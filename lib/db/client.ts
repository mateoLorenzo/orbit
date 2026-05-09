import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

let cached: Db | null = null

function init(): Db {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const client = postgres(url, { prepare: false, max: 5 })
  cached = drizzle(client, { schema })
  return cached
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(init(), prop, receiver)
  },
}) as Db

export { schema }
