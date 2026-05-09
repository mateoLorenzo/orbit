import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, api } from '../client'

describe('api client', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => { globalThis.fetch = vi.fn() })
  afterEach(() => { globalThis.fetch = originalFetch })

  it('returns parsed JSON on 2xx', async () => {
    ;(globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'world' }),
    })
    const result = await api<{ hello: string }>('/api/test')
    expect(result).toEqual({ hello: 'world' })
  })

  it('throws ApiError with status + body on 4xx', async () => {
    ;(globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    })
    await expect(api('/api/test')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      body: { error: 'not found' },
    })
  })

  it('passes init options to fetch', async () => {
    ;(globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) })
    await api('/api/test', { method: 'POST', body: JSON.stringify({ a: 1 }) })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }))
  })
})
