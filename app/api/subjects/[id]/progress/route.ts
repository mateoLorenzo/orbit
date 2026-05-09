import { NextResponse } from 'next/server'
import { getSubject, listProgressForSubject } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const subject = await getSubject(id)
  if (!subject) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const progress = await listProgressForSubject(id)
  return NextResponse.json({ progress })
}
