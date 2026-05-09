import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProfile, updateProfile } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

const UpdateProfileSchema = z
  .object({
    formatoPreferido: z.enum(['texto', 'audio', 'video', 'visual', 'podcast']).optional(),
    horariosActivos: z.array(z.string()).optional(),
    erroresRecurrentes: z.array(z.string()).optional(),
    friccionPromedio: z.number().int().min(0).max(100).optional(),
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
