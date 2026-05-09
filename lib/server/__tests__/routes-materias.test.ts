import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../store'
import { GET as getList, POST as postList } from '@/app/api/materias/route'
import { DELETE as del, GET as getOne } from '@/app/api/materias/[id]/route'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Materias routes', () => {
  beforeEach(() => resetStore())

  it('POST /materias creates and returns 201', async () => {
    const res = await postList(jsonRequest('POST', { nombre: 'Cálculo' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.nombre).toBe('Cálculo')
    expect(body.id).toBeTruthy()
  })

  it('POST /materias returns 400 on invalid input', async () => {
    const res = await postList(jsonRequest('POST', { nombre: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('validation')
  })

  it('GET /materias returns 200 with array', async () => {
    await postList(jsonRequest('POST', { nombre: 'A' }))
    const res = await getList()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('GET /materias/:id returns 200 when found', async () => {
    const created = await postList(jsonRequest('POST', { nombre: 'A' })).then((r) => r.json())
    const res = await getOne(jsonRequest('GET'), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(created.id)
  })

  it('GET /materias/:id returns 404 when missing', async () => {
    const res = await getOne(jsonRequest('GET'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('DELETE /materias/:id returns 204 on success', async () => {
    const created = await postList(jsonRequest('POST', { nombre: 'A' })).then((r) => r.json())
    const res = await del(jsonRequest('DELETE'), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(204)
  })

  it('DELETE /materias/:id returns 404 when missing', async () => {
    const res = await del(jsonRequest('DELETE'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
