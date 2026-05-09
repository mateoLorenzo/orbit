'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LessonNarration } from './types'

interface ScheduledWord {
  text: string
  startSeconds: number
}

export interface NarratedWord {
  text: string
  revealed: boolean
}

export function useNarrationAudio({ narration }: { narration?: LessonNarration }) {
  const [playState, setPlayState] = useState<'playing' | 'paused' | 'stopped'>('stopped')
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isGenerating, setIsGenerating] = useState(() => Boolean(narration))
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const frameRef = useRef<number | null>(null)

  const subtitleEnabled = Boolean(narration)

  const stopAudioClock = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!narration || !audio) {
      setIsGenerating(false)
      return
    }

    setCurrentTime(0)
    setAudioDuration(0)
    setPlayState('stopped')
    setIsGenerating(true)
    audio.pause()
    audio.currentTime = 0

    const syncAudioClock = () => {
      setCurrentTime(audio.currentTime)
      if (!audio.paused && !audio.ended) {
        frameRef.current = window.requestAnimationFrame(syncAudioClock)
      }
    }

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setAudioDuration(audio.duration)
    }
    const handlePlay = () => {
      setPlayState('playing')
      stopAudioClock()
      frameRef.current = window.requestAnimationFrame(syncAudioClock)
    }
    const handlePause = () => {
      stopAudioClock()
      setCurrentTime(audio.currentTime)
      setPlayState(audio.ended || audio.currentTime === 0 ? 'stopped' : 'paused')
    }
    const handleEnded = () => {
      stopAudioClock()
      setCurrentTime(audio.duration || audio.currentTime)
      setPlayState('stopped')
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setAudioDuration(audio.duration)
    }

    const delay = narration.generatingDelayMs ?? 1500
    const timer = window.setTimeout(() => {
      setIsGenerating(false)
      void audio.play().catch(() => setPlayState('paused'))
    }, delay)

    return () => {
      window.clearTimeout(timer)
      stopAudioClock()
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      audio.currentTime = 0
    }
  }, [narration])

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio || isGenerating) return

    if (!audio.paused) {
      audio.pause()
      return
    }

    if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.05)) {
      audio.currentTime = 0
      setCurrentTime(0)
    }

    void audio.play().catch(() => setPlayState('paused'))
  }

  const restartPlayback = () => {
    const audio = audioRef.current
    if (!audio || isGenerating) return
    audio.currentTime = 0
    setCurrentTime(0)
    void audio.play().catch(() => setPlayState('paused'))
  }

  // Build a per-word schedule by spreading each line's words across its window
  // [line.startSeconds, nextLineStart], proportionally to character count.
  const wordSchedule = useMemo<ScheduledWord[][][]>(() => {
    if (!narration) return []

    const flat: { paragraphIndex: number; lineIndex: number; text: string; startSeconds: number }[] = []
    narration.lines.forEach((paragraph, pIdx) => {
      paragraph.forEach((line, lIdx) => {
        flat.push({
          paragraphIndex: pIdx,
          lineIndex: lIdx,
          text: line.text,
          startSeconds: line.startSeconds,
        })
      })
    })

    const schedule: ScheduledWord[][][] = narration.lines.map((p) => p.map(() => []))

    for (let i = 0; i < flat.length; i++) {
      const cur = flat[i]
      const next = flat[i + 1]
      const fallbackEnd =
        audioDuration > cur.startSeconds ? audioDuration : cur.startSeconds + 4
      const endSeconds = next ? next.startSeconds : fallbackEnd
      const span = Math.max(0.2, endSeconds - cur.startSeconds)

      const words = cur.text.split(/\s+/).filter(Boolean)
      const totalChars = words.reduce((sum, w) => sum + w.length, 0) || 1

      let charsSoFar = 0
      const wordsWithTimes: ScheduledWord[] = words.map((text) => {
        const start = cur.startSeconds + (charsSoFar / totalChars) * span
        charsSoFar += text.length
        return { text, startSeconds: start }
      })

      schedule[cur.paragraphIndex][cur.lineIndex] = wordsWithTimes
    }

    return schedule
  }, [narration, audioDuration])

  const getNarratedParagraph = (paragraphIndex: number): NarratedWord[][] => {
    const paragraph = wordSchedule[paragraphIndex]
    if (!paragraph) return []
    if (isGenerating) {
      return paragraph.map((line) => line.map((w) => ({ text: w.text, revealed: false })))
    }
    // Reveal each word ~200ms before its audio onset so that the midpoint of the
    // fade transition lands roughly when the word is actually spoken.
    const leadSeconds = 0.2
    return paragraph.map((line) =>
      line.map((w) => ({ text: w.text, revealed: currentTime + leadSeconds >= w.startSeconds })),
    )
  }

  return {
    audioRef,
    audioSrc: narration?.audioSrc,
    getNarratedParagraph,
    isGenerating,
    lines: narration?.lines ?? [],
    playState,
    restartPlayback,
    subtitleEnabled,
    togglePlayback,
  }
}
