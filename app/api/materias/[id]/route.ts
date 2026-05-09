import { handleRoute } from '@/lib/server/errors'
import {
  deleteMateria,
  getMateria,
} from '@/lib/server/services/materias.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return Response.json(getMateria(id), { status: 200 })
})

export const DELETE = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  deleteMateria(id)
  return new Response(null, { status: 204 })
})
