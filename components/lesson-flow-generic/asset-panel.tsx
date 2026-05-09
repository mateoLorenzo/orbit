'use client'

import { Image as ImageIcon, Volume2 } from 'lucide-react'
import { AudioPlayer } from './audio-player'

interface Props {
  image: { url: string } | null
  audio: { url: string; durationSec: number } | null
}

export function AssetPanel({ image, audio }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-black/8 bg-black/4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="Ilustración del tema" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-black/40">
            <ImageIcon className="size-8" />
            <p className="text-sm">Generando imagen...</p>
          </div>
        )}
      </div>
      {audio ? (
        <AudioPlayer src={audio.url} durationSec={audio.durationSec} />
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-black/12 bg-white px-4 py-3 text-sm text-black/40">
          <Volume2 className="size-4" />
          Generando narración...
        </div>
      )}
    </div>
  )
}
