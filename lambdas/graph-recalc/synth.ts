import { z } from 'zod'
import { callTool } from '../_shared/anthropic'

const MAX_FILE_TEXT_CHARS = 60_000

const FileSummarySchema = z.object({
  summary: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1).max(20),
})

export type FileSummary = z.infer<typeof FileSummarySchema>

export async function summarizeFile(input: {
  subjectName: string
  filename: string
  text: string
}): Promise<FileSummary> {
  const text =
    input.text.length > MAX_FILE_TEXT_CHARS
      ? input.text.slice(0, MAX_FILE_TEXT_CHARS)
      : input.text

  const raw = await callTool<FileSummary>({
    model: 'fast',
    system:
      'You analyze student-uploaded study materials. Produce concise, faithful summaries strictly grounded in the supplied text. Never invent topics not present in the source. Output English regardless of the source language.',
    user: `Subject: ${input.subjectName}\nFile: ${input.filename}\n\n--- Material ---\n${text}`,
    toolName: 'submit_summary',
    toolDescription:
      'Submit a 2 to 4 sentence summary plus 5 to 12 keywords for this file. Keywords should be the core concepts a student must learn.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '2-4 sentence summary in English.' },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 20,
          description: 'Core concepts as 5-12 short noun phrases.',
        },
      },
      required: ['summary', 'keywords'],
    },
    maxTokens: 800,
  })

  return FileSummarySchema.parse(raw)
}

const SynthGraphSchema = z.object({
  nodes: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        contentBrief: z.string().min(1).max(800),
        prerequisiteTitles: z.array(z.string()).default([]),
      }),
    )
    .min(1)
    .max(50),
})

export type SynthGraph = z.infer<typeof SynthGraphSchema>

export async function synthesizeGraph(input: {
  subjectName: string
  files: { filename: string; summary: string; keywords: string[] }[]
  existingTitles: string[]
}): Promise<SynthGraph> {
  const filesBlock = input.files
    .map(
      (f, i) =>
        `File ${i + 1}: ${f.filename}\nSummary: ${f.summary}\nKeywords: ${f.keywords.join(', ')}`,
    )
    .join('\n\n')

  const existingBlock =
    input.existingTitles.length > 0
      ? `\n\nExisting graph nodes (reuse these exact titles when the same concept reappears):\n- ${input.existingTitles.join('\n- ')}`
      : ''

  const raw = await callTool<SynthGraph>({
    model: 'fast',
    system:
      'You design study learning paths as concept graphs.\n' +
      'Rules:\n' +
      '- Output only concepts present in the supplied materials. Never invent topics.\n' +
      '- 5 to 30 nodes total. Each node is one atomic, teachable concept.\n' +
      '- "prerequisiteTitles" must reference other node titles in this same response. Avoid cycles.\n' +
      '- Reuse existing titles verbatim when the same concept appears.\n' +
      '- Use English for titles and briefs regardless of the source language.',
    user: `Subject: ${input.subjectName}\n\nMaterials:\n${filesBlock}${existingBlock}\n\nGenerate the concept graph.`,
    toolName: 'submit_graph',
    toolDescription: 'Submit the synthesized concept graph for this subject.',
    inputSchema: {
      type: 'object',
      properties: {
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Short concept title (3-8 words).' },
              contentBrief: {
                type: 'string',
                description: '2-5 sentence overview of what this node covers.',
              },
              prerequisiteTitles: {
                type: 'array',
                items: { type: 'string' },
                description: 'Titles of other nodes (in this response) that must be learned first.',
              },
            },
            required: ['title', 'contentBrief', 'prerequisiteTitles'],
          },
          minItems: 1,
          maxItems: 50,
        },
      },
      required: ['nodes'],
    },
    maxTokens: 4096,
  })

  return SynthGraphSchema.parse(raw)
}
