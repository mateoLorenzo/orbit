export class ApiError extends Error {
  readonly name = 'ApiError'
  constructor(message: string, public status: number, public body: unknown) {
    super(message)
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(`${res.status} ${path}`, res.status, body)
  }
  return res.json()
}
