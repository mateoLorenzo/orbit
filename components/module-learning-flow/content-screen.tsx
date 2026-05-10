'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Maximize2, Minimize2, Pause, Play } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './primitives'
import type { ContentStep } from './types'
import type { NarratedWord, NarrationState } from './use-narration-audio'

interface ContentScreenProps {
  step: ContentStep
  onBack: () => void
  onNext: () => void
  narrationState: NarrationState
  onVideoProgress?: (fraction: number) => void
}

function NarratedParagraph({
  wordsByLine,
  className = 'leading-[1.25] tracking-[-0.5px]',
  revealedClass = 'text-black',
  hiddenClass = 'text-black/24',
  ariaHidden,
}: {
  wordsByLine: NarratedWord[][]
  className?: string
  revealedClass?: string
  hiddenClass?: string
  ariaHidden?: boolean
}) {
  const fullText = wordsByLine
    .map((line) => line.map((word) => word.text).join(' '))
    .join(' ')
  return (
    <p className={className} aria-hidden={ariaHidden}>
      <span className="sr-only">{fullText}</span>
      <span aria-hidden>
        {wordsByLine.map((line, lineIdx) => (
          <span key={lineIdx}>
            {line.map((word, wordIdx) => (
              <span
                key={wordIdx}
                className={`transition-colors duration-200 ${
                  word.revealed ? revealedClass : hiddenClass
                }`}
              >
                {word.text}
                {wordIdx < line.length - 1 ? ' ' : ''}
              </span>
            ))}
            {lineIdx < wordsByLine.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </p>
  )
}

function ContentText({
  paragraphs,
  narratedParagraphCount,
  subtitleEnabled,
  getNarratedParagraph,
}: {
  paragraphs: string[]
  narratedParagraphCount: number
  subtitleEnabled: boolean
  getNarratedParagraph: (paragraphIndex: number) => NarratedWord[][]
}) {
  const fadedAfter = 1
  const narrationOffset = paragraphs.length - narratedParagraphCount

  return (
    <div className="relative flex-1 overflow-hidden p-6">
      <div className="space-y-4 text-[20px] leading-[1.25] font-medium tracking-[-0.5px] text-black">
        {paragraphs.map((paragraph, index) => {
          const isNarrated =
            subtitleEnabled &&
            index >= narrationOffset &&
            index < narrationOffset + narratedParagraphCount
          const wordsByLine = isNarrated ? getNarratedParagraph(index - narrationOffset) : null
          return (
            <div
              key={index}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards"
              style={{ animationDelay: `${index * 90 + 100}ms` }}
            >
              {wordsByLine && wordsByLine.length > 0 ? (
                <NarratedParagraph wordsByLine={wordsByLine} />
              ) : (
                <p className={index > fadedAfter ? 'text-black/24' : 'text-black'}>
                  {paragraph}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
    </div>
  )
}

export function ContentScreen({
  step,
  onBack,
  onNext,
  narrationState,
  onVideoProgress,
}: ContentScreenProps) {
  const [isImmersive, setIsImmersive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const {
    getActiveParagraphIndex,
    getNarratedParagraph,
    isGenerating,
    lines,
    playState,
    subtitleEnabled,
    togglePlayback,
  } = narrationState

  // When there's no audio narration, drive the header progress bar from the
  // video's playback time so the same FlowHeader animates in lessons that
  // ship videos instead of narration. Use rAF (not onTimeUpdate, which fires
  // ~4×/s) so the bar tracks playback at 60fps without a CSS lag.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !onVideoProgress) return

    let rafId: number | null = null

    const report = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        onVideoProgress(Math.min(1, video.currentTime / video.duration))
      }
    }

    const tick = () => {
      report()
      if (!video.paused && !video.ended) {
        rafId = window.requestAnimationFrame(tick)
      } else {
        rafId = null
      }
    }

    const handlePlay = () => {
      if (rafId === null) rafId = window.requestAnimationFrame(tick)
    }
    const handleStop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
      report()
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handleStop)
    video.addEventListener('ended', handleStop)

    if (!video.paused && !video.ended) {
      rafId = window.requestAnimationFrame(tick)
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handleStop)
      video.removeEventListener('ended', handleStop)
    }
  }, [onVideoProgress, step.video])

  const overlayParagraphIndex = subtitleEnabled ? getActiveParagraphIndex() : 0
  const overlayWords = subtitleEnabled ? getNarratedParagraph(overlayParagraphIndex) : null
  const narrationOffset = step.paragraphs.length - lines.length
  const overlayFallbackText =
    step.paragraphs[narrationOffset + overlayParagraphIndex] ?? step.paragraphs[0] ?? ''

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col transition-[gap,padding] duration-500 ${isImmersive ? 'gap-0 p-0' : 'gap-6 px-6 py-6'
        }`}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col lg:flex-row transition-[gap] duration-500 ${isImmersive ? 'gap-0' : 'gap-6'
          }`}
      >
        <div
          className={`flex min-h-0 flex-col overflow-hidden rounded-xl bg-white transition-[width,opacity] duration-500 animate-in fade-in slide-in-from-left-4 ${isImmersive
              ? 'lg:w-0 lg:opacity-0 lg:invisible'
              : 'lg:w-[420px] lg:opacity-100'
            } lg:shrink-0`}
          aria-hidden={isImmersive}
        >
          <ContentText
            paragraphs={step.paragraphs}
            narratedParagraphCount={lines.length}
            subtitleEnabled={subtitleEnabled}
            getNarratedParagraph={getNarratedParagraph}
          />
        </div>

        <div
          className={`relative min-h-0 flex-1 overflow-hidden bg-black/4 transition-[border-radius] duration-500 animate-in fade-in zoom-in-95 ${
            isImmersive ? 'rounded-none' : 'rounded-xl'
          }`}
        >
          {step.video ? (
            <video
              key={step.video}
              ref={videoRef}
              src={step.video}
              poster={step.image}
              autoPlay
              loop={step.videoLoop !== false}
              muted
              playsInline
              onEnded={(e) => {
                // Park on the last frame instead of resetting / showing controls
                const v = e.currentTarget
                v.pause()
                v.currentTime = Math.max(0, v.duration - 0.001)
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={step.image}
              alt="Ilustración del tema"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
              priority
            />
          )}

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent transition-opacity duration-500 ${
              isImmersive ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={!isImmersive}
          />

          {overlayWords && overlayWords.length > 0 ? (
            <NarratedParagraph
              key={overlayParagraphIndex}
              wordsByLine={overlayWords}
              className={`pointer-events-none absolute bottom-12 left-1/2 max-w-3xl -translate-x-1/2 px-12 text-center text-[28px] font-medium leading-snug tracking-[-0.5px] transition-opacity duration-500 ${
                isImmersive ? 'opacity-100' : 'opacity-0'
              }`}
              revealedClass="text-white"
              hiddenClass="text-white/40"
              ariaHidden={!isImmersive}
            />
          ) : (
            <p
              className={`pointer-events-none absolute bottom-12 left-1/2 max-w-3xl -translate-x-1/2 px-12 text-center text-[28px] font-medium leading-snug tracking-[-0.5px] text-white transition-opacity duration-500 ${
                isImmersive ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!isImmersive}
            >
              {overlayFallbackText}
            </p>
          )}

          {subtitleEnabled ? (
            <button
              type="button"
              onClick={togglePlayback}
              disabled={isGenerating}
              aria-label={
                isGenerating
                  ? 'Generando narración'
                  : playState === 'playing'
                    ? 'Pausar audio'
                    : playState === 'paused'
                      ? 'Continuar audio'
                      : 'Reproducir audio'
              }
              className="absolute bottom-4 left-4 z-10 inline-flex size-10 items-center justify-center rounded-lg border border-black/12 bg-white text-black transition-colors hover:bg-neutral-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <div className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              ) : playState === 'playing' ? (
                <Pause className="size-4" strokeWidth={2} />
              ) : (
                <Play className="size-4" strokeWidth={2} />
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsImmersive((value) => !value)}
            aria-label={isImmersive ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="absolute bottom-4 right-4 z-10 inline-flex size-10 items-center justify-center rounded-lg border border-black/12 bg-white text-black transition-colors hover:bg-neutral-100 active:scale-[0.98]"
          >
            {isImmersive ? (
              <Minimize2 className="size-4" strokeWidth={2} />
            ) : (
              <Maximize2 className="size-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      <div
        className={`flex items-center gap-6 overflow-hidden transition-[max-height,opacity] duration-500 ${isImmersive ? 'pointer-events-none max-h-0 opacity-0' : 'max-h-32 opacity-100'
          }`}
        aria-hidden={isImmersive}
      >
        <SecondaryButton onClick={onBack}>Volver</SecondaryButton>
        <p className="flex-1 text-center text-sm font-medium tracking-[-0.5px] text-black/30">
          Podrás avanzar hacia el próximo paso cuando finalices de ver el contenido.
        </p>
        <PrimaryButton onClick={onNext}>Siguiente</PrimaryButton>
      </div>
    </div>
  )
}
