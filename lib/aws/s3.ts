import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let cached: S3Client | null = null
function client() {
  if (cached) return cached
  cached = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' })
  return cached
}

export const ORIGINALS_BUCKET = () => {
  const v = process.env.S3_ORIGINALS_BUCKET
  if (!v) throw new Error('S3_ORIGINALS_BUCKET is not set')
  return v
}

/**
 * Returns a presigned PUT URL valid for `expiresIn` seconds.
 * The client must upload with the same Content-Type they passed here.
 */
export async function presignUpload(opts: {
  key: string
  contentType: string
  expiresIn?: number
}) {
  const cmd = new PutObjectCommand({
    Bucket: ORIGINALS_BUCKET(),
    Key: opts.key,
    ContentType: opts.contentType,
  })
  return getSignedUrl(client(), cmd, { expiresIn: opts.expiresIn ?? 900 })
}
