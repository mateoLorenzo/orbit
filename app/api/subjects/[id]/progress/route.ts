import { NextResponse } from 'next/server'
import { getSubjectBySlug, listProgressForSubject } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: slug } = await params
  const subject = await getSubjectBySlug(slug)
  if (!subject) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const progress = await listProgressForSubject(subject.id)
  return NextResponse.json({ progress })
}
