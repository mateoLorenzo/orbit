import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../lib/db/client'
import { presignUpload } from '../lib/aws/s3'
import { DEMO_USER_ID } from '../lib/db/queries'

const SUBJECT_SLUG = process.argv[2]
const PDF_PATH = process.argv[3]

async function main() {
  if (!SUBJECT_SLUG || !PDF_PATH) {
    console.error('Usage: pnpm upload:file <subject-slug> <path-to-pdf>')
    process.exit(2)
  }

  const [subject] = await db
    .select()
    .from(schema.subjects)
    .where(and(eq(schema.subjects.slug, SUBJECT_SLUG), eq(schema.subjects.userId, DEMO_USER_ID)))
    .limit(1)

  if (!subject) {
    console.error(`Subject with slug "${SUBJECT_SLUG}" not found for demo user.`)
    process.exit(1)
  }
  console.log(`✓ found subject ${subject.id} (${subject.name})`)

  const pdfBytes = await fs.readFile(PDF_PATH)
  const filename = path.basename(PDF_PATH)
  console.log(`✓ loaded ${filename} (${pdfBytes.length} bytes)`)

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  const s3Key = `${DEMO_USER_ID}/${subject.id}/${randomUUID()}-${safeFilename}`
  const uploadUrl = await presignUpload({ key: s3Key, contentType: 'application/pdf' })

  const [fileRow] = await db
    .insert(schema.files)
    .values({
      subjectId: subject.id,
      userId: DEMO_USER_ID,
      s3Key,
      originalFilename: filename,
      mimeType: 'application/pdf',
      fileType: 'pdf',
      sizeBytes: pdfBytes.length,
      status: 'pending',
    })
    .returning()
  console.log(`✓ inserted file row ${fileRow.id} (status=pending)`)

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: new Uint8Array(pdfBytes),
  })
  if (!uploadRes.ok) {
    console.error(`✗ S3 PUT failed: ${uploadRes.status} ${uploadRes.statusText}`)
    process.exit(1)
  }
  console.log(`✓ uploaded to s3://.../${s3Key}`)
  console.log('')
  console.log(`Done. The file will appear in the Documentación tab for "${subject.name}".`)
  console.log(`Subject URL: /subjects/${subject.slug}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
