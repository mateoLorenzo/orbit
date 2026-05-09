# Orbit — Frontend ↔ Backend wiring (con lesson genérico)

**Fecha:** 2026-05-09
**Estado:** diseño aprobado, pendiente implementación
**Owner:** Ian (ponce.ain@gmail.com)

## Contexto y motivación

La app hoy es un prototipo visual: una sola lección sobre el Cruce de los Andes (Historia de la Independencia) está completamente armada con audio, video, narración sincronizada y quiz, pero el resto de la UI consume datos mock desde `lib/app-context.tsx` + `lib/data.ts` y nunca toca el backend. El pipeline de procesamiento (S3 → file-router → pdf-processor → embedder → graph-recalc) funciona end-to-end y está deployed en SST stage `dev`, pero no se invoca desde la UI.

Este diseño cubre el wiring para que el flujo completo del usuario funcione:

1. Crear materia desde el modal "Nueva Materia"
2. Entrar a la materia, ir a Documentación, subir PDFs
3. Las lambdas procesan automáticamente (existing pipeline)
4. Ver las cards de Clases generadas con AI
5. Entrar a una card y ver contenido + quiz
6. Completar la clase respondiendo el quiz, avanzar al siguiente nodo

**Constraint clave:** la materia "Historia de los Procesos de Independencia Latinoamericana" se usa para el pitch de 4-5 min y mantiene su flow actual (`components/module-learning-flow/` con video + audio + narración hardcoded). Para todo el resto de las materias, usamos un flow genérico nuevo que renderiza texto + quiz generados por Claude on-demand.

## Decisiones de scope

- **Solo grafo de lessons.** No construimos lambdas para imagen, audio, video, podcast, infografía. El pipeline existente termina en `paths` + `nodes` y eso alcanza.
- **Mock se preserva para el demo.** El subject de Historia se identifica vía `NEXT_PUBLIC_DEMO_SUBJECT_ID` y renderiza el flow existente sin modificaciones. Otros subjects renderean el flow genérico nuevo.
- **TanStack Query v5** como capa de server-state. Se elimina `lib/app-context.tsx` completo.
- **Un solo IAM user** (`orbit-app`) para dev local + Vercel, scopeado a buckets de stage `dev`.

## Arquitectura

### Stack y modularización

```
lib/
  api/
    client.ts              # fetch wrapper tipado, ApiError class
    subjects.ts            # listSubjects, getSubject, createSubject
    files.ts               # listFiles, requestUpload, putToS3
    nodes.ts               # listNodesForSubject, getNodeLesson, submitQuiz
  query/
    client.ts              # singleton QueryClient (staleTime 30s, retry 1, refetchOnWindowFocus false)
    keys.ts                # qk.subjects(), qk.subject(id), qk.files(id), qk.nodes(id), qk.nodeLesson(id)
    provider.tsx           # 'use client' wrapper
  hooks/
    use-subjects.ts        # useSubjects(), useCreateSubject()
    use-subject.ts         # useSubject(id)
    use-files.ts           # useFiles(id), useUploadFile(id)
    use-nodes.ts           # useNodes(id), useNode(id, nodeId)
    use-lesson.ts          # useNodeLesson(nodeId), useSubmitQuiz(nodeId)
    use-progress.ts        # useProgressSummary(id)
  domain/
    adapters.ts            # mapSubjectRow, mapNodeRow, mapFileRow → UI types
  demo/
    index.ts               # isDemoSubject(s), getDemoNode(s, nodeId)
    historia/
      lessons.ts           # fixture con los 4 nodos demo (Revolución de Mayo, Cruce, etc.)
  anthropic/
    lesson.ts              # generateLesson({ title, brief, chunks }) → { paragraphs, quiz }
```

**Borrado:**
- `lib/app-context.tsx`
- `lib/data.ts`
- `components/sources-tab.tsx` (dead code, nunca importado)
- `<AppProvider>` en `app/layout.tsx`

### Componentes

**Sin cambios:**
- `components/module-learning-flow/` — flow del demo, intacto
- `components/app-sidebar.tsx`, `components/career-progress-shader.tsx`, etc. (cosmética)
- `public/audio/*.mp3`, `/SanMartinAndes.mp4`, `/Historical.mp4`, `/learning-*.png` — assets demo

**Refactorizados (cambian fuente de datos, no apariencia):**
- `components/home-page.tsx` — `useApp()` → `useSubjects()`
- `components/subject-detail-view.tsx` — `addSource` → `useUploadFile`; lee files reales con `useFiles`
- `components/add-subject-modal.tsx` — `addSubject` → `useCreateSubject` + redirect a UUID nuevo
- `app/subjects/[id]/page.tsx` — `useApp()` → `useSubject(id)`
- `app/subjects/[id]/lessons/[nodeId]/page.tsx` — branch demo vs genérico

**Nuevos:**
- `components/lesson-flow-generic/`
  - `index.tsx` — orquestador (intro → content → quiz → done)
  - `intro-screen.tsx`
  - `content-screen.tsx` — texto solo, sin audio/video
  - `quiz-screen.tsx` — multiple-choice, sin feedback inmediato
  - `done-screen.tsx` — score + per-question feedback + "siguiente clase"

### Backend — endpoints nuevos

**`GET /api/subjects/[id]/nodes`**

Devuelve nodos con su progress status, ordenados por path.
```ts
{ nodes: Array<{
    id: string
    pathId: string
    title: string
    contentBrief: string
    progressStatus: 'locked' | 'available' | 'in_progress' | 'mastered'
  }> }
```
Implementación: 1 query Drizzle con LEFT JOIN a progress por `DEMO_USER_ID`.

**`GET /api/nodes/[id]/lesson`**

Devuelve la lección generada (paragraphs + quiz). Cache hit en `node_content` con `content_type='lesson_text'`. Cache miss → genera con Claude Haiku 4.5 vía `lib/anthropic/lesson.ts`, guarda en `generation_metadata`, devuelve.

Response shape (lo que recibe el cliente — **sin `correctIndex`**):
```ts
{
  paragraphs: string[],          // 3-4 párrafos explicativos
  quiz: Array<{
    question: string,
    options: string[4]
  }>
}
```

El `correctIndex` se guarda en `node_content.generation_metadata` y nunca se devuelve al cliente. El endpoint hace el strip antes de serializar la respuesta. La validación de respuestas se hace server-side en `POST /api/nodes/[id]/quiz`.

**`POST /api/nodes/[id]/quiz`**

Body: `{ answers: number[] }`
Lookup correctIndex desde cache, calcula passRate. Si ≥ 0.66 → upsert progress = 'mastered'. Devuelve:
```ts
{
  passed: boolean,
  score: { correct: number, total: number },
  perQuestion: Array<{ correct: number, selected: number }>
}
```

### Hooks principales

```ts
// useFiles con polling dinámico
useFiles(subjectId) {
  return useQuery({
    queryKey: qk.files(subjectId),
    queryFn: () => listFiles(subjectId),
    refetchInterval: (query) => {
      const inFlight = (query.state.data?.files ?? [])
        .some(f => f.status === 'pending' || f.status === 'processing')
      return inFlight ? 3000 : false
    },
  })
}

// useUploadFile orquesta los 3 pasos
useUploadFile(subjectId) {
  return useMutation({
    mutationFn: async (file: File) => {
      const { fileId, uploadUrl, requiredHeaders } =
        await requestUpload(subjectId, { filename: file.name, mimeType: file.type, sizeBytes: file.size })
      await putToS3(uploadUrl, file, requiredHeaders)
      return fileId
    },
    onMutate: optimisticInsert,
    onError: rollback,
    onSettled: () => qc.invalidateQueries({ queryKey: qk.files(subjectId) }),
  })
}

// useNodes igual con polling cuando subject está procesando
useNodes(subjectId) {
  return useQuery({
    queryKey: qk.nodes(subjectId),
    queryFn: () => listNodes(subjectId),
    refetchInterval: (query) => (query.state.data?.nodes.length ?? 0) === 0 ? 5000 : false,
  })
}
```

### Demo subject identification

```ts
// lib/demo/index.ts
const DEMO_SUBJECT_ID = process.env.NEXT_PUBLIC_DEMO_SUBJECT_ID

export function isDemoSubject(s: { id: string } | null | undefined): boolean {
  return !!s && !!DEMO_SUBJECT_ID && s.id === DEMO_SUBJECT_ID
}

export function getDemoNode(subject, nodeId) {
  // Resolver nodeId → demo lesson fixture (lib/demo/historia/lessons.ts)
}
```

Routing en `lessons/[nodeId]/page.tsx`:
```tsx
const { data: subject } = useSubject(id)
if (isDemoSubject(subject)) {
  return <ModuleLearningFlow {...} />  // intacto
}
return <GenericLessonFlow subjectId={id} nodeId={nodeId} {...} />
```

## Tiempo estimado por lección (datos empíricos del walkthrough)

Medido contra el flow demo actual (`/audio/lesson-1.mp3` = 34.4s, `lesson-2.mp3` = 33s, slide 3 sin audio):

| Modo | Tiempo total |
|---|---|
| Skip todo (mín. técnico) | ~50s |
| Normal (audio + leer) | ~2:50 min |
| Estudio profundo | ~4:40 min |

El UI hoy muestra "15 min" hardcoded (`ESTIMATED_LESSON_MINUTES = 15` en `subject-detail-view.tsx:23`). Ese número es engañoso. Como parte del refactor de la card, calcular dinámicamente:
- Demo: hardcoded 4 min (real average)
- Genérico: `paragraphs.length * 30s + quiz.length * 25s + 15s overhead` ≈ 2-3 min

## Error handling

- **`ApiError`** propagado por `useQuery`/`useMutation`. Componentes leen `error?.message`.
- **Upload error**: rollback optimistic + toast inline.
- **404 en subject**: pantalla "Materia no encontrada" (existente).
- **Network**: react-query retry 1 vez por default; después error inline + botón "Reintentar".
- **Lesson generation tarda**: spinner "Generando lección" (5-15s típico para Claude Haiku).
- **Quiz fail**: done screen muestra score + opciones "Repetir quiz" o "Volver a estudiar"; no marca mastered.

## IAM user

Policy `scripts/iam/orbit-app-policy.json` scopeada a buckets de stage `dev`:
- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` en originals bucket
- `s3:GetObject` en artifacts bucket
- `s3:GetBucketLocation` en ambos

Comandos:
```bash
aws iam create-user --user-name orbit-app --profile personal
aws iam put-user-policy --user-name orbit-app \
  --policy-name OrbitApp \
  --policy-document file://scripts/iam/orbit-app-policy.json \
  --profile personal
aws iam create-access-key --user-name orbit-app --profile personal
```

Las creds resultantes (long-lived) reemplazan las temp en `.env.local`. Borrar `AWS_SESSION_TOKEN` y `AWS_CREDENTIAL_EXPIRATION`. Para Vercel, pegar todas las vars en Project Settings → Environment Variables (Production + Preview + Development).

Trade-off conocido: un solo user para dev + Vercel = blast radius mayor si leak. Aceptado para el hack; post-hack separar en `orbit-app-dev` y `orbit-app-prod`.

## Seed del demo subject

`scripts/seed-demo-subject.ts` (idempotente):
1. `getOrCreateSubject({ name: 'Historia de los Procesos de Independencia Latinoamericana', userId: DEMO_USER_ID })`.
2. Para cada PDF en `seed-data/historia/*.pdf` (carpeta nueva, gitignored): si no hay file row con ese filename para el subject, presign + PUT.
3. Loguear el subject UUID al final con instrucción explícita: pegar como `NEXT_PUBLIC_DEMO_SUBJECT_ID` en `.env.local`.

Comando: `pnpm seed:demo` (envuelto en `scripts/with-aws.sh` o usando el IAM user nuevo directo).

## Testing

**Unit (vitest):**
- `lib/domain/adapters.ts` — todos los mappers, edge cases null/undefined, status enums.
- `lib/api/client.ts` — `ApiError` correcto, parse JSON happy path.
- `lib/anthropic/lesson.ts` — mock cliente Anthropic, verificar prompt incluye datos correctos + parseo del output.

**Integration (vitest + msw):**
- `useFiles` — `refetchInterval` activo con pending/processing, false con todos processed.
- `useUploadFile` — optimistic insert + rollback en error.

**Backend integration (vitest + DB Supabase):**
- `GET /api/subjects/[id]/nodes` — orden, status mapping.
- `POST /api/nodes/[id]/quiz` — passRate calc, mark mastered cuando ≥ 0.66.

**E2E manual** (no automatizado para el hack):
1. Home → Crear materia "Test"
2. Documentación → subir 1 PDF chico
3. Esperar pipeline (~1-2 min) hasta `processed`
4. Clases → ver nodes generados
5. Click en clase → leer + responder quiz → ver done con score
6. Volver al subject → status del nodo es `mastered`

## Implementación — orden de fases

Cada fase no rompe nada hasta que se completa la siguiente. Estimación total ~3.5-4h.

| Fase | Trabajo | Tiempo |
|---|---|---|
| 0 | IAM user + policy + access keys + update .env.local | 10 min |
| 1 | Install react-query + setup provider/client/keys (additive) | 30 min |
| 2 | Backend: queries helpers + 3 endpoints nuevos + lib/anthropic/lesson + tests | 45 min |
| 3 | Wire home-page + add-subject-modal | 20 min |
| 4 | Wire Documentación tab (upload + polling) | 40 min |
| 5 | Wire Clases tab + crear lesson-flow-generic + routing demo vs genérico | 60 min |
| 6 | Cleanup AppContext/data.ts + seed script + correr seed | 20 min |
| 7 | Vercel deploy + env vars | 15 min |

## Out of scope (explícito)

- Lambdas para generación de imagen/audio/video/podcast/infografía
- Auth real (sigue usando `DEMO_USER_ID` hardcoded)
- AI tutor chat dentro del nodo
- Spaced repetition / recordatorios
- Profile management (`/api/profile` queda como está)
- Open-ended quiz (mantenemos multiple-choice)
- Endpoint DELETE de files
- Separación dev/prod en cuentas AWS distintas
- Bug del home: dos cards "Historia..." duplicadas (se resuelve solo al pasar a DB)
- Refresh de `useNodes` cuando se sube un PDF nuevo a un subject que ya tiene nodos (poll solo se activa con `nodes.length === 0`). Fix futuro: invalidar `qk.nodes(id)` en `onSettled` del upload mutation.
