import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { eq, sql, and } from 'drizzle-orm'
import { Resource } from 'sst'
import { getDb, schema } from '../_shared/db'
import { embed } from '../_shared/voyage'

const sqs = new SQSClient({})

interface EmbedPayload {
  fileId: string
  subjectId: string
  totalChunks: number
  chunks: { index: number; text: string; metadata: Record<string, unknown> }[]
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const db = getDb()

  for (const record of event.Records) {
    let payload: EmbedPayload
    try {
      payload = JSON.parse(record.body)
    } catch (err) {
      console.error('embedder: invalid JSON', { messageId: record.messageId, err })
      continue
    }

    const { fileId, subjectId, totalChunks, chunks } = payload
    if (!chunks || chunks.length === 0) {
      console.warn('embedder: empty batch', { fileId })
      continue
    }
    console.log('embedder: start batch', { fileId, batchSize: chunks.length, totalChunks })

    try {
      // 1. Embed in one Voyage call (it batches internally up to 128).
      const vectors = await embed(
        chunks.map((c) => c.text),
        'document',
      )

      // 2. Upsert chunks into file_chunks.
      const rows = chunks.map((c, i) => ({
        fileId,
        subjectId,
        chunkIndex: c.index,
        text: c.text,
        embedding: vectors[i],
        metadata: c.metadata as any,
      }))

      await db.insert(schema.fileChunks).values(rows)
      console.log('embedder: inserted', { fileId, count: rows.length })

      // 3. If this batch finished the file, mark it processed and enqueue graph-recalc.
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.fileChunks)
        .where(eq(schema.fileChunks.fileId, fileId))

      if (count >= totalChunks) {
        await db
          .update(schema.files)
          .set({ status: 'processed', processedAt: new Date(), errorMessage: null })
          .where(and(eq(schema.files.id, fileId), eq(schema.files.subjectId, subjectId)))

        // Update the subject's last_upload_at so graph-recalc can debounce.
        await db
          .update(schema.subjects)
          .set({ lastUploadAt: new Date() })
          .where(eq(schema.subjects.id, subjectId))

        // Enqueue graph-recalc. FIFO with MessageGroupId=subjectId.
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: Resource.GraphRecalcQueue.url,
            MessageBody: JSON.stringify({ subjectId, triggeredBy: fileId }),
            MessageGroupId: subjectId,
            MessageDeduplicationId: `${subjectId}:${fileId}:${Date.now()}`,
          }),
        )
        console.log('embedder: file complete, graph-recalc enqueued', { fileId, subjectId })
      } else {
        console.log('embedder: batch done, file not yet complete', {
          fileId,
          chunksSoFar: count,
          totalChunks,
        })
      }
    } catch (err) {
      console.error('embedder: failed', { fileId, err })
      await db
        .update(schema.files)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(eq(schema.files.id, fileId))
      throw err // let SQS retry / DLQ
    }
  }
}
