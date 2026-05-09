import { eq, desc, and } from 'drizzle-orm'
import { db, schema } from './client'

// MVP has no auth. All server-side reads/writes use this user_id and the
// service-role connection (bypassing RLS). Replace with real auth.uid()
// once login is in place.
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

export async function listSubjects() {
  return db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.userId, DEMO_USER_ID))
    .orderBy(desc(schema.subjects.createdAt))
}

export async function createSubject(input: { name: string; description?: string | null }) {
  const [row] = await db
    .insert(schema.subjects)
    .values({
      userId: DEMO_USER_ID,
      name: input.name,
      description: input.description ?? null,
    })
    .returning()
  return row
}

export async function getSubject(id: string) {
  const [row] = await db
    .select()
    .from(schema.subjects)
    .where(and(eq(schema.subjects.id, id), eq(schema.subjects.userId, DEMO_USER_ID)))
    .limit(1)
  return row ?? null
}

export async function listFilesForSubject(subjectId: string) {
  return db
    .select()
    .from(schema.files)
    .where(and(eq(schema.files.subjectId, subjectId), eq(schema.files.userId, DEMO_USER_ID)))
    .orderBy(desc(schema.files.createdAt))
}

export async function insertPendingFile(input: {
  subjectId: string
  s3Key: string
  originalFilename: string
  mimeType: string
  fileType: typeof schema.fileType.enumValues[number]
  sizeBytes: number
}) {
  const [row] = await db
    .insert(schema.files)
    .values({
      subjectId: input.subjectId,
      userId: DEMO_USER_ID,
      s3Key: input.s3Key,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      fileType: input.fileType,
      sizeBytes: input.sizeBytes,
      status: 'pending',
    })
    .returning()
  return row
}
