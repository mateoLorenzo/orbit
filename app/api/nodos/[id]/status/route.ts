import { handleRoute } from '@/lib/server/errors'
import { UpdateProgressStatusInputSchema } from '@/lib/server/schemas'
import { upsertProgressStatus } from '@/lib/server/services/progress.service'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const { status } = UpdateProgressStatusInputSchema.parse(body)
  const progress = upsertProgressStatus(id, status)
  return Response.json(progress, { status: 200 })
})
