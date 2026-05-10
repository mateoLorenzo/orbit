# Orbit — Frontend ↔ Backend wiring + lesson genérico + lambdas de assets

**Fecha:** 2026-05-09
**Estado:** diseño aprobado, pendiente implementación
**Owner:** Ian (ponce.ain@gmail.com)
**Estimación total:** 26-31h (3-4 días full time)

## Contexto y motivación

La app hoy es un prototipo visual: una sola lección sobre el Cruce de los Andes (Historia de la Independencia) está completamente armada con audio, video, narración sincronizada y quiz, pero el resto de la UI consume datos mock desde `lib/app-context.tsx` + `lib/data.ts` y nunca toca el backend. El pipeline de procesamiento (S3 → file-router → pdf-processor → embedder → graph-recalc) funciona end-to-end y está deployed en SST stage `dev`, pero no se invoca desde la UI ni produce assets multi-formato.

Este diseño cubre:

1. Wiring completo UI ↔ backend (TanStack Query reemplaza `AppContext`)
2. Generación end-to-end de assets multi-formato (imagen, audio, podcast, video) por nodo
3. Lesson view genérico que muestra esos assets para subjects no-demo
4. Profile management (formato preferido, intereses, stats, nombre)
5. Re-procesamiento automático cuando se suben nuevos PDFs
6. DELETE de files con cleanup en S3 + cascade en DB
7. Usuario demo persistido en DB (no hardcoded)

**Constraint clave:** la materia "Historia de los Procesos de Independencia Latinoamericana" se usa para el pitch de 4-5 min y mantiene su flow actual (`components/module-learning-flow/` con video + audio + narración hardcoded). Para todo el resto de las materias, usamos un flow genérico nuevo que renderiza los assets generados por las nuevas lambdas.

## Decisiones de scope

- **Stack:** TanStack Query v5, Anthropic Claude Haiku 4.5 para LLM, FAL flux-schnell para imágenes, AWS Polly para TTS (mismo cloud, sin nueva API key).
- **Quiz:** siempre multiple-choice, 2-3 preguntas por nodo, sin feedback inmediato; resultado al final.
- **Demo subject:** identificado vía UUID en `NEXT_PUBLIC_DEMO_SUBJECT_ID`. Usa fixture local + assets de `/public/`. Inmutable durante la implementación.
- **Auth:** sin auth real. Un solo usuario demo persistido en `auth.users` + `profiles`, su UUID se inyecta como contexto en todas las queries.
- **AWS:** misma cuenta para dev y prod. Un solo IAM user `orbit-app` con policy scopeada a buckets de stage `dev`.

## Arquitectura

### Stack y modularización del frontend

```
lib/
  api/
    client.ts              # fetch wrapper tipado, ApiError class
    subjects.ts            # listSubjects, getSubject, createSubject
    files.ts               # listFiles, requestUpload, putToS3, deleteFile
    nodes.ts               # listNodesForSubject, getNodeAssets, submitQuiz
    profile.ts             # getProfile, updateProfile
  query/
    client.ts              # singleton QueryClient (staleTime 30s, retry 1, refetchOnWindowFocus false)
    keys.ts                # qk.subjects(), qk.subject(id), qk.files(id), qk.nodes(id), qk.nodeAssets(id), qk.profile()
    provider.tsx           # 'use client' wrapper
  hooks/
    use-subjects.ts        # useSubjects(), useCreateSubject()
    use-subject.ts         # useSubject(id)
    use-files.ts           # useFiles(id), useUploadFile(id), useDeleteFile(id)
    use-nodes.ts           # useNodes(id), useNode(id, nodeId)
    use-assets.ts          # useNodeAssets(nodeId), useSubmitQuiz(nodeId)
    use-profile.ts         # useProfile(), useUpdateProfile()
    use-progress.ts        # useProgressSummary(id)
  domain/
    adapters.ts            # mapSubjectRow, mapNodeRow, mapFileRow, mapNodeContentRow → UI types
    user.ts                # current user UUID resolution (from env, DEMO_USER_ID)
  demo/
    index.ts               # isDemoSubject(s), getDemoNode(s, nodeId)
    historia/
      lessons.ts           # fixture con los 4 nodos demo
  anthropic/
    lesson.ts              # generateLesson({ title, brief, chunks, interests }) → { paragraphs, quiz }
    podcast.ts             # generatePodcastScript({ title, paragraphs, interests }) → Array<{voice, text}>
```

**Borrado:**
- `lib/app-context.tsx`
- `lib/data.ts`
- `components/sources-tab.tsx` (dead code)
- `<AppProvider>` en `app/layout.tsx`

### Componentes

**Sin cambios:**
- `components/module-learning-flow/` — flow del demo
- `components/career-progress-shader.tsx`, `components/app-sidebar.tsx`
- `public/audio/*.mp3`, `/SanMartinAndes.mp4`, `/Historical.mp4`, `/learning-*.png`

**Refactorizados:**
- `components/home-page.tsx` — `useApp()` → `useSubjects()`. Header "Buenos días, {displayName}" lee de `useProfile()`.
- `components/subject-detail-view.tsx` — `addSource` → `useUploadFile`; lee files reales con `useFiles`; agrega botón delete por fila → `useDeleteFile`.
- `components/add-subject-modal.tsx` — `addSubject` → `useCreateSubject` + redirect a UUID nuevo.
- `app/subjects/[id]/page.tsx` — `useApp()` → `useSubject(id)`.
- `app/subjects/[id]/lessons/[nodeId]/page.tsx` — branch demo vs genérico.

**Nuevos:**
- `app/profile/page.tsx` — pantalla de perfil (4 secciones, ver más abajo).
- `components/profile/`
  - `format-selector.tsx` — radio group con los 5 formatos.
  - `interests-tags.tsx` — input de tags estilo "agregar / quitar".
  - `stats-panel.tsx` — racha, materias completas, formato más usado.
  - `name-avatar-editor.tsx` — input de nombre + selector de iniciales.
- `components/lesson-flow-generic/`
  - `index.tsx` — orquestador (intro → content slides → quiz → done).
  - `intro-screen.tsx`
  - `content-screen.tsx` — texto + imagen + audio narrado sincronizado (similar al demo, pero con assets reales).
  - `format-toggle.tsx` — switch entre "leer", "escuchar narración", "ver video", "podcast".
  - `quiz-screen.tsx`
  - `done-screen.tsx` — score + per-question feedback + "siguiente clase".
  - `use-lesson-data.ts` — useQuery sobre `/api/nodes/[id]/assets`.
  - `use-quiz-submit.ts` — useMutation sobre `/api/nodes/[id]/quiz`.

### Backend — endpoints nuevos / modificados

**`GET /api/subjects/[id]/nodes`** *(nuevo)*

Devuelve nodos con su progress status, ordenados por path.
```ts
{ nodes: Array<{
    id, pathId, title, contentBrief,
    progressStatus: 'locked' | 'available' | 'in_progress' | 'mastered'
  }> }
```

**`GET /api/nodes/[id]/assets`** *(nuevo)*

Devuelve todos los assets ready para un nodo, incluyendo el lesson text + quiz.
```ts
{
  status: 'partial' | 'ready',
  lesson: {
    paragraphs: string[3-4],
    quiz: Array<{ question: string, options: string[4] }>   // sin correctIndex
  } | null,
  image: { url: string } | null,
  audio: { url: string, durationSec: number } | null,
  podcast: { url: string, durationSec: number } | null,
  video: { url: string, durationSec: number } | null
}
```
Cada asset puede ser `null` si todavía no se generó. El cliente polea hasta `status === 'ready'`.

**`POST /api/nodes/[id]/quiz`** *(nuevo)*

Body: `{ answers: number[] }`. Lookup correctIndex desde `node_content.generation_metadata`, calcula passRate. Si ≥ 0.66 → upsert progress = 'mastered'. Devuelve:
```ts
{
  passed: boolean,
  score: { correct: number, total: number },
  perQuestion: Array<{ correct: number, selected: number }>
}
```

**`DELETE /api/subjects/[id]/files/[fileId]`** *(nuevo)*

1. Verifica file pertenece al subject + user
2. `s3:DeleteObject` en originals bucket
3. `db.delete(schema.files).where(eq(id, fileId))` — cascade elimina file_chunks
4. Encola message en `GraphRecalcQueue` con `subjectId` (el lambda se encarga de marcar nodos como `stale` si la regeneración cambia el grafo)

Devuelve 204.

**`GET /api/profile`** *(ya existe)* + **`PATCH /api/profile`** *(extender)*

Body para PATCH:
```ts
{
  displayName?: string,
  preferredFormat?: 'text' | 'audio' | 'video' | 'visual' | 'podcast',
  interests?: string[],
  // activeHours, recurringMistakes, averageFriction siguen siendo del sistema, no editables
}
```

**`GET /api/profile/stats`** *(nuevo)*

Devuelve métricas read-only:
```ts
{
  streakDays: number,           // hardcoded por ahora (no implementamos lógica de streak real)
  subjectsCompleted: number,    // count subjects donde 100% nodos mastered
  totalSubjects: number,
  formatUsage: Record<format, number>,  // hardcoded a {text: 100} por ahora
}
```

### Backend — pipeline de assets (lambdas nuevas)

```
Upload PDF
   ↓
file-router (existente)
   ↓
pdf-processor (existente: extract text + chunk)
   ↓
embedder (existente: Voyage embeddings, marca file processed)
   ↓
graph-recalc (existente: Claude → paths + nodes)
   ↓
   ├──→ ImageGenerationQueue → image-generator lambda
   │         (FAL flux-schnell por nodo)
   │         → S3 + node_content content_type='image'
   │
   └──→ LessonTextGenerationQueue → lesson-text lambda
             (Claude Haiku → paragraphs + quiz JSON)
             → node_content content_type='lesson_text'
             ↓
             ├──→ AudioNarrationQueue → audio-narration lambda
             │         (AWS Polly + Spanish voice)
             │         → S3 + node_content content_type='audio'
             │
             └──→ PodcastQueue → podcast lambda
                       (Claude → diálogo, Polly x2 voces, ffmpeg concat)
                       → S3 + node_content content_type='podcast'

Audio narration finishes →
   check if image is also ready →
      if yes, enqueue VideoQueue → video lambda
                       (ffmpeg: still image + audio narration → mp4 with Ken Burns)
                       → S3 + node_content content_type='video'

Image finishes →
   check if audio is also ready →
      if yes, enqueue VideoQueue (idempotency: check video doesn't already exist)
```

**Nuevas lambdas** (todas en `lambdas/`):

- `lambdas/image-generator/` — recibe `{nodeId}`, lee node + interests del user, prompt a FAL, sube PNG a S3, inserta `node_content` row.
- `lambdas/lesson-text/` — recibe `{nodeId}`, lee node + chunks + interests, llama Claude con tool use para JSON estructurado, guarda en `node_content`. Al finalizar, fan-out a AudioNarrationQueue + PodcastQueue.
- `lambdas/audio-narration/` — recibe `{nodeId}`, lee paragraphs del lesson_text, concatena en script narrativo, llama Polly (`engine: neural`, `voice: Mia` o `Lupe`), sube mp3 a S3, inserta row. Al finalizar, chequea si image está ready → si sí encola VideoQueue.
- `lambdas/podcast/` — recibe `{nodeId}`, lee paragraphs, llama Claude con prompt de "diálogo entre escéptico y entusiasta" (output JSON con turnos), Polly x2 voces (Mia + Penélope, ambas neural), ffmpeg concat de los segmentos, sube mp3 final a S3, inserta row.
- `lambdas/video/` — recibe `{nodeId}`, descarga image + audio de S3, ffmpeg con efecto Ken Burns (zoom-in lento) sobre la imagen + audio track, sube mp4 a S3, inserta row.

**Lambda layers:**
- `ffmpeg-layer` — para podcast + video lambdas. Prebuilt layer ARN público (e.g., `arn:aws:lambda:us-east-1:175033217214:layer:ffmpeg:1`) o build custom.
- `polly-layer` — no necesario, AWS SDK ya incluye Polly client.

**Nuevas SQS queues** (en `sst.config.ts`):
- `ImageGenerationQueue` (con DLQ)
- `LessonTextGenerationQueue` (con DLQ)
- `AudioNarrationQueue` (con DLQ)
- `PodcastQueue` (con DLQ)
- `VideoQueue` (con DLQ)

**Resource concurrency caps:** alineado con `feedback_aws_cost_controls.md`, cap a 2 concurrent por queue para evitar runaway costs.

### Schema additions (Drizzle migration)

```ts
// profiles table — add columns
displayName: text('display_name'),                          // editable
interests: text('interests').array().notNull().default(sql`'{}'::text[]`),  // editable

// node_content — sin cambios estructurales, ya soporta multiple rows por nodo
// El status='stale' ya existe en el enum, lo usamos para forzar re-generación
```

Migration: `0002_profile_extended.sql` (timestamp-prefixed por drizzle-kit).

### Re-procesamiento al subir o eliminar PDFs

**Backend:**
- `graph-recalc` lambda, después de actualizar nodes, marca todas las `node_content` rows del subject como `status='stale'` (`UPDATE node_content SET status='stale' WHERE node_id IN (subject's nodes)`).
- Cada asset lambda (image/lesson-text/audio/podcast/video), antes de generar, verifica si ya hay un row `status='ready'` para ese (node_id, content_type). Si lo hay y no está stale, skip. Si está stale, regenera.

**Frontend:**
- Mutation de upload (`useUploadFile.onSettled`) invalida `qk.files(id)` + `qk.nodes(id)`.
- Mutation de delete (`useDeleteFile.onSettled`) lo mismo.
- Mientras el subject esté procesando (algún file en pending/processing), el componente del subject polea `useNodes` cada 5s.

### Hooks principales

```ts
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

useUploadFile(subjectId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file) => {
      const { fileId, uploadUrl, requiredHeaders } = await requestUpload(subjectId, ...)
      await putToS3(uploadUrl, file, requiredHeaders)
      return fileId
    },
    onMutate: optimisticInsert,
    onError: rollback,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.files(subjectId) })
      qc.invalidateQueries({ queryKey: qk.nodes(subjectId) })
    },
  })
}

useDeleteFile(subjectId) { ... análogo ... }

useNodeAssets(nodeId) {
  return useQuery({
    queryKey: qk.nodeAssets(nodeId),
    queryFn: () => getNodeAssets(nodeId),
    refetchInterval: (query) => query.state.data?.status === 'ready' ? false : 3000,
  })
}
```

### Demo subject identification

```ts
// lib/demo/index.ts
const DEMO_SUBJECT_ID = process.env.NEXT_PUBLIC_DEMO_SUBJECT_ID
export function isDemoSubject(s) { return !!s && !!DEMO_SUBJECT_ID && s.id === DEMO_SUBJECT_ID }
export function getDemoNode(subject, nodeId) { /* fixture lookup */ }
```

Routing en `lessons/[nodeId]/page.tsx`:
```tsx
const { data: subject } = useSubject(id)
if (isDemoSubject(subject)) {
  const demoNode = getDemoNode(subject, nodeId)
  return <ModuleLearningFlow {...} />
}
return <GenericLessonFlow subjectId={id} nodeId={nodeId} {...} />
```

## Profile UI

`/profile` route, accesible desde el sidebar. Layout:

```
[Header con nombre + avatar editables]
[Sección 1: Formato preferido]
   Radio group (5 opciones con íconos)
[Sección 2: Tus intereses]
   Tags input: ["fútbol", "gaming", "música", ...] + "+ agregar"
[Sección 3: Tus stats]
   Card con: 24 días de racha | 1 de 5 materias completas | Formato más usado: texto
[Botón Guardar]
```

Look & feel: copia el patrón de las cards del home (border `black/8`, fondo blanco, padding `5 6`, headings `tracking-[-0.32px]`).

Cambios cuando se guardan se propagan vía `useProfile().mutate()` → invalida `qk.profile()`. Header del home re-fetchea automáticamente.

## Tiempo estimado por lección (datos empíricos del walkthrough)

Medido contra el flow demo actual:

| Modo | Tiempo |
|---|---|
| Skip todo (mín técnico) | ~50s |
| Normal (audio + leer) | ~2:50 min |
| Estudio profundo | ~4:40 min |

Para Clases del flow genérico, calcular dinámicamente en lugar de hardcodear "15 min":
- Si hay video → mostrar `Math.ceil(video.durationSec / 60)` min
- Else si hay audio → mostrar `Math.ceil(audio.durationSec / 60 + quiz.length * 0.5)` min
- Else (solo texto) → `paragraphs.length * 0.5 + quiz.length * 0.5` min

## Error handling

- `ApiError` propagado por hooks. Componentes leen `error?.message`.
- Upload error: rollback optimistic + toast inline.
- Delete error: re-mostrar la fila + toast.
- 404 subject: pantalla "Materia no encontrada" (existente).
- Asset generation falla en una lambda: row queda con `status='failed'` + `errorMessage`. UI muestra "Este formato no se pudo generar" pero permite usar los otros.
- Lesson view sin assets ready: "Generando contenido..." + spinner. Polea cada 3s.
- Quiz fail: done screen muestra score + opciones "Repetir quiz" o "Volver a estudiar"; no marca mastered.

## IAM user

Policy `scripts/iam/orbit-app-policy.json`:
- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` en originals bucket
- `s3:GetObject` en artifacts bucket (lectura para servir assets)
- `s3:GetBucketLocation` en ambos

Las lambdas tienen sus propios roles vía SST (no usan este user); ellas necesitan adicionalmente `s3:PutObject` en artifacts bucket + `polly:SynthesizeSpeech`.

Comandos:
```bash
aws iam create-user --user-name orbit-app --profile personal
aws iam put-user-policy --user-name orbit-app \
  --policy-name OrbitApp \
  --policy-document file://scripts/iam/orbit-app-policy.json \
  --profile personal
aws iam create-access-key --user-name orbit-app --profile personal
```

Para Vercel: pegar todas las vars de `.env.local` (incluyendo las nuevas: `OPENAI_API_KEY` no aplica porque usamos Polly; `NEXT_PUBLIC_DEMO_SUBJECT_ID`).

## Seed del demo user + demo subject

`scripts/seed-demo-data.ts` (idempotente):
1. Insert/upsert `auth.users` con UUID fijo (e.g., `00000000-0000-4000-8000-000000000001` ya en uso).
2. Insert/upsert `profiles` con `displayName='Ian'`, `preferredFormat='text'`, `interests=[]`.
3. `getOrCreateSubject({ name: 'Historia de los Procesos de Independencia Latinoamericana', userId })`.
4. Para cada PDF en `seed-data/historia/*.pdf` (gitignored): si no existe row con ese filename, presign + PUT.
5. Loguear `NEXT_PUBLIC_DEMO_USER_ID` y `NEXT_PUBLIC_DEMO_SUBJECT_ID` para pegar en `.env.local`.

Comando: `pnpm seed:demo`.

## Testing

**Unit (vitest):**
- `lib/domain/adapters.ts` — todos los mappers, edge cases.
- `lib/api/client.ts` — `ApiError` correcto.
- `lib/anthropic/lesson.ts`, `lib/anthropic/podcast.ts` — mock client, verificar prompts y parseo.

**Integration (vitest + msw):**
- `useFiles`, `useUploadFile`, `useDeleteFile`, `useNodeAssets` — comportamiento de polling, optimistic, invalidations.

**Backend integration (vitest + DB Supabase):**
- `GET /api/subjects/[id]/nodes` — orden, status mapping.
- `POST /api/nodes/[id]/quiz` — passRate calc, mark mastered cuando ≥ 0.66.
- `DELETE /api/subjects/[id]/files/[fileId]` — happy path + permission check.

**Lambda smoke tests:**
- Cada lambda nueva tiene un test que la invoca con un payload conocido y verifica el row final en DB. Ejecutado con `pnpm smoke:lambda` (similar al `smoke:e2e` existente).

**E2E manual** pre-pitch:
1. Home → Crear materia "Test"
2. Documentación → subir 1 PDF chico
3. Esperar pipeline (~2-5 min) hasta `processed`
4. Clases → ver nodes generados con thumbnail real
5. Click en clase → ver lesson con texto + imagen + audio + (eventualmente) video y podcast
6. Switchear formato con el toggle (texto / audio / video / podcast)
7. Responder quiz → ver done con score
8. Volver al subject → status del nodo `mastered`
9. Volver al subject, eliminar el PDF original
10. Verificar grafo se recalcula y nodos cambian

## Implementación — orden de fases

| Fase | Trabajo | Tiempo |
|---|---|---|
| 0 | IAM user + policy + access keys + update .env.local | 0.5h |
| 1 | Install react-query + setup provider/client/keys | 0.5h |
| 2 | Backend foundation: queries helpers + endpoints `/nodes`, `/quiz`, `/assets`, `/profile`, `/profile/stats`, DELETE `/files/[id]` + tests | 1.5h |
| 3 | Migration: profile columns (displayName, interests) | 0.25h |
| 4 | Lambda image-generator (FAL flux-schnell) + queue + SST resource | 2.5h |
| 5 | Lambda lesson-text (Claude Haiku con tool use) + queue | 2h |
| 6 | Lambda audio-narration (Polly neural Spanish voice) + queue | 3h |
| 7 | Lambda podcast (Claude diálogo + Polly x2 + ffmpeg concat) + queue + ffmpeg layer | 5.5h |
| 8 | Lambda video (ffmpeg Ken Burns + audio mux) + queue | 9h |
| 9 | Wire home + create-subject modal | 0.5h |
| 10 | Wire Documentación tab (upload + delete + polling) | 1h |
| 11 | Wire Clases tab + crear lesson-flow-generic con format toggle (4 formatos) + routing demo vs genérico | 2.5h |
| 12 | Profile UI (4 secciones + screen route) | 2.5h |
| 13 | Cleanup AppContext/data.ts + seed script + correr seed | 0.5h |
| 14 | Vercel deploy + env vars + smoke E2E | 0.5h |

**Total: ~32h.**

Buffer de 3-4h para imprevistos llevaría a ~36h, ~4 días al 9h/día. **Riesgo concentrado en Fase 8 (video).** Si Fase 8 se atasca, fallback documentado: render cliente-side de imagen + audio sincronizados sin generar mp4 (~1h).

## Out of scope (explícito)

- Auth real (sigue usando un único user persistido)
- AI tutor chat dentro del nodo
- Spaced repetition / recordatorios
- Open-ended quiz (siempre multiple-choice)
- Separación dev/prod en cuentas AWS distintas
- Streak real (hardcoded a 24 por ahora)
- Manejo de edge cases del podcast cuando Polly devuelve audio cortado
- Caching de assets en CDN (servimos directo desde S3 con presigned URLs)
- Bug del home: dos cards "Historia..." duplicadas → se resuelve solo al borrar `lib/data.ts`
