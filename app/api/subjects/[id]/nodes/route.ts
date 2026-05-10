import { NextResponse } from 'next/server'
import { getSubjectBySlug, listNodesWithProgress } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const subject = await getSubjectBySlug(slug)
  if (!subject) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const nodes = await listNodesWithProgress(subject.id)
  return NextResponse.json({ nodes })
}
