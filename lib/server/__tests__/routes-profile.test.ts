import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../store'
import { GET as getProfile, PATCH as patchProfile } from '@/app/api/profile/route'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Profile routes', () => {
  beforeEach(() => resetStore())

  it('GET /profile returns the singleton', async () => {
    const res = await getProfile(jsonRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('singleton')
    expect(body.formatoPreferido).toBe('texto')
  })

  it('PATCH /profile merges fields', async () => {
    const res = await patchProfile(jsonRequest('PATCH', { formatoPreferido: 'audio' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.formatoPreferido).toBe('audio')
    expect(body.id).toBe('singleton')
  })

  it('PATCH /profile returns 400 on invalid', async () => {
    const res = await patchProfile(jsonRequest('PATCH', { formatoPreferido: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('PATCH /profile ignores incoming id', async () => {
    const res = await patchProfile(jsonRequest('PATCH', { id: 'hacked', friccionPromedio: 0.7 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('singleton')
    expect(body.friccionPromedio).toBe(0.7)
  })
})
