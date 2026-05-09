import { db, schema } from '../lib/db/client'

async function main() {
  const subjectsCount = await db.select().from(schema.subjects).limit(1)
  console.log(`subjects rows fetched: ${subjectsCount.length}`)

  const filesCount = await db.select().from(schema.files).limit(1)
  console.log(`files rows fetched: ${filesCount.length}`)

  const chunksCount = await db.select().from(schema.fileChunks).limit(1)
  console.log(`file_chunks rows fetched: ${chunksCount.length}`)

  console.log('OK — Drizzle schema is consistent with the deployed DB.')
  process.exit(0)
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err)
  process.exit(1)
})
