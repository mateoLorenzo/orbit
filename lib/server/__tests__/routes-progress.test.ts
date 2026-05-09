import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/queries', () => ({
  getSubject: vi.fn(),
  getSubjectBySlug: vi.fn(),
  listProgressForSubject: vi.fn(),
  summarizeProgressForSubject: vi.fn(),
  upsertNodeProgress: vi.fn(),
}))

import { GET as listProgress } from '@/app/api/subjects/[id]/progress/route'
import { GET as getSummary } from '@/app/api/subjects/[id]/progress/summary/route'
import { PATCH as patchStatus } from '@/app/api/nodes/[id]/status/route'
import * as queries from '@/lib/db/queries'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const fakeSubject = {
  id: 's1',
  userId: 'demo',
  name: 'A',
  description: null,
  slug: 'a',
  lastUploadAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('Progress routes (Drizzle)', () => {
  beforeEach(() => {
    vi.mocked(queries.getSubject).mockReset()
    vi.mocked(queries.getSubjectBySlug).mockReset()
    vi.mocked(queries.listProgressForSubject).mockReset()
    vi.mocked(queries.summarizeProgressForSubject).mockReset()
    vi.mocked(queries.upsertNodeProgress).mockReset()
  })

  it('GET /subjects/:id/progress 404 when subject missing', async () => {
    vi.mocked(queries.getSubjectBySlug).mockResolvedValue(null as never)
    const res = await listProgress(jsonRequest('GET'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('GET /subjects/:id/progress returns wrapped array', async () => {
    vi.mocked(queries.getSubjectBySlug).mockResolvedValue(fakeSubject)
    vi.mocked(queries.listProgressForSubject).mockResolvedValue([
      { id: 'p1', nodeId: 'n1', status: 'mastered' as const, completedAt: null, updatedAt: new Date() },
    ])
    const res = await listProgress(jsonRequest('GET'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.progress).toHaveLength(1)
  })

  it('GET /subjects/:id/progress/summary 404 when subject missing', async () => {
    vi.mocked(queries.getSubjectBySlug).mockResolvedValue(null as never)
    const res = await getSummary(jsonRequest('GET'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('GET /subjects/:id/progress/summary returns summary', async () => {
    vi.mocked(queries.getSubjectBySlug).mockResolvedValue(fakeSubject)
    vi.mocked(queries.summarizeProgressForSubject).mockResolvedValue({
      total: 4, mastered: 2, inProgress: 1, available: 1, locked: 0, percentMastered: 50,
    })
    const res = await getSummary(jsonRequest('GET'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.percentMastered).toBe(50)
  })

  it('PATCH /nodes/:id/status creates Progress', async () => {
    vi.mocked(queries.upsertNodeProgress).mockResolvedValue({
      id: 'p1', userId: 'demo', nodeId: 'n1', status: 'mastered' as const, completedAt: new Date(), updatedAt: new Date(),
    })
    const res = await patchStatus(jsonRequest('PATCH', { status: 'mastered' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.progress.status).toBe('mastered')
    expect(vi.mocked(queries.upsertNodeProgress)).toHaveBeenCalledWith('n1', 'mastered')
  })

  it('PATCH /nodes/:id/status returns 400 on invalid status', async () => {
    const res = await patchStatus(jsonRequest('PATCH', { status: 'foo' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    expect(res.status).toBe(400)
    expect(vi.mocked(queries.upsertNodeProgress)).not.toHaveBeenCalled()
  })
})
