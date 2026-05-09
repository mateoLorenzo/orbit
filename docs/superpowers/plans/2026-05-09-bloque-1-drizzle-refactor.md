# Bloque 1 — Drizzle Refactor (Lean) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot the in-memory Bloque 1 implementation to align with `main`'s Drizzle/Postgres stack. Drop our redundant materias/dataroom code (their `subjects`/`files` already cover that domain better), and re-implement only the two pieces that are genuinely new: **progress** and **profile**.

**Architecture:** Extend `lib/db/schema.ts` with two tables. Add Drizzle query helpers in `lib/db/queries.ts`. Add Next.js route handlers under `app/api/` following main's `NextResponse.json(...)` style. Mock the db client in tests with `vi.mock`.

**Tech Stack:** Next.js 16 · Drizzle ORM · Postgres · zod · Vitest (with `vi.mock`).

**Spec:** `docs/superpowers/specs/2026-05-09-bloque-1-crud-base-design.md` (original, partially superseded — see Decisions below).

---

## Decisions taken before planning

1. **Stack pivots from in-memory → Drizzle**, aligning with `main`.
2. **Drop materias/dataroom**: `subjects` and `files` on main already cover the domain.
3. **Drop nodos route**: rename to `/api/nodes/[id]/status` matching main's English naming.
4. **Drop our `errors.ts` (`ApiError` / `handleRoute`)**: route handlers use `NextResponse.json(...)` directly, matching `app/api/subjects/*`.
5. **Drop our service files** (`progress.service.ts`, `profile.service.ts`): main's pattern is "queries.ts is the service". Routes call queries directly.
6. **Tests with `vi.mock`** of the db client. No real DB required.
7. **Profile multi-user-ready**: use `userId` as PK (referencing `auth.users`) instead of literal `'singleton'`. For the no-auth MVP we use `DEMO_USER_ID` as the singleton key. Aligns with main's pattern.
8. **Progress.userId column**: same userId pattern, FK to `auth.users` like `subjects`/`files`.
9. **Progress.nodeId**: FK to `nodes(id)` cascade-delete (their schema has `nodes` already).

## File Structure

| Path | Responsibility |
|---|---|
| `lib/db/schema.ts` | **Modify**: add `progress` and `profile` tables + enums + types |
| `lib/db/queries.ts` | **Modify**: add `getProfile`, `updateProfile`, `upsertNodeProgress`, `listProgressForSubject`, `summarizeProgressForSubject` |
| `app/api/profile/route.ts` | **Replace**: GET + PATCH using NextResponse + queries |
| `app/api/subjects/[id]/progress/route.ts` | **New**: GET list |
| `app/api/subjects/[id]/progress/summary/route.ts` | **New**: GET summary |
| `app/api/nodes/[id]/status/route.ts` | **New**: PATCH upsert |
| `lib/db/__tests__/queries-progress.test.ts` | **New**: progress query tests with `vi.mock` |
| `lib/db/__tests__/queries-profile.test.ts` | **New**: profile query tests with `vi.mock` |
| `lib/server/__tests__/routes-profile.test.ts` | **Replace**: re-test the new profile route |
| `lib/server/__tests__/routes-progress.test.ts` | **Replace**: re-test the new progress routes |

### Files to delete

- `lib/server/errors.ts` + `lib/server/__tests__/errors.test.ts`
- `lib/server/schemas.ts` + `lib/server/__tests__/schemas.test.ts` (its types are absorbed by Drizzle inferred types)
- `lib/server/store.ts` + `lib/server/__tests__/store.test.ts`
- `lib/server/services/` (entire directory)
- `app/api/materias/` (entire directory — including `[id]/files/`, `[id]/progress/`, `[id]/progress/summary/`, `[id]/route.ts`, `route.ts`)
- `app/api/files/[id]/route.ts`
- `app/api/nodos/` (entire directory)

---

## Task 1: Add Drizzle tables for progress + profile

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add the `progress_status` enum + `progress` table**

In `lib/db/schema.ts`, after the existing `contentStatus` enum line, add:

```ts
export const progressStatus = pgEnum('progress_status', [
  'bloqueado',
  'disponible',
  'en_curso',
  'dominado',
])

export const formatoPreferido = pgEnum('formato_preferido', [
  'texto',
  'audio',
  'video',
  'visual',
  'podcast',
])
```

After the existing `nodeContent` table block, add:

```ts
export const progress = pgTable(
  'progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    status: progressStatus('status').notNull().default('disponible'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('progress_user_node_unique').on(t.userId, t.nodeId),
    index('idx_progress_user_status').on(t.userId, t.status),
    index('idx_progress_node').on(t.nodeId),
  ],
)

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  formatoPreferido: formatoPreferido('formato_preferido').notNull().default('texto'),
  horariosActivos: text('horarios_activos').array().notNull().default(sql`'{}'::text[]`),
  erroresRecurrentes: text('errores_recurrentes')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  friccionPromedio: integer('friccion_promedio').notNull().default(50), // 0..100, integer for simplicity
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

After the existing `type NodeContent` line at the bottom, add:

```ts
export type Progress = typeof progress.$inferSelect
export type NewProgress = typeof progress.$inferInsert
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
```

- [ ] **Step 2: Verify build / type-check**

Run:
```bash
pnpm exec tsc --noEmit
```
Expected: no new TS errors. Pre-existing warnings about `process.env.DATABASE_URL` are tolerated.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(db): add progress and profiles tables"
```

Note: we do NOT run `pnpm db:push` here. That requires `DATABASE_URL` and is the user's call.

---

## Task 2: Add Drizzle queries for progress + profile

**Files:**
- Modify: `lib/db/queries.ts`

- [ ] **Step 1: Append progress + profile queries to `lib/db/queries.ts`**

At the end of `lib/db/queries.ts`, append:

```ts
import { sql } from 'drizzle-orm'

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
  dominado: number
  enCurso: number
  disponible: number
  bloqueado: number
  percentDominado: number
}

export async function summarizeProgressForSubject(subjectId: string): Promise<ProgressSummary> {
  const rows = await listProgressForSubject(subjectId)
  const counts = {
    total: rows.length,
    dominado: rows.filter((r) => r.status === 'dominado').length,
    enCurso: rows.filter((r) => r.status === 'en_curso').length,
    disponible: rows.filter((r) => r.status === 'disponible').length,
    bloqueado: rows.filter((r) => r.status === 'bloqueado').length,
  }
  const percentDominado =
    counts.total === 0 ? 0 : Math.round((counts.dominado / counts.total) * 100)
  return { ...counts, percentDominado }
}

export async function upsertNodeProgress(
  nodeId: string,
  status: typeof schema.progressStatus.enumValues[number],
) {
  const completedAt = status === 'dominado' ? new Date() : null
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
  formatoPreferido?: typeof schema.formatoPreferido.enumValues[number]
  horariosActivos?: string[]
  erroresRecurrentes?: string[]
  friccionPromedio?: number
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
```

Important: the `import { sql }` at the top is needed for the schema defaults in Task 1 — verify that schema.ts already imports sql (it does).

- [ ] **Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```
Expected: no new TS errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db/queries.ts
git commit -m "feat(db): add progress and profile queries"
```

---

## Task 3: Tests for progress + profile queries (vi.mock)

**Files:**
- Create: `lib/db/__tests__/queries-progress.test.ts`
- Create: `lib/db/__tests__/queries-profile.test.ts`
- Modify: `vitest.config.ts` (expand include glob)

- [ ] **Step 1: Update vitest config to include lib/db tests**

In `vitest.config.ts`, change the `include` to:

```ts
    include: ['lib/server/**/*.test.ts', 'lib/db/**/*.test.ts'],
```

- [ ] **Step 2: Create `lib/db/__tests__/queries-progress.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the db client BEFORE importing the queries module under test.
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}

vi.mock('../client', () => ({
  db: mockDb,
  schema: {
    progress: { userId: 'progress.userId', nodeId: 'progress.nodeId', id: 'progress.id', status: 'progress.status', completedAt: 'progress.completedAt', updatedAt: 'progress.updatedAt' },
    nodes: { id: 'nodes.id', subjectId: 'nodes.subjectId' },
    progressStatus: { enumValues: ['bloqueado', 'disponible', 'en_curso', 'dominado'] },
  },
}))

import {
  listProgressForSubject,
  summarizeProgressForSubject,
  upsertNodeProgress,
} from '../queries'

describe('progress queries', () => {
  beforeEach(() => {
    mockDb.select.mockReset()
    mockDb.insert.mockReset()
    mockDb.update.mockReset()
  })

  it('listProgressForSubject builds a join + filter query and returns rows', async () => {
    const rows = [{ id: 'p1', nodeId: 'n1', status: 'dominado', completedAt: new Date(), updatedAt: new Date() }]
    const where = vi.fn().mockResolvedValue(rows)
    const innerJoin = vi.fn(() => ({ where }))
    const from = vi.fn(() => ({ innerJoin }))
    mockDb.select.mockReturnValue({ from })

    const out = await listProgressForSubject('subject-1')
    expect(out).toEqual(rows)
    expect(mockDb.select).toHaveBeenCalled()
    expect(from).toHaveBeenCalled()
    expect(innerJoin).toHaveBeenCalled()
  })

  it('summarizeProgressForSubject computes counts and percent', async () => {
    const rows = [
      { id: '1', nodeId: 'n1', status: 'dominado', completedAt: null, updatedAt: new Date() },
      { id: '2', nodeId: 'n2', status: 'dominado', completedAt: null, updatedAt: new Date() },
      { id: '3', nodeId: 'n3', status: 'en_curso', completedAt: null, updatedAt: new Date() },
      { id: '4', nodeId: 'n4', status: 'disponible', completedAt: null, updatedAt: new Date() },
    ]
    const where = vi.fn().mockResolvedValue(rows)
    const innerJoin = vi.fn(() => ({ where }))
    const from = vi.fn(() => ({ innerJoin }))
    mockDb.select.mockReturnValue({ from })

    const summary = await summarizeProgressForSubject('subject-1')
    expect(summary).toEqual({
      total: 4,
      dominado: 2,
      enCurso: 1,
      disponible: 1,
      bloqueado: 0,
      percentDominado: 50,
    })
  })

  it('summarizeProgressForSubject returns 0% when no rows', async () => {
    const where = vi.fn().mockResolvedValue([])
    const innerJoin = vi.fn(() => ({ where }))
    const from = vi.fn(() => ({ innerJoin }))
    mockDb.select.mockReturnValue({ from })

    const summary = await summarizeProgressForSubject('subject-1')
    expect(summary.total).toBe(0)
    expect(summary.percentDominado).toBe(0)
  })

  it("upsertNodeProgress sets completedAt when status is 'dominado'", async () => {
    const returning = vi.fn().mockResolvedValue([
      { id: 'p1', userId: 'demo', nodeId: 'n1', status: 'dominado', completedAt: new Date(), updatedAt: new Date() },
    ])
    const onConflictDoUpdate = vi.fn(() => ({ returning }))
    const values = vi.fn(() => ({ onConflictDoUpdate }))
    mockDb.insert.mockReturnValue({ values })

    const out = await upsertNodeProgress('n1', 'dominado')
    expect(out.status).toBe('dominado')
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'n1', status: 'dominado', completedAt: expect.any(Date) }),
    )
  })

  it("upsertNodeProgress nulls completedAt when leaving 'dominado'", async () => {
    const returning = vi.fn().mockResolvedValue([
      { id: 'p1', userId: 'demo', nodeId: 'n1', status: 'en_curso', completedAt: null, updatedAt: new Date() },
    ])
    const onConflictDoUpdate = vi.fn(() => ({ returning }))
    const values = vi.fn(() => ({ onConflictDoUpdate }))
    mockDb.insert.mockReturnValue({ values })

    await upsertNodeProgress('n1', 'en_curso')
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'n1', status: 'en_curso', completedAt: null }),
    )
  })
})
```

- [ ] **Step 3: Create `lib/db/__tests__/queries-profile.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}

vi.mock('../client', () => ({
  db: mockDb,
  schema: {
    profiles: { userId: 'profiles.userId' },
    formatoPreferido: { enumValues: ['texto', 'audio', 'video', 'visual', 'podcast'] },
  },
}))

import { getProfile, updateProfile } from '../queries'

const seed = {
  userId: 'demo',
  formatoPreferido: 'texto',
  horariosActivos: [],
  erroresRecurrentes: [],
  friccionPromedio: 50,
  updatedAt: new Date(),
}

describe('profile queries', () => {
  beforeEach(() => {
    mockDb.select.mockReset()
    mockDb.insert.mockReset()
    mockDb.update.mockReset()
  })

  it('getProfile returns the existing row', async () => {
    const limit = vi.fn().mockResolvedValue([seed])
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    mockDb.select.mockReturnValue({ from })

    const out = await getProfile()
    expect(out).toEqual(seed)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('getProfile auto-seeds when missing', async () => {
    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    mockDb.select.mockReturnValue({ from })

    const returning = vi.fn().mockResolvedValue([seed])
    const values = vi.fn(() => ({ returning }))
    mockDb.insert.mockReturnValue({ values })

    const out = await getProfile()
    expect(out).toEqual(seed)
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('updateProfile merges fields and returns the updated row', async () => {
    // first call: getProfile path returns existing
    const limit = vi.fn().mockResolvedValue([seed])
    const where1 = vi.fn(() => ({ limit }))
    const from1 = vi.fn(() => ({ where: where1 }))
    mockDb.select.mockReturnValue({ from: from1 })

    const returning = vi.fn().mockResolvedValue([{ ...seed, formatoPreferido: 'audio' }])
    const where2 = vi.fn(() => ({ returning }))
    const set = vi.fn(() => ({ where: where2 }))
    mockDb.update.mockReturnValue({ set })

    const out = await updateProfile({ formatoPreferido: 'audio' })
    expect(out.formatoPreferido).toBe('audio')
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ formatoPreferido: 'audio', updatedAt: expect.any(Date) }),
    )
  })
})
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm test
```
Expected: PASS — old 68 tests + 5 new progress query tests + 3 new profile query tests = 76 total. (Old tests still pass because we haven't deleted them yet.)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts lib/db/__tests__
git commit -m "test(db): add progress and profile query tests with vi.mock"
```

---

## Task 4: Add new route handlers (NextResponse style)

**Files:**
- Replace: `app/api/profile/route.ts`
- Create: `app/api/subjects/[id]/progress/route.ts`
- Create: `app/api/subjects/[id]/progress/summary/route.ts`
- Create: `app/api/nodes/[id]/status/route.ts`

- [ ] **Step 1: Replace `app/api/profile/route.ts`**

Overwrite with:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProfile, updateProfile } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

const UpdateProfileSchema = z
  .object({
    formatoPreferido: z.enum(['texto', 'audio', 'video', 'visual', 'podcast']).optional(),
    horariosActivos: z.array(z.string()).optional(),
    erroresRecurrentes: z.array(z.string()).optional(),
    friccionPromedio: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .partial()

export async function GET() {
  const profile = await getProfile()
  return NextResponse.json({ profile })
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const profile = await updateProfile(parsed.data)
  return NextResponse.json({ profile })
}
```

- [ ] **Step 2: Create `app/api/subjects/[id]/progress/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getSubject, listProgressForSubject } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const subject = await getSubject(id)
  if (!subject) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const progress = await listProgressForSubject(id)
  return NextResponse.json({ progress })
}
```

- [ ] **Step 3: Create `app/api/subjects/[id]/progress/summary/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getSubject, summarizeProgressForSubject } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const subject = await getSubject(id)
  if (!subject) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const summary = await summarizeProgressForSubject(id)
  return NextResponse.json({ summary })
}
```

- [ ] **Step 4: Create `app/api/nodes/[id]/status/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertNodeProgress } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

const PatchStatusSchema = z.object({
  status: z.enum(['bloqueado', 'disponible', 'en_curso', 'dominado']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = PatchStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const progress = await upsertNodeProgress(id, parsed.data.status)
  return NextResponse.json({ progress })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/profile/route.ts app/api/subjects/\[id\]/progress app/api/nodes
git commit -m "feat(api): add Drizzle-backed profile, progress and node status routes"
```

---

## Task 5: Route tests with vi.mock

**Files:**
- Replace: `lib/server/__tests__/routes-profile.test.ts`
- Replace: `lib/server/__tests__/routes-progress.test.ts`

- [ ] **Step 1: Overwrite `lib/server/__tests__/routes-profile.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetProfile = vi.fn()
const mockUpdateProfile = vi.fn()

vi.mock('@/lib/db/queries', () => ({
  getProfile: mockGetProfile,
  updateProfile: mockUpdateProfile,
}))

import { GET, PATCH } from '@/app/api/profile/route'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const seed = {
  userId: 'demo',
  formatoPreferido: 'texto',
  horariosActivos: [],
  erroresRecurrentes: [],
  friccionPromedio: 50,
  updatedAt: new Date().toISOString(),
}

describe('Profile routes (Drizzle)', () => {
  beforeEach(() => {
    mockGetProfile.mockReset()
    mockUpdateProfile.mockReset()
  })

  it('GET /api/profile returns the singleton wrapped', async () => {
    mockGetProfile.mockResolvedValue(seed)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.userId).toBe('demo')
  })

  it('PATCH /api/profile merges fields and returns 200', async () => {
    mockUpdateProfile.mockResolvedValue({ ...seed, formatoPreferido: 'audio' })
    const res = await PATCH(jsonRequest('PATCH', { formatoPreferido: 'audio' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.formatoPreferido).toBe('audio')
    expect(mockUpdateProfile).toHaveBeenCalledWith({ formatoPreferido: 'audio' })
  })

  it('PATCH /api/profile returns 400 on invalid formato', async () => {
    const res = await PATCH(jsonRequest('PATCH', { formatoPreferido: 'invalid' }))
    expect(res.status).toBe(400)
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('PATCH /api/profile returns 400 on extra fields (strict)', async () => {
    const res = await PATCH(jsonRequest('PATCH', { id: 'hacked' }))
    expect(res.status).toBe(400)
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Overwrite `lib/server/__tests__/routes-progress.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetSubject = vi.fn()
const mockListProgress = vi.fn()
const mockSummarize = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/db/queries', () => ({
  getSubject: mockGetSubject,
  listProgressForSubject: mockListProgress,
  summarizeProgressForSubject: mockSummarize,
  upsertNodeProgress: mockUpsert,
}))

import { GET as listProgress } from '@/app/api/subjects/[id]/progress/route'
import { GET as getSummary } from '@/app/api/subjects/[id]/progress/summary/route'
import { PATCH as patchStatus } from '@/app/api/nodes/[id]/status/route'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Progress routes (Drizzle)', () => {
  beforeEach(() => {
    mockGetSubject.mockReset()
    mockListProgress.mockReset()
    mockSummarize.mockReset()
    mockUpsert.mockReset()
  })

  it('GET /subjects/:id/progress 404 when subject missing', async () => {
    mockGetSubject.mockResolvedValue(null)
    const res = await listProgress(jsonRequest('GET'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('GET /subjects/:id/progress returns wrapped array', async () => {
    mockGetSubject.mockResolvedValue({ id: 's1' })
    mockListProgress.mockResolvedValue([
      { id: 'p1', nodeId: 'n1', status: 'dominado', completedAt: null, updatedAt: new Date().toISOString() },
    ])
    const res = await listProgress(jsonRequest('GET'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.progress).toHaveLength(1)
  })

  it('GET /subjects/:id/progress/summary 404 when subject missing', async () => {
    mockGetSubject.mockResolvedValue(null)
    const res = await getSummary(jsonRequest('GET'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('GET /subjects/:id/progress/summary returns summary', async () => {
    mockGetSubject.mockResolvedValue({ id: 's1' })
    mockSummarize.mockResolvedValue({
      total: 4, dominado: 2, enCurso: 1, disponible: 1, bloqueado: 0, percentDominado: 50,
    })
    const res = await getSummary(jsonRequest('GET'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.percentDominado).toBe(50)
  })

  it('PATCH /nodes/:id/status creates Progress', async () => {
    mockUpsert.mockResolvedValue({
      id: 'p1', nodeId: 'n1', status: 'dominado', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    const res = await patchStatus(jsonRequest('PATCH', { status: 'dominado' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.progress.status).toBe('dominado')
    expect(mockUpsert).toHaveBeenCalledWith('n1', 'dominado')
  })

  it('PATCH /nodes/:id/status returns 400 on invalid status', async () => {
    const res = await patchStatus(jsonRequest('PATCH', { status: 'foo' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    expect(res.status).toBe(400)
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests, verify pass**

```bash
pnpm test
```
Expected: PASS for all the new routes (the OLD route tests will FAIL because they import paths that we're about to delete; that's expected, we'll clean them up in Task 6).

- [ ] **Step 4: Commit**

```bash
git add lib/server/__tests__/routes-profile.test.ts lib/server/__tests__/routes-progress.test.ts
git commit -m "test(api): replace route tests with vi.mock'd Drizzle queries"
```

---

## Task 6: Delete redundant code

**Files to delete:**
- `lib/server/errors.ts` + `lib/server/__tests__/errors.test.ts`
- `lib/server/schemas.ts` + `lib/server/__tests__/schemas.test.ts`
- `lib/server/store.ts` + `lib/server/__tests__/store.test.ts`
- `lib/server/services/` (entire directory)
- `lib/server/__tests__/routes-materias.test.ts`
- `lib/server/__tests__/routes-dataroom.test.ts`
- `app/api/materias/` (entire directory)
- `app/api/files/` (entire directory)
- `app/api/nodos/` (entire directory)

- [ ] **Step 1: Delete files**

Run:
```bash
rm -f lib/server/errors.ts lib/server/schemas.ts lib/server/store.ts
rm -f lib/server/__tests__/errors.test.ts lib/server/__tests__/schemas.test.ts lib/server/__tests__/store.test.ts
rm -f lib/server/__tests__/routes-materias.test.ts lib/server/__tests__/routes-dataroom.test.ts
rm -rf lib/server/services
rm -rf app/api/materias app/api/files app/api/nodos
```

- [ ] **Step 2: Confirm `lib/server/__tests__/` only has the two route test files**

Run:
```bash
ls lib/server/__tests__/
```
Expected output:
```
routes-profile.test.ts
routes-progress.test.ts
```

If `lib/server/` is otherwise empty (no other files), it can stay as a directory containing only `__tests__/`. That's fine.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```
Expected: PASS — only Drizzle tests remain (5 progress queries + 3 profile queries + 4 profile routes + 6 progress routes = 18 tests across 4 files).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove in-memory bloque 1 services and routes (superseded by Drizzle)"
```

---

## Task 7: Final smoke + cleanup

**Files:** none (verification only)

- [ ] **Step 1: Type check**

```bash
pnpm exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```
Expected: 18 tests pass across 4 files.

- [ ] **Step 3: Confirm route tree**

```bash
find app/api -name 'route.ts' | sort
```
Expected output:
```
app/api/nodes/[id]/status/route.ts
app/api/profile/route.ts
app/api/subjects/[id]/files/route.ts
app/api/subjects/[id]/progress/route.ts
app/api/subjects/[id]/progress/summary/route.ts
app/api/subjects/[id]/route.ts
app/api/subjects/route.ts
```

- [ ] **Step 4: Final commit (only if verification finds anything to fix)**

Skip if everything is clean.

---

## Self-Review

**Spec coverage** (relative to original `2026-05-09-bloque-1-crud-base-design.md`):
- ✅ ProgressService → Task 1 + 2 + 4 + 5
- ✅ UserProfileService → Task 1 + 2 + 4 + 5
- ❌ MateriasService → intentionally dropped (superseded by `subjects` on main)
- ❌ DataRoomService → intentionally dropped (superseded by `files`/S3 pipeline on main)

**Placeholder scan:** clean.

**Type consistency:** function names match across tasks (`getProfile`, `updateProfile`, `listProgressForSubject`, `summarizeProgressForSubject`, `upsertNodeProgress`). `ProgressSummary` interface defined once in `queries.ts` and consumed in route + tests.

**Naming changes:** all routes use English to match main: `subjects`, `nodes`. `friccionPromedio` is integer 0..100 (not float 0..1) for simpler enum/check constraints.
