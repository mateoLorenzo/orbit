import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { eq, and, desc, sql } from 'drizzle-orm'
import { Resource } from 'sst'
import { getDb, schema } from '../_shared/db'
import { generateLessonText } from './synth'

const sqs = new SQSClient({})

const MAX_CHUNKS_PER_PROMPT = 8 // ~5k tokens cap

interface Payload {
  nodeId: string
  subjectId: string
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const db = getDb()

  for (const record of event.Records) {
    let payload: Payload
    try {
      payload = JSON.parse(record.body)
    } catch (err) {
      console.error('lesson-text: invalid JSON', { messageId: record.messageId, err })
      continue
    }

    const { nodeId, subjectId } = payload
    console.log('lesson-text: start', { nodeId, subjectId })

    // Idempotency: skip if a 'ready' lesson_text row already exists.
    const [existing] = await db
      .select()
      .from(schema.nodeContent)
      .where(
        and(
          eq(schema.nodeContent.nodeId, nodeId),
          eq(schema.nodeContent.contentType, 'lesson_text'),
        ),
      )
      .limit(1)
    if (existing && existing.status === 'ready') {
      console.log('lesson-text: already ready, skip', { nodeId })
      continue
    }

    // Load node + subject + interests + top chunks.
    const [node] = await db
      .select()
      .from(schema.nodes)
      .where(eq(schema.nodes.id, nodeId))
      .limit(1)
    if (!node) {
      console.warn('lesson-text: node not found', { nodeId })
      continue
    }

    const [subject] = await db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, subjectId))
      .limit(1)
    if (!subject) {
      console.warn('lesson-text: subject not found', { subjectId })
      continue
    }

    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, subject.userId))
      .limit(1)
    const interests = profile?.interests ?? []

    // Top N chunks by topic embedding similarity if node has one, else first N.
    let chunkRows: { text: string }[] = []
    if (node.topicEmbedding) {
      chunkRows = await db
        .select({ text: schema.fileChunks.text })
        .from(schema.fileChunks)
        .where(eq(schema.fileChunks.subjectId, subjectId))
        .orderBy(
          sql`${schema.fileChunks.embedding} <=> ${JSON.stringify(node.topicEmbedding)}::vector`,
        )
        .limit(MAX_CHUNKS_PER_PROMPT)
    } else {
      chunkRows = await db
        .select({ text: schema.fileChunks.text })
        .from(schema.fileChunks)
        .where(eq(schema.fileChunks.subjectId, subjectId))
        .orderBy(desc(schema.fileChunks.createdAt))
        .limit(MAX_CHUNKS_PER_PROMPT)
    }

    if (chunkRows.length === 0) {
      console.warn('lesson-text: no chunks for subject', { subjectId, nodeId })
      continue
    }

    // Mark generating (creates row if missing).
    if (existing) {
      await db
        .update(schema.nodeContent)
        .set({ status: 'generating', errorMessage: null })
        .where(eq(schema.nodeContent.id, existing.id))
    } else {
      await db.insert(schema.nodeContent).values({
        nodeId,
        contentType: 'lesson_text',
        status: 'generating',
      })
    }

    try {
      const lesson = await generateLessonText({
        subjectName: subject.name,
        nodeTitle: node.title,
        nodeContentBrief: node.contentBrief,
        chunks: chunkRows.map((c) => c.text),
        interests,
      })

      await db
        .update(schema.nodeContent)
        .set({
          status: 'ready',
          generationMetadata: lesson as any,
          errorMessage: null,
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'lesson_text'),
          ),
        )

      console.log('lesson-text: done', { nodeId, paragraphs: lesson.paragraphs.length, quiz: lesson.quiz.length })

      // Fan out audio narration now that paragraphs exist.
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: Resource.AudioNarrationQueue.url,
          MessageBody: JSON.stringify({ nodeId }),
        }),
      )
    } catch (err) {
      console.error('lesson-text: failed', { nodeId, err })
      await db
        .update(schema.nodeContent)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'lesson_text'),
          ),
        )
      throw err // SQS retry / DLQ
    }
  }
}
