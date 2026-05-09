import { eq, desc, and } from 'drizzle-orm'
import { db, schema } from './client'
import { CURRENT_USER_ID } from '@/lib/auth/current-user'
import { slugify, uniquifySlug } from '@/lib/slug'

// MVP has no auth. All server-side reads/writes use this user_id and the
// service-role connection (bypassing RLS). Replace with real auth.uid()
// once login is in place.
export const DEMO_USER_ID = CURRENT_USER_ID  // re-export for backwards-compat with route.ts files

export async function listSubjects() {
  return db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.userId, DEMO_USER_ID))
    .orderBy(desc(schema.subjects.createdAt))
}

export async function createSubject(input: { name: string; description?: string | null }) {
  const base = slugify(input.name)
  const existing = await db.select({ slug: schema.subjects.slug }).from(schema.subjects)
  const slug = uniquifySlug(base, new Set(existing.map((r) => r.slug)))
  const [row] = await db
    .insert(schema.subjects)
    .values({
      userId: DEMO_USER_ID,
      name: input.name,
      description: input.description ?? null,
      slug,
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

export async function getSubjectBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(schema.subjects)
    .where(and(eq(schema.subjects.slug, slug), eq(schema.subjects.userId, DEMO_USER_ID)))
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
  displayName?: string | null
  interests?: string[]
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

// --- Nodes with progress ---

export async function listNodesWithProgress(subjectId: string) {
  const rows = await db
    .select({
      id: schema.nodes.id,
      pathId: schema.nodes.pathId,
      slug: schema.nodes.slug,
      title: schema.nodes.title,
      contentBrief: schema.nodes.contentBrief,
      progressStatus: schema.progress.status,
    })
    .from(schema.nodes)
    .innerJoin(schema.paths, eq(schema.paths.id, schema.nodes.pathId))
    .leftJoin(
      schema.progress,
      and(
        eq(schema.progress.nodeId, schema.nodes.id),
        eq(schema.progress.userId, CURRENT_USER_ID),
      ),
    )
    .where(eq(schema.nodes.subjectId, subjectId))
    .orderBy(schema.paths.orderIndex, schema.nodes.createdAt)

  return rows.map((r) => ({
    ...r,
    progressStatus: r.progressStatus ?? ('available' as const),
  }))
}

export interface NodeAssets {
  status: 'partial' | 'ready'
  lesson: { paragraphs: string[]; quiz: Array<{ question: string; options: string[] }> } | null
  image: { s3Key: string } | null
  audio: { s3Key: string; durationSec: number } | null
  podcast: { s3Key: string; durationSec: number } | null
  video: { s3Key: string; durationSec: number } | null
}

export async function getNodeAssets(nodeId: string): Promise<NodeAssets> {
  const rows = await db
    .select()
    .from(schema.nodeContent)
    .where(eq(schema.nodeContent.nodeId, nodeId))

  const byType = new Map(rows.filter((r) => r.status === 'ready').map((r) => [r.contentType, r]))

  const lessonRow = byType.get('lesson_text')
  const meta = (lessonRow?.generationMetadata as any) ?? null
  const lesson = meta
    ? {
        paragraphs: meta.paragraphs ?? [],
        quiz: (meta.quiz ?? []).map((q: any) => ({
          question: q.question,
          options: q.options,
          // correctIndex stripped on purpose
        })),
      }
    : null

  const fromKey = (k: string) => {
    const r = byType.get(k)
    return r?.contentUrl
      ? { s3Key: r.contentUrl, durationSec: (r.generationMetadata as any)?.durationSec ?? 0 }
      : null
  }
  const imageRow = byType.get('image')
  const image = imageRow?.contentUrl ? { s3Key: imageRow.contentUrl } : null
  const audio = fromKey('audio')
  const podcast = fromKey('podcast')
  const video = fromKey('video')

  // ready when lesson + image + audio all present (video/podcast optional for now)
  const status: 'partial' | 'ready' = lesson && image && audio ? 'ready' : 'partial'
  return { status, lesson, image, audio, podcast, video }
}

export async function gradeQuiz(nodeId: string, answers: number[]) {
  const [lessonRow] = await db
    .select()
    .from(schema.nodeContent)
    .where(and(eq(schema.nodeContent.nodeId, nodeId), eq(schema.nodeContent.contentType, 'lesson_text')))
    .limit(1)

  if (!lessonRow) throw new Error('lesson not generated yet')
  const quiz = (lessonRow.generationMetadata as any)?.quiz as Array<{ correctIndex: number }> | undefined
  if (!quiz || quiz.length === 0) throw new Error('no quiz in lesson metadata')

  const perQuestion = quiz.map((q, i) => ({
    correct: q.correctIndex,
    selected: answers[i] ?? -1,
  }))
  const correct = perQuestion.filter((p) => p.correct === p.selected).length
  const total = quiz.length
  const passed = correct / total >= 0.66

  if (passed) {
    await upsertNodeProgress(nodeId, 'mastered')
  }

  return { passed, score: { correct, total }, perQuestion }
}

export async function deleteFile(subjectId: string, fileId: string) {
  const [row] = await db
    .select()
    .from(schema.files)
    .where(
      and(
        eq(schema.files.id, fileId),
        eq(schema.files.subjectId, subjectId),
        eq(schema.files.userId, CURRENT_USER_ID),
      ),
    )
    .limit(1)
  if (!row) return null
  await db.delete(schema.files).where(eq(schema.files.id, fileId))
  return row // caller uses row.s3Key to delete from S3
}

export async function getNodeBySlug(subjectId: string, nodeSlug: string) {
  const [row] = await db
    .select()
    .from(schema.nodes)
    .where(and(eq(schema.nodes.subjectId, subjectId), eq(schema.nodes.slug, nodeSlug)))
    .limit(1)
  return row ?? null
}

export async function getStats() {
  const subjects = await listSubjects()
  let mastered = 0
  for (const s of subjects) {
    const summary = await summarizeProgressForSubject(s.id)
    if (summary.total > 0 && summary.percentMastered === 100) mastered += 1
  }
  return {
    streakDays: 24, // hardcoded MVP
    subjectsCompleted: mastered,
    totalSubjects: subjects.length,
    formatUsage: { text: 100 } as Record<string, number>,
  }
}
