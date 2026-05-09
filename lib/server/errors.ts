import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RouteHandler<Args extends unknown[]> = (...args: Args) => Promise<Response>

export function handleRoute<Args extends unknown[]>(fn: RouteHandler<Args>): RouteHandler<Args> {
  return async (...args: Args) => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof ApiError) {
        return Response.json({ error: err.code, message: err.message }, { status: err.status })
      }
      if (err instanceof ZodError) {
        return Response.json({ error: 'validation', issues: err.issues }, { status: 400 })
      }
      console.error('Unhandled route error:', err)
      return Response.json(
        { error: 'internal', message: 'Internal server error' },
        { status: 500 },
      )
    }
  }
}
