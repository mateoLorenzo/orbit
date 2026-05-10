import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'

const polly = new PollyClient({})

export type SpanishVoice = 'Mia' | 'Lupe' | 'Penelope'

export interface PollyResult {
  bytes: Buffer
  contentType: 'audio/mpeg'
  approxDurationSec: number  // estimated based on char count + WPM
}

const CHARS_PER_SECOND = 14 // empirical for neural Spanish at default rate

export async function synthesizeSpeech(
  text: string,
  voice: SpanishVoice = 'Mia',
): Promise<PollyResult> {
  const res = await polly.send(
    new SynthesizeSpeechCommand({
      Engine: 'neural',
      VoiceId: voice,
      LanguageCode: voice === 'Mia' ? 'es-MX' : 'es-US',
      OutputFormat: 'mp3',
      Text: text,
      TextType: 'text',
    }),
  )

  if (!res.AudioStream) throw new Error('Polly returned no AudioStream')

  // Polly returns a Readable; collect into Buffer.
  const chunks: Uint8Array[] = []
  for await (const chunk of res.AudioStream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0)
  const merged = Buffer.alloc(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.byteLength
  }

  const approxDurationSec = Math.round(text.length / CHARS_PER_SECOND)
  return { bytes: merged, contentType: 'audio/mpeg', approxDurationSec }
}
