import { handleRoute } from '@/lib/server/errors'
import { getProgressSummaryByMateria } from '@/lib/server/services/progress.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return Response.json(getProgressSummaryByMateria(id), { status: 200 })
})
