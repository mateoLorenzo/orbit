import { eq, and } from 'drizzle-orm'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { db, schema } from '../lib/db/client'

const SLUG = process.argv[2]

async function main() {
  if (!SLUG) {
    console.error('Usage: pnpm tsx --env-file=.env.local scripts/regen-graph.ts <subject-slug>')
    process.exit(2)
  }

  const queueUrl = process.env.SQS_GRAPH_RECALC_URL
  if (!queueUrl) throw new Error('SQS_GRAPH_RECALC_URL is not set')

  const [subject] = await db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.slug, SLUG))
    .limit(1)
  if (!subject) {
    console.error(`subject with slug "${SLUG}" not found`)
    process.exit(1)
  }
  console.log(`✓ subject: ${subject.id} — ${subject.name}`)

  const cleared = await db
    .update(schema.files)
    .set({ summary: null, keywords: null })
    .where(
      and(
        eq(schema.files.subjectId, subject.id),
        eq(schema.files.status, 'processed'),
      ),
    )
    .returning({ id: schema.files.id, originalFilename: schema.files.originalFilename })
  console.log(`✓ cleared summary/keywords on ${cleared.length} processed files`)
  for (const f of cleared) console.log(`    - ${f.id} ${f.originalFilename}`)

  const deleted = await db
    .delete(schema.nodes)
    .where(eq(schema.nodes.subjectId, subject.id))
    .returning({ id: schema.nodes.id })
  console.log(`✓ hard-deleted ${deleted.length} nodes (CASCADE clears node_content/edges/progress)`)

  const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ subjectId: subject.id, triggeredBy: 'regen-graph-script' }),
      MessageGroupId: subject.id,
      MessageDeduplicationId: `${subject.id}:regen:${Date.now()}`,
    }),
  )
  console.log(`✓ enqueued graph-recalc for subject ${subject.id}`)
  console.log('  → graph-recalc lambda will re-summarize files in source language,')
  console.log('  → then archive English nodes, create Spanish nodes,')
  console.log('  → and fan out lesson-text generation.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
