import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../store'
import { createMateria } from '../services/materias.service'
import { GET as listProgress } from '@/app/api/materias/[id]/progress/route'
import { GET as getSummary } from '@/app/api/materias/[id]/progress/summary/route'
import { PATCH as patchStatus } from '@/app/api/nodos/[id]/status/route'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Progress routes', () => {
  beforeEach(() => resetStore())

  it('PATCH /nodos/:id/status creates Progress on first call', async () => {
    const res = await patchStatus(jsonRequest('PATCH', { status: 'disponible' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nodoId).toBe('n1')
    expect(body.status).toBe('disponible')
  })

  it('PATCH /nodos/:id/status returns 400 on invalid status', async () => {
    const res = await patchStatus(jsonRequest('PATCH', { status: 'foo' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    expect(res.status).toBe(400)
  })

  it('GET /materias/:id/progress returns 404 when materia missing', async () => {
    const res = await listProgress(jsonRequest('GET'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('GET /materias/:id/progress returns array', async () => {
    const m = createMateria({ nombre: 'A' })
    await patchStatus(jsonRequest('PATCH', { status: 'dominado' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    const res = await listProgress(jsonRequest('GET'), { params: Promise.resolve({ id: m.id }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('GET /materias/:id/progress/summary computes percent', async () => {
    const m = createMateria({ nombre: 'A' })
    await patchStatus(jsonRequest('PATCH', { status: 'dominado' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    await patchStatus(jsonRequest('PATCH', { status: 'en_curso' }), {
      params: Promise.resolve({ id: 'n2' }),
    })
    const res = await getSummary(jsonRequest('GET'), {
      params: Promise.resolve({ id: m.id }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(2)
    expect(body.dominado).toBe(1)
    expect(body.percentDominado).toBe(50)
  })
})
