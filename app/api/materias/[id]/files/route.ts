import { ApiError, handleRoute } from '@/lib/server/errors'
import {
  createFile,
  listFilesByMateria,
} from '@/lib/server/services/dataroom.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return Response.json(listFilesByMateria(id), { status: 200 })
})

export const POST = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    throw new ApiError(400, 'validation', "Missing 'file' field in multipart body")
  }
  const created = createFile(id, {
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    size: file.size,
  })
  return Response.json(created, { status: 201 })
})
