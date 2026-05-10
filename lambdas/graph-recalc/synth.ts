import { z } from 'zod'
import { generate } from '../_shared/ai'

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

  return generate({
    tier: 'fast',
    schema: FileSummarySchema,
    schemaName: 'FileSummary',
    schemaDescription:
      'A 2 to 4 sentence summary plus 5 to 12 keywords for this file. Keywords should be the core concepts a student must learn.',
    system:
      'You analyze student-uploaded study materials. Produce concise, faithful summaries strictly grounded in the supplied text. Never invent topics not present in the source. Write the summary and keywords in the same language as the supplied material (if the material is in Spanish, output Spanish; if English, output English; etc.).',
    prompt: `Subject: ${input.subjectName}\nFile: ${input.filename}\n\n--- Material ---\n${text}`,
    maxTokens: 800,
  })
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

  return generate({
    tier: 'fast',
    schema: SynthGraphSchema,
    schemaName: 'ConceptGraph',
    schemaDescription:
      'Synthesized concept graph for this subject. Each node is one atomic, teachable concept with optional prerequisite titles referencing other nodes in this same response.',
    system:
      'You design study learning paths as concept graphs.\n' +
      'Rules:\n' +
      '- Output only concepts present in the supplied materials. Never invent topics.\n' +
      '- 5 to 30 nodes total. Each node is one atomic, teachable concept.\n' +
      '- "prerequisiteTitles" must reference other node titles in this same response. Avoid cycles.\n' +
      '- Reuse existing titles verbatim when the same concept appears.\n' +
      '- Write titles and briefs in the same language as the source materials (e.g., Spanish materials → Spanish titles and briefs).',
    prompt: `Subject: ${input.subjectName}\n\nMaterials:\n${filesBlock}${existingBlock}\n\nGenerate the concept graph.`,
    maxTokens: 4096,
  })
}
