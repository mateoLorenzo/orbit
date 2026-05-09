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

// --- Progress ---

export async function listProgressForSubject(subjectId: string) {
  return db
    .select({
      id: schema.progress.id,
      nodeId: schema.progress.nodeId,
      status: schema.progress.status,
      completedAt: schema.progress.completedAt,
      updatedAt: schema.progress.updatedAt,
    })
    .from(schema.progress)
    .innerJoin(schema.nodes, eq(schema.nodes.id, schema.progress.nodeId))
    .where(
      and(
        eq(schema.progress.userId, DEMO_USER_ID),
        eq(schema.nodes.subjectId, subjectId),
      ),
    )
}

export interface ProgressSummary {
  total: number
  mastered: number
  inProgress: number
  available: number
  locked: number
  percentMastered: number
}

export async function summarizeProgressForSubject(subjectId: string): Promise<ProgressSummary> {
  const rows = await listProgressForSubject(subjectId)
  const counts = {
    total: rows.length,
    mastered: rows.filter((r) => r.status === 'mastered').length,
    inProgress: rows.filter((r) => r.status === 'in_progress').length,
    available: rows.filter((r) => r.status === 'available').length,
    locked: rows.filter((r) => r.status === 'locked').length,
  }
  const percentMastered =
    counts.total === 0 ? 0 : Math.round((counts.mastered / counts.total) * 100)
  return { ...counts, percentMastered }
}

export async function upsertNodeProgress(
  nodeId: string,
  status: typeof schema.progressStatus.enumValues[number],
) {
  const completedAt = status === 'mastered' ? new Date() : null
  const [row] = await db
    .insert(schema.progress)
    .values({
      userId: DEMO_USER_ID,
      nodeId,
      status,
      completedAt,
    })
    .onConflictDoUpdate({
      target: [schema.progress.userId, schema.progress.nodeId],
      set: {
        status,
        completedAt,
        updatedAt: new Date(),
      },
    })
    .returning()
  return row
}

// --- Profile ---

export async function getProfile() {
  const [row] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, DEMO_USER_ID))
    .limit(1)
  if (row) return row

  // Auto-seed the singleton on first read.
  const [seed] = await db
    .insert(schema.profiles)
    .values({ userId: DEMO_USER_ID })
    .returning()
  return seed
}

export async function updateProfile(input: {
  preferredFormat?: typeof schema.preferredFormat.enumValues[number]
  activeHours?: string[]
  recurringMistakes?: string[]
  averageFriction?: number
}) {
  // Ensure singleton exists
  await getProfile()
  const [row] = await db
    .update(schema.profiles)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.profiles.userId, DEMO_USER_ID))
    .returning()
  return row
}
