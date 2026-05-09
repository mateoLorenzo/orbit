import { VoyageAIClient } from 'voyageai'

let cached: VoyageAIClient | null = null

function getVoyage() {
  if (cached) return cached
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY is not set')
  cached = new VoyageAIClient({ apiKey })
  return cached
}

export const EMBEDDING_MODEL = 'voyage-3.5'
export const EMBEDDING_DIMS = 1024

type InputType = 'document' | 'query'

export async function embed(texts: string[], inputType: InputType = 'document'): Promise<number[][]> {
  if (texts.length === 0) return []
  const voyage = getVoyage()
  const res = await voyage.embed({
    input: texts,
    model: EMBEDDING_MODEL,
    inputType,
    outputDimension: EMBEDDING_DIMS,
  })
  const data = res.data ?? []
  return data.map((d) => d.embedding ?? [])
}

export async function embedOne(text: string, inputType: InputType = 'query'): Promise<number[]> {
  const [vec] = await embed([text], inputType)
  return vec
}
