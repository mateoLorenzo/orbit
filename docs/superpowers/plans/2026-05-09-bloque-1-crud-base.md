# Bloque 1 — CRUD Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 4 CRUD services from Block 1 of `servicios_backend.pdf` (MateriasService, DataRoomService, ProgressService, UserProfileService) as Next.js App Router API routes backed by an in-memory store.

**Architecture:** Service modules with a shared in-memory singleton store. Route handlers stay thin and delegate to services. Validation with zod. TDD: tests for services first, then implementation, then route handlers. No database, no auth, no file bytes persisted (mock mode only).

**Tech Stack:** Next.js 16 (App Router) · TypeScript · zod · Vitest.

**Spec:** `docs/superpowers/specs/2026-05-09-bloque-1-crud-base-design.md`

---

## File Structure

| Path | Responsibility |
|---|---|
| `lib/server/errors.ts` | `ApiError` class + `handleRoute` wrapper for route handlers |
| `lib/server/schemas.ts` | Zod schemas for `Materia`, `File`, `Progress`, `Profile` + inferred TS types |
| `lib/server/store.ts` | In-memory singleton store + `resetStore()` helper |
| `lib/server/services/materias.service.ts` | CRUD for Materia, cascades to files on delete |
| `lib/server/services/dataroom.service.ts` | CRUD for File metadata |
| `lib/server/services/progress.service.ts` | List/summary by materia + upsert by nodoId |
| `lib/server/services/profile.service.ts` | Get + partial merge for the singleton profile |
| `app/api/materias/route.ts` | `POST`, `GET /materias` |
| `app/api/materias/[id]/route.ts` | `GET`, `DELETE /materias/:id` |
| `app/api/materias/[id]/files/route.ts` | `POST`, `GET /materias/:id/files` (multipart) |
| `app/api/files/[id]/route.ts` | `DELETE /files/:id` |
| `app/api/materias/[id]/progress/route.ts` | `GET /materias/:id/progress` |
| `app/api/materias/[id]/progress/summary/route.ts` | `GET /materias/:id/progress/summary` |
| `app/api/nodos/[id]/status/route.ts` | `PATCH /nodos/:id/status` |
| `app/api/profile/route.ts` | `GET`, `PATCH /profile` |
| `lib/server/services/__tests__/*.test.ts` | One test file per service |
| `vitest.config.ts` | Vitest config with path alias |

---

## Task 1: Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest as devDependency**

Run:
```bash
pnpm add -D vitest @types/node
```

Expected: lockfile updates, no errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/server/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
```

- [ ] **Step 3: Add test script to `package.json`**

In `package.json` → `scripts`, add `"test": "vitest run"` and `"test:watch": "vitest"`. Keep existing scripts intact.

- [ ] **Step 4: Smoke check — run vitest with no tests**

Run:
```bash
pnpm test
```

Expected: exits with `No test files found` or similar — confirms vitest is wired but nothing to run yet. Exit code 1 is fine here.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore: add vitest for backend service tests"
```

---

## Task 2: Error handling primitives

**Files:**
- Create: `lib/server/errors.ts`
- Test: `lib/server/__tests__/errors.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/server/__tests__/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError, handleRoute } from '../errors'
import { z } from 'zod'

describe('ApiError', () => {
  it('preserves status, code and message', () => {
    const err = new ApiError(404, 'not_found', 'Materia not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe('not_found')
    expect(err.message).toBe('Materia not found')
  })
})

describe('handleRoute', () => {
  it('returns the handler response on success', async () => {
    const handler = handleRoute(async () => Response.json({ ok: true }))
    const res = await handler()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('maps ApiError to its status and shape', async () => {
    const handler = handleRoute(async () => {
      throw new ApiError(404, 'not_found', 'Materia not found')
    })
    const res = await handler()
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found', message: 'Materia not found' })
  })

  it('maps ZodError to 400 validation', async () => {
    const handler = handleRoute(async () => {
      z.object({ nombre: z.string().min(1) }).parse({ nombre: '' })
      return Response.json({})
    })
    const res = await handler()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('validation')
    expect(Array.isArray(body.issues)).toBe(true)
  })

  it('maps unknown errors to 500', async () => {
    const handler = handleRoute(async () => {
      throw new Error('boom')
    })
    const res = await handler()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'internal', message: 'Internal server error' })
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run:
```bash
pnpm test
```
Expected: FAIL — `Cannot find module '../errors'`.

- [ ] **Step 3: Implement `lib/server/errors.ts`**

```ts
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RouteHandler<Args extends unknown[]> = (...args: Args) => Promise<Response>

export function handleRoute<Args extends unknown[]>(fn: RouteHandler<Args>): RouteHandler<Args> {
  return async (...args: Args) => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof ApiError) {
        return Response.json({ error: err.code, message: err.message }, { status: err.status })
      }
      if (err instanceof ZodError) {
        return Response.json({ error: 'validation', issues: err.issues }, { status: 400 })
      }
      console.error('Unhandled route error:', err)
      return Response.json(
        { error: 'internal', message: 'Internal server error' },
        { status: 500 },
      )
    }
  }
}
```

- [ ] **Step 4: Run test, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — 4 tests in `errors.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/server/errors.ts lib/server/__tests__/errors.test.ts
git commit -m "feat(server): add ApiError class and handleRoute wrapper"
```

---

## Task 3: Zod schemas

**Files:**
- Create: `lib/server/schemas.ts`
- Test: `lib/server/__tests__/schemas.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/server/__tests__/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  MateriaSchema,
  CreateMateriaInputSchema,
  FileSchema,
  ProgressSchema,
  ProgressStatusSchema,
  ProfileSchema,
  UpdateProfileInputSchema,
} from '../schemas'

describe('schemas', () => {
  it('Materia: rejects empty nombre', () => {
    expect(() => CreateMateriaInputSchema.parse({ nombre: '' })).toThrow()
  })

  it('Materia: accepts valid input', () => {
    expect(CreateMateriaInputSchema.parse({ nombre: 'Cálculo' })).toEqual({ nombre: 'Cálculo' })
  })

  it('Materia: full shape requires id, nombre, createdAt', () => {
    const m = MateriaSchema.parse({
      id: 'a',
      nombre: 'b',
      createdAt: new Date().toISOString(),
    })
    expect(m.id).toBe('a')
  })

  it('File: full shape parses', () => {
    const f = FileSchema.parse({
      id: 'f1',
      materiaId: 'm1',
      fileName: 'x.pdf',
      fileType: 'application/pdf',
      filePath: 'mock://m1/x.pdf',
      size: 100,
      uploadedAt: new Date().toISOString(),
    })
    expect(f.size).toBe(100)
  })

  it('ProgressStatus: only accepts the 4 values', () => {
    expect(ProgressStatusSchema.parse('dominado')).toBe('dominado')
    expect(() => ProgressStatusSchema.parse('foo')).toThrow()
  })

  it('Progress: accepts null completedAt', () => {
    const p = ProgressSchema.parse({
      id: 'p1',
      nodoId: 'n1',
      status: 'disponible',
      completedAt: null,
    })
    expect(p.completedAt).toBeNull()
  })

  it('Profile: full shape parses', () => {
    const p = ProfileSchema.parse({
      id: 'singleton',
      formatoPreferido: 'texto',
      horariosActivos: ['morning'],
      erroresRecurrentes: [],
      friccionPromedio: 0.5,
    })
    expect(p.id).toBe('singleton')
  })

  it('UpdateProfileInput: all fields optional, id stripped', () => {
    const out = UpdateProfileInputSchema.parse({ formatoPreferido: 'audio', id: 'ignored' } as Record<string, unknown>)
    expect(out.formatoPreferido).toBe('audio')
    expect((out as Record<string, unknown>).id).toBeUndefined()
  })

  it('Profile: friccionPromedio must be 0..1', () => {
    expect(() =>
      ProfileSchema.parse({
        id: 'singleton',
        formatoPreferido: 'texto',
        horariosActivos: [],
        erroresRecurrentes: [],
        friccionPromedio: 2,
      }),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run:
```bash
pnpm test
```
Expected: FAIL — `Cannot find module '../schemas'`.

- [ ] **Step 3: Implement `lib/server/schemas.ts`**

```ts
import { z } from 'zod'

export const ISODateString = z.string().datetime({ offset: true }).or(z.string().datetime())

// Materia
export const MateriaSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  createdAt: z.string(),
})
export type Materia = z.infer<typeof MateriaSchema>

export const CreateMateriaInputSchema = z.object({
  nombre: z.string().min(1).trim(),
})
export type CreateMateriaInput = z.infer<typeof CreateMateriaInputSchema>

// File
export const FileSchema = z.object({
  id: z.string().min(1),
  materiaId: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  filePath: z.string().min(1),
  size: z.number().int().nonnegative(),
  uploadedAt: z.string(),
})
export type FileEntry = z.infer<typeof FileSchema>

// Progress
export const ProgressStatusSchema = z.enum(['bloqueado', 'disponible', 'en_curso', 'dominado'])
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>

export const ProgressSchema = z.object({
  id: z.string().min(1),
  nodoId: z.string().min(1),
  status: ProgressStatusSchema,
  completedAt: z.string().nullable(),
})
export type Progress = z.infer<typeof ProgressSchema>

export const UpdateProgressStatusInputSchema = z.object({
  status: ProgressStatusSchema,
})

// Profile
export const FormatoPreferidoSchema = z.enum(['texto', 'audio', 'video', 'visual', 'podcast'])

export const ProfileSchema = z.object({
  id: z.literal('singleton'),
  formatoPreferido: FormatoPreferidoSchema,
  horariosActivos: z.array(z.string()),
  erroresRecurrentes: z.array(z.string()),
  friccionPromedio: z.number().min(0).max(1),
})
export type Profile = z.infer<typeof ProfileSchema>

export const UpdateProfileInputSchema = ProfileSchema.omit({ id: true }).partial()
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>
```

- [ ] **Step 4: Run test, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — 9 tests in `schemas.test.ts` plus the existing 4 in `errors.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/server/schemas.ts lib/server/__tests__/schemas.test.ts
git commit -m "feat(server): add zod schemas for Materia, File, Progress, Profile"
```

---

## Task 4: In-memory store

**Files:**
- Create: `lib/server/store.ts`
- Test: `lib/server/__tests__/store.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/server/__tests__/store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore, store } from '../store'

describe('store', () => {
  beforeEach(() => resetStore())

  it('starts empty for collections', () => {
    expect(store.materias).toEqual([])
    expect(store.files).toEqual([])
    expect(store.progress).toEqual([])
  })

  it('seeds the singleton profile', () => {
    expect(store.profile.id).toBe('singleton')
    expect(store.profile.formatoPreferido).toBe('texto')
    expect(store.profile.friccionPromedio).toBe(0.5)
    expect(store.profile.horariosActivos).toEqual([])
    expect(store.profile.erroresRecurrentes).toEqual([])
  })

  it('resetStore clears mutations', () => {
    store.materias.push({ id: '1', nombre: 'X', createdAt: new Date().toISOString() })
    store.profile.formatoPreferido = 'audio'
    resetStore()
    expect(store.materias).toEqual([])
    expect(store.profile.formatoPreferido).toBe('texto')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run:
```bash
pnpm test
```
Expected: FAIL — `Cannot find module '../store'`.

- [ ] **Step 3: Implement `lib/server/store.ts`**

```ts
import type { FileEntry, Materia, Profile, Progress } from './schemas'

interface Store {
  materias: Materia[]
  files: FileEntry[]
  progress: Progress[]
  profile: Profile
}

function defaultProfile(): Profile {
  return {
    id: 'singleton',
    formatoPreferido: 'texto',
    horariosActivos: [],
    erroresRecurrentes: [],
    friccionPromedio: 0.5,
  }
}

export const store: Store = {
  materias: [],
  files: [],
  progress: [],
  profile: defaultProfile(),
}

export function resetStore(): void {
  store.materias.length = 0
  store.files.length = 0
  store.progress.length = 0
  Object.assign(store.profile, defaultProfile())
}
```

- [ ] **Step 4: Run test, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — store tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/server/store.ts lib/server/__tests__/store.test.ts
git commit -m "feat(server): add in-memory store with reset helper"
```

---

## Task 5: MateriasService

**Files:**
- Create: `lib/server/services/materias.service.ts`
- Test: `lib/server/services/__tests__/materias.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/server/services/__tests__/materias.service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../errors'
import { resetStore, store } from '../../store'
import {
  createMateria,
  deleteMateria,
  getMateria,
  listMaterias,
} from '../materias.service'

describe('MateriasService', () => {
  beforeEach(() => resetStore())

  it('creates a materia with id, nombre, createdAt', () => {
    const m = createMateria({ nombre: 'Cálculo' })
    expect(m.id).toMatch(/[0-9a-f-]{36}/)
    expect(m.nombre).toBe('Cálculo')
    expect(typeof m.createdAt).toBe('string')
    expect(store.materias).toHaveLength(1)
  })

  it('lists materias in insertion order', () => {
    createMateria({ nombre: 'A' })
    createMateria({ nombre: 'B' })
    const list = listMaterias()
    expect(list.map((m) => m.nombre)).toEqual(['A', 'B'])
  })

  it('getMateria returns the materia by id', () => {
    const m = createMateria({ nombre: 'A' })
    expect(getMateria(m.id)).toEqual(m)
  })

  it('getMateria throws 404 ApiError when not found', () => {
    expect(() => getMateria('nope')).toThrow(ApiError)
    try {
      getMateria('nope')
    } catch (err) {
      expect((err as ApiError).status).toBe(404)
      expect((err as ApiError).code).toBe('not_found')
    }
  })

  it('deleteMateria removes the materia', () => {
    const m = createMateria({ nombre: 'A' })
    deleteMateria(m.id)
    expect(store.materias).toHaveLength(0)
  })

  it('deleteMateria cascades to files of that materia', () => {
    const m = createMateria({ nombre: 'A' })
    store.files.push({
      id: 'f1',
      materiaId: m.id,
      fileName: 'x.pdf',
      fileType: 'application/pdf',
      filePath: 'mock://x',
      size: 1,
      uploadedAt: new Date().toISOString(),
    })
    store.files.push({
      id: 'f2',
      materiaId: 'other',
      fileName: 'y.pdf',
      fileType: 'application/pdf',
      filePath: 'mock://y',
      size: 1,
      uploadedAt: new Date().toISOString(),
    })
    deleteMateria(m.id)
    expect(store.files.map((f) => f.id)).toEqual(['f2'])
  })

  it('deleteMateria throws 404 when not found', () => {
    expect(() => deleteMateria('nope')).toThrow(ApiError)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
pnpm test
```
Expected: FAIL — `Cannot find module '../materias.service'`.

- [ ] **Step 3: Implement `lib/server/services/materias.service.ts`**

```ts
import { randomUUID } from 'node:crypto'
import { ApiError } from '../errors'
import { CreateMateriaInputSchema, type Materia } from '../schemas'
import { store } from '../store'

export function listMaterias(): Materia[] {
  return [...store.materias]
}

export function getMateria(id: string): Materia {
  const found = store.materias.find((m) => m.id === id)
  if (!found) {
    throw new ApiError(404, 'not_found', `Materia ${id} not found`)
  }
  return found
}

export function createMateria(input: unknown): Materia {
  const parsed = CreateMateriaInputSchema.parse(input)
  const materia: Materia = {
    id: randomUUID(),
    nombre: parsed.nombre,
    createdAt: new Date().toISOString(),
  }
  store.materias.push(materia)
  return materia
}

export function deleteMateria(id: string): void {
  const idx = store.materias.findIndex((m) => m.id === id)
  if (idx === -1) {
    throw new ApiError(404, 'not_found', `Materia ${id} not found`)
  }
  store.materias.splice(idx, 1)
  // cascade: drop files belonging to this materia
  store.files = store.files.filter((f) => f.materiaId !== id)
}
```

Note: `store.files = ...` reassigns the array. Update `store.ts` to support this — `files` must remain a mutable property (it already is).

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — MateriasService tests green plus all previous.

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/materias.service.ts lib/server/services/__tests__/materias.service.test.ts
git commit -m "feat(server): add MateriasService with cascade delete"
```

---

## Task 6: DataRoomService

**Files:**
- Create: `lib/server/services/dataroom.service.ts`
- Test: `lib/server/services/__tests__/dataroom.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/server/services/__tests__/dataroom.service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../errors'
import { resetStore, store } from '../../store'
import { createMateria } from '../materias.service'
import {
  createFile,
  deleteFile,
  listFilesByMateria,
} from '../dataroom.service'

describe('DataRoomService', () => {
  beforeEach(() => resetStore())

  it('createFile attaches metadata to the materia', () => {
    const m = createMateria({ nombre: 'A' })
    const f = createFile(m.id, {
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
      size: 1234,
    })
    expect(f.materiaId).toBe(m.id)
    expect(f.fileName).toBe('doc.pdf')
    expect(f.fileType).toBe('application/pdf')
    expect(f.size).toBe(1234)
    expect(f.filePath).toBe(`mock://${m.id}/doc.pdf`)
    expect(typeof f.uploadedAt).toBe('string')
    expect(store.files).toHaveLength(1)
  })

  it('createFile throws 404 if materia missing', () => {
    expect(() =>
      createFile('nope', { fileName: 'a', fileType: 'application/pdf', size: 1 }),
    ).toThrow(ApiError)
  })

  it('createFile rejects empty fileName', () => {
    const m = createMateria({ nombre: 'A' })
    expect(() =>
      createFile(m.id, { fileName: '', fileType: 'application/pdf', size: 1 }),
    ).toThrow()
  })

  it('listFilesByMateria returns only matching files', () => {
    const m1 = createMateria({ nombre: 'A' })
    const m2 = createMateria({ nombre: 'B' })
    createFile(m1.id, { fileName: 'x.pdf', fileType: 'application/pdf', size: 1 })
    createFile(m2.id, { fileName: 'y.pdf', fileType: 'application/pdf', size: 1 })
    const list = listFilesByMateria(m1.id)
    expect(list).toHaveLength(1)
    expect(list[0].fileName).toBe('x.pdf')
  })

  it('listFilesByMateria throws 404 if materia missing', () => {
    expect(() => listFilesByMateria('nope')).toThrow(ApiError)
  })

  it('deleteFile removes the file by id', () => {
    const m = createMateria({ nombre: 'A' })
    const f = createFile(m.id, { fileName: 'x.pdf', fileType: 'application/pdf', size: 1 })
    deleteFile(f.id)
    expect(store.files).toHaveLength(0)
  })

  it('deleteFile throws 404 if file missing', () => {
    expect(() => deleteFile('nope')).toThrow(ApiError)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
pnpm test
```
Expected: FAIL — `Cannot find module '../dataroom.service'`.

- [ ] **Step 3: Implement `lib/server/services/dataroom.service.ts`**

```ts
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ApiError } from '../errors'
import { type FileEntry } from '../schemas'
import { store } from '../store'
import { getMateria } from './materias.service'

const CreateFileMetaSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  size: z.number().int().nonnegative(),
})

export type CreateFileMeta = z.infer<typeof CreateFileMetaSchema>

export function createFile(materiaId: string, input: unknown): FileEntry {
  getMateria(materiaId) // throws 404 if missing
  const parsed = CreateFileMetaSchema.parse(input)
  const file: FileEntry = {
    id: randomUUID(),
    materiaId,
    fileName: parsed.fileName,
    fileType: parsed.fileType,
    filePath: `mock://${materiaId}/${parsed.fileName}`,
    size: parsed.size,
    uploadedAt: new Date().toISOString(),
  }
  store.files.push(file)
  return file
}

export function listFilesByMateria(materiaId: string): FileEntry[] {
  getMateria(materiaId)
  return store.files.filter((f) => f.materiaId === materiaId)
}

export function deleteFile(id: string): void {
  const idx = store.files.findIndex((f) => f.id === id)
  if (idx === -1) {
    throw new ApiError(404, 'not_found', `File ${id} not found`)
  }
  store.files.splice(idx, 1)
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — DataRoomService tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/dataroom.service.ts lib/server/services/__tests__/dataroom.service.test.ts
git commit -m "feat(server): add DataRoomService for file metadata"
```

---

## Task 7: ProgressService

**Files:**
- Create: `lib/server/services/progress.service.ts`
- Test: `lib/server/services/__tests__/progress.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/server/services/__tests__/progress.service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../errors'
import { resetStore, store } from '../../store'
import { createMateria } from '../materias.service'
import {
  getProgressByMateria,
  getProgressSummaryByMateria,
  upsertProgressStatus,
} from '../progress.service'

describe('ProgressService', () => {
  beforeEach(() => resetStore())

  it('upsertProgressStatus creates a new Progress when missing', () => {
    const p = upsertProgressStatus('node-1', 'disponible')
    expect(p.nodoId).toBe('node-1')
    expect(p.status).toBe('disponible')
    expect(p.completedAt).toBeNull()
    expect(store.progress).toHaveLength(1)
  })

  it('upsertProgressStatus updates an existing Progress', () => {
    upsertProgressStatus('node-1', 'disponible')
    const updated = upsertProgressStatus('node-1', 'en_curso')
    expect(store.progress).toHaveLength(1)
    expect(updated.status).toBe('en_curso')
    expect(updated.completedAt).toBeNull()
  })

  it("upsertProgressStatus sets completedAt when status becomes 'dominado'", () => {
    const p = upsertProgressStatus('node-1', 'dominado')
    expect(p.status).toBe('dominado')
    expect(p.completedAt).not.toBeNull()
  })

  it("upsertProgressStatus clears completedAt when leaving 'dominado'", () => {
    upsertProgressStatus('node-1', 'dominado')
    const p = upsertProgressStatus('node-1', 'en_curso')
    expect(p.completedAt).toBeNull()
  })

  it('upsertProgressStatus rejects invalid status', () => {
    expect(() => upsertProgressStatus('node-1', 'foo' as never)).toThrow()
  })

  it('getProgressByMateria validates materia exists and returns all progress', () => {
    const m = createMateria({ nombre: 'A' })
    upsertProgressStatus('node-1', 'dominado')
    upsertProgressStatus('node-2', 'disponible')
    const list = getProgressByMateria(m.id)
    expect(list).toHaveLength(2)
  })

  it('getProgressByMateria throws 404 when materia missing', () => {
    expect(() => getProgressByMateria('nope')).toThrow(ApiError)
  })

  it('getProgressSummaryByMateria returns counts and percent', () => {
    const m = createMateria({ nombre: 'A' })
    upsertProgressStatus('n1', 'dominado')
    upsertProgressStatus('n2', 'dominado')
    upsertProgressStatus('n3', 'en_curso')
    upsertProgressStatus('n4', 'disponible')
    const summary = getProgressSummaryByMateria(m.id)
    expect(summary).toEqual({
      total: 4,
      dominado: 2,
      enCurso: 1,
      disponible: 1,
      bloqueado: 0,
      percentDominado: 50,
    })
  })

  it('getProgressSummaryByMateria returns 0% with no progress entries', () => {
    const m = createMateria({ nombre: 'A' })
    const summary = getProgressSummaryByMateria(m.id)
    expect(summary.total).toBe(0)
    expect(summary.percentDominado).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
pnpm test
```
Expected: FAIL — `Cannot find module '../progress.service'`.

- [ ] **Step 3: Implement `lib/server/services/progress.service.ts`**

```ts
import { randomUUID } from 'node:crypto'
import {
  ProgressStatusSchema,
  type Progress,
  type ProgressStatus,
} from '../schemas'
import { store } from '../store'
import { getMateria } from './materias.service'

export interface ProgressSummary {
  total: number
  dominado: number
  enCurso: number
  disponible: number
  bloqueado: number
  percentDominado: number
}

export function upsertProgressStatus(nodoId: string, status: ProgressStatus): Progress {
  const validStatus = ProgressStatusSchema.parse(status)
  const completedAt = validStatus === 'dominado' ? new Date().toISOString() : null
  const existing = store.progress.find((p) => p.nodoId === nodoId)
  if (existing) {
    existing.status = validStatus
    existing.completedAt = completedAt
    return existing
  }
  const created: Progress = {
    id: randomUUID(),
    nodoId,
    status: validStatus,
    completedAt,
  }
  store.progress.push(created)
  return created
}

export function getProgressByMateria(materiaId: string): Progress[] {
  getMateria(materiaId)
  // TODO bloque 2: filtrar por nodos pertenecientes a esta materia.
  return [...store.progress]
}

export function getProgressSummaryByMateria(materiaId: string): ProgressSummary {
  const list = getProgressByMateria(materiaId)
  const counts = {
    total: list.length,
    dominado: list.filter((p) => p.status === 'dominado').length,
    enCurso: list.filter((p) => p.status === 'en_curso').length,
    disponible: list.filter((p) => p.status === 'disponible').length,
    bloqueado: list.filter((p) => p.status === 'bloqueado').length,
  }
  const percentDominado =
    counts.total === 0 ? 0 : Math.round((counts.dominado / counts.total) * 100)
  return { ...counts, percentDominado }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — ProgressService tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/progress.service.ts lib/server/services/__tests__/progress.service.test.ts
git commit -m "feat(server): add ProgressService with upsert and summary"
```

---

## Task 8: ProfileService

**Files:**
- Create: `lib/server/services/profile.service.ts`
- Test: `lib/server/services/__tests__/profile.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/server/services/__tests__/profile.service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../../store'
import { getProfile, updateProfile } from '../profile.service'

describe('ProfileService', () => {
  beforeEach(() => resetStore())

  it('getProfile returns the singleton', () => {
    const p = getProfile()
    expect(p.id).toBe('singleton')
    expect(p.formatoPreferido).toBe('texto')
  })

  it('updateProfile merges partial fields', () => {
    const p = updateProfile({ formatoPreferido: 'audio', friccionPromedio: 0.8 })
    expect(p.formatoPreferido).toBe('audio')
    expect(p.friccionPromedio).toBe(0.8)
    expect(p.id).toBe('singleton')
    expect(p.horariosActivos).toEqual([])
  })

  it('updateProfile ignores incoming id', () => {
    const p = updateProfile({ id: 'hacked' } as Record<string, unknown>)
    expect(p.id).toBe('singleton')
  })

  it('updateProfile rejects invalid formato', () => {
    expect(() => updateProfile({ formatoPreferido: 'invalid' as never })).toThrow()
  })

  it('updateProfile rejects friccionPromedio out of range', () => {
    expect(() => updateProfile({ friccionPromedio: 2 })).toThrow()
  })

  it('updateProfile replaces array fields when provided', () => {
    const p = updateProfile({ horariosActivos: ['morning'], erroresRecurrentes: ['x'] })
    expect(p.horariosActivos).toEqual(['morning'])
    expect(p.erroresRecurrentes).toEqual(['x'])
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
pnpm test
```
Expected: FAIL — `Cannot find module '../profile.service'`.

- [ ] **Step 3: Implement `lib/server/services/profile.service.ts`**

```ts
import { UpdateProfileInputSchema, type Profile } from '../schemas'
import { store } from '../store'

export function getProfile(): Profile {
  return { ...store.profile }
}

export function updateProfile(input: unknown): Profile {
  const parsed = UpdateProfileInputSchema.parse(input)
  Object.assign(store.profile, parsed)
  return { ...store.profile }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — ProfileService tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/profile.service.ts lib/server/services/__tests__/profile.service.test.ts
git commit -m "feat(server): add ProfileService for the singleton profile"
```

---

## Task 9: Materias route handlers

**Files:**
- Create: `app/api/materias/route.ts`
- Create: `app/api/materias/[id]/route.ts`
- Test: `lib/server/__tests__/routes-materias.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/server/__tests__/routes-materias.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../store'
import { GET as getList, POST as postList } from '@/app/api/materias/route'
import { DELETE as del, GET as getOne } from '@/app/api/materias/[id]/route'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Materias routes', () => {
  beforeEach(() => resetStore())

  it('POST /materias creates and returns 201', async () => {
    const res = await postList(jsonRequest('POST', { nombre: 'Cálculo' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.nombre).toBe('Cálculo')
    expect(body.id).toBeTruthy()
  })

  it('POST /materias returns 400 on invalid input', async () => {
    const res = await postList(jsonRequest('POST', { nombre: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('validation')
  })

  it('GET /materias returns 200 with array', async () => {
    await postList(jsonRequest('POST', { nombre: 'A' }))
    const res = await getList()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('GET /materias/:id returns 200 when found', async () => {
    const created = await postList(jsonRequest('POST', { nombre: 'A' })).then((r) => r.json())
    const res = await getOne(jsonRequest('GET'), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(created.id)
  })

  it('GET /materias/:id returns 404 when missing', async () => {
    const res = await getOne(jsonRequest('GET'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('DELETE /materias/:id returns 204 on success', async () => {
    const created = await postList(jsonRequest('POST', { nombre: 'A' })).then((r) => r.json())
    const res = await del(jsonRequest('DELETE'), { params: Promise.resolve({ id: created.id }) })
    expect(res.status).toBe(204)
  })

  it('DELETE /materias/:id returns 404 when missing', async () => {
    const res = await del(jsonRequest('DELETE'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
pnpm test
```
Expected: FAIL — module imports not found.

- [ ] **Step 3: Implement `app/api/materias/route.ts`**

```ts
import { handleRoute } from '@/lib/server/errors'
import {
  createMateria,
  listMaterias,
} from '@/lib/server/services/materias.service'

export const GET = handleRoute(async () => {
  return Response.json(listMaterias(), { status: 200 })
})

export const POST = handleRoute(async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  const created = createMateria(body)
  return Response.json(created, { status: 201 })
})
```

- [ ] **Step 4: Implement `app/api/materias/[id]/route.ts`**

```ts
import { handleRoute } from '@/lib/server/errors'
import {
  deleteMateria,
  getMateria,
} from '@/lib/server/services/materias.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return Response.json(getMateria(id), { status: 200 })
})

export const DELETE = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  deleteMateria(id)
  return new Response(null, { status: 204 })
})
```

- [ ] **Step 5: Run tests, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — Materias route tests green.

- [ ] **Step 6: Commit**

```bash
git add app/api/materias lib/server/__tests__/routes-materias.test.ts
git commit -m "feat(api): add /api/materias route handlers"
```

---

## Task 10: DataRoom route handlers

**Files:**
- Create: `app/api/materias/[id]/files/route.ts`
- Create: `app/api/files/[id]/route.ts`
- Test: `lib/server/__tests__/routes-dataroom.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/server/__tests__/routes-dataroom.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../store'
import { createMateria } from '../services/materias.service'
import { GET as listFiles, POST as uploadFile } from '@/app/api/materias/[id]/files/route'
import { DELETE as deleteFileRoute } from '@/app/api/files/[id]/route'

function multipartRequest(file: { name: string; type: string; bytes: Uint8Array }): Request {
  const fd = new FormData()
  fd.append('file', new Blob([file.bytes], { type: file.type }), file.name)
  return new Request('http://test/local', { method: 'POST', body: fd })
}

describe('DataRoom routes', () => {
  beforeEach(() => resetStore())

  it('POST /materias/:id/files uploads a file (metadata only)', async () => {
    const m = createMateria({ nombre: 'A' })
    const req = multipartRequest({
      name: 'doc.pdf',
      type: 'application/pdf',
      bytes: new Uint8Array([1, 2, 3]),
    })
    const res = await uploadFile(req, { params: Promise.resolve({ id: m.id }) })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.fileName).toBe('doc.pdf')
    expect(body.fileType).toBe('application/pdf')
    expect(body.size).toBe(3)
    expect(body.materiaId).toBe(m.id)
    expect(body.filePath).toBe(`mock://${m.id}/doc.pdf`)
  })

  it('POST /materias/:id/files returns 404 when materia missing', async () => {
    const req = multipartRequest({
      name: 'doc.pdf',
      type: 'application/pdf',
      bytes: new Uint8Array([1]),
    })
    const res = await uploadFile(req, { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('POST /materias/:id/files returns 400 when file field missing', async () => {
    const m = createMateria({ nombre: 'A' })
    const req = new Request('http://test/local', { method: 'POST', body: new FormData() })
    const res = await uploadFile(req, { params: Promise.resolve({ id: m.id }) })
    expect(res.status).toBe(400)
  })

  it('GET /materias/:id/files lists only that materia files', async () => {
    const m = createMateria({ nombre: 'A' })
    await uploadFile(
      multipartRequest({ name: 'x.pdf', type: 'application/pdf', bytes: new Uint8Array([1]) }),
      { params: Promise.resolve({ id: m.id }) },
    )
    const res = await listFiles(new Request('http://test'), {
      params: Promise.resolve({ id: m.id }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('DELETE /files/:id removes the file', async () => {
    const m = createMateria({ nombre: 'A' })
    const created = await uploadFile(
      multipartRequest({ name: 'x.pdf', type: 'application/pdf', bytes: new Uint8Array([1]) }),
      { params: Promise.resolve({ id: m.id }) },
    ).then((r) => r.json())
    const res = await deleteFileRoute(new Request('http://test', { method: 'DELETE' }), {
      params: Promise.resolve({ id: created.id }),
    })
    expect(res.status).toBe(204)
  })

  it('DELETE /files/:id returns 404 when missing', async () => {
    const res = await deleteFileRoute(new Request('http://test', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'nope' }),
    })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
pnpm test
```
Expected: FAIL — module imports not found.

- [ ] **Step 3: Implement `app/api/materias/[id]/files/route.ts`**

```ts
import { ApiError, handleRoute } from '@/lib/server/errors'
import {
  createFile,
  listFilesByMateria,
} from '@/lib/server/services/dataroom.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return Response.json(listFilesByMateria(id), { status: 200 })
})

export const POST = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    throw new ApiError(400, 'validation', "Missing 'file' field in multipart body")
  }
  const created = createFile(id, {
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    size: file.size,
  })
  return Response.json(created, { status: 201 })
})
```

- [ ] **Step 4: Implement `app/api/files/[id]/route.ts`**

```ts
import { handleRoute } from '@/lib/server/errors'
import { deleteFile } from '@/lib/server/services/dataroom.service'

type Ctx = { params: Promise<{ id: string }> }

export const DELETE = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  deleteFile(id)
  return new Response(null, { status: 204 })
})
```

- [ ] **Step 5: Run tests, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — DataRoom route tests green.

- [ ] **Step 6: Commit**

```bash
git add app/api/materias/\[id\]/files app/api/files lib/server/__tests__/routes-dataroom.test.ts
git commit -m "feat(api): add DataRoom file upload and delete routes"
```

---

## Task 11: Progress route handlers

**Files:**
- Create: `app/api/materias/[id]/progress/route.ts`
- Create: `app/api/materias/[id]/progress/summary/route.ts`
- Create: `app/api/nodos/[id]/status/route.ts`
- Test: `lib/server/__tests__/routes-progress.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/server/__tests__/routes-progress.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../store'
import { createMateria } from '../services/materias.service'
import { GET as listProgress } from '@/app/api/materias/[id]/progress/route'
import { GET as getSummary } from '@/app/api/materias/[id]/progress/summary/route'
import { PATCH as patchStatus } from '@/app/api/nodos/[id]/status/route'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Progress routes', () => {
  beforeEach(() => resetStore())

  it('PATCH /nodos/:id/status creates Progress on first call', async () => {
    const res = await patchStatus(jsonRequest('PATCH', { status: 'disponible' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nodoId).toBe('n1')
    expect(body.status).toBe('disponible')
  })

  it('PATCH /nodos/:id/status returns 400 on invalid status', async () => {
    const res = await patchStatus(jsonRequest('PATCH', { status: 'foo' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    expect(res.status).toBe(400)
  })

  it('GET /materias/:id/progress returns 404 when materia missing', async () => {
    const res = await listProgress(jsonRequest('GET'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('GET /materias/:id/progress returns array', async () => {
    const m = createMateria({ nombre: 'A' })
    await patchStatus(jsonRequest('PATCH', { status: 'dominado' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    const res = await listProgress(jsonRequest('GET'), { params: Promise.resolve({ id: m.id }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('GET /materias/:id/progress/summary computes percent', async () => {
    const m = createMateria({ nombre: 'A' })
    await patchStatus(jsonRequest('PATCH', { status: 'dominado' }), {
      params: Promise.resolve({ id: 'n1' }),
    })
    await patchStatus(jsonRequest('PATCH', { status: 'en_curso' }), {
      params: Promise.resolve({ id: 'n2' }),
    })
    const res = await getSummary(jsonRequest('GET'), {
      params: Promise.resolve({ id: m.id }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(2)
    expect(body.dominado).toBe(1)
    expect(body.percentDominado).toBe(50)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
pnpm test
```
Expected: FAIL — module imports not found.

- [ ] **Step 3: Implement `app/api/materias/[id]/progress/route.ts`**

```ts
import { handleRoute } from '@/lib/server/errors'
import { getProgressByMateria } from '@/lib/server/services/progress.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return Response.json(getProgressByMateria(id), { status: 200 })
})
```

- [ ] **Step 4: Implement `app/api/materias/[id]/progress/summary/route.ts`**

```ts
import { handleRoute } from '@/lib/server/errors'
import { getProgressSummaryByMateria } from '@/lib/server/services/progress.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  return Response.json(getProgressSummaryByMateria(id), { status: 200 })
})
```

- [ ] **Step 5: Implement `app/api/nodos/[id]/status/route.ts`**

```ts
import { handleRoute } from '@/lib/server/errors'
import { UpdateProgressStatusInputSchema } from '@/lib/server/schemas'
import { upsertProgressStatus } from '@/lib/server/services/progress.service'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const { status } = UpdateProgressStatusInputSchema.parse(body)
  const progress = upsertProgressStatus(id, status)
  return Response.json(progress, { status: 200 })
})
```

- [ ] **Step 6: Run tests, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — Progress route tests green.

- [ ] **Step 7: Commit**

```bash
git add app/api/materias/\[id\]/progress app/api/nodos lib/server/__tests__/routes-progress.test.ts
git commit -m "feat(api): add Progress and node status routes"
```

---

## Task 12: Profile route handler

**Files:**
- Create: `app/api/profile/route.ts`
- Test: `lib/server/__tests__/routes-profile.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/server/__tests__/routes-profile.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../store'
import { GET as getProfile, PATCH as patchProfile } from '@/app/api/profile/route'

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://test/local', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Profile routes', () => {
  beforeEach(() => resetStore())

  it('GET /profile returns the singleton', async () => {
    const res = await getProfile(jsonRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('singleton')
    expect(body.formatoPreferido).toBe('texto')
  })

  it('PATCH /profile merges fields', async () => {
    const res = await patchProfile(jsonRequest('PATCH', { formatoPreferido: 'audio' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.formatoPreferido).toBe('audio')
    expect(body.id).toBe('singleton')
  })

  it('PATCH /profile returns 400 on invalid', async () => {
    const res = await patchProfile(jsonRequest('PATCH', { formatoPreferido: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('PATCH /profile ignores incoming id', async () => {
    const res = await patchProfile(jsonRequest('PATCH', { id: 'hacked', friccionPromedio: 0.7 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('singleton')
    expect(body.friccionPromedio).toBe(0.7)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
pnpm test
```
Expected: FAIL — module imports not found.

- [ ] **Step 3: Implement `app/api/profile/route.ts`**

```ts
import { handleRoute } from '@/lib/server/errors'
import {
  getProfile as getProfileService,
  updateProfile,
} from '@/lib/server/services/profile.service'

export const GET = handleRoute(async () => {
  return Response.json(getProfileService(), { status: 200 })
})

export const PATCH = handleRoute(async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  const updated = updateProfile(body)
  return Response.json(updated, { status: 200 })
})
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
pnpm test
```
Expected: PASS — Profile route tests green plus all previous suites.

- [ ] **Step 5: Commit**

```bash
git add app/api/profile lib/server/__tests__/routes-profile.test.ts
git commit -m "feat(api): add /api/profile GET and PATCH"
```

---

## Task 13: End-to-end smoke check via dev server

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run:
```bash
pnpm test
```
Expected: PASS — every suite green (errors, schemas, store, 4 services, 4 route suites).

- [ ] **Step 2: Build to catch type errors**

Run:
```bash
pnpm build
```
Expected: build succeeds with no TS errors.

- [ ] **Step 3: Start dev server**

Run (in a separate terminal or background):
```bash
pnpm dev
```
Wait until `Ready` log appears.

- [ ] **Step 4: Smoke-test all endpoints with curl**

Run, copy/paste each block and check the responses:

```bash
# 1. Create materia
curl -s -X POST http://localhost:3000/api/materias \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Cálculo"}' | tee /tmp/m.json

MID=$(jq -r .id /tmp/m.json)
echo "Materia id: $MID"

# 2. List materias
curl -s http://localhost:3000/api/materias

# 3. Get one
curl -s "http://localhost:3000/api/materias/$MID"

# 4. Upload a file (metadata)
echo "hello" > /tmp/sample.txt
curl -s -X POST "http://localhost:3000/api/materias/$MID/files" \
  -F "file=@/tmp/sample.txt" | tee /tmp/f.json
FID=$(jq -r .id /tmp/f.json)

# 5. List files
curl -s "http://localhost:3000/api/materias/$MID/files"

# 6. Patch a node status
curl -s -X PATCH "http://localhost:3000/api/nodos/n1/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"dominado"}'

# 7. Progress summary
curl -s "http://localhost:3000/api/materias/$MID/progress/summary"

# 8. Profile
curl -s http://localhost:3000/api/profile
curl -s -X PATCH http://localhost:3000/api/profile \
  -H 'Content-Type: application/json' \
  -d '{"formatoPreferido":"audio"}'

# 9. Delete file
curl -s -X DELETE "http://localhost:3000/api/files/$FID" -o /dev/null -w '%{http_code}\n'

# 10. Delete materia (cascade)
curl -s -X DELETE "http://localhost:3000/api/materias/$MID" -o /dev/null -w '%{http_code}\n'
```

Expected:
- All POST/PATCH return JSON bodies with the right shape.
- DELETEs return `204`.
- Profile PATCH returns the updated singleton.
- After deleting the materia, `GET /api/materias` returns `[]`.

- [ ] **Step 5: Stop dev server**

- [ ] **Step 6: Final commit (only if any fixes were made during smoke)**

Skip if no changes were needed.

---

## Self-Review

**Spec coverage:**
- ✅ MateriasService (4 endpoints) → Task 5 + 9
- ✅ DataRoomService (3 endpoints, multipart, cascade) → Task 6 + 10
- ✅ ProgressService (3 endpoints, upsert, summary) → Task 7 + 11
- ✅ UserProfileService (2 endpoints, singleton, merge) → Task 8 + 12
- ✅ Error handling + validation pattern → Task 2
- ✅ Zod schemas → Task 3
- ✅ In-memory store + reset → Task 4
- ✅ Vitest infra → Task 1
- ✅ Smoke test → Task 13

**Placeholder scan:** clean. No "TBD" / "TODO" outside the explicit `// TODO bloque 2: filtrar...` inside `progress.service.ts` (intentional, documented in spec).

**Type consistency:** function names match across tasks (`createMateria`, `getMateria`, `deleteMateria`, `listMaterias`, `createFile`, `deleteFile`, `listFilesByMateria`, `upsertProgressStatus`, `getProgressByMateria`, `getProgressSummaryByMateria`, `getProfile`, `updateProfile`). Schema names consistent (`MateriaSchema`, `FileSchema`, etc.). `ProgressSummary` interface defined in service and consumed in route — same shape as in the spec.

No issues to fix.
