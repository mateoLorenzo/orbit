import type { SQSEvent, SQSHandler } from 'aws-lambda'

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const payload = JSON.parse(record.body)
    console.log('graph-recalc: TODO synthesize graph', { subjectId: payload.subjectId })
    // TODO Phase 3:
    // 1. Debounce: re-enqueue with DelaySeconds=30 if last_upload_at < 30s ago
    // 2. Fetch processed files (summary+keywords) and current graph
    // 3. Call Anthropic claude-haiku-4-5 with structured output (zod schema)
    // 4. Diff vs current: reuse IDs, insert new, archive missing
    // 5. Recompute topic_embedding via Voyage; mark stale node_content if cosine < 0.85
  }
}
