import Anthropic from '@anthropic-ai/sdk'
import { Resource } from 'sst'

let cached: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (cached) return cached
  const apiKey = Resource.AnthropicApiKey.value
  if (!apiKey) throw new Error('AnthropicApiKey secret is not set')
  cached = new Anthropic({ apiKey })
  return cached
}

export const ANTHROPIC_MODELS = {
  fast: 'claude-haiku-4-5',
  smart: 'claude-sonnet-4-6',
} as const

export type ModelTier = keyof typeof ANTHROPIC_MODELS

interface CallToolOptions {
  model?: ModelTier
  system: string
  user: string
  toolName: string
  toolDescription: string
  inputSchema: Record<string, unknown>
  maxTokens?: number
}

export async function callTool<T>(opts: CallToolOptions): Promise<T> {
  const client = getAnthropic()
  const res = await client.messages.create({
    model: ANTHROPIC_MODELS[opts.model ?? 'fast'],
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    tool_choice: { type: 'tool', name: opts.toolName },
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.inputSchema as Anthropic.Tool.InputSchema,
      },
    ],
    messages: [{ role: 'user', content: opts.user }],
  })
  const block = res.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') {
    throw new Error(`Anthropic ${opts.toolName} did not return a tool_use block`)
  }
  return block.input as T
}
