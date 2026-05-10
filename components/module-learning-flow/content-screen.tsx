'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Maximize2,
  Minimize2,
  Pause,
  Play,
} from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './primitives'
import type { ContentStep } from './types'
import type { NarratedWord, NarrationState } from './use-narration-audio'

interface ContentScreenProps {
  step: ContentStep
  onBack: () => void
  onNext: () => void
  onExit: () => void
  narrationState: NarrationState
  onVideoProgress?: (fraction: number) => void
}

// Buttons floating over the fullscreen video need a punchy hover so they read
// against any frame. White → orange + white text; matches the app's primary accent.
const OVERLAY_BUTTON_BASE =
  'inline-flex items-center justify-center rounded-lg border border-black/12 bg-white text-black transition-colors hover:border-[#ff4f00] hover:bg-[#ff4f00] hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'

function OverlayTextButton({
  onClick,
  children,
}: {
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${OVERLAY_BUTTON_BASE} h-10 gap-1 px-3 text-base font-medium tracking-[-0.32px]`}
    >
      {children}
    </button>
  )
}

function OverlayIconButton({
  onClick,
  ariaLabel,
  disabled,
  children,
}: {
  onClick?: () => void
  ariaLabel: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${OVERLAY_BUTTON_BASE} size-10`}
    >
      {children}
    </button>
  )
}

function NarratedSubtitle({
  wordsByLine,
  className,
}: {
  wordsByLine: NarratedWord[][]
  className: string
}) {
  const fullText = wordsByLine
    .map((line) => line.map((word) => word.text).join(' '))
    .join(' ')
  return (
    <p className={className}>
      <span className="sr-only">{fullText}</span>
      <span aria-hidden>
        {wordsByLine.map((line, lineIdx) => (
          <span key={lineIdx}>
            {line.map((word, wordIdx) => (
              <span
                key={wordIdx}
                className={`transition-colors duration-200 ${
                  word.revealed ? 'text-white' : 'text-white/40'
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

function NarratedPanelParagraph({
  wordsByLine,
}: {
  wordsByLine: NarratedWord[][]
}) {
  const fullText = wordsByLine
    .map((line) => line.map((word) => word.text).join(' '))
    .join(' ')
  return (
    <p className="leading-[1.25] tracking-[-0.5px]">
      <span className="sr-only">{fullText}</span>
      <span aria-hidden>
        {wordsByLine.map((line, lineIdx) => (
          <span key={lineIdx}>
            {line.map((word, wordIdx) => (
              <span
                key={wordIdx}
                className={`transition-colors duration-200 ${
                  word.revealed ? 'text-black' : 'text-black/24'
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
                <NarratedPanelParagraph wordsByLine={wordsByLine} />
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
  onExit,
  narrationState,
  onVideoProgress,
}: ContentScreenProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Below the lg breakpoint we lock to the fullscreen overlay layout — the
  // split (text + video) layout is desktop-only by design.
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobileViewport(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const showFullscreen = isMobileViewport || isFullscreen
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

  // Drive header progress from video playback at 60fps via rAF (onTimeUpdate
  // fires ~4×/s and lags the bar visibly).
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
  const overlayFallbackText = subtitleEnabled
    ? step.paragraphs[narrationOffset + overlayParagraphIndex] ?? step.paragraphs[0] ?? ''
    : step.paragraphs.join(' ')

  const subtitleClass =
    'pointer-events-none absolute bottom-20 left-6 right-6 text-center text-2xl font-medium leading-snug tracking-[-0.5px] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] lg:left-24 lg:right-24'

  const mediaElement = step.video ? (
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
      sizes={showFullscreen ? '100vw' : '(min-width: 1024px) 60vw, 100vw'}
      className="object-cover"
      priority
    />
  )

  if (showFullscreen) {
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black/4">
        {mediaElement}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
        />

        <div className="absolute left-5 top-5 z-10 flex items-center gap-2 lg:left-6 lg:top-6">
          <OverlayTextButton onClick={onExit}>Volver</OverlayTextButton>
          {subtitleEnabled ? (
            <OverlayIconButton
              onClick={togglePlayback}
              disabled={isGenerating}
              ariaLabel={
                isGenerating
                  ? 'Generando narración'
                  : playState === 'playing'
                    ? 'Pausar audio'
                    : playState === 'paused'
                      ? 'Continuar audio'
                      : 'Reproducir audio'
              }
            >
              {isGenerating ? (
                <div className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              ) : playState === 'playing' ? (
                <Pause className="size-4" strokeWidth={2} />
              ) : (
                <Play className="size-4" strokeWidth={2} />
              )}
            </OverlayIconButton>
          ) : null}
        </div>

        {!isMobileViewport ? (
          <div className="absolute right-5 top-5 z-10 lg:right-6 lg:top-6">
            <OverlayIconButton
              onClick={() => setIsFullscreen(false)}
              ariaLabel="Salir de pantalla completa"
            >
              <Minimize2 className="size-4" strokeWidth={2} />
            </OverlayIconButton>
          </div>
        ) : null}

        {overlayWords && overlayWords.length > 0 ? (
          <NarratedSubtitle
            key={overlayParagraphIndex}
            wordsByLine={overlayWords}
            className={subtitleClass}
          />
        ) : (
          <p className={subtitleClass} aria-live="polite">
            {overlayFallbackText}
          </p>
        )}

        <div className="absolute right-5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-[15px] lg:hidden">
          <OverlayIconButton onClick={onBack} ariaLabel="Anterior">
            <ArrowUp className="size-5" strokeWidth={2} />
          </OverlayIconButton>
          <OverlayIconButton onClick={onNext} ariaLabel="Continuar">
            <ArrowDown className="size-5" strokeWidth={2} />
          </OverlayIconButton>
        </div>

        <div className="absolute bottom-6 left-6 z-10 hidden lg:block">
          <OverlayTextButton onClick={onBack}>
            Anterior
            <ArrowUp className="size-5" strokeWidth={2} />
          </OverlayTextButton>
        </div>

        <div className="absolute bottom-6 right-6 z-10 hidden lg:block">
          <OverlayTextButton onClick={onNext}>
            Continuar
            <ArrowDown className="size-5" strokeWidth={2} />
          </OverlayTextButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-white lg:w-[420px] lg:shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
          <ContentText
            paragraphs={step.paragraphs}
            narratedParagraphCount={lines.length}
            subtitleEnabled={subtitleEnabled}
            getNarratedParagraph={getNarratedParagraph}
          />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black/4 animate-in fade-in zoom-in-95 duration-500">
          {mediaElement}

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
            onClick={() => setIsFullscreen(true)}
            aria-label="Pantalla completa"
            className="absolute bottom-4 right-4 z-10 inline-flex size-10 items-center justify-center rounded-lg border border-black/12 bg-white text-black transition-colors hover:bg-neutral-100 active:scale-[0.98]"
          >
            <Maximize2 className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <SecondaryButton onClick={onBack}>Volver</SecondaryButton>
        <p className="flex-1 text-center text-sm font-medium tracking-[-0.5px] text-black/30">
          Podrás avanzar hacia el próximo paso cuando finalices de ver el contenido.
        </p>
        <PrimaryButton onClick={onNext}>
          Siguiente
          <ArrowRight className="size-5" strokeWidth={2} />
        </PrimaryButton>
      </div>
    </div>
  )
}
