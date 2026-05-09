import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '../_shared/db'
import { uploadToArtifacts } from '../_shared/s3-upload'
import { buildImagePrompt, generateImage } from './synth'

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
      console.error('image-generator: invalid JSON', { messageId: record.messageId, err })
      continue
    }

    const { nodeId, subjectId } = payload
    console.log('image-generator: start', { nodeId, subjectId })

    const [existing] = await db
      .select()
      .from(schema.nodeContent)
      .where(
        and(
          eq(schema.nodeContent.nodeId, nodeId),
          eq(schema.nodeContent.contentType, 'image'),
        ),
      )
      .limit(1)
    if (existing && existing.status === 'ready') {
      console.log('image-generator: already ready, skip', { nodeId })
      continue
    }

    const [node] = await db
      .select()
      .from(schema.nodes)
      .where(eq(schema.nodes.id, nodeId))
      .limit(1)
    if (!node) {
      console.warn('image-generator: node not found', { nodeId })
      continue
    }
    const [subject] = await db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, subjectId))
      .limit(1)
    if (!subject) {
      console.warn('image-generator: subject not found', { subjectId })
      continue
    }
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, subject.userId))
      .limit(1)
    const interests = profile?.interests ?? []

    if (existing) {
      await db
        .update(schema.nodeContent)
        .set({ status: 'generating', errorMessage: null })
        .where(eq(schema.nodeContent.id, existing.id))
    } else {
      await db.insert(schema.nodeContent).values({
        nodeId,
        contentType: 'image',
        status: 'generating',
      })
    }

    try {
      const prompt = buildImagePrompt({
        subjectName: subject.name,
        nodeTitle: node.title,
        contentBrief: node.contentBrief,
        interests,
      })
      const { bytes, contentType } = await generateImage(prompt)
      const ext = contentType.includes('jpeg') ? 'jpg' : 'png'
      const key = `nodes/${nodeId}/image.${ext}`
      await uploadToArtifacts(key, bytes, contentType)

      await db
        .update(schema.nodeContent)
        .set({
          status: 'ready',
          contentUrl: key,
          imagePrompt: prompt,
          generationMetadata: { provider: 'fal/flux-schnell', sizeBytes: bytes.byteLength } as any,
          errorMessage: null,
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'image'),
          ),
        )

      console.log('image-generator: done', { nodeId, key, bytes: bytes.byteLength })
    } catch (err) {
      console.error('image-generator: failed', { nodeId, err })
      await db
        .update(schema.nodeContent)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'image'),
          ),
        )
      throw err
    }
  }
}
