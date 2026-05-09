// Simple character-based chunking with overlap. Good enough for MVP.
// Voyage's voyage-3.5 has a 32k token context; we chunk much smaller for retrieval quality.

const CHUNK_CHARS = 1200
const CHUNK_OVERLAP = 150

export interface Chunk {
  index: number
  text: string
  metadata: { startChar: number; endChar: number }
}

export function chunkText(text: string): Chunk[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length === 0) return []
  const chunks: Chunk[] = []
  let start = 0
  let index = 0
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_CHARS, cleaned.length)
    const slice = cleaned.slice(start, end).trim()
    if (slice.length > 0) {
      chunks.push({
        index,
        text: slice,
        metadata: { startChar: start, endChar: end },
      })
      index++
    }
    if (end >= cleaned.length) break
    start = end - CHUNK_OVERLAP
  }
  return chunks
}
