import postgres from 'postgres'
import { slugify, uniquifySlug } from '../lib/slug'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set')

const client = postgres(url, { prepare: false, max: 1 })

async function main() {
  await client`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS slug text`
  await client`ALTER TABLE nodes ADD COLUMN IF NOT EXISTS slug text`

  const subjects = await client<{ id: string; name: string }[]>`
    SELECT id, name FROM subjects WHERE slug IS NULL
  `
  const usedSubjectSlugs = new Set<string>(
    (await client<{ slug: string }[]>`
      SELECT slug FROM subjects WHERE slug IS NOT NULL
    `).map((r) => r.slug),
  )
  for (const s of subjects) {
    const base = slugify(s.name)
    const slug = uniquifySlug(base, usedSubjectSlugs)
    usedSubjectSlugs.add(slug)
    await client`UPDATE subjects SET slug = ${slug} WHERE id = ${s.id}`
    console.log(`subject ${s.id}: ${slug}`)
  }
  console.log(`backfilled ${subjects.length} subjects`)

  const nodes = await client<{ id: string; subject_id: string; title: string }[]>`
    SELECT id, subject_id, title
    FROM nodes
    WHERE slug IS NULL
    ORDER BY subject_id, created_at
  `
  const usedNodeSlugsBySubject = new Map<string, Set<string>>()
  for (const n of nodes) {
    let used = usedNodeSlugsBySubject.get(n.subject_id)
    if (!used) {
      const existing = await client<{ slug: string }[]>`
        SELECT slug FROM nodes WHERE subject_id = ${n.subject_id} AND slug IS NOT NULL
      `
      used = new Set(existing.map((r) => r.slug))
      usedNodeSlugsBySubject.set(n.subject_id, used)
    }
    const base = slugify(n.title)
    const slug = uniquifySlug(base, used)
    used.add(slug)
    await client`UPDATE nodes SET slug = ${slug} WHERE id = ${n.id}`
  }
  console.log(`backfilled ${nodes.length} nodes`)

  await client`ALTER TABLE subjects ALTER COLUMN slug SET NOT NULL`
  await client`
    ALTER TABLE subjects
    DROP CONSTRAINT IF EXISTS subjects_slug_unique,
    ADD CONSTRAINT subjects_slug_unique UNIQUE (slug)
  `
  await client`ALTER TABLE nodes ALTER COLUMN slug SET NOT NULL`
  await client`
    ALTER TABLE nodes
    DROP CONSTRAINT IF EXISTS nodes_slug_per_subject_unique,
    ADD CONSTRAINT nodes_slug_per_subject_unique UNIQUE (subject_id, slug)
  `
  console.log('constraints applied')

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
