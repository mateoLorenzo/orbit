import { NextResponse } from 'next/server'
import { deleteFile, getSubjectBySlug } from '@/lib/db/queries'
import { deleteObject } from '@/lib/aws/s3'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: slug, fileId } = await params
  const subject = await getSubjectBySlug(slug)
  if (!subject) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const row = await deleteFile(subject.id, fileId)
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  try {
    await deleteObject(row.s3Key)
  } catch (err) {
    console.error('s3 delete failed', { fileId, s3Key: row.s3Key, err })
  }
  return new NextResponse(null, { status: 204 })
}
