import { handleRoute } from '@/lib/server/errors'
import { deleteFile } from '@/lib/server/services/dataroom.service'

type Ctx = { params: Promise<{ id: string }> }

export const DELETE = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  deleteFile(id)
  return new Response(null, { status: 204 })
})
