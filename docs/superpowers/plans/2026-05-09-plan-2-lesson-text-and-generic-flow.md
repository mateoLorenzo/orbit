# Plan 2 — Lesson text generation + generic lesson flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar el texto de cada lección + 2-3 preguntas multiple-choice on-demand cuando graph-recalc crea nodos nuevos, y renderizar todo en un componente nuevo `lesson-flow-generic` que sirve a cualquier subject que NO sea el demo. El demo flow (`module-learning-flow/`) queda intacto.

**Architecture:** Pipeline: graph-recalc → fan-out a LessonTextGenerationQueue por cada nodo nuevo/modificado → lambda llama Claude Haiku con tool use → guarda `node_content` row con `content_type='lesson_text'`. Frontend: `useNodes(subjectId)` polea hasta tener nodos; `useNodeAssets(nodeId)` polea hasta `lesson_text` esté `ready`. Lesson page hace branching `isDemoSubject()` para renderizar `module-learning-flow` (demo) vs `lesson-flow-generic` (real). Quiz validado server-side via `POST /api/nodes/[id]/quiz` (ya existe de Plan 1).

**Tech Stack:** AWS Lambda + SQS · Drizzle ORM · Anthropic Claude Haiku 4.5 · TanStack Query v5 · Next.js 14 app router

---

## File Structure

**Crear:**
- `lib/demo/index.ts` — `isDemoSubject(s)`, `getDemoNode(subject, nodeId)`
- `lib/demo/historia/lessons.ts` — fixture de los 4 nodos del demo subject
- `lib/hooks/use-nodes.ts` — `useNodes(subjectId)` con polling
- `lib/hooks/use-assets.ts` — `useNodeAssets(nodeId)` con polling, `useSubmitQuiz(nodeId)`
- `lib/api/nodes.ts` — `getNodeAssets`, `submitQuiz` (frontend wrappers)
- `lambdas/lesson-text/index.ts` — handler SQS
- `lambdas/lesson-text/synth.ts` — prompt + tool schema + Claude call
- `components/lesson-flow-generic/index.tsx` — orquestador
- `components/lesson-flow-generic/primitives.tsx` — header + progress bar
- `components/lesson-flow-generic/intro-screen.tsx`
- `components/lesson-flow-generic/content-screen.tsx`
- `components/lesson-flow-generic/quiz-screen.tsx`
- `components/lesson-flow-generic/done-screen.tsx`
- `components/lesson-flow-generic/use-lesson-data.ts`
- `components/lesson-flow-generic/use-quiz-submit.ts`

**Modificar:**
- `sst.config.ts` — agregar `LessonTextGenerationQueue` + `LessonTextGenerator` lambda
- `lambdas/graph-recalc/index.ts` — fan-out a LessonTextGenerationQueue después de crear/updatear nodos
- `lib/query/keys.ts` — agregar `qk.nodeAssets(id)` (ya está de Plan 1; verificar)
- `components/subject-detail-view.tsx` — Clases tab usa `useNodes(subject.id)` en lugar de `subject.content`
- `app/subjects/[id]/lessons/[nodeId]/page.tsx` — branch demo vs generic
- `.env.local` — agregar `SQS_LESSON_TEXT_URL` después del deploy

---

## Phase 0 — Demo scaffold + frontend hooks (1h)

### Task 1: Crear `lib/demo/` con la fixture del demo subject

**Files:**
- Create: `lib/demo/index.ts`
- Create: `lib/demo/historia/lessons.ts`

- [ ] **Step 1: Fixture de las 4 lessons del demo**

Create `lib/demo/historia/lessons.ts`:
```ts
import type { ContentNode } from '@/lib/types'

export const HISTORIA_LESSONS: ContentNode[] = [
  {
    id: 'historia-independencia-1',
    title: 'La Revolución de Mayo',
    description:
      'Las tensiones políticas y sociales que impulsaron el inicio del proceso independentista en el Río de la Plata.',
    type: 'clase',
    status: 'completado',
    order: 1,
  },
  {
    id: 'historia-independencia-2',
    title: 'El Cruce de los Andes',
    description:
      'La estrategia militar y política de José de San Martín para liberar Chile y avanzar sobre el Virreinato del Perú.',
    type: 'clase',
    status: 'en-progreso',
    order: 2,
  },
  {
    id: 'historia-independencia-3',
    title: 'Las Invasiones Inglesas',
    description:
      'El impacto de las invasiones británicas en Buenos Aires y el surgimiento de nuevas identidades políticas.',
    type: 'clase',
    status: 'pendiente',
    order: 3,
  },
  {
    id: 'historia-independencia-4',
    title: 'La Asamblea del Año XIII',
    description:
      'Las primeras iniciativas para organizar políticamente las Provincias Unidas y consolidar la independencia.',
    type: 'clase',
    status: 'pendiente',
    order: 4,
  },
]
```

- [ ] **Step 2: Helpers en lib/demo/index.ts**

Create `lib/demo/index.ts`:
```ts
import type { ContentNode } from '@/lib/types'
import { HISTORIA_LESSONS } from './historia/lessons'

const DEMO_SUBJECT_ID = process.env.NEXT_PUBLIC_DEMO_SUBJECT_ID

export function isDemoSubject(s: { id: string } | null | undefined): boolean {
  return !!s && !!DEMO_SUBJECT_ID && s.id === DEMO_SUBJECT_ID
}

export function getDemoLessons(): ContentNode[] {
  return HISTORIA_LESSONS
}

export function getDemoNode(nodeId: string): ContentNode | null {
  return HISTORIA_LESSONS.find((n) => n.id === nodeId) ?? null
}
```

(`NEXT_PUBLIC_DEMO_SUBJECT_ID` se setea en Plan 5 después del seed. Por ahora `isDemoSubject` devuelve siempre false, lo cual está bien — todos los subjects van por el flow genérico.)

- [ ] **Step 3: Verify TS**

Run: `pnpm tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add lib/demo
git commit -m "$(cat <<'EOF'
feat(demo): scaffold demo subject identification + Historia fixture

isDemoSubject() returns false until NEXT_PUBLIC_DEMO_SUBJECT_ID
is set (Plan 5). HISTORIA_LESSONS holds the same 4 hardcoded
nodes that the existing module-learning-flow expects, just
extracted from lib/data.ts so we can drop that file later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Hooks `useNodes` + `useNodeAssets` + `useSubmitQuiz`

**Files:**
- Create: `lib/api/nodes.ts`
- Create: `lib/hooks/use-nodes.ts`
- Create: `lib/hooks/use-assets.ts`

- [ ] **Step 1: API helper para assets + quiz**

Create `lib/api/nodes.ts`:
```ts
import { api } from './client'

export interface NodeAssets {
  status: 'partial' | 'ready'
  lesson: {
    paragraphs: string[]
    quiz: Array<{ question: string; options: string[] }>
  } | null
  image: { url: string } | null
  audio: { url: string; durationSec: number } | null
  podcast: { url: string; durationSec: number } | null
  video: { url: string; durationSec: number } | null
}

export interface QuizResult {
  passed: boolean
  score: { correct: number; total: number }
  perQuestion: Array<{ correct: number; selected: number }>
}

export const getNodeAssets = (nodeId: string) =>
  api<NodeAssets>(`/api/nodes/${nodeId}/assets`)

export const submitQuiz = (nodeId: string, answers: number[]) =>
  api<QuizResult>(`/api/nodes/${nodeId}/quiz`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
```

- [ ] **Step 2: useNodes hook**

Create `lib/hooks/use-nodes.ts`:
```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { listNodes } from '@/lib/api/subjects'

export function useNodes(subjectId: string) {
  return useQuery({
    queryKey: qk.nodes(subjectId),
    queryFn: () => listNodes(subjectId),
    select: (data) => data.nodes,
    enabled: !!subjectId,
    refetchInterval: (query) => {
      const nodes = (query.state.data as { nodes: unknown[] } | undefined)?.nodes ?? []
      return nodes.length === 0 ? 5000 : false
    },
  })
}
```

- [ ] **Step 3: useNodeAssets + useSubmitQuiz hooks**

Create `lib/hooks/use-assets.ts`:
```ts
'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { getNodeAssets, submitQuiz, type NodeAssets } from '@/lib/api/nodes'

export function useNodeAssets(nodeId: string) {
  return useQuery({
    queryKey: qk.nodeAssets(nodeId),
    queryFn: () => getNodeAssets(nodeId),
    enabled: !!nodeId,
    refetchInterval: (query) => {
      const data = query.state.data as NodeAssets | undefined
      return data?.status === 'ready' ? false : 3000
    },
  })
}

export function useSubmitQuiz(nodeId: string) {
  return useMutation({
    mutationFn: (answers: number[]) => submitQuiz(nodeId, answers),
  })
}
```

- [ ] **Step 4: Verify TS + tests**

```bash
pnpm tsc --noEmit
pnpm test
```
Expected: 0 errors, 25 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/api/nodes.ts lib/hooks/use-nodes.ts lib/hooks/use-assets.ts
git commit -m "$(cat <<'EOF'
feat(hooks): useNodes, useNodeAssets, useSubmitQuiz

useNodes polls every 5s while the subject has 0 nodes (waiting
for graph-recalc). useNodeAssets polls every 3s until
status='ready' (lesson + image + audio all present), then
stops. submitQuiz is a one-shot mutation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Lesson text lambda (2h)

### Task 3: Synth module — Claude prompt + tool schema

**Files:**
- Create: `lambdas/lesson-text/synth.ts`

- [ ] **Step 1: Implementar synth**

Create `lambdas/lesson-text/synth.ts`:
```ts
import { callTool } from '../_shared/anthropic'

export interface LessonText {
  paragraphs: string[]
  quiz: Array<{
    question: string
    options: string[]   // exactly 4
    correctIndex: number  // 0-3
  }>
}

interface SynthInput {
  subjectName: string
  nodeTitle: string
  nodeContentBrief: string
  chunks: string[]    // ordered, top-relevant chunks
  interests: string[] // user.interests for analogies
}

const SYSTEM = `Sos un tutor experto que crea contenido de estudio personalizado en español rioplatense.
Tu tarea: convertir un brief de tema + extractos de los materiales del estudiante en una lección breve + un quiz multiple-choice.

Reglas:
1. NUNCA inventes información que no esté en los chunks proporcionados. Si no hay datos suficientes, hacé párrafos genéricos basados en el brief, pero indicá implícitamente "según los materiales del curso".
2. Los párrafos deben ser entre 3 y 4, cada uno de 2-4 oraciones.
3. El quiz tiene exactamente 2 o 3 preguntas multiple-choice con 4 opciones cada una. Solo UNA respuesta correcta (correctIndex 0-3).
4. Las preguntas deben validar comprensión real, no memoria de detalles triviales.
5. Si el estudiante tiene intereses cargados, usalos como contexto analógico EN LOS PÁRRAFOS (no en las preguntas), sin distorsionar la precisión.
6. Tono: explicativo, claro, segunda persona singular ("podés ver que...").`

const TOOL_SCHEMA = {
  type: 'object',
  properties: {
    paragraphs: {
      type: 'array',
      items: { type: 'string', minLength: 50, maxLength: 800 },
      minItems: 3,
      maxItems: 4,
    },
    quiz: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', minLength: 10, maxLength: 250 },
          options: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 200 },
            minItems: 4,
            maxItems: 4,
          },
          correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
        },
        required: ['question', 'options', 'correctIndex'],
      },
    },
  },
  required: ['paragraphs', 'quiz'],
}

export async function generateLessonText(input: SynthInput): Promise<LessonText> {
  const interestsLine =
    input.interests.length > 0
      ? `\n\nIntereses del estudiante (usá como contexto analógico en los párrafos): ${input.interests.join(', ')}.`
      : ''

  const userPrompt = `Materia: ${input.subjectName}

Tema: ${input.nodeTitle}

Brief del tema:
${input.nodeContentBrief}

Extractos relevantes de los materiales:
${input.chunks.map((c, i) => `--- chunk ${i + 1} ---\n${c}`).join('\n\n')}${interestsLine}

Generá la lección con párrafos + quiz.`

  return callTool<LessonText>({
    model: 'fast',
    system: SYSTEM,
    user: userPrompt,
    toolName: 'submit_lesson',
    toolDescription: 'Devuelve la lección estructurada con párrafos explicativos y quiz multiple-choice.',
    inputSchema: TOOL_SCHEMA,
    maxTokens: 4096,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lambdas/lesson-text/synth.ts
git commit -m "$(cat <<'EOF'
feat(lambda): synth module for lesson text generation

Builds the prompt + JSON schema and calls Claude Haiku via
callTool helper. Quiz is constrained to 2-3 questions with
exactly 4 options each. interests array is injected as
analogical context only — never distorts factual accuracy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Lambda handler — SQS consumer

**Files:**
- Create: `lambdas/lesson-text/index.ts`

- [ ] **Step 1: Handler**

Create `lambdas/lesson-text/index.ts`:
```ts
import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getDb, schema } from '../_shared/db'
import { generateLessonText } from './synth'

const MAX_CHUNKS_PER_PROMPT = 8 // ~5k tokens cap

interface Payload {
  nodeId: string
  subjectId: string
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const db = getDb()

  for (const record of event.Records) {
    let payload: Payload
    try {
      payload = JSON.parse(record.body)
    } catch (err) {
      console.error('lesson-text: invalid JSON', { messageId: record.messageId, err })
      continue
    }

    const { nodeId, subjectId } = payload
    console.log('lesson-text: start', { nodeId, subjectId })

    // Idempotency: skip if a 'ready' lesson_text row already exists.
    const [existing] = await db
      .select()
      .from(schema.nodeContent)
      .where(
        and(
          eq(schema.nodeContent.nodeId, nodeId),
          eq(schema.nodeContent.contentType, 'lesson_text'),
        ),
      )
      .limit(1)
    if (existing && existing.status === 'ready') {
      console.log('lesson-text: already ready, skip', { nodeId })
      continue
    }

    // Load node + subject + interests + top chunks.
    const [node] = await db
      .select()
      .from(schema.nodes)
      .where(eq(schema.nodes.id, nodeId))
      .limit(1)
    if (!node) {
      console.warn('lesson-text: node not found', { nodeId })
      continue
    }

    const [subject] = await db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, subjectId))
      .limit(1)
    if (!subject) {
      console.warn('lesson-text: subject not found', { subjectId })
      continue
    }

    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, subject.userId))
      .limit(1)
    const interests = profile?.interests ?? []

    // Top N chunks by topic embedding similarity if node has one, else first N.
    let chunkRows: { text: string }[] = []
    if (node.topicEmbedding) {
      chunkRows = await db
        .select({ text: schema.fileChunks.text })
        .from(schema.fileChunks)
        .where(eq(schema.fileChunks.subjectId, subjectId))
        .orderBy(
          sql`${schema.fileChunks.embedding} <=> ${JSON.stringify(node.topicEmbedding)}::vector`,
        )
        .limit(MAX_CHUNKS_PER_PROMPT)
    } else {
      chunkRows = await db
        .select({ text: schema.fileChunks.text })
        .from(schema.fileChunks)
        .where(eq(schema.fileChunks.subjectId, subjectId))
        .orderBy(desc(schema.fileChunks.createdAt))
        .limit(MAX_CHUNKS_PER_PROMPT)
    }

    if (chunkRows.length === 0) {
      console.warn('lesson-text: no chunks for subject', { subjectId, nodeId })
      continue
    }

    // Mark generating (creates row if missing).
    if (existing) {
      await db
        .update(schema.nodeContent)
        .set({ status: 'generating', errorMessage: null })
        .where(eq(schema.nodeContent.id, existing.id))
    } else {
      await db.insert(schema.nodeContent).values({
        nodeId,
        contentType: 'lesson_text',
        status: 'generating',
      })
    }

    try {
      const lesson = await generateLessonText({
        subjectName: subject.name,
        nodeTitle: node.title,
        nodeContentBrief: node.contentBrief,
        chunks: chunkRows.map((c) => c.text),
        interests,
      })

      await db
        .update(schema.nodeContent)
        .set({
          status: 'ready',
          generationMetadata: lesson as any,
          errorMessage: null,
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'lesson_text'),
          ),
        )

      console.log('lesson-text: done', { nodeId, paragraphs: lesson.paragraphs.length, quiz: lesson.quiz.length })
    } catch (err) {
      console.error('lesson-text: failed', { nodeId, err })
      await db
        .update(schema.nodeContent)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'lesson_text'),
          ),
        )
      throw err // SQS retry / DLQ
    }
  }
}
```

- [ ] **Step 2: TS check**

Run: `pnpm tsc --noEmit`
Expected: 0 errors. (If lambda types are not in the main project, this is fine — SST builds its own; but the file must be valid TS.)

- [ ] **Step 3: Commit**

```bash
git add lambdas/lesson-text/index.ts
git commit -m "$(cat <<'EOF'
feat(lambda): lesson-text SQS handler

Picks up {nodeId, subjectId} from queue, fetches the node,
top relevant chunks (vector similarity if embedding exists,
else recent), user interests, and generates the lesson via
Claude. Idempotent: skips if a 'ready' row already exists
for (nodeId, content_type='lesson_text').

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: SST resource — queue + lambda

**Files:**
- Modify: `sst.config.ts`

- [ ] **Step 1: Agregar queue**

Modify `sst.config.ts`. Después de la línea `const graphRecalcQ = makeQueueWithDlq('GraphRecalcQueue', ...)` (~línea 93-96), agregar:
```ts
const lessonTextQ = makeQueueWithDlq('LessonTextGenerationQueue', {
  visibilityTimeout: '180 seconds',
})
```

- [ ] **Step 2: Agregar URL al lambdaEnv**

En el bloque `const lambdaEnv = {...}` (~línea 99-110), agregar:
```ts
LESSON_TEXT_QUEUE_URL: lessonTextQ.main.url,
```
(Después de `GRAPH_RECALC_QUEUE_URL`.)

- [ ] **Step 3: Linkear el queue al graph-recalc lambda**

En el bloque `const graphRecalc = new sst.aws.Function(...)` (~línea 179-186), modificar el array `link`:
```ts
link: [...sharedLink, graphRecalcQ.main, lessonTextQ.main],
```

- [ ] **Step 4: Crear el lambda lesson-text**

Después del bloque de graph-recalc, agregar:
```ts
// ─── Lambda: lesson-text ──────────────────────────────────────────────
const lessonText = new sst.aws.Function('LessonTextGenerator', {
  handler: 'lambdas/lesson-text/index.handler',
  memory: '1024 MB',
  timeout: '180 seconds',
  environment: lambdaEnv,
  link: [...sharedLink, lessonTextQ.main],
})
lessonTextQ.main.subscribe(lessonText.arn, {
  transform: { eventSourceMapping: withConcurrency },
})
```

- [ ] **Step 5: Output**

En el bloque `return {...}` al final, agregar:
```ts
LessonTextQueueUrl: lessonTextQ.main.url,
```

- [ ] **Step 6: Commit**

```bash
git add sst.config.ts
git commit -m "$(cat <<'EOF'
feat(sst): add LessonTextGenerationQueue + LessonTextGenerator lambda

180s visibility timeout matches the lambda's max runtime
(Claude generation typically takes 5-15s but we leave headroom
for retries). Concurrency capped via withConcurrency helper
to stay within the unreserved-concurrency budget.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Modificar graph-recalc para fan out

**Files:**
- Modify: `lambdas/graph-recalc/index.ts`

- [ ] **Step 1: Agregar SQS client + import**

Modify `lambdas/graph-recalc/index.ts`. Al inicio del archivo, agregar imports si no están:
```ts
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { Resource } from 'sst'
```
Y después de los demás imports:
```ts
const sqs = new SQSClient({})
```

(Estos imports pueden ya existir parcialmente — verificar y dedup.)

- [ ] **Step 2: Fan out después de procesar nodos**

En el handler, después del bloque que inserta `edgesToInsert` (~línea 217) y antes del console.log final (~línea 232), agregar:
```ts
// Fan out lesson-text generation for new + updated nodes.
const nodesToGenerate: string[] = []
for (const [key, _synthNode] of synthByTitle) {
  const id = titleToId.get(key)
  if (!id) continue
  // Skip nodes whose lesson_text already exists and is 'ready' AND wasn't
  // updated in this run. We approximate "updated in this run" by checking
  // if it's in nodesNeedingEmbedding (same condition).
  const wasUpdated = nodesNeedingEmbedding.some((n) => n.id === id)
  if (wasUpdated || !await hasReadyLesson(db, id)) {
    nodesToGenerate.push(id)
  }
}

for (const nodeId of nodesToGenerate) {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: Resource.LessonTextGenerationQueue.url,
      MessageBody: JSON.stringify({ nodeId, subjectId }),
    }),
  )
}
console.log('graph-recalc: fan-out lesson-text', { subjectId, count: nodesToGenerate.length })
```

Y al final del archivo (fuera del handler), agregar el helper:
```ts
async function hasReadyLesson(
  db: ReturnType<typeof getDb>,
  nodeId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ status: schema.nodeContent.status })
    .from(schema.nodeContent)
    .where(
      and(
        eq(schema.nodeContent.nodeId, nodeId),
        eq(schema.nodeContent.contentType, 'lesson_text'),
      ),
    )
    .limit(1)
  return row?.status === 'ready'
}
```

(Verificar que `and` y `eq` ya están importados de drizzle-orm — sí lo están.)

- [ ] **Step 3: TS check**

Run: `pnpm tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add lambdas/graph-recalc/index.ts
git commit -m "$(cat <<'EOF'
feat(lambda): graph-recalc fans out to LessonTextGenerationQueue

After upserting nodes + edges, enqueue one lesson-text message
per node that's new, updated, or doesn't have a 'ready' lesson
yet. Idempotency lives in the lesson-text lambda itself, so
redundant messages are cheap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Deploy SST + actualizar `.env.local`

**Files:**
- Modify: `.env.local` (gitignored — manual update)

- [ ] **Step 1: Deploy**

Run:
```bash
pnpm sst deploy --stage dev
```
Expected: deploy success. La salida muestra `LessonTextQueueUrl: ...`

- [ ] **Step 2: Update .env.local**

Agregar la nueva URL a `.env.local`, después de `SQS_GRAPH_RECALC_URL`:
```bash
SQS_LESSON_TEXT_URL=<URL desde la salida del deploy>
```

- [ ] **Step 3: Verify lambda exists**

Run:
```bash
aws lambda get-function --function-name $(aws lambda list-functions --query "Functions[?contains(FunctionName, 'LessonTextGenerator')].FunctionName" --output text) --query 'Configuration.{Name:FunctionName,Runtime:Runtime,Memory:MemorySize}'
```
Expected: JSON con el nombre + runtime + memory.

- [ ] **Step 4: NO commit**

(`.env.local` es gitignored. SST genera archivos extra en `.sst/` que ya están gitignored.)

---

## Phase 2 — Generic lesson flow component (1.5h)

### Task 8: Componentes presentacionales (intro/done/quiz primitives)

**Files:**
- Create: `components/lesson-flow-generic/primitives.tsx`
- Create: `components/lesson-flow-generic/intro-screen.tsx`
- Create: `components/lesson-flow-generic/done-screen.tsx`
- Create: `components/lesson-flow-generic/quiz-screen.tsx`
- Create: `components/lesson-flow-generic/content-screen.tsx`

- [ ] **Step 1: primitives.tsx — header + progress bar reutilizable**

Create `components/lesson-flow-generic/primitives.tsx`:
```tsx
'use client'

interface FlowHeaderProps {
  title: string
  percent: number
}

export function FlowHeader({ title, percent }: FlowHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-black/8 bg-white px-6 py-4">
      <p className="text-center text-base font-medium tracking-[-0.32px] text-black">{title}</p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/8">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: intro-screen.tsx**

Create `components/lesson-flow-generic/intro-screen.tsx`:
```tsx
'use client'

import { ArrowRight } from 'lucide-react'

interface Props {
  subjectName: string
  nodeTitle: string
  onStart: () => void
}

export function IntroScreen({ subjectName, nodeTitle, onStart }: Props) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/40">{subjectName}</p>
        <h1 className="max-w-2xl text-4xl font-medium leading-tight tracking-[-0.5px] text-[#ff4f00]">
          {nodeTitle}
        </h1>
        <p className="text-base font-medium tracking-[-0.32px] text-black/60">
          ¿Listo para comenzar el tema?
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ff4f00] px-5 text-base font-medium text-white transition-opacity hover:opacity-90"
      >
        Comenzar
        <ArrowRight className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  )
}
```

- [ ] **Step 3: content-screen.tsx (texto + paragraphs)**

Create `components/lesson-flow-generic/content-screen.tsx`:
```tsx
'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'

interface Props {
  paragraphs: string[]
  onBack: () => void
  onNext: () => void
}

export function ContentScreen({ paragraphs, onBack, onNext }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-3xl flex-col gap-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed tracking-[-0.32px] text-black">
              {p}
            </p>
          ))}
        </div>
      </div>
      <footer className="flex items-center justify-between border-t border-black/8 bg-white px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/12 px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Volver
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-opacity hover:opacity-90"
        >
          Siguiente
          <ArrowRight className="size-4" strokeWidth={2} />
        </button>
      </footer>
    </div>
  )
}
```

- [ ] **Step 4: quiz-screen.tsx**

Create `components/lesson-flow-generic/quiz-screen.tsx`:
```tsx
'use client'

import { ArrowRight } from 'lucide-react'

interface Props {
  question: string
  options: string[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  onContinue: () => void
}

export function QuizScreen({ question, options, selectedIndex, onSelect, onContinue }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-2xl font-light tracking-[-0.5px] text-black/40">Una breve pregunta</p>
        <h2 className="text-3xl font-medium leading-tight tracking-[-0.5px] text-black">
          {question}
        </h2>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-3">
        {options.map((opt, i) => {
          const isSelected = selectedIndex === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`rounded-2xl border px-5 py-4 text-center text-lg font-medium tracking-[-0.32px] transition-colors ${
                isSelected
                  ? 'border-[#ff4f00] bg-[#ff4f00]/10 text-[#ff4f00]'
                  : 'border-black/8 bg-white text-black hover:bg-black/4'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={selectedIndex === null}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ff4f00] px-5 text-base font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </button>
        <p className="text-sm text-black/40">Sabrás la respuesta correcta al finalizar el tema</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: done-screen.tsx (con score + per-question feedback)**

Create `components/lesson-flow-generic/done-screen.tsx`:
```tsx
'use client'

import { Check, X } from 'lucide-react'
import type { QuizResult } from '@/lib/api/nodes'

interface Props {
  result: QuizResult
  questions: Array<{ question: string; options: string[] }>
  onContinueNext?: () => void
  onBackToSubject: () => void
}

export function DoneScreen({ result, questions, onContinueNext, onBackToSubject }: Props) {
  const { score, perQuestion, passed } = result
  const headlineColor = passed ? '#17a758' : '#d62828'
  const headline = passed ? '¡Bien hecho!' : 'Casi'
  const subtitle = passed
    ? `Acertaste ${score.correct} de ${score.total}.`
    : `Acertaste ${score.correct} de ${score.total}. Necesitás 2 de 3 para avanzar.`

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-medium leading-tight tracking-[-0.5px]" style={{ color: headlineColor }}>
          {headline}
        </h1>
        <p className="text-2xl font-medium tracking-[-0.5px] text-black">{subtitle}</p>
      </div>

      <ul className="flex w-full max-w-2xl flex-col gap-4">
        {questions.map((q, i) => {
          const r = perQuestion[i]
          const correct = r.correct === r.selected
          return (
            <li key={i} className="rounded-2xl border border-black/8 bg-white p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: correct ? '#17a758' : '#d62828' }}
                >
                  {correct ? (
                    <Check className="size-4 text-white" strokeWidth={3} />
                  ) : (
                    <X className="size-4 text-white" strokeWidth={3} />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-base font-medium tracking-[-0.32px] text-black">{q.question}</p>
                  <p className="text-sm text-black/60">
                    Respuesta correcta: <strong>{q.options[r.correct]}</strong>
                  </p>
                  {!correct && r.selected >= 0 && (
                    <p className="text-sm text-[#d62828]">
                      Respondiste: {q.options[r.selected]}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col items-center gap-2">
        {passed && onContinueNext ? (
          <button
            type="button"
            onClick={onContinueNext}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff4f00] px-5 text-base font-medium text-white transition-opacity hover:opacity-90"
          >
            Continuar hacia el siguiente
          </button>
        ) : null}
        <button
          type="button"
          onClick={onBackToSubject}
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/12 px-5 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
        >
          Volver a la materia
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: TS check + commit**

```bash
pnpm tsc --noEmit
git add components/lesson-flow-generic
git commit -m "$(cat <<'EOF'
feat(lesson-generic): presentational screens (intro, content, quiz, done)

Five small presentational components consumed by the
orchestrator in Task 9. Look mirrors module-learning-flow's
demo screens but stripped of audio/video — just text + quiz.
Quiz feedback shown on done-screen with per-question correct
/incorrect markers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Hooks + orquestador del flow

**Files:**
- Create: `components/lesson-flow-generic/use-lesson-data.ts`
- Create: `components/lesson-flow-generic/use-quiz-submit.ts`
- Create: `components/lesson-flow-generic/index.tsx`

- [ ] **Step 1: use-lesson-data.ts (re-export del hook ya creado)**

Create `components/lesson-flow-generic/use-lesson-data.ts`:
```ts
'use client'

export { useNodeAssets } from '@/lib/hooks/use-assets'
```

(Wrapper trivial. Existe para mantener todos los hooks específicos del flow co-localizados.)

- [ ] **Step 2: use-quiz-submit.ts (re-export)**

Create `components/lesson-flow-generic/use-quiz-submit.ts`:
```ts
'use client'

export { useSubmitQuiz } from '@/lib/hooks/use-assets'
```

- [ ] **Step 3: index.tsx — orquestador**

Create `components/lesson-flow-generic/index.tsx`:
```tsx
'use client'

import { useMemo, useState } from 'react'
import { FlowHeader } from './primitives'
import { IntroScreen } from './intro-screen'
import { ContentScreen } from './content-screen'
import { QuizScreen } from './quiz-screen'
import { DoneScreen } from './done-screen'
import { useNodeAssets } from './use-lesson-data'
import { useSubmitQuiz } from './use-quiz-submit'
import type { QuizResult } from '@/lib/api/nodes'

interface Props {
  subjectName: string
  subjectId: string
  nodeId: string
  nodeTitle: string
  onExit: () => void
  onContinueNext?: () => void
}

type Step =
  | { kind: 'intro' }
  | { kind: 'content' }
  | { kind: 'quiz'; index: number }
  | { kind: 'done' }

export default function LessonFlowGeneric({
  subjectName,
  subjectId,
  nodeId,
  nodeTitle,
  onExit,
  onContinueNext,
}: Props) {
  const assetsQuery = useNodeAssets(nodeId)
  const submitMutation = useSubmitQuiz(nodeId)

  const lesson = assetsQuery.data?.lesson ?? null

  const [step, setStep] = useState<Step>({ kind: 'intro' })
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)

  const totalQuiz = lesson?.quiz.length ?? 0
  const completedSteps = useMemo(() => {
    if (step.kind === 'intro') return 0
    if (step.kind === 'content') return 1
    if (step.kind === 'quiz') return 1 + step.index + 1
    return 1 + totalQuiz
  }, [step, totalQuiz])
  const totalSteps = 1 + totalQuiz
  const progressPercent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100)
  const showHeader = step.kind === 'content' || step.kind === 'quiz'

  // Loading state: lesson not generated yet.
  if (!lesson || lesson.paragraphs.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f8f8f8] text-center">
        <div className="size-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
        <p className="text-base font-medium tracking-[-0.32px] text-black/60">
          Generando lección a partir de tus materiales...
        </p>
        <p className="text-sm text-black/40">Esto suele tomar 5-15 segundos.</p>
      </div>
    )
  }

  const handleStart = () => setStep({ kind: 'content' })

  const handleContentNext = () => {
    if (totalQuiz === 0) {
      // Skip quiz, go to done immediately.
      submitMutation.mutate([], {
        onSuccess: (r) => {
          setResult(r)
          setStep({ kind: 'done' })
        },
      })
    } else {
      setStep({ kind: 'quiz', index: 0 })
    }
  }
  const handleContentBack = () => setStep({ kind: 'intro' })

  const handleQuizSelect = (i: number) => {
    if (step.kind !== 'quiz') return
    setSelections((s) => ({ ...s, [step.index]: i }))
  }

  const handleQuizContinue = () => {
    if (step.kind !== 'quiz') return
    const next = step.index + 1
    if (next < totalQuiz) {
      setStep({ kind: 'quiz', index: next })
    } else {
      const answers = Array.from({ length: totalQuiz }, (_, i) => selections[i] ?? -1)
      submitMutation.mutate(answers, {
        onSuccess: (r) => {
          setResult(r)
          setStep({ kind: 'done' })
        },
      })
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8] text-black">
      {showHeader && <FlowHeader title={subjectName} percent={progressPercent} />}

      <div className="flex min-h-0 flex-1 flex-col">
        {step.kind === 'intro' && (
          <IntroScreen subjectName={subjectName} nodeTitle={nodeTitle} onStart={handleStart} />
        )}
        {step.kind === 'content' && (
          <ContentScreen
            paragraphs={lesson.paragraphs}
            onBack={handleContentBack}
            onNext={handleContentNext}
          />
        )}
        {step.kind === 'quiz' && (
          <QuizScreen
            question={lesson.quiz[step.index].question}
            options={lesson.quiz[step.index].options}
            selectedIndex={selections[step.index] ?? null}
            onSelect={handleQuizSelect}
            onContinue={handleQuizContinue}
          />
        )}
        {step.kind === 'done' && result && (
          <DoneScreen
            result={result}
            questions={lesson.quiz}
            onContinueNext={onContinueNext}
            onBackToSubject={onExit}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TS check + commit**

```bash
pnpm tsc --noEmit
git add components/lesson-flow-generic
git commit -m "$(cat <<'EOF'
feat(lesson-generic): orchestrator with intro/content/quiz/done flow

Polls /api/nodes/[id]/assets until lesson is ready, then walks
the user through intro → content (paragraphs) → quiz (one
screen per question) → done (score + per-question feedback).
Submit happens once after the last quiz answer; the server
grades and marks progress mastered if pass-rate >= 66%.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Wire Clases tab + lesson page (1h)

### Task 10: Refactor Clases tab para usar `useNodes`

**Files:**
- Modify: `components/subject-detail-view.tsx`

- [ ] **Step 1: Leer la sección Clases**

Read `components/subject-detail-view.tsx` para ubicar:
- Donde se renderiza `subject.content.map(...)` con las cards (`CompletedLessonCard`, `ActiveLessonCard`, etc.)
- Donde se calcula `flattenContent` y `getCardStates`

- [ ] **Step 2: Importar useNodes + adapter**

En el bloque de imports al inicio:
```ts
import { useNodes } from '@/lib/hooks/use-nodes'
import type { ContentNode } from '@/lib/types'
```

- [ ] **Step 3: Crear adapter local de NodeWithProgress → ContentNode**

Antes de la función `SubjectDetailView` (~línea 303), agregar:
```ts
function nodeToContentNode(
  n: { id: string; title: string; contentBrief: string; progressStatus: 'locked' | 'available' | 'in_progress' | 'mastered' },
  index: number,
): ContentNode {
  const statusMap = {
    locked: 'pendiente',
    available: 'pendiente',
    in_progress: 'en-progreso',
    mastered: 'completado',
  } as const
  return {
    id: n.id,
    title: n.title,
    description: n.contentBrief,
    type: 'clase',
    status: statusMap[n.progressStatus],
    order: index + 1,
  }
}
```

- [ ] **Step 4: Reemplazar `subject.content` por la query**

Dentro de `SubjectDetailView`:

Encontrar:
```ts
const totalPages = Math.max(1, Math.ceil(subject.content.length / PAGE_SIZE))
```
(Y todo lo que use `subject.content`.)

Antes de eso, agregar:
```ts
const nodesQuery = useNodes(subject.id)
const lessons: ContentNode[] = (nodesQuery.data ?? []).map(nodeToContentNode)
```

Reemplazar TODAS las referencias a `subject.content` con `lessons`. Hay al menos 5 (totalPages, visibleClasses, cardStates, etc.).

Específicamente:
```ts
const totalPages = Math.max(1, Math.ceil(lessons.length / PAGE_SIZE))
const safePage = Math.min(page, totalPages - 1)
const startIndex = safePage * PAGE_SIZE
const visibleClasses = lessons.slice(startIndex, startIndex + PAGE_SIZE)
const visibleStates = cardStates.slice(startIndex, startIndex + PAGE_SIZE)
```

Y `getSubjectProgress` y `getCardStates`:
```ts
const progress = useMemo(() => getSubjectProgressFromNodes(lessons), [lessons])
const cardStates = useMemo(() => getCardStates(lessons), [lessons])
```

Para que `getSubjectProgress` funcione con la nueva fuente, agregar al inicio del archivo (~al lado de `getSubjectProgress` original, ~línea 29):
```ts
function getSubjectProgressFromNodes(nodes: ContentNode[]): number {
  if (nodes.length === 0) return 0
  const completed = nodes.filter((n) => n.status === 'completado').length
  return Math.round((completed / nodes.length) * 100)
}
```

(`getCardStates` ya acepta `ContentNode[]` directamente — no requiere cambios.)

- [ ] **Step 5: Manejar estado vacío + loading**

Donde se renderean las cards (~línea 410-498), antes del map agregar:
```tsx
{nodesQuery.isLoading ? (
  <div className="px-6 py-10 text-center text-base text-black/50">
    Cargando lecciones...
  </div>
) : lessons.length === 0 ? (
  <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
    <p className="text-base font-medium tracking-[-0.32px] text-black">
      Estamos generando las lecciones a partir de tus PDFs.
    </p>
    <p className="text-sm text-black/50">
      Esto suele tomar 1-3 minutos. Esta página se va a actualizar sola.
    </p>
  </div>
) : (
  /* keep the existing cards markup */
)}
```

- [ ] **Step 6: Verify TS + tests**

```bash
pnpm tsc --noEmit
pnpm test
```
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add components/subject-detail-view.tsx
git commit -m "$(cat <<'EOF'
refactor(clases): render real nodes from useNodes(subjectId)

Clases tab now lists real lessons generated by graph-recalc.
Empty state explains the wait while the pipeline runs. The
hook polls every 5s while nodes.length === 0, then stops.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Refactor lesson page — branch demo vs generic

**Files:**
- Modify: `app/subjects/[id]/lessons/[nodeId]/page.tsx`

- [ ] **Step 1: Reescribir el archivo**

Replace the entire `app/subjects/[id]/lessons/[nodeId]/page.tsx` content with:
```tsx
'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppSidebar from '@/components/app-sidebar'
import ModuleLearningFlow from '@/components/module-learning-flow'
import LessonFlowGeneric from '@/components/lesson-flow-generic'
import { useSubject } from '@/lib/hooks/use-subject'
import { useNodes } from '@/lib/hooks/use-nodes'
import { mapSubjectRow } from '@/lib/domain/adapters'
import { isDemoSubject, getDemoLessons, getDemoNode } from '@/lib/demo'

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = (params.id as string) ?? ''
  const nodeId = (params.nodeId as string) ?? ''

  const subjectQuery = useSubject(subjectId)
  const isDemo = isDemoSubject(subjectQuery.data ?? null)
  const nodesQuery = useNodes(subjectId)

  const onExit = () => router.push(`/subjects/${subjectId}`)

  if (subjectQuery.isLoading) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <p className="text-base text-black/50">Cargando lección...</p>
        </main>
      </div>
    )
  }

  if (!subjectQuery.data) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Lección no encontrada</p>
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

  const subject = mapSubjectRow(subjectQuery.data)

  // Demo branch: use the existing ModuleLearningFlow with the local fixture.
  if (isDemo) {
    const demoNode = getDemoNode(nodeId)
    if (!demoNode) return null
    const lessons = getDemoLessons()
    const idx = lessons.findIndex((l) => l.id === demoNode.id)
    const next = idx >= 0 ? lessons[idx + 1] : undefined
    return (
      <ModuleLearningFlow
        subject={{ ...subject, content: lessons }}
        node={demoNode}
        onExit={onExit}
        onContinueNext={
          next ? () => router.push(`/subjects/${subjectId}/lessons/${next.id}`) : undefined
        }
      />
    )
  }

  // Generic branch: real backend-generated lesson.
  const realNodes = nodesQuery.data ?? []
  const currentNode = realNodes.find((n) => n.id === nodeId)
  if (!currentNode) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Lección no encontrada</p>
            <Link
              href={`/subjects/${subjectId}`}
              className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
            >
              Volver
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const idx = realNodes.findIndex((n) => n.id === nodeId)
  const next = idx >= 0 ? realNodes[idx + 1] : undefined

  return (
    <LessonFlowGeneric
      subjectName={subject.name}
      subjectId={subjectId}
      nodeId={nodeId}
      nodeTitle={currentNode.title}
      onExit={onExit}
      onContinueNext={
        next ? () => router.push(`/subjects/${subjectId}/lessons/${next.id}`) : undefined
      }
    />
  )
}
```

- [ ] **Step 2: TS check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/subjects/\[id\]/lessons/\[nodeId\]/page.tsx
git commit -m "$(cat <<'EOF'
refactor(lesson-page): branch demo vs generic flow

Demo subject (identified by NEXT_PUBLIC_DEMO_SUBJECT_ID) keeps
using ModuleLearningFlow with the local Historia fixture.
Every other subject loads its real generated lesson via
LessonFlowGeneric. Both branches share the same exit and
continue-to-next navigation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Smoke E2E + push (0.5h)

### Task 12: End-to-end con Playwright + push

**Files:** ninguno

- [ ] **Step 1: Verify checks**

```bash
pnpm test
pnpm tsc --noEmit
```
Expected: limpios.

- [ ] **Step 2: E2E manual via browser**

```bash
pnpm dev > /tmp/devlog.txt 2>&1 &
sleep 10
```

En el browser:
1. Home → "+ Nueva materia" → "Plan 2 Smoke"
2. Documentación → subir un PDF chico
3. Esperar status "Listo"
4. Después de ~30s-2min, volver a Clases → ver cards de lessons aparecer
5. Click en una card → ver "Generando lección..." (5-15s) → contenido + quiz
6. Responder las 2-3 preguntas → Done screen con score
7. Si pass: click "Continuar hacia el siguiente" → próxima lección o si era la última, vuelve

```bash
kill %1
```

- [ ] **Step 3: Push branch**

```bash
git push origin plan-2-lesson-text-and-generic-flow
```

- [ ] **Step 4: Done**

Reportar:
- ¿Cuántos commits?
- ¿E2E completo?
- URL del PR.

---

## Out of scope para Plan 2

- Lambdas image / audio / podcast / video → **Plan 3-4**
- Format toggle (texto / audio / video / podcast) en lesson view → **Plan 3-4** (cuando los assets existen)
- Profile UI (displayName + interests editables) → **Plan 5**
- Borrado de AppContext + data.ts + sources-tab.tsx → **Plan 5**
- Seed del demo subject → **Plan 5**
- Vercel deploy → **Plan 5**
