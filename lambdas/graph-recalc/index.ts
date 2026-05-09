import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { eq, and, inArray, or } from 'drizzle-orm'
import { Resource } from 'sst'
import { getDb, schema } from '../_shared/db'
import { embed } from '../_shared/voyage'
import { summarizeFile, synthesizeGraph } from './synth'

const sqs = new SQSClient({})
const DEBOUNCE_MS = 30_000

interface RecalcPayload {
  subjectId: string
  triggeredBy?: string
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const db = getDb()

  for (const record of event.Records) {
    let payload: RecalcPayload
    try {
      payload = JSON.parse(record.body)
    } catch (err) {
      console.error('graph-recalc: invalid JSON', { messageId: record.messageId, err })
      continue
    }

    const { subjectId } = payload
    console.log('graph-recalc: start', { subjectId })

    const [subject] = await db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, subjectId))
      .limit(1)
    if (!subject) {
      console.warn('graph-recalc: subject not found', { subjectId })
      continue
    }

    if (
      subject.lastUploadAt &&
      Date.now() - subject.lastUploadAt.getTime() < DEBOUNCE_MS
    ) {
      console.log('graph-recalc: debouncing — re-enqueue with delay', { subjectId })
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: Resource.GraphRecalcQueue.url,
          MessageBody: JSON.stringify(payload),
          MessageGroupId: subjectId,
          MessageDeduplicationId: `${subjectId}:debounce:${Date.now()}`,
          DelaySeconds: 30,
        }),
      )
      continue
    }

    const processedFiles = await db
      .select()
      .from(schema.files)
      .where(
        and(
          eq(schema.files.subjectId, subjectId),
          eq(schema.files.status, 'processed'),
        ),
      )
    if (processedFiles.length === 0) {
      console.log('graph-recalc: no processed files', { subjectId })
      continue
    }

    for (const file of processedFiles) {
      if (file.summary && file.keywords && file.keywords.length > 0) continue
      const chunkRows = await db
        .select({ text: schema.fileChunks.text, idx: schema.fileChunks.chunkIndex })
        .from(schema.fileChunks)
        .where(eq(schema.fileChunks.fileId, file.id))
      if (chunkRows.length === 0) {
        console.warn('graph-recalc: file has no chunks', { fileId: file.id })
        continue
      }
      const ordered = [...chunkRows].sort((a, b) => a.idx - b.idx)
      const text = ordered.map((c) => c.text).join('\n\n')
      const { summary, keywords } = await summarizeFile({
        subjectName: subject.name,
        filename: file.originalFilename,
        text,
      })
      await db
        .update(schema.files)
        .set({ summary, keywords })
        .where(eq(schema.files.id, file.id))
      file.summary = summary
      file.keywords = keywords
      console.log('graph-recalc: summarized', { fileId: file.id, keywords: keywords.length })
    }

    const existingNodes = await db
      .select()
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.subjectId, subjectId),
          eq(schema.nodes.status, 'active'),
        ),
      )

    const summarizedFiles = processedFiles.filter(
      (f): f is typeof f & { summary: string; keywords: string[] } =>
        Boolean(f.summary) && Array.isArray(f.keywords) && f.keywords.length > 0,
    )
    if (summarizedFiles.length === 0) {
      console.warn('graph-recalc: no files with summaries — abort', { subjectId })
      continue
    }

    const synth = await synthesizeGraph({
      subjectName: subject.name,
      files: summarizedFiles.map((f) => ({
        filename: f.originalFilename,
        summary: f.summary,
        keywords: f.keywords,
      })),
      existingTitles: existingNodes.map((n) => n.title),
    })

    const [existingPath] = await db
      .select()
      .from(schema.paths)
      .where(eq(schema.paths.subjectId, subjectId))
      .orderBy(schema.paths.orderIndex)
      .limit(1)
    let pathId = existingPath?.id
    if (!pathId) {
      const [created] = await db
        .insert(schema.paths)
        .values({ subjectId, title: 'Default', orderIndex: 0 })
        .returning({ id: schema.paths.id })
      pathId = created.id
    }

    const norm = (s: string) => s.trim().toLowerCase()
    const existingByTitle = new Map(existingNodes.map((n) => [norm(n.title), n]))
    const synthByTitle = new Map<string, typeof synth.nodes[number]>()
    for (const n of synth.nodes) synthByTitle.set(norm(n.title), n)

    const titleToId = new Map<string, string>()
    const nodesNeedingEmbedding: { id: string; text: string }[] = []
    let createdCount = 0
    let updatedCount = 0

    for (const [key, synthNode] of synthByTitle) {
      const existing = existingByTitle.get(key)
      if (existing) {
        const changed =
          existing.contentBrief !== synthNode.contentBrief || existing.title !== synthNode.title
        if (changed) {
          await db
            .update(schema.nodes)
            .set({
              title: synthNode.title,
              contentBrief: synthNode.contentBrief,
              updatedAt: new Date(),
            })
            .where(eq(schema.nodes.id, existing.id))
          nodesNeedingEmbedding.push({
            id: existing.id,
            text: `${synthNode.title}\n\n${synthNode.contentBrief}`,
          })
          updatedCount++
        }
        titleToId.set(key, existing.id)
      } else {
        const [created] = await db
          .insert(schema.nodes)
          .values({
            pathId,
            subjectId,
            title: synthNode.title,
            contentBrief: synthNode.contentBrief,
          })
          .returning({ id: schema.nodes.id })
        titleToId.set(key, created.id)
        nodesNeedingEmbedding.push({
          id: created.id,
          text: `${synthNode.title}\n\n${synthNode.contentBrief}`,
        })
        createdCount++
      }
    }

    let archivedCount = 0
    for (const [key, existing] of existingByTitle) {
      if (!synthByTitle.has(key)) {
        await db
          .update(schema.nodes)
          .set({ status: 'archived', updatedAt: new Date() })
          .where(eq(schema.nodes.id, existing.id))
        archivedCount++
      }
    }

    const subjectNodeIds = (
      await db
        .select({ id: schema.nodes.id })
        .from(schema.nodes)
        .where(eq(schema.nodes.subjectId, subjectId))
    ).map((r) => r.id)

    if (subjectNodeIds.length > 0) {
      await db
        .delete(schema.nodeEdges)
        .where(
          or(
            inArray(schema.nodeEdges.fromNodeId, subjectNodeIds),
            inArray(schema.nodeEdges.toNodeId, subjectNodeIds),
          ),
        )
    }

    const edgesToInsert: { fromNodeId: string; toNodeId: string }[] = []
    for (const [key, synthNode] of synthByTitle) {
      const toId = titleToId.get(key)
      if (!toId) continue
      for (const prereq of synthNode.prerequisiteTitles) {
        const fromId = titleToId.get(norm(prereq))
        if (!fromId || fromId === toId) continue
        edgesToInsert.push({ fromNodeId: fromId, toNodeId: toId })
      }
    }
    if (edgesToInsert.length > 0) {
      await db
        .insert(schema.nodeEdges)
        .values(edgesToInsert)
        .onConflictDoNothing({
          target: [schema.nodeEdges.fromNodeId, schema.nodeEdges.toNodeId],
        })
    }

    if (nodesNeedingEmbedding.length > 0) {
      const vectors = await embed(
        nodesNeedingEmbedding.map((n) => n.text),
        'document',
      )
      for (let i = 0; i < nodesNeedingEmbedding.length; i++) {
        await db
          .update(schema.nodes)
          .set({ topicEmbedding: vectors[i], updatedAt: new Date() })
          .where(eq(schema.nodes.id, nodesNeedingEmbedding[i].id))
      }
    }

    console.log('graph-recalc: done', {
      subjectId,
      synthNodes: synth.nodes.length,
      created: createdCount,
      updated: updatedCount,
      archived: archivedCount,
      edges: edgesToInsert.length,
    })
  }
}
