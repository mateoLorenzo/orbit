'use client'

import { useEffect, useRef, useState } from 'react'
import type { LessonNarration } from './types'

export function useNarrationAudio({ narration }: { narration?: LessonNarration }) {
  const [playState, setPlayState] = useState<'playing' | 'paused' | 'stopped'>('stopped')
  const [currentTime, setCurrentTime] = useState(0)
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

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    const delay = narration.generatingDelayMs ?? 1500
    const timer = window.setTimeout(() => {
      setIsGenerating(false)
      void audio.play().catch(() => setPlayState('paused'))
    }, delay)

    return () => {
      window.clearTimeout(timer)
      stopAudioClock()
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

  const getRevealedLines = (paragraphIndex: number) => {
    if (!narration || isGenerating) return 0
    const lines = narration.lines[paragraphIndex]
    if (!lines) return 0

    let revealed = 0
    for (const line of lines) {
      if (currentTime >= line.startSeconds) revealed += 1
      else break
    }
    return revealed
  }

  return {
    audioRef,
    audioSrc: narration?.audioSrc,
    getRevealedLines,
    isGenerating,
    lines: narration?.lines ?? [],
    playState,
    restartPlayback,
    subtitleEnabled,
    togglePlayback,
  }
}
