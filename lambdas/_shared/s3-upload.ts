import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Resource } from 'sst'

const s3 = new S3Client({})

export async function uploadToArtifacts(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: Resource.ArtifactsBucket.name,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return key
}
