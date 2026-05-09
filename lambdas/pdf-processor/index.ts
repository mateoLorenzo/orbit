import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { extractText, getDocumentProxy } from 'unpdf'
import { eq } from 'drizzle-orm'
import { Resource } from 'sst'
import { getDb, schema } from '../_shared/db'
import { chunkText } from '../_shared/chunking'

const s3 = new S3Client({})
const sqs = new SQSClient({})

const MAX_MESSAGE_BYTES = 200_000 // SQS limit is 256KB; leave headroom for envelope

async function downloadObject(bucket: string, key: string): Promise<Uint8Array> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  if (!res.Body) throw new Error(`empty body for s3://${bucket}/${key}`)
  // node 20 stream → bytes
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
  let total = 0
  for (const c of chunks) total += c.byteLength
  const merged = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.byteLength
  }
  return merged
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? text.join('\n\n') : text
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const db = getDb()

  for (const record of event.Records) {
    let body: { bucket: string; key: string }
    try {
      body = JSON.parse(record.body)
    } catch (err) {
      console.error('pdf-processor: invalid JSON', { messageId: record.messageId, err })
      continue
    }
    const { bucket, key } = body
    console.log('pdf-processor: start', { bucket, key })

    // 1. Find the file row by s3_key (created by the API route at upload time)
    const [fileRow] = await db
      .select()
      .from(schema.files)
      .where(eq(schema.files.s3Key, key))
      .limit(1)

    if (!fileRow) {
      console.error('pdf-processor: no file row found for key', { key })
      continue
    }

    // 2. Mark processing
    await db
      .update(schema.files)
      .set({ status: 'processing', errorMessage: null })
      .where(eq(schema.files.id, fileRow.id))

    try {
      // 3. Download + extract
      const bytes = await downloadObject(bucket, key)
      const text = await extractPdfText(bytes)
      console.log('pdf-processor: extracted', {
        fileId: fileRow.id,
        chars: text.length,
      })

      // 4. Chunk
      const chunks = chunkText(text)
      if (chunks.length === 0) {
        await db
          .update(schema.files)
          .set({ status: 'failed', errorMessage: 'no extractable text' })
          .where(eq(schema.files.id, fileRow.id))
        continue
      }

      // 5. Enqueue for embedding. Single message if it fits; otherwise split.
      const fullPayload = {
        fileId: fileRow.id,
        subjectId: fileRow.subjectId,
        totalChunks: chunks.length,
        chunks,
      }
      const fullJson = JSON.stringify(fullPayload)

      if (fullJson.length <= MAX_MESSAGE_BYTES) {
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: Resource.EmbeddingQueue.url,
            MessageBody: fullJson,
          }),
        )
        console.log('pdf-processor: enqueued single batch', {
          fileId: fileRow.id,
          chunks: chunks.length,
        })
      } else {
        // Split into batches whose JSON serialization stays under the cap.
        const batches: typeof chunks[] = []
        let current: typeof chunks = []
        let currentSize = 200 // envelope overhead
        for (const c of chunks) {
          const cSize = JSON.stringify(c).length + 2
          if (current.length > 0 && currentSize + cSize > MAX_MESSAGE_BYTES) {
            batches.push(current)
            current = []
            currentSize = 200
          }
          current.push(c)
          currentSize += cSize
        }
        if (current.length > 0) batches.push(current)

        for (const batch of batches) {
          const payload = {
            fileId: fileRow.id,
            subjectId: fileRow.subjectId,
            totalChunks: chunks.length,
            chunks: batch,
          }
          await sqs.send(
            new SendMessageCommand({
              QueueUrl: Resource.EmbeddingQueue.url,
              MessageBody: JSON.stringify(payload),
            }),
          )
        }
        console.log('pdf-processor: enqueued split batches', {
          fileId: fileRow.id,
          batches: batches.length,
          totalChunks: chunks.length,
        })
      }
    } catch (err) {
      console.error('pdf-processor: failed', { fileId: fileRow.id, err })
      await db
        .update(schema.files)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(eq(schema.files.id, fileRow.id))
    }
  }
}
