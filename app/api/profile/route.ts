import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProfile, updateProfile } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

const UpdateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(100).nullish(),
    interests: z.array(z.string().min(1).max(40)).max(20).optional(),
    preferredFormat: z.enum(['text', 'audio', 'video', 'visual', 'podcast']).optional(),
    activeHours: z.array(z.string()).optional(),
    recurringMistakes: z.array(z.string()).optional(),
    averageFriction: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .partial()

export async function GET() {
  const profile = await getProfile()
  return NextResponse.json({ profile })
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const profile = await updateProfile(parsed.data)
  return NextResponse.json({ profile })
}
