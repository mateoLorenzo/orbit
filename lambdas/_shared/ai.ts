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
