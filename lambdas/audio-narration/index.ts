import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '../_shared/db'
import { uploadToArtifacts } from '../_shared/s3-upload'
import { synthesizeSpeech } from './polly'

interface Payload {
  nodeId: string
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const db = getDb()

  for (const record of event.Records) {
    let payload: Payload
    try {
      payload = JSON.parse(record.body)
    } catch (err) {
      console.error('audio-narration: invalid JSON', { messageId: record.messageId, err })
      continue
    }

    const { nodeId } = payload
    console.log('audio-narration: start', { nodeId })

    const [existing] = await db
      .select()
      .from(schema.nodeContent)
      .where(
        and(
          eq(schema.nodeContent.nodeId, nodeId),
          eq(schema.nodeContent.contentType, 'audio'),
        ),
      )
      .limit(1)
    if (existing && existing.status === 'ready') {
      console.log('audio-narration: already ready, skip', { nodeId })
      continue
    }

    const [lessonRow] = await db
      .select()
      .from(schema.nodeContent)
      .where(
        and(
          eq(schema.nodeContent.nodeId, nodeId),
          eq(schema.nodeContent.contentType, 'lesson_text'),
        ),
      )
      .limit(1)
    if (!lessonRow || lessonRow.status !== 'ready') {
      console.warn('audio-narration: lesson_text not ready, deferring', { nodeId })
      throw new Error('lesson_text not ready') // SQS retry will pick it up later
    }
    const meta = lessonRow.generationMetadata as any
    const paragraphs: string[] = meta?.paragraphs ?? []
    if (paragraphs.length === 0) {
      console.warn('audio-narration: no paragraphs', { nodeId })
      continue
    }

    if (existing) {
      await db
        .update(schema.nodeContent)
        .set({ status: 'generating', errorMessage: null })
        .where(eq(schema.nodeContent.id, existing.id))
    } else {
      await db.insert(schema.nodeContent).values({
        nodeId,
        contentType: 'audio',
        status: 'generating',
      })
    }

    try {
      const script = paragraphs.join('\n\n')
      const { bytes, contentType, approxDurationSec } = await synthesizeSpeech(script, 'Mia')
      const key = `nodes/${nodeId}/narration.mp3`
      await uploadToArtifacts(key, bytes, contentType)

      await db
        .update(schema.nodeContent)
        .set({
          status: 'ready',
          contentUrl: key,
          generationMetadata: {
            provider: 'aws-polly',
            voice: 'Mia',
            engine: 'neural',
            durationSec: approxDurationSec,
            sizeBytes: bytes.byteLength,
          } as any,
          errorMessage: null,
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'audio'),
          ),
        )

      console.log('audio-narration: done', { nodeId, key, bytes: bytes.byteLength, approxDurationSec })
    } catch (err) {
      console.error('audio-narration: failed', { nodeId, err })
      await db
        .update(schema.nodeContent)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'audio'),
          ),
        )
      throw err
    }
  }
}
