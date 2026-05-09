import { describe, expect, it } from 'vitest'
import { ApiError, handleRoute } from '../errors'
import { z } from 'zod'

describe('ApiError', () => {
  it('preserves status, code and message', () => {
    const err = new ApiError(404, 'not_found', 'Materia not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe('not_found')
    expect(err.message).toBe('Materia not found')
  })
})

describe('handleRoute', () => {
  it('returns the handler response on success', async () => {
    const handler = handleRoute(async () => Response.json({ ok: true }))
    const res = await handler()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('maps ApiError to its status and shape', async () => {
    const handler = handleRoute(async () => {
      throw new ApiError(404, 'not_found', 'Materia not found')
    })
    const res = await handler()
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found', message: 'Materia not found' })
  })

  it('maps ZodError to 400 validation', async () => {
    const handler = handleRoute(async () => {
      z.object({ nombre: z.string().min(1) }).parse({ nombre: '' })
      return Response.json({})
    })
    const res = await handler()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('validation')
    expect(Array.isArray(body.issues)).toBe(true)
  })

  it('maps unknown errors to 500', async () => {
    const handler = handleRoute(async () => {
      throw new Error('boom')
    })
    const res = await handler()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'internal', message: 'Internal server error' })
  })
})
