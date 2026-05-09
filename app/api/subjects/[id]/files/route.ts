import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { getSubject, insertPendingFile, listFilesForSubject, DEMO_USER_ID } from '@/lib/db/queries'
import { presignUpload } from '@/lib/aws/s3'
import { fileTypeForMime } from '@/lib/files/mime'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const subject = await getSubject(id)
  if (!subject) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const files = await listFilesForSubject(id)
  return NextResponse.json({ files })
}

const RequestUploadSchema = z.object({
  filename: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024), // 100MB cap
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = await params
  const subject = await getSubject(subjectId)
  if (!subject) return NextResponse.json({ error: 'subject not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = RequestUploadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { filename, mimeType, sizeBytes } = parsed.data

  const fileType = fileTypeForMime(mimeType)
  if (!fileType) {
    return NextResponse.json(
      { error: `unsupported mime type: ${mimeType}` },
      { status: 415 },
    )
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  const s3Key = `${DEMO_USER_ID}/${subjectId}/${randomUUID()}-${safeFilename}`

  const fileRow = await insertPendingFile({
    subjectId,
    s3Key,
    originalFilename: filename,
    mimeType,
    fileType,
    sizeBytes,
  })

  const uploadUrl = await presignUpload({ key: s3Key, contentType: mimeType })

  return NextResponse.json(
    {
      fileId: fileRow.id,
      s3Key,
      uploadUrl,
      requiredHeaders: { 'Content-Type': mimeType },
      expiresInSeconds: 900,
    },
    { status: 201 },
  )
}
