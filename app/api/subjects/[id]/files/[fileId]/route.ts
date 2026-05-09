import { NextResponse } from 'next/server'
import { deleteFile } from '@/lib/db/queries'
import { deleteObject } from '@/lib/aws/s3'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params
  const row = await deleteFile(id, fileId)
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // S3 cleanup. If it fails, the file row is already deleted; log and continue.
  try {
    await deleteObject(row.s3Key)
  } catch (err) {
    console.error('s3 delete failed', { fileId, s3Key: row.s3Key, err })
  }
  return new NextResponse(null, { status: 204 })
}
