import { Resource } from 'sst'

interface PromptInput {
  subjectName: string
  nodeTitle: string
  contentBrief: string
  interests: string[]
}

const STYLE = 'editorial illustration, textbook diagram aesthetic, clean composition, professional, neutral color palette, high contrast'

export function buildImagePrompt(input: PromptInput): string {
  const interestFlavor =
    input.interests.length > 0
      ? `, subtle visual cues from ${input.interests.slice(0, 2).join(' and ')}`
      : ''
  return `${input.nodeTitle} — ${input.contentBrief}${interestFlavor}. ${STYLE}.`
}

export interface FalImageResult {
  bytes: Uint8Array
  contentType: string
}

const FAL_ENDPOINT = 'https://fal.run/fal-ai/flux/schnell'

export async function generateImage(prompt: string): Promise<FalImageResult> {
  const apiKey = Resource.FalKey.value
  if (!apiKey) throw new Error('FalKey secret is not set')

  const res = await fetch(FAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_4_3',
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`FAL call failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { images: Array<{ url: string; content_type?: string }> }
  if (!data.images || data.images.length === 0) {
    throw new Error('FAL returned no images')
  }

  const imgUrl = data.images[0].url
  const contentType = data.images[0].content_type ?? 'image/png'
  const imgRes = await fetch(imgUrl)
  if (!imgRes.ok) throw new Error(`failed to download FAL image: ${imgRes.status}`)
  const buf = new Uint8Array(await imgRes.arrayBuffer())
  return { bytes: buf, contentType }
}
