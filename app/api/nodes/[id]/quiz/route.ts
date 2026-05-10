import { NextResponse } from 'next/server'
import { z } from 'zod'
import { gradeQuiz } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

const Body = z.object({ answers: z.array(z.number().int().min(0).max(3)) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const result = await gradeQuiz(id, parsed.data.answers)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 409 },
    )
  }
}
