import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { Resource } from 'sst'
import * as schema from '../../lib/db/schema'

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (cachedDb) return cachedDb
  const url = Resource.DatabaseUrl.value
  if (!url) throw new Error('DatabaseUrl secret is not set')
  const client = postgres(url, {
    prepare: false,
    max: 1, // each lambda invocation reuses the cached connection across warm invocations
    idle_timeout: 20,
  })
  cachedDb = drizzle(client, { schema })
  return cachedDb
}

export { schema }
