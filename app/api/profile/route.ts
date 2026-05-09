import { handleRoute } from '@/lib/server/errors'
import {
  getProfile as getProfileService,
  updateProfile,
} from '@/lib/server/services/profile.service'

export const GET = handleRoute(async () => {
  return Response.json(getProfileService(), { status: 200 })
})

export const PATCH = handleRoute(async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  const updated = updateProfile(body)
  return Response.json(updated, { status: 200 })
})
