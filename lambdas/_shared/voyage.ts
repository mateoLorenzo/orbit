import { Resource } from 'sst'

export const EMBEDDING_MODEL = 'voyage-3.5'
export const EMBEDDING_DIMS = 1024

type InputType = 'document' | 'query'

interface VoyageEmbedResponse {
  data: { embedding: number[]; index: number }[]
  model: string
  usage: { total_tokens: number }
}

export async function embed(texts: string[], inputType: InputType = 'document'): Promise<number[][]> {
  if (texts.length === 0) return []
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Resource.VoyageApiKey.value}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
      input_type: inputType,
      output_dimension: EMBEDDING_DIMS,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Voyage embed failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as VoyageEmbedResponse
  // Sort by index just in case the API doesn't preserve order
  const sorted = [...json.data].sort((a, b) => a.index - b.index)
  return sorted.map((d) => d.embedding)
}
