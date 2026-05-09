# Plan 1 — Foundation + wiring básico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el `AppContext` mock por un stack de TanStack Query que consuma los endpoints reales, agregar los endpoints backend faltantes para Plan 2-5, y dejar funcionando end-to-end el flujo: crear materia → subir/borrar PDFs → ver el procesamiento real reflejado en el UI.

**Architecture:** Frontend usa hooks de react-query que envuelven funciones de `lib/api/*`. Cada hook tiene su queryKey en `lib/query/keys.ts` y comparte un `QueryClient` singleton. Backend agrega 5 endpoints nuevos (`GET /nodes`, `GET /assets`, `POST /quiz`, `DELETE /files/[id]`, `GET /profile/stats`) que serán consumidos por los próximos planes. AppContext sigue existiendo hasta el final de Plan 5 para no romper componentes en transición.

**Tech Stack:** Next.js 14 app router · TanStack Query v5 · Drizzle ORM · Supabase Postgres · Vitest · Zod

---

## File Structure

**Crear:**
- `lib/auth/current-user.ts` — single source of truth para el demo user UUID
- `lib/api/client.ts` — fetch wrapper + ApiError
- `lib/api/subjects.ts` — listSubjects, getSubject, createSubject
- `lib/api/files.ts` — listFiles, requestUpload, putToS3, deleteFile
- `lib/api/profile.ts` — getProfile, updateProfile, getStats
- `lib/query/client.ts` — QueryClient singleton
- `lib/query/keys.ts` — query key factory
- `lib/query/provider.tsx` — `'use client'` provider wrapper
- `lib/hooks/use-subjects.ts` — useSubjects, useCreateSubject
- `lib/hooks/use-subject.ts` — useSubject
- `lib/hooks/use-files.ts` — useFiles, useUploadFile, useDeleteFile
- `lib/hooks/use-profile.ts` — useProfile, useUpdateProfile, useStats
- `lib/domain/adapters.ts` — mapSubjectRow, mapFileRow → UI types
- `app/api/subjects/[id]/nodes/route.ts` — GET nodes con progress
- `app/api/subjects/[id]/files/[fileId]/route.ts` — DELETE file
- `app/api/nodes/[id]/assets/route.ts` — GET node assets (skeleton, retorna shape vacío)
- `app/api/nodes/[id]/quiz/route.ts` — POST quiz (skeleton, retorna shape válido)
- `app/api/profile/stats/route.ts` — GET stats
- `scripts/iam/orbit-app-policy.json` — IAM policy
- Migration drizzle: `drizzle/000X_profile_extended.sql` (añade displayName, interests)

**Modificar:**
- `lib/db/schema.ts` — añadir columnas `displayName` + `interests` a `profiles`
- `lib/db/queries.ts` — usar `CURRENT_USER_ID` en lugar de constante local; agregar `listNodesWithProgress`, `getNodeAssets`, `gradeQuiz`, `deleteFile`, `getStats`
- `lib/aws/s3.ts` — agregar `deleteObject` helper
- `app/api/profile/route.ts` — extender PATCH con displayName/interests
- `app/layout.tsx` — wrap con `<QueryProvider>` (mantiene `<AppProvider>` durante transición)
- `components/home-page.tsx` — `useApp()` → `useSubjects()`
- `components/add-subject-modal.tsx` — `useApp().addSubject` → `useCreateSubject()` + redirect
- `app/subjects/[id]/page.tsx` — `useApp()` → `useSubject(id)`
- `components/subject-detail-view.tsx` — Documentación tab usa `useFiles` + `useUploadFile` + `useDeleteFile`
- `package.json` — añadir `@tanstack/react-query`, `@tanstack/react-query-devtools`, script `seed:demo`
- `.env.local` — agregar `DEMO_USER_ID`

---

## Phase 0 — IAM user (0.5h)

### Task 1: Crear IAM user `orbit-app` con policy scopeada

**Files:**
- Create: `scripts/iam/orbit-app-policy.json`
- Modify: `.env.local` (replace AWS_* keys)

- [ ] **Step 1: Crear el archivo de policy**

Create `scripts/iam/orbit-app-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3OriginalsRW",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::platanus-hack-26-ar-team-25-dev-originalsbucketbucket-ofumfwtr/*"
    },
    {
      "Sid": "S3ArtifactsR",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::platanus-hack-26-ar-team-25-dev-artifactsbucketbucket-cwzewhnn/*"
    },
    {
      "Sid": "S3BucketLocation",
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation"],
      "Resource": [
        "arn:aws:s3:::platanus-hack-26-ar-team-25-dev-originalsbucketbucket-ofumfwtr",
        "arn:aws:s3:::platanus-hack-26-ar-team-25-dev-artifactsbucketbucket-cwzewhnn"
      ]
    }
  ]
}
```

- [ ] **Step 2: Crear el IAM user (necesita SSO creds activas)**

Run:
```bash
aws iam create-user --user-name orbit-app --profile personal
```
Expected: JSON with `UserName: orbit-app`. Si falla con `EntityAlreadyExists`, está OK, saltear este step.

- [ ] **Step 3: Adjuntar la policy inline**

Run:
```bash
aws iam put-user-policy --user-name orbit-app \
  --policy-name OrbitApp \
  --policy-document file://scripts/iam/orbit-app-policy.json \
  --profile personal
```
Expected: comando termina sin output (success silencioso).

- [ ] **Step 4: Generar access keys**

Run:
```bash
aws iam create-access-key --user-name orbit-app --profile personal
```
Expected: JSON con `AccessKeyId` (empieza con `AKIA`) y `SecretAccessKey`. **GUARDAR EN UN PASSWORD MANAGER ANTES DE SEGUIR.**

- [ ] **Step 5: Reemplazar las credenciales en `.env.local`**

En `.env.local`, reemplazar las líneas existentes de AWS por:
```bash
# --- AWS (long-lived IAM user orbit-app, scoped to dev resources) ---
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<paste AccessKeyId from step 4>
AWS_SECRET_ACCESS_KEY=<paste SecretAccessKey from step 4>
# DEMO_USER_ID is the singleton row in auth.users used by every server-side query
DEMO_USER_ID=00000000-0000-4000-8000-000000000001
```
Borrar `AWS_SESSION_TOKEN` y `AWS_CREDENTIAL_EXPIRATION` si quedaron.

- [ ] **Step 6: Verificar que `pnpm dev` arranca y puede presignar**

Run:
```bash
pnpm dev &
sleep 8
curl -s http://localhost:3000/api/subjects | jq '.subjects | length'
kill %1
```
Expected: número entero (puede ser 0 o más). Si tira "credentials" error, las keys están mal.

- [ ] **Step 7: Commit**

```bash
git add scripts/iam/orbit-app-policy.json
git commit -m "$(cat <<'EOF'
chore(iam): add scoped IAM policy for orbit-app user

Long-lived AWS credentials replace the temporary SSO session
that expires daily. Scoped to dev S3 buckets only; SQS access
stays with lambda execution roles.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
(`.env.local` no se commitea, está gitignored.)

---

## Phase 1 — React Query infra (0.5h)

### Task 2: Instalar dependencies + crear QueryClient + provider

**Files:**
- Modify: `package.json`
- Create: `lib/query/client.ts`
- Create: `lib/query/keys.ts`
- Create: `lib/query/provider.tsx`

- [ ] **Step 1: Instalar packages**

Run:
```bash
pnpm add @tanstack/react-query@^5
pnpm add -D @tanstack/react-query-devtools@^5
```
Expected: lockfile actualizado, packages aparecen en `package.json`.

- [ ] **Step 2: Crear el QueryClient singleton**

Create `lib/query/client.ts`:
```ts
import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
        gcTime: 5 * 60_000,
      },
    },
  })
}
```

- [ ] **Step 3: Crear el query key factory**

Create `lib/query/keys.ts`:
```ts
export const qk = {
  subjects: () => ['subjects'] as const,
  subject: (id: string) => ['subjects', id] as const,
  files: (subjectId: string) => ['subjects', subjectId, 'files'] as const,
  nodes: (subjectId: string) => ['subjects', subjectId, 'nodes'] as const,
  nodeAssets: (nodeId: string) => ['nodes', nodeId, 'assets'] as const,
  progressSummary: (subjectId: string) => ['subjects', subjectId, 'progress'] as const,
  profile: () => ['profile'] as const,
  stats: () => ['profile', 'stats'] as const,
}
```

- [ ] **Step 4: Crear el provider client component**

Create `lib/query/provider.tsx`:
```tsx
'use client'

import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { makeQueryClient } from './client'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient())
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 5: Wrap layout con QueryProvider**

Modify `app/layout.tsx`. Localizar `<AppProvider>{children}</AppProvider>` y reemplazar por:
```tsx
<QueryProvider>
  <AppProvider>{children}</AppProvider>
</QueryProvider>
```
Y al inicio del archivo, después del import de AppProvider, agregar:
```tsx
import { QueryProvider } from '@/lib/query/provider'
```
(Mantener `AppProvider` por ahora — se borra al final de Plan 5.)

- [ ] **Step 6: Verificar que el dev server sigue compilando**

Run:
```bash
pnpm dev &
sleep 8
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
kill %1
```
Expected: `200`.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml lib/query app/layout.tsx
git commit -m "$(cat <<'EOF'
feat(query): add TanStack Query provider, client, and key factory

Foundation for replacing AppContext with server-state hooks.
AppProvider stays mounted alongside QueryProvider during the
transition; will be removed in Plan 5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Crear el fetch wrapper tipado

**Files:**
- Create: `lib/api/client.ts`
- Test: `lib/api/__tests__/client.test.ts` (vitest)

- [ ] **Step 1: Actualizar vitest config para incluir lib/api/**

Modify `vitest.config.ts`. Cambiar `include` por:
```ts
include: ['lib/server/**/*.test.ts', 'lib/db/**/*.test.ts', 'lib/api/**/*.test.ts', 'lib/domain/**/*.test.ts'],
```

- [ ] **Step 2: Escribir el test failing**

Create `lib/api/__tests__/client.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, api } from '../client'

describe('api client', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => { globalThis.fetch = vi.fn() })
  afterEach(() => { globalThis.fetch = originalFetch })

  it('returns parsed JSON on 2xx', async () => {
    ;(globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'world' }),
    })
    const result = await api<{ hello: string }>('/api/test')
    expect(result).toEqual({ hello: 'world' })
  })

  it('throws ApiError with status + body on 4xx', async () => {
    ;(globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    })
    await expect(api('/api/test')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      body: { error: 'not found' },
    })
  })

  it('passes init options to fetch', async () => {
    ;(globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) })
    await api('/api/test', { method: 'POST', body: JSON.stringify({ a: 1 }) })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }))
  })
})
```

- [ ] **Step 3: Correr el test (debe fallar)**

Run: `pnpm test lib/api/__tests__/client.test.ts`
Expected: FAIL — `Cannot find module '../client'`.

- [ ] **Step 4: Implementar el client**

Create `lib/api/client.ts`:
```ts
export class ApiError extends Error {
  readonly name = 'ApiError'
  constructor(message: string, public status: number, public body: unknown) {
    super(message)
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(`${res.status} ${path}`, res.status, body)
  }
  return res.json()
}
```

- [ ] **Step 5: Correr test (debe pasar)**

Run: `pnpm test lib/api/__tests__/client.test.ts`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/api/client.ts lib/api/__tests__/client.test.ts vitest.config.ts
git commit -m "$(cat <<'EOF'
feat(api): typed fetch wrapper with ApiError

Lightweight wrapper around fetch that throws on non-2xx,
preserving status + parsed body. Used by every API helper
in lib/api/*.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Centralizar el demo user UUID

**Files:**
- Create: `lib/auth/current-user.ts`
- Modify: `lib/db/queries.ts`

- [ ] **Step 1: Crear el módulo current-user**

Create `lib/auth/current-user.ts`:
```ts
// MVP has no auth. The demo user UUID lives in env (DEMO_USER_ID) so
// it's not a code constant. The same UUID is the sole row in auth.users
// + profiles, seeded by scripts/seed-demo-data.ts (Plan 5).
export const CURRENT_USER_ID =
  process.env.DEMO_USER_ID ?? '00000000-0000-4000-8000-000000000001'
```

- [ ] **Step 2: Reemplazar la constante en queries.ts**

Modify `lib/db/queries.ts`. En la línea 7, reemplazar:
```ts
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'
```
por:
```ts
import { CURRENT_USER_ID } from '@/lib/auth/current-user'
export const DEMO_USER_ID = CURRENT_USER_ID  // re-export for backwards-compat with route.ts files
```

- [ ] **Step 3: Verificar que tests existentes siguen pasando**

Run: `pnpm test`
Expected: todos los tests pasan (los existentes mockean el módulo, no se ven afectados).

- [ ] **Step 4: Commit**

```bash
git add lib/auth/current-user.ts lib/db/queries.ts
git commit -m "$(cat <<'EOF'
refactor(auth): source demo user UUID from env, not code constant

Plan 1 prep: future plans will need to reference the current
user from server actions and lambdas. Centralizing in lib/auth
makes that one import.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Backend foundation (1.5h)

### Task 5: Migration — agregar `displayName` + `interests` a `profiles`

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `drizzle/0001_profile_extended.sql` (generated)

- [ ] **Step 1: Editar el schema**

Modify `lib/db/schema.ts`. Localizar el bloque `profiles = pgTable(...)` (~línea 217-229). Agregar dos columnas dentro del objeto:

Antes:
```ts
preferredFormat: preferredFormat('preferred_format').notNull().default('text'),
activeHours: text('active_hours').array().notNull().default(sql`'{}'::text[]`),
```

Después (insertar entre las dos líneas):
```ts
preferredFormat: preferredFormat('preferred_format').notNull().default('text'),
displayName: text('display_name'),
interests: text('interests').array().notNull().default(sql`'{}'::text[]`),
activeHours: text('active_hours').array().notNull().default(sql`'{}'::text[]`),
```

- [ ] **Step 2: Generar la migration**

Run:
```bash
pnpm db:generate
```
Expected: aparece `drizzle/0001_*.sql` (o el siguiente número que corresponda).

- [ ] **Step 3: Verificar el SQL generado**

Run:
```bash
ls drizzle/*.sql | tail -1 | xargs cat
```
Expected: contiene `ALTER TABLE "profiles" ADD COLUMN "display_name" text;` y `ALTER TABLE "profiles" ADD COLUMN "interests" text[] DEFAULT '{}'::text[] NOT NULL;`. Si no, regenerar.

- [ ] **Step 4: Aplicar la migration al DB de Supabase**

Run:
```bash
pnpm db:push
```
Expected: prompt confirma cambios, aplicarlos. Output incluye "Changes applied".

- [ ] **Step 5: Verificar las columnas**

Run via supabase MCP (o equivalente):
```sql
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'profiles' ORDER BY ordinal_position;
```
Expected: aparecen `display_name` (text, nullable) y `interests` (ARRAY, not null).

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "$(cat <<'EOF'
feat(db): add display_name + interests columns to profiles

Plan 1 prep for the profile UI (built in Plan 5). interests
will also feed the Claude prompt in lesson generation
(Plan 2) so analogies match the user's interests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Query helpers — `listNodesWithProgress`, `getNodeAssets`, `gradeQuiz`, `deleteFile`, `getStats`

**Files:**
- Modify: `lib/db/queries.ts`
- Modify: `lib/aws/s3.ts`
- Test: `lib/db/__tests__/queries-nodes.test.ts`
- Test: `lib/db/__tests__/queries-files-delete.test.ts`

- [ ] **Step 1: Agregar `deleteObject` a lib/aws/s3.ts**

Modify `lib/aws/s3.ts`. Al final del archivo, agregar:
```ts
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: ORIGINALS_BUCKET(), Key: key }))
}
```
Y al inicio, ampliar el import existente:
```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
```
(Si la línea de import existente tiene solo `PutObjectCommand`, agregar `DeleteObjectCommand`.)

- [ ] **Step 2: Test failing — listNodesWithProgress**

Create `lib/db/__tests__/queries-nodes.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../client', () => ({
  db: { select: vi.fn() },
  schema: {
    nodes: { id: 'nodes.id', subjectId: 'nodes.subjectId', pathId: 'nodes.pathId',
             title: 'nodes.title', contentBrief: 'nodes.contentBrief', createdAt: 'nodes.createdAt' },
    paths: { id: 'paths.id', orderIndex: 'paths.orderIndex' },
    progress: { nodeId: 'progress.nodeId', userId: 'progress.userId', status: 'progress.status' },
  },
}))

vi.mock('@/lib/auth/current-user', () => ({
  CURRENT_USER_ID: '00000000-0000-4000-8000-000000000001',
}))

import { listNodesWithProgress } from '../queries'
import * as clientModule from '../client'

const mockDb = clientModule.db as unknown as { select: ReturnType<typeof vi.fn> }

describe('listNodesWithProgress', () => {
  beforeEach(() => mockDb.select.mockReset())

  it('returns nodes with progressStatus defaulted to available when no row', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { id: 'n1', pathId: 'p1', title: 'Intro', contentBrief: 'brief', progressStatus: null },
        { id: 'n2', pathId: 'p1', title: 'Next', contentBrief: 'brief2', progressStatus: 'mastered' },
      ]),
    }
    mockDb.select.mockReturnValue(chain)

    const result = await listNodesWithProgress('subj-1')
    expect(result).toEqual([
      { id: 'n1', pathId: 'p1', title: 'Intro', contentBrief: 'brief', progressStatus: 'available' },
      { id: 'n2', pathId: 'p1', title: 'Next', contentBrief: 'brief2', progressStatus: 'mastered' },
    ])
  })
})
```

- [ ] **Step 3: Run test (debe fallar)**

Run: `pnpm test lib/db/__tests__/queries-nodes.test.ts`
Expected: FAIL — `listNodesWithProgress is not a function`.

- [ ] **Step 4: Implementar listNodesWithProgress**

Modify `lib/db/queries.ts`. Al final del archivo, agregar:
```ts
// --- Nodes with progress ---

export async function listNodesWithProgress(subjectId: string) {
  const rows = await db
    .select({
      id: schema.nodes.id,
      pathId: schema.nodes.pathId,
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
    progressStatus: r.progressStatus ?? 'available' as const,
  }))
}
```

- [ ] **Step 5: Run test (debe pasar)**

Run: `pnpm test lib/db/__tests__/queries-nodes.test.ts`
Expected: 1 test pass.

- [ ] **Step 6: Implementar `getNodeAssets`, `gradeQuiz`, `deleteFile`, `getStats` (sin tests por ahora — se cubren en Plan 2-5)**

Modify `lib/db/queries.ts`. Después de `listNodesWithProgress`, agregar:
```ts
export interface NodeAssets {
  status: 'partial' | 'ready'
  lesson: { paragraphs: string[]; quiz: Array<{ question: string; options: string[] }> } | null
  image: { url: string } | null
  audio: { url: string; durationSec: number } | null
  podcast: { url: string; durationSec: number } | null
  video: { url: string; durationSec: number } | null
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

  const fromUrl = (k: string) => {
    const r = byType.get(k)
    return r?.contentUrl ? { url: r.contentUrl, durationSec: (r.generationMetadata as any)?.durationSec ?? 0 } : null
  }

  const image = byType.get('image')?.contentUrl ? { url: byType.get('image')!.contentUrl! } : null
  const audio = fromUrl('audio')
  const podcast = fromUrl('podcast')
  const video = fromUrl('video')

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
    .where(and(
      eq(schema.files.id, fileId),
      eq(schema.files.subjectId, subjectId),
      eq(schema.files.userId, CURRENT_USER_ID),
    ))
    .limit(1)
  if (!row) return null
  await db.delete(schema.files).where(eq(schema.files.id, fileId))
  return row  // caller uses row.s3Key to delete from S3
}

export async function getStats() {
  const subjects = await listSubjects()
  let mastered = 0
  for (const s of subjects) {
    const summary = await summarizeProgressForSubject(s.id)
    if (summary.total > 0 && summary.percentMastered === 100) mastered += 1
  }
  return {
    streakDays: 24,                  // hardcoded MVP
    subjectsCompleted: mastered,
    totalSubjects: subjects.length,
    formatUsage: { text: 100 } as Record<string, number>,
  }
}
```

- [ ] **Step 7: Run all tests (no regression)**

Run: `pnpm test`
Expected: todos los tests pasan.

- [ ] **Step 8: Commit**

```bash
git add lib/db/queries.ts lib/db/__tests__/queries-nodes.test.ts lib/aws/s3.ts
git commit -m "$(cat <<'EOF'
feat(queries): add listNodesWithProgress, getNodeAssets, gradeQuiz, deleteFile, getStats

Backend helpers consumed by the new endpoints in Phase 2 and
by the asset lambdas in Plan 3+. getNodeAssets returns null for
each missing format so the UI can show 'partial' state while
the pipeline catches up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Endpoint `GET /api/subjects/[id]/nodes`

**Files:**
- Create: `app/api/subjects/[id]/nodes/route.ts`

- [ ] **Step 1: Implementar el endpoint**

Create `app/api/subjects/[id]/nodes/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getSubject, listNodesWithProgress } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const subject = await getSubject(id)
  if (!subject) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const nodes = await listNodesWithProgress(id)
  return NextResponse.json({ nodes })
}
```

- [ ] **Step 2: Verificar manualmente con curl**

Run:
```bash
pnpm dev &
sleep 8
SUBJ_ID=$(curl -s http://localhost:3000/api/subjects | jq -r '.subjects[0].id')
curl -s "http://localhost:3000/api/subjects/$SUBJ_ID/nodes" | jq '.nodes | length'
kill %1
```
Expected: número entero (puede ser 0 si el subject no tiene nodes aún).

- [ ] **Step 3: Commit**

```bash
git add app/api/subjects/\[id\]/nodes/route.ts
git commit -m "$(cat <<'EOF'
feat(api): GET /api/subjects/[id]/nodes returns nodes with progress

Used by the Clases tab to render real lesson cards (Plan 2)
instead of the mock subject.content array.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Endpoint `GET /api/nodes/[id]/assets`

**Files:**
- Create: `app/api/nodes/[id]/assets/route.ts`

- [ ] **Step 1: Implementar el endpoint**

Create `app/api/nodes/[id]/assets/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getNodeAssets } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const assets = await getNodeAssets(id)
  return NextResponse.json(assets)
}
```

- [ ] **Step 2: Verificar manualmente**

Run:
```bash
pnpm dev &
sleep 8
NODE_ID=$(curl -s http://localhost:3000/api/subjects | jq -r '.subjects[0].id' | xargs -I {} curl -s "http://localhost:3000/api/subjects/{}/nodes" | jq -r '.nodes[0].id // empty')
if [ -n "$NODE_ID" ]; then
  curl -s "http://localhost:3000/api/nodes/$NODE_ID/assets" | jq '.status'
else
  echo "no nodes available — endpoint will return 'partial' for any UUID"
fi
kill %1
```
Expected: `"partial"` o `"ready"`.

- [ ] **Step 3: Commit**

```bash
git add app/api/nodes/
git commit -m "$(cat <<'EOF'
feat(api): GET /api/nodes/[id]/assets returns multi-format content

Returns lesson text + quiz (no correctIndex) + URLs for image,
audio, podcast, video. Each is null until the corresponding
asset lambda runs in Plan 3+. Status is 'ready' when lesson +
image + audio are present.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Endpoint `POST /api/nodes/[id]/quiz`

**Files:**
- Create: `app/api/nodes/[id]/quiz/route.ts`

- [ ] **Step 1: Implementar el endpoint**

Create `app/api/nodes/[id]/quiz/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { gradeQuiz } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

const Body = z.object({ answers: z.array(z.number().int().min(0).max(3)) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const result = await gradeQuiz(id, parsed.data.answers)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 409 },
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/nodes/\[id\]/quiz/route.ts
git commit -m "$(cat <<'EOF'
feat(api): POST /api/nodes/[id]/quiz grades answers + marks mastered

Looks up correctIndex from node_content.generation_metadata,
calculates pass rate (>= 66%), upserts progress = 'mastered'
when passed. Returns per-question feedback for the done screen.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Endpoint `DELETE /api/subjects/[id]/files/[fileId]`

**Files:**
- Create: `app/api/subjects/[id]/files/[fileId]/route.ts`

- [ ] **Step 1: Implementar el endpoint**

Create `app/api/subjects/[id]/files/[fileId]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { deleteFile } from '@/lib/db/queries'
import { deleteObject } from '@/lib/aws/s3'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params
  const row = await deleteFile(id, fileId)
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // S3 cleanup. If it fails, the file row is already deleted; log and continue.
  try {
    await deleteObject(row.s3Key)
  } catch (err) {
    console.error('s3 delete failed', { fileId, s3Key: row.s3Key, err })
  }
  return new NextResponse(null, { status: 204 })
}
```

(Nota: graph-recalc trigger queda fuera de Plan 1 — se agrega cuando el módulo lambdas exista en Plan 3.)

- [ ] **Step 2: Commit**

```bash
git add app/api/subjects/\[id\]/files/\[fileId\]/route.ts
git commit -m "$(cat <<'EOF'
feat(api): DELETE /api/subjects/[id]/files/[fileId] with S3 cleanup

Removes the file row (cascade deletes file_chunks) and the S3
object. If S3 delete fails, the row is already gone and we
just log — preferable to leaving an orphan row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Endpoint `GET /api/profile/stats`

**Files:**
- Create: `app/api/profile/stats/route.ts`

- [ ] **Step 1: Implementar el endpoint**

Create `app/api/profile/stats/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getStats } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const stats = await getStats()
  return NextResponse.json(stats)
}
```

- [ ] **Step 2: Verificar**

Run:
```bash
pnpm dev &
sleep 8
curl -s http://localhost:3000/api/profile/stats | jq
kill %1
```
Expected: `{ "streakDays": 24, "subjectsCompleted": <num>, "totalSubjects": <num>, "formatUsage": { "text": 100 } }`.

- [ ] **Step 3: Commit**

```bash
git add app/api/profile/stats/route.ts
git commit -m "$(cat <<'EOF'
feat(api): GET /api/profile/stats returns aggregate metrics

streakDays + formatUsage are stubbed (24 + text:100). Real
calculation requires session tracking that's out of scope.
The Profile UI in Plan 5 displays these read-only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Extender `PATCH /api/profile` para displayName + interests

**Files:**
- Modify: `app/api/profile/route.ts`
- Modify: `lib/db/queries.ts` (extender updateProfile signature)

- [ ] **Step 1: Extender updateProfile en queries.ts**

Modify `lib/db/queries.ts`. Localizar la firma actual de `updateProfile` (~línea 157):
```ts
export async function updateProfile(input: {
  preferredFormat?: typeof schema.preferredFormat.enumValues[number]
  activeHours?: string[]
  recurringMistakes?: string[]
  averageFriction?: number
}) {
```
Reemplazar por:
```ts
export async function updateProfile(input: {
  displayName?: string | null
  interests?: string[]
  preferredFormat?: typeof schema.preferredFormat.enumValues[number]
  activeHours?: string[]
  recurringMistakes?: string[]
  averageFriction?: number
}) {
```
(Drizzle propaga las nuevas keys al `.set(...)` automáticamente porque ya las acepta el schema.)

- [ ] **Step 2: Extender el zod schema en route.ts**

Modify `app/api/profile/route.ts`. Localizar `UpdateProfileSchema` (~líneas 7-15) y reemplazar por:
```ts
const UpdateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(100).nullish(),
    interests: z.array(z.string().min(1).max(40)).max(20).optional(),
    preferredFormat: z.enum(['text', 'audio', 'video', 'visual', 'podcast']).optional(),
    activeHours: z.array(z.string()).optional(),
    recurringMistakes: z.array(z.string()).optional(),
    averageFriction: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .partial()
```
(El handler PATCH ya existe en líneas 22-30 — no hace falta tocarlo, llama a `updateProfile(parsed.data)` y la nueva firma del query helper acepta los campos extra.)

- [ ] **Step 3: Verificar**

Run:
```bash
pnpm dev &
sleep 8
curl -s -X PATCH http://localhost:3000/api/profile \
  -H 'content-type: application/json' \
  -d '{"displayName":"Ian","interests":["fútbol","gaming"]}' | jq '.profile.displayName, .profile.interests'
kill %1
```
Expected: `"Ian"` y `["fútbol","gaming"]`.

- [ ] **Step 4: Commit**

```bash
git add app/api/profile/route.ts lib/db/queries.ts
git commit -m "$(cat <<'EOF'
feat(api): extend PATCH /api/profile with displayName + interests

Plan 1 prep for the profile UI (Plan 5). interests is also
read by the lesson generation lambda in Plan 2 to inject
user-specific analogies into Claude prompts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Domain adapters + frontend API helpers (1h)

### Task 13: Domain adapters

**Files:**
- Create: `lib/domain/adapters.ts`
- Test: `lib/domain/__tests__/adapters.test.ts`

- [ ] **Step 1: Test failing — mapSubjectRow**

Create `lib/domain/__tests__/adapters.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { mapSubjectRow, mapFileRow } from '../adapters'

describe('mapSubjectRow', () => {
  it('maps a DB row to UI Subject with deterministic color/icon', () => {
    const row = {
      id: 'a-uuid',
      userId: 'u',
      name: 'Historia',
      description: 'desc',
      lastUploadAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    }
    const ui = mapSubjectRow(row)
    expect(ui.id).toBe('a-uuid')
    expect(ui.name).toBe('Historia')
    expect(ui.description).toBe('desc')
    expect(ui.color).toMatch(/^from-/)
    expect(ui.icon).toBeTypeOf('string')
    expect(ui.sources).toEqual([])
    expect(ui.content).toEqual([])
  })

  it('handles null description', () => {
    const row = { id: 'x', userId: 'u', name: 'X', description: null, lastUploadAt: null,
                  createdAt: new Date(), updatedAt: new Date() }
    const ui = mapSubjectRow(row)
    expect(ui.description).toBe('')
  })
})

describe('mapFileRow', () => {
  it('maps DB status to UI status label', () => {
    const base = {
      id: 'f1', subjectId: 's1', userId: 'u', s3Key: 'k', originalFilename: 'x.pdf',
      mimeType: 'application/pdf', fileType: 'pdf' as const, sizeBytes: 1024,
      errorMessage: null, summary: null, keywords: null, processedAt: null, createdAt: new Date(),
    }
    expect(mapFileRow({ ...base, status: 'pending' }).status).toBe('uploading')
    expect(mapFileRow({ ...base, status: 'processing' }).status).toBe('processing')
    expect(mapFileRow({ ...base, status: 'processed' }).status).toBe('ready')
    expect(mapFileRow({ ...base, status: 'failed' }).status).toBe('error')
  })
})
```

- [ ] **Step 2: Run test (fails)**

Run: `pnpm test lib/domain/__tests__/adapters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar adapters**

Create `lib/domain/adapters.ts`:
```ts
import type { Subject as UISubject, Source as UISource } from '@/lib/types'
import type { Subject as DBSubject, FileRow } from '@/lib/db/schema'

const COLORS = [
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-green-600',
  'from-purple-500 to-fuchsia-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-violet-600',
] as const
const ICONS = ['palette', 'book', 'atom', 'flask', 'globe', 'music'] as const

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function mapSubjectRow(row: DBSubject): UISubject {
  const h = hash(row.id)
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    color: COLORS[h % COLORS.length],
    icon: ICONS[h % ICONS.length],
    createdAt: row.createdAt,
    sources: [],
    content: [],
  }
}

const STATUS_MAP = {
  pending: 'uploading',
  processing: 'processing',
  processed: 'ready',
  failed: 'error',
} as const

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function mapFileRow(row: FileRow): UISource {
  return {
    id: row.id,
    name: row.originalFilename,
    type: 'pdf',
    size: formatSize(row.sizeBytes),
    uploadedAt: row.createdAt,
    status: STATUS_MAP[row.status],
  }
}
```

- [ ] **Step 4: Run test (passes)**

Run: `pnpm test lib/domain/__tests__/adapters.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/domain
git commit -m "$(cat <<'EOF'
feat(domain): adapters mapping DB rows to UI types

Single boundary where DB shape becomes UI shape. Future schema
changes only touch this file. Color + icon for subjects are
derived deterministically from the UUID so they stay stable
across reloads.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Frontend API helpers — subjects + files + profile

**Files:**
- Create: `lib/api/subjects.ts`
- Create: `lib/api/files.ts`
- Create: `lib/api/profile.ts`

- [ ] **Step 1: subjects.ts**

Create `lib/api/subjects.ts`:
```ts
import { api } from './client'
import type { Subject as DBSubject } from '@/lib/db/schema'

export interface NodeWithProgress {
  id: string
  pathId: string
  title: string
  contentBrief: string
  progressStatus: 'locked' | 'available' | 'in_progress' | 'mastered'
}

export const listSubjects = () => api<{ subjects: DBSubject[] }>('/api/subjects')
export const getSubject = (id: string) => api<{ subject: DBSubject }>(`/api/subjects/${id}`)
export const createSubject = (input: { name: string; description?: string }) =>
  api<{ subject: DBSubject }>('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
export const listNodes = (subjectId: string) =>
  api<{ nodes: NodeWithProgress[] }>(`/api/subjects/${subjectId}/nodes`)
```

- [ ] **Step 2: files.ts**

Create `lib/api/files.ts`:
```ts
import { api } from './client'
import type { FileRow } from '@/lib/db/schema'

export const listFiles = (subjectId: string) =>
  api<{ files: FileRow[] }>(`/api/subjects/${subjectId}/files`)

export const requestUpload = (
  subjectId: string,
  input: { filename: string; mimeType: string; sizeBytes: number },
) =>
  api<{ fileId: string; uploadUrl: string; requiredHeaders: Record<string, string> }>(
    `/api/subjects/${subjectId}/files`,
    { method: 'POST', body: JSON.stringify(input) },
  )

export async function putToS3(uploadUrl: string, file: File, headers: Record<string, string>) {
  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers })
  if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`)
}

export const deleteFile = async (subjectId: string, fileId: string) => {
  const res = await fetch(`/api/subjects/${subjectId}/files/${fileId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error(`DELETE failed: ${res.status}`)
}
```

- [ ] **Step 3: profile.ts**

Create `lib/api/profile.ts`:
```ts
import { api } from './client'
import type { Profile } from '@/lib/db/schema'

export interface ProfileStats {
  streakDays: number
  subjectsCompleted: number
  totalSubjects: number
  formatUsage: Record<string, number>
}

export const getProfile = () => api<{ profile: Profile }>('/api/profile')
export const updateProfile = (input: Partial<Pick<Profile, 'displayName' | 'interests' | 'preferredFormat'>>) =>
  api<{ profile: Profile }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
export const getStats = () => api<ProfileStats>('/api/profile/stats')
```

- [ ] **Step 4: Verificar que TS compila**

Run: `pnpm tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add lib/api/subjects.ts lib/api/files.ts lib/api/profile.ts
git commit -m "$(cat <<'EOF'
feat(api): typed client helpers for subjects, files, profile

Each helper wraps fetch via api<T>() and is consumed by the
hooks in lib/hooks/*. putToS3 is the only one that talks to
a non-app URL (presigned S3) so it bypasses the wrapper.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: React Query hooks — subjects + files + profile

**Files:**
- Create: `lib/hooks/use-subjects.ts`
- Create: `lib/hooks/use-subject.ts`
- Create: `lib/hooks/use-files.ts`
- Create: `lib/hooks/use-profile.ts`

- [ ] **Step 1: use-subjects.ts**

Create `lib/hooks/use-subjects.ts`:
```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { qk } from '@/lib/query/keys'
import { createSubject, listSubjects } from '@/lib/api/subjects'

export function useSubjects() {
  return useQuery({
    queryKey: qk.subjects(),
    queryFn: listSubjects,
    select: (data) => data.subjects,
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: createSubject,
    onSuccess: ({ subject }) => {
      qc.invalidateQueries({ queryKey: qk.subjects() })
      router.push(`/subjects/${subject.id}`)
    },
  })
}
```

- [ ] **Step 2: use-subject.ts**

Create `lib/hooks/use-subject.ts`:
```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { getSubject } from '@/lib/api/subjects'

export function useSubject(id: string) {
  return useQuery({
    queryKey: qk.subject(id),
    queryFn: () => getSubject(id),
    select: (data) => data.subject,
    enabled: !!id,
  })
}
```

- [ ] **Step 3: use-files.ts (incluye upload + delete con polling)**

Create `lib/hooks/use-files.ts`:
```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { deleteFile, listFiles, putToS3, requestUpload } from '@/lib/api/files'
import type { FileRow } from '@/lib/db/schema'

export function useFiles(subjectId: string) {
  return useQuery({
    queryKey: qk.files(subjectId),
    queryFn: () => listFiles(subjectId),
    select: (data) => data.files,
    enabled: !!subjectId,
    refetchInterval: (query) => {
      const files = (query.state.data as { files: FileRow[] } | undefined)?.files ?? []
      const inFlight = files.some((f) => f.status === 'pending' || f.status === 'processing')
      return inFlight ? 3000 : false
    },
  })
}

export function useUploadFile(subjectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const { fileId, uploadUrl, requiredHeaders } = await requestUpload(subjectId, {
        filename: file.name,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
      })
      await putToS3(uploadUrl, file, requiredHeaders)
      return fileId
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.files(subjectId) })
      qc.invalidateQueries({ queryKey: qk.nodes(subjectId) })
    },
  })
}

export function useDeleteFile(subjectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => deleteFile(subjectId, fileId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.files(subjectId) })
      qc.invalidateQueries({ queryKey: qk.nodes(subjectId) })
    },
  })
}
```

- [ ] **Step 4: use-profile.ts**

Create `lib/hooks/use-profile.ts`:
```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { getProfile, getStats, updateProfile } from '@/lib/api/profile'

export function useProfile() {
  return useQuery({ queryKey: qk.profile(), queryFn: getProfile, select: (d) => d.profile })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile() }),
  })
}

export function useStats() {
  return useQuery({ queryKey: qk.stats(), queryFn: getStats })
}
```

- [ ] **Step 5: Verificar TS**

Run: `pnpm tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks
git commit -m "$(cat <<'EOF'
feat(hooks): react-query hooks for subjects, files, profile

useFiles polls every 3s while any file is pending or processing,
then stops. useUploadFile invalidates both files and nodes
queries since a new doc retriggers graph-recalc upstream.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Wire home + add-subject-modal (0.5h)

### Task 16: Refactor `home-page.tsx` para usar `useSubjects`

**Files:**
- Modify: `components/home-page.tsx`

- [ ] **Step 1: Leer el archivo y localizar uso de useApp**

Run: `grep -n "useApp\|subjects\." components/home-page.tsx | head -20`
Tomar nota de las líneas donde se usa `subjects` del context.

- [ ] **Step 2: Reemplazar useApp por useSubjects**

Modify `components/home-page.tsx`:
1. Cambiar el import:
   ```ts
   // Antes:
   import { useApp } from '@/lib/app-context'
   // Después:
   import { useSubjects } from '@/lib/hooks/use-subjects'
   import { mapSubjectRow } from '@/lib/domain/adapters'
   ```
2. Localizar la línea `const { subjects } = useApp()` y reemplazar por:
   ```ts
   const { data: dbSubjects = [], isLoading } = useSubjects()
   const subjects = dbSubjects.map(mapSubjectRow)
   ```
3. Si hay un render de `subjects.map(...)` para las cards, agregar arriba un loading state:
   ```tsx
   if (isLoading) {
     return <div className="px-6 py-10 text-center text-black/50">Cargando materias...</div>
   }
   ```
   (Adaptar al markup existente.)

- [ ] **Step 3: Verificar visualmente**

Run:
```bash
pnpm dev &
sleep 8
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
kill %1
```
Expected: `200`. Si abrís el browser, ahora ves los subjects de DB (ya no los mock).

- [ ] **Step 4: Commit**

```bash
git add components/home-page.tsx
git commit -m "$(cat <<'EOF'
refactor(home): consume useSubjects instead of mock context

Home now lists real subjects from the DB. The duplicate
'Historia...' card from lib/data.ts disappears because there
is only one Historia row (until seed runs in Plan 5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Refactor `add-subject-modal.tsx` para usar `useCreateSubject`

**Files:**
- Modify: `components/add-subject-modal.tsx`

- [ ] **Step 1: Reemplazar la mutación**

Modify `components/add-subject-modal.tsx`:
1. Cambiar import:
   ```ts
   // Antes:
   import { useApp } from '@/lib/app-context'
   // Después:
   import { useCreateSubject } from '@/lib/hooks/use-subjects'
   ```
2. Reemplazar `const { addSubject } = useApp()` por:
   ```ts
   const createMutation = useCreateSubject()
   ```
3. Localizar `handleSubmit`. Reemplazar el cuerpo:
   ```ts
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault()
     if (!name.trim()) return
     createMutation.mutate(
       { name: name.trim(), description: description.trim() || undefined },
       {
         onSuccess: () => {
           setName('')
           setDescription('')
           setSelectedIcon(subjectIcons[0])
           onClose()
         },
       },
     )
   }
   ```
4. En el botón "Crear materia" agregar disabled state:
   ```tsx
   <Button
     type="submit"
     disabled={!name.trim() || createMutation.isPending}
     className="..."
   >
     {createMutation.isPending ? 'Creando...' : 'Crear materia'}
   </Button>
   ```

- [ ] **Step 2: Verificar end-to-end**

Run:
```bash
pnpm dev &
sleep 8
echo "Open http://localhost:3000/, click '+ Nueva materia', create one with name 'Test E2E'"
echo "Verify: modal closes, redirected to /subjects/<uuid>, new card visible on home after going back"
echo "Press Enter to kill dev server"
read
kill %1
```
Expected: el flujo completo funciona. Después corroborá en DB:
```bash
# (si tenés acceso al MCP de Supabase)
# SELECT name FROM subjects WHERE name = 'Test E2E';
```

- [ ] **Step 3: Commit**

```bash
git add components/add-subject-modal.tsx
git commit -m "$(cat <<'EOF'
refactor(modal): create subjects via API + redirect to UUID

useCreateSubject handles POST + cache invalidation + push to
the new subject's URL. Mock addSubject() in AppContext is now
unused; AppProvider stays mounted but increasingly empty.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: Refactor `app/subjects/[id]/page.tsx` para usar `useSubject`

**Files:**
- Modify: `app/subjects/[id]/page.tsx`

- [ ] **Step 1: Cambiar la fuente de datos**

Modify `app/subjects/[id]/page.tsx`:
```tsx
'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppSidebar from '@/components/app-sidebar'
import SubjectDetailView from '@/components/subject-detail-view'
import { useSubject } from '@/lib/hooks/use-subject'
import { mapSubjectRow } from '@/lib/domain/adapters'

export default function SubjectDetailPage() {
  const params = useParams()
  const id = (params.id as string) ?? ''
  const { data: dbSubject, isLoading, error } = useSubject(id)

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <p className="text-base text-black/50">Cargando materia...</p>
        </main>
      </div>
    )
  }

  if (error || !dbSubject) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Materia no encontrada</p>
            <p className="text-base text-black/50">
              No pudimos encontrar la materia que estás buscando.
            </p>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
            >
              Volver al inicio
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return <SubjectDetailView subject={mapSubjectRow(dbSubject)} />
}
```

- [ ] **Step 2: Verificar**

Run:
```bash
pnpm dev &
sleep 8
SUBJ=$(curl -s http://localhost:3000/api/subjects | jq -r '.subjects[0].id')
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/subjects/$SUBJ"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/subjects/00000000-0000-0000-0000-000000000000"
kill %1
```
Expected: `200` para el primero, `200` (con "Materia no encontrada" renderizado) para el segundo.

- [ ] **Step 3: Commit**

```bash
git add app/subjects/\[id\]/page.tsx
git commit -m "$(cat <<'EOF'
refactor(subject-page): fetch subject from API instead of mock

Loading + 404 states are explicit. mock-id URLs (e.g.
/subjects/historia-independencia) now correctly 404 because
the subject doesn't exist in DB until the seed runs (Plan 5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Wire Documentación tab (1h)

### Task 19: Refactor Documentación tab — listar files reales

**Files:**
- Modify: `components/subject-detail-view.tsx`

- [ ] **Step 1: Leer la sección actual de Documentación**

Run: `grep -n "addSource\|sources\|DocumentationTable" components/subject-detail-view.tsx | head -20`

Identificar dónde se inyectan `subject.sources` al `DocumentationTable` (~línea 498) y dónde el tab Documentación monta el componente (~línea 410).

- [ ] **Step 2: Cambiar la fuente de files**

Modify `components/subject-detail-view.tsx`:

1. Imports al inicio (después de los existentes):
   ```ts
   import { useFiles, useUploadFile, useDeleteFile } from '@/lib/hooks/use-files'
   import { mapFileRow } from '@/lib/domain/adapters'
   ```

2. Borrar el import de `useApp`:
   ```ts
   // Borrar: import { useApp } from '@/lib/app-context'
   ```

3. Dentro del componente `SubjectDetailView`, reemplazar:
   ```ts
   const { addSource } = useApp()
   ```
   por:
   ```ts
   const filesQuery = useFiles(subject.id)
   const uploadMutation = useUploadFile(subject.id)
   const deleteMutation = useDeleteFile(subject.id)
   const sources = (filesQuery.data ?? []).map(mapFileRow)
   ```

4. En `onFilesSelected`, reemplazar el body del `forEach` (que crea un Source fake) por:
   ```ts
   const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = Array.from(e.target.files ?? [])
     const accepted = files.filter((f) =>
       f.type === 'application/pdf' ||
       f.type === 'application/msword' ||
       f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
       f.type.startsWith('image/'),
     )
     for (const file of accepted) {
       uploadMutation.mutate(file)
     }
     e.target.value = ''
   }
   ```

5. Donde el `DocumentationTable` renderiza, reemplazar `subject.sources` por `sources`:
   ```tsx
   <DocumentationTable
     sources={sources}
     onDownload={onDownloadSource}
     onDelete={(source) => deleteMutation.mutate(source.id)}
     isLoading={filesQuery.isLoading}
   />
   ```

- [ ] **Step 3: Extender `DocumentationTableProps` con `onDelete` + `isLoading`**

Modify `components/subject-detail-view.tsx`. Localizar `DocumentationTableProps` (~línea 236) y reemplazar:
```ts
interface DocumentationTableProps {
  sources: Source[]
  onDownload: (source: Source) => void
  onDelete: (source: Source) => void
  isLoading?: boolean
}
```

- [ ] **Step 4: Renderizar loading + agregar botón delete por fila**

Modify `components/subject-detail-view.tsx` dentro de `DocumentationTable` (~líneas 241-297):

1. Cambiar la firma del componente para destructurar los nuevos props:
   ```ts
   function DocumentationTable({ sources, onDownload, onDelete, isLoading }: DocumentationTableProps) {
   ```

2. Localizar la línea `{sources.length === 0 ? (` (~línea 265) y agregar un branch nuevo para `isLoading` antes del actual:
   ```tsx
   {isLoading ? (
     <div className="px-6 py-10 text-center text-base text-black/50">
       Cargando documentos...
     </div>
   ) : sources.length === 0 ? (
     <div className="px-6 py-10 text-center text-base text-black/50">
       Aún no se cargaron documentos.
     </div>
   ) : (
     sources.map((source) => (
       /* fila existente, sin cambios estructurales */
     ))
   )}
   ```
   (Mantener el JSX del map intacto.)

2. Dentro del `cellClass` de "Acciones" (~línea 282-291), agregar el botón delete al lado de Descargar:
   ```tsx
   <div className="flex flex-1 min-w-px items-center gap-2 px-6 py-4">
     <button
       type="button"
       onClick={() => onDownload(source)}
       className="inline-flex h-8 items-center gap-1 rounded-lg border border-black/12 px-2 text-sm font-medium tracking-[-0.28px] text-black transition-colors hover:bg-black/4"
     >
       <ArrowDownToLine className="size-4" strokeWidth={2} />
       Descargar
     </button>
     <button
       type="button"
       onClick={() => onDelete(source)}
       className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-300 px-2 text-sm font-medium tracking-[-0.28px] text-red-600 transition-colors hover:bg-red-50"
     >
       Eliminar
     </button>
   </div>
   ```
   (Agregar import de un ícono de trash si querés, sino texto plano "Eliminar" alcanza.)

- [ ] **Step 5: Verificar end-to-end**

Run:
```bash
pnpm dev &
sleep 8
echo "Manual test:"
echo "1. Navega a un subject existente (cualquier UUID de DB)"
echo "2. Tab Documentación: deberías ver tabla vacía o files reales"
echo "3. Click 'Añadir documentos' → seleccioná un PDF chico"
echo "4. La fila aparece como 'Subiendo' → 'Procesando' → 'Listo' (~1-2 min)"
echo "5. Click 'Eliminar' → la fila desaparece"
echo "Press Enter to kill dev server"
read
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add components/subject-detail-view.tsx
git commit -m "$(cat <<'EOF'
feat(docs-tab): wire upload + delete + polling to real backend

The Documentación tab now triggers the real S3 upload pipeline.
Status flips pending → processing → processed in ~1-2 min and
the row updates without a page refresh thanks to the dynamic
refetchInterval. Eliminar runs the new DELETE endpoint with
S3 cleanup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Verification — final pass

### Task 20: Smoke E2E manual + cleanup

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Verificar tests pasan**

Run: `pnpm test`
Expected: 100% pass.

- [ ] **Step 2: Verificar TS limpio**

Run: `pnpm tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 3: Verificar lint limpio**

Run: `pnpm lint`
Expected: 0 errores. Si hay warnings de unused vars en `app-context.tsx` (porque ya casi no se usa), ignorar — se borra en Plan 5.

- [ ] **Step 4: Smoke E2E manual completo**

Run:
```bash
pnpm dev &
sleep 8
```

Manualmente en browser:
1. Home → "+ Nueva materia" → crear "Smoke Test {fecha}"
2. Verificar redirect a `/subjects/<uuid>`
3. Tab Documentación → "Añadir documentos" → subir un PDF chico (≤2MB)
4. Verificar fila aparece como "Subiendo"
5. Refrescar después de ~30s → status debería ser "Procesando"
6. Después de ~1-2 min → "Listo"
7. Click "Eliminar" en esa fila → desaparece
8. Volver al home → la materia "Smoke Test ..." sigue ahí
9. Click en la materia → tab Clases vacía (esperado, Plan 2 wirea esto)

Run: `kill %1`

- [ ] **Step 5: Push al remote**

Run: `git push origin main`
Expected: 18-20 commits subidos limpiamente.

---

## Out of scope para Plan 1 (cubierto en planes posteriores)

- Tab Clases muestra contenido real → **Plan 2**
- Lambda lesson-text genera paragraphs + quiz → **Plan 2**
- Lesson view genérico (`components/lesson-flow-generic/`) → **Plan 2**
- Lambdas de imagen + audio → **Plan 3**
- Lambdas de podcast + video → **Plan 4**
- Profile UI completo → **Plan 5**
- Borrado de `lib/app-context.tsx` + `lib/data.ts` + `<AppProvider>` → **Plan 5**
- Seed del demo subject + Vercel deploy → **Plan 5**
