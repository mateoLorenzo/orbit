# Plan 4 — AI SDK migration (Anthropic-only, extension hooks for future providers)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar `@anthropic-ai/sdk` por `ai` (Vercel AI SDK) + `@ai-sdk/anthropic`. Mismo modelo (Haiku 4.5 / Sonnet 4.6), mismo costo, mismo presupuesto de $50 USD en la key de Anthropic. La ganancia es código más limpio (`generateObject` + Zod schemas en vez de boilerplate manual de `tool_choice`) y un punto de extensión claro para sumar OpenAI / OpenRouter en el futuro sin reescribir callers.

**Architecture:** Nuevo helper `lambdas/_shared/ai.ts` expone `generate({ tier, system, prompt, schema, maxTokens })` que recibe un Zod schema y devuelve el objeto tipado. Internamente usa `generateObject` de AI SDK con un provider Anthropic inicializado desde `Resource.AnthropicApiKey.value` (SST secret). El `lambdas/_shared/anthropic.ts` actual se borra junto con `lib/anthropic/client.ts` (dead code, cero consumers fuera del propio archivo). Sólo dos lambdas tocan AI: `graph-recalc/synth.ts` y `lesson-text/synth.ts`. Los Zod schemas que ya existen en `graph-recalc/synth.ts` se reutilizan; el JSON Schema inline de `lesson-text/synth.ts` se convierte a Zod.

**Tech Stack:** ai (v5) · @ai-sdk/anthropic · zod (^3.24.1, ya instalado) · SST 4 · Anthropic Claude Haiku 4.5 / Sonnet 4.6

---

## File Structure

**Crear:**
- `lambdas/_shared/ai.ts` — `generate(opts)` + `MODEL_TIERS` constants, factory provider con `Resource.AnthropicApiKey`

**Modificar:**
- `package.json` — sacar `@anthropic-ai/sdk`, sumar `ai` + `@ai-sdk/anthropic`
- `lambdas/graph-recalc/synth.ts` — `callTool` → `generate`, reusar `FileSummarySchema` y `SynthGraphSchema` (ya en Zod)
- `lambdas/lesson-text/synth.ts` — `callTool` → `generate`, convertir `TOOL_SCHEMA` (JSON Schema) a Zod
- `scripts/smoke-anthropic-ai.ts` (nuevo) — smoke chico de pre-deploy para confirmar key + provider antes de pagar el deploy

**Borrar:**
- `lambdas/_shared/anthropic.ts` (reemplazado por `ai.ts`)
- `lib/anthropic/client.ts` (sin consumers; el grep `from '@/lib/anthropic'` no encuentra nada fuera del propio archivo)

---

## Cost guardrails

Tus $50 de presupuesto en la key Anthropic alcanzan holgadamente para esta migración:
- **Smoke test pre-deploy** (Task 5): 1 call a Haiku con un prompt de ~50 tokens → **~$0.0001**
- **Smoke E2E post-deploy** (Task 8): 1 graph-recalc en un subject de prueba con 1 PDF chico (~3 páginas) → 1 summarize + 1 synthesize + N lesson-text (donde N = nodos sintetizados, ~5-8 para un PDF chico) → **~$0.10 total**
- **Total Plan 4 ≤ $0.15**, queda margen para 2-3 retries si algo falla.

No se llama a Sonnet en este plan. Ningún cambio de modelo respecto a hoy.

---

## Phase 0 — Dep swap (10 min)

### Task 1: Reemplazar `@anthropic-ai/sdk` por AI SDK

**Files:** Modify `package.json`

- [ ] **Step 1: Sacar dep vieja**

```bash
pnpm remove @anthropic-ai/sdk
```

Esperado: `package.json` ya no tiene `"@anthropic-ai/sdk"`. `pnpm-lock.yaml` actualizado.

- [ ] **Step 2: Sumar AI SDK + provider Anthropic**

```bash
pnpm add ai @ai-sdk/anthropic
```

Esperado: `package.json` tiene ahora `"ai": "^5.x"` y `"@ai-sdk/anthropic": "^2.x"` (las versiones exactas las elige pnpm; cualquier 5.x / 2.x sirve). Zod ya está instalado.

- [ ] **Step 3: Verify**

```bash
grep -E '"ai"|"@ai-sdk/anthropic"|"@anthropic-ai/sdk"|"zod"' package.json
```

Esperado: `ai`, `@ai-sdk/anthropic`, `zod` presentes. `@anthropic-ai/sdk` ausente.

- [ ] **Step 4: Verify env tiene la key**

```bash
grep -E "^ANTHROPIC_API_KEY" .env.local | sed 's/=.*/=***/'
```

Esperado: `ANTHROPIC_API_KEY=***`. Si no está, parar y avisar.

- [ ] **Step 5: Verify SST tiene el secret**

```bash
grep -A 2 "AnthropicApiKey" sst.config.ts
```

Esperado: ver `new sst.Secret("AnthropicApiKey")` o equivalente, y que graph-recalc + lesson-text functions tengan `link: [...AnthropicApiKey...]` en su definición.

(No commit todavía. Phase 1 commitea junto con el helper para evitar romper TS entre commits.)

---

## Phase 1 — Core helper (30 min)

### Task 2: Escribir `lambdas/_shared/ai.ts`

**File:** Create `lambdas/_shared/ai.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { Resource } from 'sst'
import type { z } from 'zod'

let _anthropic: ReturnType<typeof createAnthropic> | null = null

function anthropicProvider() {
  if (_anthropic) return _anthropic
  const apiKey = Resource.AnthropicApiKey.value
  if (!apiKey) throw new Error('AnthropicApiKey secret is not set')
  _anthropic = createAnthropic({ apiKey })
  return _anthropic
}

export const MODEL_TIERS = {
  fast: 'claude-haiku-4-5',
  smart: 'claude-sonnet-4-6',
} as const

export type ModelTier = keyof typeof MODEL_TIERS

interface GenerateOptions<S extends z.ZodTypeAny> {
  tier?: ModelTier
  system: string
  prompt: string
  schema: S
  schemaName?: string
  schemaDescription?: string
  maxTokens?: number
}

/**
 * Single-turn structured generation. Returns the parsed Zod object.
 *
 * Default provider is Anthropic (claude-haiku-4-5 / claude-sonnet-4-6).
 * To swap providers later: install @ai-sdk/openai or @openrouter/ai-sdk-provider,
 * replace anthropicProvider() with a switch on tier (or env var), and adjust
 * MODEL_TIERS. Callers don't change.
 */
export async function generate<S extends z.ZodTypeAny>(
  opts: GenerateOptions<S>,
): Promise<z.infer<S>> {
  const provider = anthropicProvider()
  const model = provider(MODEL_TIERS[opts.tier ?? 'fast'])
  const { object } = await generateObject({
    model,
    system: opts.system,
    prompt: opts.prompt,
    schema: opts.schema,
    schemaName: opts.schemaName,
    schemaDescription: opts.schemaDescription,
    maxOutputTokens: opts.maxTokens ?? 4096,
  })
  return object
}
```

- [ ] **Step 2: TS check**

```bash
pnpm tsc --noEmit
```

Esperado: sin errores nuevos. (Hay 2 callers viejos —`graph-recalc/synth.ts` y `lesson-text/synth.ts`— que todavía importan `callTool` desde el archivo viejo `_shared/anthropic.ts`; eso sigue compilando porque ese archivo aún no se borró.)

- [ ] **Step 3: Commit**

```bash
git add lambdas/_shared/ai.ts package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(_shared): add AI SDK helper with Anthropic provider

generate(opts) wraps generateObject + @ai-sdk/anthropic. Same
Anthropic Haiku/Sonnet models as before; the goal is cleaner
code (Zod schemas, typed return) and a clear extension point
for adding OpenAI/OpenRouter without rewriting callers.

@anthropic-ai/sdk removed from deps. callers (graph-recalc,
lesson-text) migrate in the next commits — old _shared/anthropic.ts
stays in place until they cut over.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Migrate lambdas (45 min)

### Task 3: Migrar `lambdas/graph-recalc/synth.ts`

**File:** Modify `lambdas/graph-recalc/synth.ts`

- [ ] **Step 1: Cambiar import**

Reemplazar la línea 2:
```ts
import { callTool } from '../_shared/anthropic'
```
por:
```ts
import { generate } from '../_shared/ai'
```

- [ ] **Step 2: Migrar `summarizeFile`**

Reemplazar el bloque `const raw = await callTool<FileSummary>({...})` (~líneas 23-46) por:

```ts
  return generate({
    tier: 'fast',
    schema: FileSummarySchema,
    schemaName: 'FileSummary',
    schemaDescription:
      'A 2 to 4 sentence summary plus 5 to 12 keywords for this file. Keywords should be the core concepts a student must learn.',
    system:
      'You analyze student-uploaded study materials. Produce concise, faithful summaries strictly grounded in the supplied text. Never invent topics not present in the source. Output English regardless of the source language.',
    prompt: `Subject: ${input.subjectName}\nFile: ${input.filename}\n\n--- Material ---\n${text}`,
    maxTokens: 800,
  })
```

Y borrar la línea final `return FileSummarySchema.parse(raw)` (ya no hace falta — `generate` valida internamente vía AI SDK).

- [ ] **Step 3: Migrar `synthesizeGraph`**

Reemplazar el bloque `const raw = await callTool<SynthGraph>({...})` (~líneas 83-124) por:

```ts
  return generate({
    tier: 'fast',
    schema: SynthGraphSchema,
    schemaName: 'ConceptGraph',
    schemaDescription: 'Synthesized concept graph for this subject. Each node is one atomic, teachable concept with optional prerequisite titles referencing other nodes in this same response.',
    system:
      'You design study learning paths as concept graphs.\n' +
      'Rules:\n' +
      '- Output only concepts present in the supplied materials. Never invent topics.\n' +
      '- 5 to 30 nodes total. Each node is one atomic, teachable concept.\n' +
      '- "prerequisiteTitles" must reference other node titles in this same response. Avoid cycles.\n' +
      '- Reuse existing titles verbatim when the same concept appears.\n' +
      '- Use English for titles and briefs regardless of the source language.',
    prompt: `Subject: ${input.subjectName}\n\nMaterials:\n${filesBlock}${existingBlock}\n\nGenerate the concept graph.`,
    maxTokens: 4096,
  })
```

Y borrar la línea final `return SynthGraphSchema.parse(raw)`.

- [ ] **Step 4: Verificar archivo entero**

El archivo debería verse limpio ahora — los Zod schemas (`FileSummarySchema` + `SynthGraphSchema`) siguen exactamente como están, sólo cambian las llamadas.

```bash
grep -n "callTool\|inputSchema\|toolName" lambdas/graph-recalc/synth.ts
```

Esperado: cero matches.

- [ ] **Step 5: TS check**

```bash
pnpm tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add lambdas/graph-recalc/synth.ts
git commit -m "$(cat <<'EOF'
refactor(graph-recalc): use AI SDK generate() instead of callTool

summarizeFile + synthesizeGraph now go through the new shared
helper. Zod schemas (FileSummarySchema, SynthGraphSchema) are
reused as-is — generateObject validates internally so the
explicit .parse() at the end is redundant and removed.

No model change (still Haiku 4.5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Migrar `lambdas/lesson-text/synth.ts`

**File:** Modify `lambdas/lesson-text/synth.ts`

- [ ] **Step 1: Cambiar import + sumar zod**

Reemplazar la línea 1:
```ts
import { callTool } from '../_shared/anthropic'
```
por:
```ts
import { z } from 'zod'
import { generate } from '../_shared/ai'
```

- [ ] **Step 2: Convertir `TOOL_SCHEMA` (JSON Schema) a Zod**

Reemplazar el bloque `const TOOL_SCHEMA = {...}` (líneas 31-61) por:

```ts
const LessonTextSchema = z.object({
  paragraphs: z
    .array(z.string().min(50).max(800))
    .min(3)
    .max(4),
  quiz: z
    .array(
      z.object({
        question: z.string().min(10).max(250),
        options: z.array(z.string().min(1).max(200)).length(4),
        correctIndex: z.number().int().min(0).max(3),
      }),
    )
    .min(2)
    .max(3),
})
```

Y reemplazar la interface manual `LessonText` (líneas 3-10) por la inferida:
```ts
export type LessonText = z.infer<typeof LessonTextSchema>
```

- [ ] **Step 3: Migrar `generateLessonText`**

Reemplazar el bloque `return callTool<LessonText>({...})` (~líneas 81-89) por:

```ts
  return generate({
    tier: 'fast',
    schema: LessonTextSchema,
    schemaName: 'LessonText',
    schemaDescription:
      'Lección estructurada con párrafos explicativos y quiz multiple-choice. 3-4 párrafos, 2-3 preguntas con 4 opciones cada una y un correctIndex.',
    system: SYSTEM,
    prompt: userPrompt,
    maxTokens: 4096,
  })
```

- [ ] **Step 4: Verificar archivo entero**

```bash
grep -n "callTool\|inputSchema\|toolName\|TOOL_SCHEMA" lambdas/lesson-text/synth.ts
```

Esperado: cero matches.

- [ ] **Step 5: TS check**

```bash
pnpm tsc --noEmit
```

Esperado: sin errores. Si el `LessonText` type cambia su shape (no debería — el Zod schema produce el mismo shape que la interface manual), revisar `lambdas/lesson-text/index.ts` para asegurarse que el handler todavía consume los campos `paragraphs` + `quiz` correctamente.

- [ ] **Step 6: Commit**

```bash
git add lambdas/lesson-text/synth.ts
git commit -m "$(cat <<'EOF'
refactor(lesson-text): use AI SDK generate() + Zod schema

LessonText interface replaced by z.infer<typeof LessonTextSchema>.
The hand-written JSON Schema (TOOL_SCHEMA) is gone — Zod is
the single source of truth for the structure now, and AI SDK's
generateObject converts it to JSON Schema under the hood.

No model change (still Haiku 4.5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Borrar legacy (5 min)

### Task 5: Smoke test pre-deploy + delete old helpers

**File:** Create `scripts/smoke-anthropic-ai.ts` (temporary)

- [ ] **Step 1: Crear smoke local**

```ts
import { z } from 'zod'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

const anthropic = createAnthropic({ apiKey })

async function main() {
  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5'),
    schema: z.object({ greeting: z.string(), wordsInGreeting: z.number() }),
    schemaName: 'Greeting',
    system: 'You answer briefly.',
    prompt: 'Say hello in 3 words and report how many words you used.',
    maxOutputTokens: 100,
  })
  console.log('OK:', object)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

Sumar al `package.json`:
```json
"smoke:anthropic-ai": "tsx --env-file=.env.local scripts/smoke-anthropic-ai.ts"
```

- [ ] **Step 2: Correr smoke**

```bash
pnpm smoke:anthropic-ai
```

Esperado: `OK: { greeting: 'Hello there friend', wordsInGreeting: 3 }` (o variantes; el shape importa, no los valores). Si falla por API key, parar y verificar `.env.local`. Si falla por dep, volver a Phase 0.

Costo: ~$0.0001.

- [ ] **Step 3: Borrar archivos legacy**

```bash
rm lambdas/_shared/anthropic.ts lib/anthropic/client.ts scripts/smoke-anthropic-ai.ts
```

(El smoke se borra junto — fue de un solo uso. Si querés que quede como herramienta, en lugar de borrarlo, dejá la entrada en `package.json`.)

- [ ] **Step 4: Verificar que no quedó nada huérfano**

```bash
grep -rn "@anthropic-ai/sdk\|from '../_shared/anthropic\|from '@/lib/anthropic" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules
```

Esperado: cero matches.

- [ ] **Step 5: TS check + tests**

```bash
pnpm tsc --noEmit
pnpm test
```

Esperado: TS clean, 33 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: remove legacy @anthropic-ai/sdk wrappers

lambdas/_shared/anthropic.ts and lib/anthropic/client.ts had
zero remaining consumers after the migration. The dep was
already removed from package.json in Phase 0; this just deletes
the wrapper files.

scripts/smoke-anthropic-ai.ts was a one-shot validation that
the new AI SDK + provider could authenticate before paying for
a full lambda redeploy. Removed too.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Deploy + smoke E2E (30 min)

### Task 6: Deploy lambdas

- [ ] **Step 1: AWS auth**

```bash
aws sts get-caller-identity --profile personal
```

Esperado: imprime account ID `651285356370` (sin error).

- [ ] **Step 2: Deploy**

```bash
eval "$(aws configure export-credentials --profile personal --format env)"
pnpm sst deploy --stage dev
```

Esperado: `✓ Complete` con todas las queues + buckets listados. Tiempo: 1-2 min (sólo cambian dos lambdas: graph-recalc + lesson-text).

Si falla por dep no resuelta (`@anthropic-ai/sdk` linked en alguna parte sin actualizar), volver a Task 5 Step 4.

---

### Task 7: Smoke E2E con un PDF

**Goal:** Subir un PDF chico a un subject nuevo, esperar que el pipeline corra (pdf → embedder → graph-recalc → lesson-text), y verificar que graph-recalc + lesson-text producen output con el helper nuevo.

- [ ] **Step 1: Verificar PDFs disponibles**

```bash
ls walkthrough/*.pdf 2>/dev/null | head -3
```

Si no hay PDFs en `walkthrough/`, usar cualquier PDF chico del repo, por ejemplo:
```bash
find . -name "*.pdf" -size -200k -not -path "./node_modules/*" 2>/dev/null | head -3
```

Pickeá uno de 1-3 páginas (max ~200KB). Si no hay ninguno apto, pedirle al user que provea uno.

- [ ] **Step 2: Correr smoke-e2e**

```bash
eval "$(aws configure export-credentials --profile personal --format env)"
pnpm smoke:e2e <path-to-pdf>
```

Esperado: el script crea un subject, sube el PDF presignado, dispara la pipeline, y polea el estado hasta ver lecciones generadas. Output incluye los UUIDs del subject + nodos creados.

Tiempo: ~2-4 min (depende del tamaño del PDF y del cold-start de las lambdas).

Costo: ~$0.10 (1 summarize + 1 synthesize + ~5-8 lesson-text calls a Haiku).

- [ ] **Step 3: Verificar contenido generado**

Tomar el `subjectId` impreso por el smoke (UUID) y correr:

```bash
SUBJECT_ID=<paste-uuid>
```

Vía supabase MCP (preferido) o psql:
```sql
SELECT n.title, n.slug, nc.status, jsonb_array_length(nc.generation_metadata->'paragraphs') AS para_count
FROM nodes n
LEFT JOIN node_content nc ON nc.node_id = n.id AND nc.content_type = 'lesson_text'
WHERE n.subject_id = '<SUBJECT_ID>'
ORDER BY n.created_at;
```

Esperado:
- Cada nodo tiene un slug (heredado de Plan 3.5)
- Al menos 1-2 nodos con `nc.status = 'ready'` y `para_count` entre 3 y 4
- El resto pueden estar `generating` (lesson-text demora unos segundos por nodo)

Si todos los nodos están `failed`, mirar CloudWatch logs (Step 4) — probable que el helper o el provider esté mal inicializado.

- [ ] **Step 4: Verificar CloudWatch logs**

```bash
eval "$(aws configure export-credentials --profile personal --format env)"
aws logs tail /aws/lambda/platanus-hack-26-ar-team-25-dev-LessonTextGenerator --since 10m --follow=false 2>&1 | head -40
```

Esperado: ver logs de `lesson-text: start { nodeId: ... }` seguidos de `lesson-text: done`. Ningún `Error: AnthropicApiKey secret is not set` ni `Error: 401`.

Mismo check para graph-recalc:
```bash
aws logs tail /aws/lambda/platanus-hack-26-ar-team-25-dev-GraphRecalc --since 10m --follow=false 2>&1 | head -40
```

- [ ] **Step 5: Cleanup del subject de prueba**

```sql
DELETE FROM subjects WHERE id = '<SUBJECT_ID>';
```

(Cascade borra files + nodes + node_content + node_edges.)

---

## Phase 5 — Push + PR (10 min)

### Task 8: Push branch + PR

- [ ] **Step 1: Sumario de cambios**

```bash
git log --oneline @{u}..HEAD
```

Esperado: 4 commits (helper, graph-recalc, lesson-text, cleanup).

- [ ] **Step 2: Push**

```bash
git push
```

(Si la branch nueva fue `plan-4-ai-sdk-migration` y todavía no se pusheó, agregar `-u origin plan-4-ai-sdk-migration`.)

- [ ] **Step 3: Crear PR**

```bash
gh pr create --title "Plan 4: migrate Anthropic SDK to Vercel AI SDK" --body "$(cat <<'EOF'
## Summary

- Reemplaza `@anthropic-ai/sdk` por `ai` (Vercel AI SDK) + `@ai-sdk/anthropic`. Mismo provider (Anthropic), mismos modelos (Haiku 4.5 / Sonnet 4.6), mismo costo. La key sigue siendo el SST secret `AnthropicApiKey`.
- Nuevo helper compartido `lambdas/_shared/ai.ts` con `generate({ tier, system, prompt, schema, maxTokens })`. Recibe Zod schemas y devuelve el objeto tipado vía `generateObject`. Reemplaza el boilerplate manual de `tool_choice`.
- Borra `lambdas/_shared/anthropic.ts` y `lib/anthropic/client.ts` (este último era dead code, sin consumers).
- `lambdas/graph-recalc/synth.ts` reusa los Zod schemas que ya tenía (`FileSummarySchema`, `SynthGraphSchema`). `lambdas/lesson-text/synth.ts` convierte su `TOOL_SCHEMA` (JSON Schema) a Zod (`LessonTextSchema`).

## Extension hooks (out of scope para este PR)

Para sumar OpenAI o OpenRouter más adelante:
1. `pnpm add @ai-sdk/openai` (o `@openrouter/ai-sdk-provider`).
2. En `lambdas/_shared/ai.ts`, reemplazar `anthropicProvider()` por un switch (por env var o por tier).
3. Sumar la key correspondiente como SST secret y linkearla a las funciones que lo necesiten.
4. Cero cambios en los callers (graph-recalc/synth, lesson-text/synth).

## Test plan

- [ ] `pnpm test` → 33 tests pass
- [ ] `pnpm tsc --noEmit` → clean
- [ ] `pnpm sst deploy --stage dev` → `✓ Complete`
- [ ] `pnpm smoke:e2e <small-pdf>` → subject creado, ≥1 node con lesson_text status='ready' y 3-4 paragraphs
- [ ] CloudWatch logs LessonTextGenerator + GraphRecalc → cero errores 401 / "AnthropicApiKey secret is not set"

## Costo del migration

- Smoke pre-deploy: ~$0.0001
- Smoke E2E post-deploy: ~$0.10
- Total: ≤ $0.15 — bien dentro del presupuesto de $50 USD en la key Anthropic.
EOF
)"
```

- [ ] **Step 4: Reportar URL del PR al usuario**

---

## Out of scope para Plan 4

- **Embeddings**: Voyage sigue como está (no hay embeddings en AI SDK con el dimension match). Migrar a OpenAI embeddings o a `@ai-sdk/voyage` queda para Plan 5+.
- **Imágenes**: FAL sigue directo. Migrar a `generateImage` de AI SDK queda para cuando se reactive el fan-out (Plan 5 con Higgsfield, según Plan 3.5).
- **TTS**: Polly sigue directo. Sumar `generateSpeech` con OpenAI/ElevenLabs es upgrade de calidad, plan separado.
- **Sumar OpenAI / OpenRouter**: el helper deja el hook listo (ver "Extension hooks" arriba), pero no se instala ni se prueba aquí. Decisión deliberada para no inflar el blast radius del refactor.
- **Streaming en lesson-text**: AI SDK soporta `streamObject` para mostrar paragraphs a medida que se generan. Es UX upgrade, plan separado.
