import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '../lib/db/client'
import { presignUpload } from '../lib/aws/s3'
import { DEMO_USER_ID } from '../lib/db/queries'

const PDF_PATH = process.argv[2]
const TIMEOUT_MS = 180_000

async function main() {
  if (!PDF_PATH) {
    console.error('Usage: pnpm smoke:e2e <path-to-pdf>')
    process.exit(2)
  }
  const pdfBytes = await fs.readFile(PDF_PATH)
  console.log(`Loaded PDF: ${PDF_PATH} (${pdfBytes.length} bytes)`)

  // 1. Create subject
  const [subject] = await db
    .insert(schema.subjects)
    .values({
      userId: DEMO_USER_ID,
      name: `E2E ${new Date().toISOString()}`,
      description: 'smoke test',
    })
    .returning()
  console.log(`✓ created subject ${subject.id}`)

  // 2. Build s3 key, presign upload, insert pending file row
  const filename = path.basename(PDF_PATH)
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

  // 3. PUT to S3
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: new Uint8Array(pdfBytes),
  })
  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`upload failed: ${uploadRes.status} ${err}`)
  }
  console.log(`✓ uploaded to s3://.../${s3Key}`)

  // 4. Poll for status
  const start = Date.now()
  let lastStatus = 'pending'
  while (Date.now() - start < TIMEOUT_MS) {
    const [row] = await db
      .select()
      .from(schema.files)
      .where(eq(schema.files.id, fileRow.id))
      .limit(1)
    if (!row) throw new Error('file row vanished')
    const elapsed = Math.floor((Date.now() - start) / 1000)
    if (row.status !== lastStatus) {
      console.log(`  [${elapsed}s] status: ${lastStatus} → ${row.status}`)
      lastStatus = row.status
    }
    if (row.status === 'processed') {
      const chunks = await db
        .select()
        .from(schema.fileChunks)
        .where(eq(schema.fileChunks.fileId, fileRow.id))
      console.log(`✓ SUCCESS: ${chunks.length} chunks inserted`)
      const sample = chunks[0]
      if (sample?.embedding) {
        const v = sample.embedding as number[]
        console.log(`  sample embedding dim=${v.length}, first 3: [${v.slice(0, 3).map((n) => n.toFixed(4)).join(', ')}, ...]`)
      }
      console.log(`  subject_id=${subject.id}, file_id=${fileRow.id}`)
      process.exit(0)
    }
    if (row.status === 'failed') {
      console.error(`✗ FAILED: ${row.errorMessage}`)
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  console.error(`✗ TIMEOUT after ${TIMEOUT_MS / 1000}s; last status: ${lastStatus}`)
  process.exit(1)
}

main().catch((err) => {
  console.error('SMOKE E2E FAILED:', err)
  process.exit(1)
})
