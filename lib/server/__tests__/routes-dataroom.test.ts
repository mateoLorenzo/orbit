import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../store'
import { createMateria } from '../services/materias.service'
import { GET as listFiles, POST as uploadFile } from '@/app/api/materias/[id]/files/route'
import { DELETE as deleteFileRoute } from '@/app/api/files/[id]/route'

function multipartRequest(file: { name: string; type: string; bytes: Uint8Array }): Request {
  const fd = new FormData()
  fd.append('file', new Blob([file.bytes], { type: file.type }), file.name)
  return new Request('http://test/local', { method: 'POST', body: fd })
}

describe('DataRoom routes', () => {
  beforeEach(() => resetStore())

  it('POST /materias/:id/files uploads a file (metadata only)', async () => {
    const m = createMateria({ nombre: 'A' })
    const req = multipartRequest({
      name: 'doc.pdf',
      type: 'application/pdf',
      bytes: new Uint8Array([1, 2, 3]),
    })
    const res = await uploadFile(req, { params: Promise.resolve({ id: m.id }) })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.fileName).toBe('doc.pdf')
    expect(body.fileType).toBe('application/pdf')
    expect(body.size).toBe(3)
    expect(body.materiaId).toBe(m.id)
    expect(body.filePath).toBe(`mock://${m.id}/doc.pdf`)
  })

  it('POST /materias/:id/files returns 404 when materia missing', async () => {
    const req = multipartRequest({
      name: 'doc.pdf',
      type: 'application/pdf',
      bytes: new Uint8Array([1]),
    })
    const res = await uploadFile(req, { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('POST /materias/:id/files returns 400 when file field missing', async () => {
    const m = createMateria({ nombre: 'A' })
    const req = new Request('http://test/local', { method: 'POST', body: new FormData() })
    const res = await uploadFile(req, { params: Promise.resolve({ id: m.id }) })
    expect(res.status).toBe(400)
  })

  it('GET /materias/:id/files lists only that materia files', async () => {
    const m = createMateria({ nombre: 'A' })
    await uploadFile(
      multipartRequest({ name: 'x.pdf', type: 'application/pdf', bytes: new Uint8Array([1]) }),
      { params: Promise.resolve({ id: m.id }) },
    )
    const res = await listFiles(new Request('http://test'), {
      params: Promise.resolve({ id: m.id }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('DELETE /files/:id removes the file', async () => {
    const m = createMateria({ nombre: 'A' })
    const created = await uploadFile(
      multipartRequest({ name: 'x.pdf', type: 'application/pdf', bytes: new Uint8Array([1]) }),
      { params: Promise.resolve({ id: m.id }) },
    ).then((r) => r.json())
    const res = await deleteFileRoute(new Request('http://test', { method: 'DELETE' }), {
      params: Promise.resolve({ id: created.id }),
    })
    expect(res.status).toBe(204)
  })

  it('DELETE /files/:id returns 404 when missing', async () => {
    const res = await deleteFileRoute(new Request('http://test', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'nope' }),
    })
    expect(res.status).toBe(404)
  })
})
