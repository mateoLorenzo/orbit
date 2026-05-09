import { embed, EMBEDDING_DIMS, EMBEDDING_MODEL } from '../lib/voyage/embeddings'

async function main() {
  const texts = [
    'The integral of a function is the antiderivative.',
    'Newtons second law states force equals mass times acceleration.',
  ]
  const vectors = await embed(texts, 'document')

  console.log(`model: ${EMBEDDING_MODEL}`)
  console.log(`expected dims: ${EMBEDDING_DIMS}`)
  console.log(`returned vectors: ${vectors.length}`)
  for (const [i, v] of vectors.entries()) {
    console.log(`  [${i}] dim=${v.length}, sample=[${v.slice(0, 3).map((n) => n.toFixed(4)).join(', ')}, ...]`)
    if (v.length !== EMBEDDING_DIMS) {
      throw new Error(`vector ${i} has wrong dimensions: ${v.length} != ${EMBEDDING_DIMS}`)
    }
  }
  console.log('OK — Voyage embeddings work and dims match the schema.')
  process.exit(0)
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err)
  process.exit(1)
})
