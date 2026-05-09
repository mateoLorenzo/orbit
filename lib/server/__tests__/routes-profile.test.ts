import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/queries', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}))

import { GET, PATCH } from '@/app/api/profile/route'
import * as queries from '@/lib/db/queries'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const seed = {
  userId: 'demo',
  formatoPreferido: 'texto' as const,
  horariosActivos: [] as string[],
  erroresRecurrentes: [] as string[],
  friccionPromedio: 50,
  updatedAt: new Date(),
}

describe('Profile routes (Drizzle)', () => {
  beforeEach(() => {
    vi.mocked(queries.getProfile).mockReset()
    vi.mocked(queries.updateProfile).mockReset()
  })

  it('GET /api/profile returns the singleton wrapped', async () => {
    vi.mocked(queries.getProfile).mockResolvedValue(seed)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.userId).toBe('demo')
  })

  it('PATCH /api/profile merges fields and returns 200', async () => {
    vi.mocked(queries.updateProfile).mockResolvedValue({ ...seed, formatoPreferido: 'audio' as const })
    const res = await PATCH(jsonRequest('PATCH', { formatoPreferido: 'audio' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.formatoPreferido).toBe('audio')
    expect(vi.mocked(queries.updateProfile)).toHaveBeenCalledWith({ formatoPreferido: 'audio' })
  })

  it('PATCH /api/profile returns 400 on invalid formato', async () => {
    const res = await PATCH(jsonRequest('PATCH', { formatoPreferido: 'invalid' }))
    expect(res.status).toBe(400)
    expect(vi.mocked(queries.updateProfile)).not.toHaveBeenCalled()
  })

  it('PATCH /api/profile returns 400 on extra fields (strict)', async () => {
    const res = await PATCH(jsonRequest('PATCH', { id: 'hacked' }))
    expect(res.status).toBe(400)
    expect(vi.mocked(queries.updateProfile)).not.toHaveBeenCalled()
  })
})
