'use client'

import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  durationSec: number
}

export function AudioPlayer({ src, durationSec }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const a = ref.current
    if (!a) return
    const onTime = () => setProgress(a.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const a = ref.current
    if (!a) return
    if (a.paused) a.play()
    else a.pause()
  }
  const restart = () => {
    const a = ref.current
    if (!a) return
    a.currentTime = 0
    a.play()
  }

  const pct = durationSec > 0 ? Math.min(100, (progress / durationSec) * 100) : 0
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3">
      <audio ref={ref} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-90"
        aria-label={playing ? 'Pausar audio' : 'Reproducir audio'}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
      </button>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-black/50">
          <span>Narración IA</span>
          <span>{fmtTime(progress)} / {fmtTime(durationSec)}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/8">
          <div className="h-full rounded-full bg-black transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={restart}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black"
        aria-label="Reiniciar audio"
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  )
}
