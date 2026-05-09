import { handleRoute } from '@/lib/server/errors'
import {
  createMateria,
  listMaterias,
} from '@/lib/server/services/materias.service'

export const GET = handleRoute(async () => {
  return Response.json(listMaterias(), { status: 200 })
})

export const POST = handleRoute(async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  const created = createMateria(body)
  return Response.json(created, { status: 201 })
})
