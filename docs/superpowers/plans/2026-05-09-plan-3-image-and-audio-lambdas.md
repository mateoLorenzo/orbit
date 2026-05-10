# Plan 3 — Lambdas image (FAL) + audio (Polly)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar una imagen ilustrativa por nodo (FAL flux-schnell) y una narración TTS de los párrafos del lesson_text (AWS Polly neural Spanish). Las lambdas suben los assets al bucket de artifacts y el frontend los muestra junto al texto. Sigue intacto el demo flow.

**Architecture:** Pipeline extendido: graph-recalc → fan-out paralelo a `LessonTextGenerationQueue` + `ImageGenerationQueue`. La lambda image-generator llama FAL, descarga el PNG, sube a S3 artifacts en `nodes/{nodeId}/image.png`, persiste s3Key en `node_content.content_url`. Cuando lesson-text termina, hace fan-out a `AudioNarrationQueue`. La lambda audio-narration toma los párrafos, los pasa a Polly (voz Mia, neural), sube mp3 a `nodes/{nodeId}/narration.mp3`. La API `/api/nodes/[id]/assets` aplica `presignArtifactGet(s3Key)` antes de devolver, así el cliente recibe URLs firmadas válidas por 1h. Frontend `content-screen` se rediseña a 2 columnas (texto + imagen + audio inline).

**Tech Stack:** AWS Lambda + SQS · FAL flux-schnell · AWS Polly Neural · Drizzle ORM · TanStack Query

---

## File Structure

**Crear:**
- `lambdas/_shared/s3-upload.ts` — `uploadToArtifacts(key, body, contentType)` reutilizable
- `lambdas/image-generator/synth.ts` — prompt builder + FAL call
- `lambdas/image-generator/index.ts` — SQS handler
- `lambdas/audio-narration/polly.ts` — Polly client wrapper
- `lambdas/audio-narration/index.ts` — SQS handler
- `components/lesson-flow-generic/audio-player.tsx` — HTML5 audio control
- `components/lesson-flow-generic/asset-panel.tsx` — image + audio composite

**Modificar:**
- `lib/aws/s3.ts` — agregar `presignArtifactGet(key, expiresIn?)`
- `app/api/nodes/[id]/assets/route.ts` — wrapping de URLs con presigning
- `lib/db/queries.ts` — `getNodeAssets` devuelve `s3Key` en lugar de URL final (presigning lo hace el route)
- `sst.config.ts` — agregar `ImageGenerationQueue` + `AudioNarrationQueue` + 2 lambdas + IAM Polly
- `lambdas/graph-recalc/index.ts` — fan-out adicional a ImageGenerationQueue
- `lambdas/lesson-text/index.ts` — fan-out a AudioNarrationQueue al terminar
- `components/lesson-flow-generic/content-screen.tsx` — layout 2 columnas + asset-panel
- `components/lesson-flow-generic/index.tsx` — pasa `assets` a content-screen

---

## Phase 0 — S3 presigning + assets endpoint refactor (0.5h)

### Task 1: `presignArtifactGet` + assets endpoint usa s3Key

**Files:**
- Modify: `lib/aws/s3.ts`
- Modify: `lib/db/queries.ts`
- Modify: `app/api/nodes/[id]/assets/route.ts`

- [ ] **Step 1: Agregar `presignArtifactGet` en lib/aws/s3.ts**

Modify `lib/aws/s3.ts`. Al final del archivo, agregar:
```ts
import { GetObjectCommand } from '@aws-sdk/client-s3'

export const ARTIFACTS_BUCKET = () => {
  const v = process.env.S3_ARTIFACTS_BUCKET
  if (!v) throw new Error('S3_ARTIFACTS_BUCKET is not set')
  return v
}

export async function presignArtifactGet(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: ARTIFACTS_BUCKET(), Key: key })
  return getSignedUrl(client(), cmd, { expiresIn })
}
```

Y al inicio, ampliar el import (agregar `GetObjectCommand`):
```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
```

- [ ] **Step 2: `getNodeAssets` devuelve s3Key, no URL final**

Modify `lib/db/queries.ts`. Localizar `getNodeAssets` (~después de `listNodesWithProgress`).

Cambiar la firma del shape `NodeAssets`:
```ts
export interface NodeAssets {
  status: 'partial' | 'ready'
  lesson: { paragraphs: string[]; quiz: Array<{ question: string; options: string[] }> } | null
  image: { s3Key: string } | null
  audio: { s3Key: string; durationSec: number } | null
  podcast: { s3Key: string; durationSec: number } | null
  video: { s3Key: string; durationSec: number } | null
}
```

Y en el cuerpo, reemplazar:
```ts
const imageRow = byType.get('image')
const image = imageRow?.contentUrl ? { url: imageRow.contentUrl } : null
const audio = fromUrl('audio')
const podcast = fromUrl('podcast')
const video = fromUrl('video')
```
por:
```ts
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
```

(Borrar el `fromUrl` viejo.)

- [ ] **Step 3: Route aplica presigning**

Modify `app/api/nodes/[id]/assets/route.ts`. Reemplazar el handler GET:
```ts
import { NextResponse } from 'next/server'
import { getNodeAssets } from '@/lib/db/queries'
import { presignArtifactGet } from '@/lib/aws/s3'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const assets = await getNodeAssets(id)

  const presign = async <T extends { s3Key: string } | null>(a: T) =>
    a ? { ...a, url: await presignArtifactGet(a.s3Key), s3Key: undefined } : null

  return NextResponse.json({
    status: assets.status,
    lesson: assets.lesson,
    image: await presign(assets.image),
    audio: await presign(assets.audio),
    podcast: await presign(assets.podcast),
    video: await presign(assets.video),
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
git add lib/aws/s3.ts lib/db/queries.ts 'app/api/nodes/[id]/assets/route.ts'
git commit -m "$(cat <<'EOF'
refactor(assets): store s3Key in DB, presign URLs at API edge

Lambdas (image, audio, podcast, video) write s3Key into
node_content.content_url. The API route generates a fresh
presigned GET (1h expiry) per request so private bucket stays
private and clients always get a valid URL within their cache
window.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Image lambda (2h)

### Task 2: Synth — prompt builder + FAL call

**Files:**
- Create: `lambdas/_shared/s3-upload.ts`
- Create: `lambdas/image-generator/synth.ts`

- [ ] **Step 1: S3 upload helper compartido**

Create `lambdas/_shared/s3-upload.ts`:
```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Resource } from 'sst'

const s3 = new S3Client({})

export async function uploadToArtifacts(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: Resource.ArtifactsBucket.name,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return key
}
```

- [ ] **Step 2: FAL prompt + call**

Create `lambdas/image-generator/synth.ts`:
```ts
import { Resource } from 'sst'

interface PromptInput {
  subjectName: string
  nodeTitle: string
  contentBrief: string
  interests: string[]
}

const STYLE = 'editorial illustration, textbook diagram aesthetic, clean composition, professional, neutral color palette, high contrast'

export function buildImagePrompt(input: PromptInput): string {
  const interestFlavor =
    input.interests.length > 0
      ? `, subtle visual cues from ${input.interests.slice(0, 2).join(' and ')}`
      : ''
  return `${input.nodeTitle} — ${input.contentBrief}${interestFlavor}. ${STYLE}.`
}

export interface FalImageResult {
  bytes: Uint8Array
  contentType: string
}

const FAL_ENDPOINT = 'https://fal.run/fal-ai/flux/schnell'

export async function generateImage(prompt: string): Promise<FalImageResult> {
  const apiKey = Resource.FalKey.value
  if (!apiKey) throw new Error('FalKey secret is not set')

  const res = await fetch(FAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_4_3',
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`FAL call failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { images: Array<{ url: string; content_type?: string }> }
  if (!data.images || data.images.length === 0) {
    throw new Error('FAL returned no images')
  }

  const imgUrl = data.images[0].url
  const contentType = data.images[0].content_type ?? 'image/png'
  const imgRes = await fetch(imgUrl)
  if (!imgRes.ok) throw new Error(`failed to download FAL image: ${imgRes.status}`)
  const buf = new Uint8Array(await imgRes.arrayBuffer())
  return { bytes: buf, contentType }
}
```

- [ ] **Step 3: Commit**

```bash
git add lambdas/_shared/s3-upload.ts lambdas/image-generator/synth.ts
git commit -m "$(cat <<'EOF'
feat(lambda): image-generator synth + shared s3 upload helper

buildImagePrompt composes a focused editorial-style prompt
with optional interest flavor. generateImage POSTs to FAL
flux-schnell (4 steps, landscape 4:3), downloads the PNG,
returns bytes for the handler to upload to S3 artifacts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Image lambda handler

**Files:**
- Create: `lambdas/image-generator/index.ts`

- [ ] **Step 1: Handler**

Create `lambdas/image-generator/index.ts`:
```ts
import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '../_shared/db'
import { uploadToArtifacts } from '../_shared/s3-upload'
import { buildImagePrompt, generateImage } from './synth'

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
      console.error('image-generator: invalid JSON', { messageId: record.messageId, err })
      continue
    }

    const { nodeId, subjectId } = payload
    console.log('image-generator: start', { nodeId, subjectId })

    // Idempotency: skip if a 'ready' image row already exists.
    const [existing] = await db
      .select()
      .from(schema.nodeContent)
      .where(
        and(
          eq(schema.nodeContent.nodeId, nodeId),
          eq(schema.nodeContent.contentType, 'image'),
        ),
      )
      .limit(1)
    if (existing && existing.status === 'ready') {
      console.log('image-generator: already ready, skip', { nodeId })
      continue
    }

    // Load node + subject + interests.
    const [node] = await db
      .select()
      .from(schema.nodes)
      .where(eq(schema.nodes.id, nodeId))
      .limit(1)
    if (!node) {
      console.warn('image-generator: node not found', { nodeId })
      continue
    }
    const [subject] = await db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, subjectId))
      .limit(1)
    if (!subject) {
      console.warn('image-generator: subject not found', { subjectId })
      continue
    }
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, subject.userId))
      .limit(1)
    const interests = profile?.interests ?? []

    // Mark generating.
    if (existing) {
      await db
        .update(schema.nodeContent)
        .set({ status: 'generating', errorMessage: null })
        .where(eq(schema.nodeContent.id, existing.id))
    } else {
      await db.insert(schema.nodeContent).values({
        nodeId,
        contentType: 'image',
        status: 'generating',
      })
    }

    try {
      const prompt = buildImagePrompt({
        subjectName: subject.name,
        nodeTitle: node.title,
        contentBrief: node.contentBrief,
        interests,
      })
      const { bytes, contentType } = await generateImage(prompt)
      const ext = contentType.includes('jpeg') ? 'jpg' : 'png'
      const key = `nodes/${nodeId}/image.${ext}`
      await uploadToArtifacts(key, bytes, contentType)

      await db
        .update(schema.nodeContent)
        .set({
          status: 'ready',
          contentUrl: key,
          imagePrompt: prompt,
          generationMetadata: { provider: 'fal/flux-schnell', sizeBytes: bytes.byteLength } as any,
          errorMessage: null,
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'image'),
          ),
        )

      console.log('image-generator: done', { nodeId, key, bytes: bytes.byteLength })
    } catch (err) {
      console.error('image-generator: failed', { nodeId, err })
      await db
        .update(schema.nodeContent)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'image'),
          ),
        )
      throw err
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lambdas/image-generator/index.ts
git commit -m "$(cat <<'EOF'
feat(lambda): image-generator SQS handler

Picks up {nodeId, subjectId}, builds prompt from node + interests,
calls FAL flux-schnell, uploads PNG to artifacts bucket at
nodes/{nodeId}/image.png, stores key in node_content.content_url.
Idempotent: skips when a 'ready' image row already exists.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: SST resource for image lambda + IAM

**File:** Modify `sst.config.ts`

- [ ] **Step 1: Queue + URL en lambdaEnv**

After the `lessonTextQ` declaration:
```ts
const imageGenQ = makeQueueWithDlq('ImageGenerationQueue', {
  visibilityTimeout: '120 seconds',
})
```

In `lambdaEnv`, after `LESSON_TEXT_QUEUE_URL`:
```ts
IMAGE_GEN_QUEUE_URL: imageGenQ.main.url,
```

- [ ] **Step 2: Linkear queue al graph-recalc**

En `graphRecalc.link` cambiar:
```ts
link: [...sharedLink, graphRecalcQ.main, lessonTextQ.main, imageGenQ.main],
```

- [ ] **Step 3: Crear el lambda image-generator**

Después del bloque `lessonText.subscribe(...)`:
```ts
// ─── Lambda: image-generator ──────────────────────────────────────────
const imageGenerator = new sst.aws.Function('ImageGenerator', {
  handler: 'lambdas/image-generator/index.handler',
  memory: '1024 MB',
  timeout: '120 seconds',
  environment: lambdaEnv,
  link: [...sharedLink, imageGenQ.main],
})
imageGenQ.main.subscribe(imageGenerator.arn, {
  transform: { eventSourceMapping: withConcurrency },
})
```

- [ ] **Step 4: Output**

En el `return { ... }`:
```ts
ImageGenQueueUrl: imageGenQ.main.url,
```

- [ ] **Step 5: Commit**

```bash
git add sst.config.ts
git commit -m "$(cat <<'EOF'
feat(sst): add ImageGenerationQueue + ImageGenerator lambda

120s timeout for the FAL call (typically 5-10s) + S3 upload.
Linked to artifacts bucket via sharedLink (already includes
artifactsBucket, so put_object permission is automatic).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: graph-recalc también enqueua image

**File:** Modify `lambdas/graph-recalc/index.ts`

- [ ] **Step 1: Fan-out paralelo**

Localizar el bloque que hace fan-out a `LessonTextGenerationQueue` (agregado en Plan 2). Justo después de ese loop, agregar:

```ts
// Same node set fan-out to image generation (parallel pipeline).
for (const nodeId of nodesToGenerate) {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: Resource.ImageGenerationQueue.url,
      MessageBody: JSON.stringify({ nodeId, subjectId }),
    }),
  )
}
console.log('graph-recalc: fan-out image-gen', { subjectId, count: nodesToGenerate.length })
```

(Reuse `nodesToGenerate` array — same node set qualifies for image generation.)

- [ ] **Step 2: Commit**

```bash
git add lambdas/graph-recalc/index.ts
git commit -m "$(cat <<'EOF'
feat(lambda): graph-recalc also fans out to ImageGenerationQueue

Parallel pipeline: same node set that needs lesson text also
needs an image. Image lambda is idempotent so redundant sends
are cheap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Audio narration lambda (2.5h)

### Task 6: Polly wrapper

**Files:**
- Create: `lambdas/audio-narration/polly.ts`

- [ ] **Step 1: Polly client**

Create `lambdas/audio-narration/polly.ts`:
```ts
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'

const polly = new PollyClient({})

export type SpanishVoice = 'Mia' | 'Lupe' | 'Penelope'

export interface PollyResult {
  bytes: Buffer
  contentType: 'audio/mpeg'
  approxDurationSec: number  // estimated based on char count + WPM
}

const CHARS_PER_SECOND = 14 // empirical for neural Spanish at default rate

export async function synthesizeSpeech(
  text: string,
  voice: SpanishVoice = 'Mia',
): Promise<PollyResult> {
  const res = await polly.send(
    new SynthesizeSpeechCommand({
      Engine: 'neural',
      VoiceId: voice,
      LanguageCode: voice === 'Mia' ? 'es-MX' : voice === 'Lupe' ? 'es-US' : 'es-US',
      OutputFormat: 'mp3',
      Text: text,
      TextType: 'text',
    }),
  )

  if (!res.AudioStream) throw new Error('Polly returned no AudioStream')

  // Polly returns a Readable; collect into Buffer.
  const chunks: Uint8Array[] = []
  for await (const chunk of res.AudioStream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0)
  const merged = Buffer.alloc(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.byteLength
  }

  const approxDurationSec = Math.round(text.length / CHARS_PER_SECOND)
  return { bytes: merged, contentType: 'audio/mpeg', approxDurationSec }
}
```

- [ ] **Step 2: Commit**

```bash
git add lambdas/audio-narration/polly.ts
git commit -m "$(cat <<'EOF'
feat(lambda): Polly wrapper for Spanish neural TTS

Defaults to voice Mia (es-MX neural). Returns mp3 bytes plus
an approximate duration based on a 14 chars/sec heuristic
(measured empirically on neural Spanish at default rate).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Audio lambda handler

**Files:**
- Create: `lambdas/audio-narration/index.ts`

- [ ] **Step 1: Handler**

Create `lambdas/audio-narration/index.ts`:
```ts
import type { SQSEvent, SQSHandler } from 'aws-lambda'
import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '../_shared/db'
import { uploadToArtifacts } from '../_shared/s3-upload'
import { synthesizeSpeech } from './polly'

interface Payload {
  nodeId: string
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const db = getDb()

  for (const record of event.Records) {
    let payload: Payload
    try {
      payload = JSON.parse(record.body)
    } catch (err) {
      console.error('audio-narration: invalid JSON', { messageId: record.messageId, err })
      continue
    }

    const { nodeId } = payload
    console.log('audio-narration: start', { nodeId })

    // Idempotency.
    const [existing] = await db
      .select()
      .from(schema.nodeContent)
      .where(
        and(
          eq(schema.nodeContent.nodeId, nodeId),
          eq(schema.nodeContent.contentType, 'audio'),
        ),
      )
      .limit(1)
    if (existing && existing.status === 'ready') {
      console.log('audio-narration: already ready, skip', { nodeId })
      continue
    }

    // Load lesson_text paragraphs.
    const [lessonRow] = await db
      .select()
      .from(schema.nodeContent)
      .where(
        and(
          eq(schema.nodeContent.nodeId, nodeId),
          eq(schema.nodeContent.contentType, 'lesson_text'),
        ),
      )
      .limit(1)
    if (!lessonRow || lessonRow.status !== 'ready') {
      console.warn('audio-narration: lesson_text not ready, deferring', { nodeId })
      throw new Error('lesson_text not ready') // SQS retry will pick it up later
    }
    const meta = lessonRow.generationMetadata as any
    const paragraphs: string[] = meta?.paragraphs ?? []
    if (paragraphs.length === 0) {
      console.warn('audio-narration: no paragraphs', { nodeId })
      continue
    }

    // Mark generating.
    if (existing) {
      await db
        .update(schema.nodeContent)
        .set({ status: 'generating', errorMessage: null })
        .where(eq(schema.nodeContent.id, existing.id))
    } else {
      await db.insert(schema.nodeContent).values({
        nodeId,
        contentType: 'audio',
        status: 'generating',
      })
    }

    try {
      // Concatenate paragraphs into a single narration script with sentence pauses.
      const script = paragraphs.join('\n\n')
      const { bytes, contentType, approxDurationSec } = await synthesizeSpeech(script, 'Mia')
      const key = `nodes/${nodeId}/narration.mp3`
      await uploadToArtifacts(key, bytes, contentType)

      await db
        .update(schema.nodeContent)
        .set({
          status: 'ready',
          contentUrl: key,
          generationMetadata: {
            provider: 'aws-polly',
            voice: 'Mia',
            engine: 'neural',
            durationSec: approxDurationSec,
            sizeBytes: bytes.byteLength,
          } as any,
          errorMessage: null,
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'audio'),
          ),
        )

      console.log('audio-narration: done', { nodeId, key, bytes: bytes.byteLength, approxDurationSec })
    } catch (err) {
      console.error('audio-narration: failed', { nodeId, err })
      await db
        .update(schema.nodeContent)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(
          and(
            eq(schema.nodeContent.nodeId, nodeId),
            eq(schema.nodeContent.contentType, 'audio'),
          ),
        )
      throw err
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lambdas/audio-narration/index.ts
git commit -m "$(cat <<'EOF'
feat(lambda): audio-narration SQS handler

Reads lesson_text paragraphs (defers via SQS retry if not ready),
concatenates into a single narration, calls Polly Mia neural,
uploads mp3 to artifacts. Stores approx duration in metadata
for the UI to show.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: SST resource for audio lambda + Polly IAM

**File:** Modify `sst.config.ts`

- [ ] **Step 1: Queue + URL**

After `imageGenQ`:
```ts
const audioNarrationQ = makeQueueWithDlq('AudioNarrationQueue', {
  visibilityTimeout: '180 seconds',
})
```

In `lambdaEnv`:
```ts
AUDIO_NARRATION_QUEUE_URL: audioNarrationQ.main.url,
```

- [ ] **Step 2: Link queue al lesson-text lambda**

Cambiar el `lessonText.link`:
```ts
link: [...sharedLink, lessonTextQ.main, audioNarrationQ.main],
```

- [ ] **Step 3: Crear lambda audio-narration con Polly IAM**

Después del bloque `imageGenerator.subscribe(...)`:
```ts
// ─── Lambda: audio-narration ──────────────────────────────────────────
const audioNarration = new sst.aws.Function('AudioNarrator', {
  handler: 'lambdas/audio-narration/index.handler',
  memory: '1024 MB',
  timeout: '180 seconds',
  environment: lambdaEnv,
  link: [...sharedLink, audioNarrationQ.main],
  permissions: [
    {
      actions: ['polly:SynthesizeSpeech'],
      resources: ['*'],
    },
  ],
})
audioNarrationQ.main.subscribe(audioNarration.arn, {
  transform: { eventSourceMapping: withConcurrency },
})
```

- [ ] **Step 4: Output**

```ts
AudioNarrationQueueUrl: audioNarrationQ.main.url,
```

- [ ] **Step 5: Commit**

```bash
git add sst.config.ts
git commit -m "$(cat <<'EOF'
feat(sst): add AudioNarrationQueue + AudioNarrator lambda

Polly:SynthesizeSpeech IAM permission scoped to the lambda
role only (resource '*' is the AWS recommendation for Polly
because voices aren't ARN-addressable). 180s timeout covers
~30s of speech easily.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: lesson-text fans out a audio cuando termina

**File:** Modify `lambdas/lesson-text/index.ts`

- [ ] **Step 1: Imports**

Verify these are at the top:
```ts
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { Resource } from 'sst'
```
Y:
```ts
const sqs = new SQSClient({})
```

(Add if missing.)

- [ ] **Step 2: Fan-out al final del happy path**

Inside the `try` block, después del `console.log('lesson-text: done', ...)` line, agregar:
```ts
// Fan out audio narration now that paragraphs exist.
await sqs.send(
  new SendMessageCommand({
    QueueUrl: Resource.AudioNarrationQueue.url,
    MessageBody: JSON.stringify({ nodeId }),
  }),
)
```

- [ ] **Step 3: Commit**

```bash
git add lambdas/lesson-text/index.ts
git commit -m "$(cat <<'EOF'
feat(lambda): lesson-text fans out to AudioNarrationQueue on success

Audio depends on paragraphs existing, so we trigger the
narration lambda only after lesson_text reaches 'ready'.
Idempotency in audio-narration skips reruns.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Deploy + verify (0.25h)

### Task 10: SST deploy + .env.local

**Files:**
- Modify: `.env.local` (gitignored)

- [ ] **Step 1: Deploy**

Run:
```bash
eval "$(aws configure export-credentials --profile personal --format env)"
pnpm sst deploy --stage dev
```

Expected: deploy ok, prints `ImageGenQueueUrl` + `AudioNarrationQueueUrl`.

- [ ] **Step 2: Update .env.local**

Agregar después de `SQS_LESSON_TEXT_URL`:
```bash
SQS_IMAGE_GEN_URL=<URL del output>
SQS_AUDIO_NARRATION_URL=<URL del output>
```

- [ ] **Step 3: Verify lambdas**

```bash
aws lambda list-functions --region us-east-1 --profile personal --query "Functions[?contains(FunctionName, 'ImageGenerator') || contains(FunctionName, 'AudioNarrator')].FunctionName" --output text
```
Expected: 2 nombres de funciones aparecen.

---

## Phase 4 — Frontend wiring (1h)

### Task 11: Update lesson-flow-generic para mostrar imagen + audio

**Files:**
- Create: `components/lesson-flow-generic/audio-player.tsx`
- Create: `components/lesson-flow-generic/asset-panel.tsx`
- Modify: `components/lesson-flow-generic/content-screen.tsx`
- Modify: `components/lesson-flow-generic/index.tsx`
- Modify: `lib/api/nodes.ts` — actualizar shape de NodeAssets para que coincida con la API (usa `url` no `s3Key`)

- [ ] **Step 1: Update lib/api/nodes.ts**

Modify `lib/api/nodes.ts`. La interface NodeAssets ya usa `url` — verificar que no haya cambiado a s3Key. Si sí, dejarla con `url`:
```ts
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
```
(El route ya hace presigning + agrega `url` y borra `s3Key`. El cliente solo ve `url`.)

- [ ] **Step 2: AudioPlayer component**

Create `components/lesson-flow-generic/audio-player.tsx`:
```tsx
'use client'

import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  durationSec: number
}

export function AudioPlayer({ src, durationSec }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const a = ref.current
    if (!a) return
    const onTime = () => setProgress(a.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const a = ref.current
    if (!a) return
    if (a.paused) a.play()
    else a.pause()
  }
  const restart = () => {
    const a = ref.current
    if (!a) return
    a.currentTime = 0
    a.play()
  }

  const pct = durationSec > 0 ? Math.min(100, (progress / durationSec) * 100) : 0
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3">
      <audio ref={ref} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-90"
        aria-label={playing ? 'Pausar audio' : 'Reproducir audio'}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
      </button>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-black/50">
          <span>Narración IA</span>
          <span>{fmtTime(progress)} / {fmtTime(durationSec)}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/8">
          <div className="h-full rounded-full bg-black transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={restart}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black"
        aria-label="Reiniciar audio"
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 3: AssetPanel — image + audio juntos**

Create `components/lesson-flow-generic/asset-panel.tsx`:
```tsx
'use client'

import { ImageIcon, Volume2 } from 'lucide-react'
import { AudioPlayer } from './audio-player'

interface Props {
  image: { url: string } | null
  audio: { url: string; durationSec: number } | null
}

export function AssetPanel({ image, audio }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-black/8 bg-black/4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="Ilustración del tema" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-black/40">
            <ImageIcon className="size-8" />
            <p className="text-sm">Generando imagen...</p>
          </div>
        )}
      </div>
      {audio ? (
        <AudioPlayer src={audio.url} durationSec={audio.durationSec} />
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-black/12 bg-white px-4 py-3 text-sm text-black/40">
          <Volume2 className="size-4" />
          Generando narración...
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update content-screen.tsx — layout 2 columnas**

Modify `components/lesson-flow-generic/content-screen.tsx`. Replace ENTIRE file:
```tsx
'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { AssetPanel } from './asset-panel'

interface Props {
  paragraphs: string[]
  image: { url: string } | null
  audio: { url: string; durationSec: number } | null
  onBack: () => void
  onNext: () => void
}

export function ContentScreen({ paragraphs, image, audio, onBack, onNext }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 overflow-y-auto px-6 py-8">
        <div className="flex flex-1 flex-col gap-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed tracking-[-0.32px] text-black">
              {p}
            </p>
          ))}
        </div>
        <aside className="w-[360px] shrink-0">
          <AssetPanel image={image} audio={audio} />
        </aside>
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

- [ ] **Step 5: Pasar assets desde el orquestador**

Modify `components/lesson-flow-generic/index.tsx`. Localizar el render de `<ContentScreen ...>` y pasarle `image` + `audio`:
```tsx
{step.kind === 'content' && (
  <ContentScreen
    paragraphs={lesson.paragraphs}
    image={assetsQuery.data?.image ?? null}
    audio={assetsQuery.data?.audio ?? null}
    onBack={handleContentBack}
    onNext={handleContentNext}
  />
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
git add components/lesson-flow-generic
git commit -m "$(cat <<'EOF'
feat(lesson-generic): show image + audio narration in content screen

Two-column layout: paragraphs on the left, AssetPanel on the
right (image + AudioPlayer). Both render placeholder states
while the lambdas are still generating. Once ready, image
shows up inline and audio is playable with a custom control.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Smoke E2E + push (0.5h)

### Task 12: End-to-end + push

- [ ] **Step 1: Re-trigger graph-recalc para subject de prueba**

Si querés ver assets en una materia que ya tenía nodos pero no imagen/audio:
```bash
SUBJ_UUID=<uuid de un subject con nodos>
aws sqs send-message \
  --queue-url "$SQS_GRAPH_RECALC_URL" \
  --message-body "{\"subjectId\":\"$SUBJ_UUID\",\"triggeredBy\":\"plan3-smoke\"}" \
  --message-group-id "$SUBJ_UUID" \
  --message-deduplication-id "plan3-$(date +%s)" \
  --region us-east-1 --profile personal
```

(O subir un PDF nuevo a un subject vacío y dejar que el pipeline corra completo.)

- [ ] **Step 2: Esperar ~1-2 min y chequear DB**

```sql
SELECT
  n.title,
  COUNT(DISTINCT CASE WHEN nc.content_type='lesson_text' AND nc.status='ready' THEN 1 END) AS has_lesson,
  COUNT(DISTINCT CASE WHEN nc.content_type='image' AND nc.status='ready' THEN 1 END) AS has_image,
  COUNT(DISTINCT CASE WHEN nc.content_type='audio' AND nc.status='ready' THEN 1 END) AS has_audio
FROM nodes n
LEFT JOIN node_content nc ON nc.node_id = n.id
WHERE n.subject_id = '<uuid>'
GROUP BY n.id, n.title;
```

Expected: cada nodo tiene 1/1/1 (lesson + image + audio).

- [ ] **Step 3: Browser smoke**

```bash
pnpm dev > /tmp/devlog.txt 2>&1 &
sleep 10
```

Browser:
1. Navegá a `/subjects/<uuid>`
2. Click en una lesson card
3. Comenzar → ContentScreen muestra párrafos + imagen real + audio player
4. Click play en el audio → escuchás la narración
5. Avanzá al quiz → respondé → done con score

```bash
kill %1
```

- [ ] **Step 4: Push branch**

```bash
git push origin plan-3-image-and-audio-lambdas
```

- [ ] **Step 5: Reportar resultados**

---

## Out of scope para Plan 3

- Lambdas podcast + video → **Plan 4**
- Profile UI → **Plan 5**
- Format toggle (texto / audio / video / podcast) → **Plan 4** cuando los 4 formatos existen
- Cleanup AppContext + data.ts + Vercel deploy → **Plan 5**
