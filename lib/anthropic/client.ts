import Anthropic from '@anthropic-ai/sdk'

let cached: Anthropic | null = null

export function getAnthropic() {
  if (cached) return cached
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  cached = new Anthropic({ apiKey })
  return cached
}

// Default models for this project. Haiku for fast/cheap structured tasks
// (graph synth, image-prompt builder); Sonnet when reasoning or vision is needed.
export const ANTHROPIC_MODELS = {
  fast: 'claude-haiku-4-5',
  smart: 'claude-sonnet-4-6',
} as const
