import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const sqs = new SQSClient({ region: process.env.AWS_REGION })

const ROUTE_MAP: Record<string, string | undefined> = {
  // mime → queue URL
  'application/pdf': process.env.PDF_QUEUE_URL,
  'application/msword': process.env.DOC_QUEUE_URL,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    process.env.DOC_QUEUE_URL,
  'image/png': process.env.IMAGE_QUEUE_URL,
  'image/jpeg': process.env.IMAGE_QUEUE_URL,
  'image/webp': process.env.IMAGE_QUEUE_URL,
  'video/mp4': process.env.VIDEO_QUEUE_URL,
  'video/quicktime': process.env.VIDEO_QUEUE_URL,
}

function fallbackByExtension(key: string): string | undefined {
  const ext = key.split('.').pop()?.toLowerCase()
  if (!ext) return undefined
  if (ext === 'pdf') return process.env.PDF_QUEUE_URL
  if (ext === 'doc' || ext === 'docx') return process.env.DOC_QUEUE_URL
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return process.env.IMAGE_QUEUE_URL
  if (['mp4', 'mov', 'webm'].includes(ext)) return process.env.VIDEO_QUEUE_URL
  return undefined
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    let s3Event: any
    try {
      s3Event = JSON.parse(record.body)
    } catch (err) {
      console.error('file-router: invalid JSON in record', { messageId: record.messageId, err })
      continue
    }

    const s3Records: any[] = s3Event?.Records ?? []
    for (const r of s3Records) {
      const bucket = r?.s3?.bucket?.name
      const key = decodeURIComponent((r?.s3?.object?.key ?? '').replace(/\+/g, ' '))
      if (!bucket || !key) {
        console.warn('file-router: malformed S3 record', r)
        continue
      }

      // Look up the file row to learn the mime type. For MVP we fall back to extension.
      const queueUrl = fallbackByExtension(key)
      if (!queueUrl) {
        console.warn('file-router: no route for key', { bucket, key })
        continue
      }

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({ bucket, key }),
        }),
      )
      console.log('file-router: routed', { bucket, key, queueUrl })
    }
  }
}
