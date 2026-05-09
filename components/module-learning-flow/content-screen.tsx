'use client'

import Image from 'next/image'
import { Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { IconButton, PrimaryButton, SecondaryButton } from './primitives'
import type { ContentStep, LessonNarration, NarratedLine } from './types'
import { useNarrationAudio } from './use-narration-audio'

interface ContentScreenProps {
  step: ContentStep
  voice: string
  onChangeVoice: () => void
  onBack: () => void
  onNext: () => void
  narration?: LessonNarration
}

function NarratedParagraph({
  lines,
  revealedCount,
}: {
  lines: NarratedLine[]
  revealedCount: number
}) {
  const fullText = lines.map((line) => line.text).join(' ')
  return (
    <p className="leading-[1.25] tracking-[-0.5px]">
      <span className="sr-only">{fullText}</span>
      <span aria-hidden>
        {lines.map((line, index) => (
          <span
            key={index}
            className={`transition-colors duration-500 ${
              index < revealedCount ? 'text-black' : 'text-black/24'
            }`}
          >
            {line.text}
            {index < lines.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </p>
  )
}

function VoicePanel({
  voice,
  subtitleEnabled,
  isGenerating,
  playState,
  onChangeVoice,
  onTogglePlayback,
  onRestartPlayback,
}: {
  voice: string
  subtitleEnabled: boolean
  isGenerating: boolean
  playState: 'playing' | 'paused' | 'stopped'
  onChangeVoice: () => void
  onTogglePlayback: () => void
  onRestartPlayback: () => void
}) {
  return (
    <div className="border-t border-black/4 p-6">
      <div className="flex items-center gap-3 rounded-xl bg-[#f8f8f8] p-4">
        <div className="size-10 shrink-0 rounded-full bg-black/10" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium leading-none tracking-[-0.5px] text-black/40">
            {subtitleEnabled && isGenerating ? 'Generando narración…' : 'Voz elegida'}
          </p>
          <p className="mt-1 truncate text-base font-medium leading-none tracking-[-0.5px] text-black">
            {voice}
          </p>
        </div>

        {subtitleEnabled ? (
          <>
            <IconButton
              onClick={onTogglePlayback}
              label={
                isGenerating
                  ? 'Generando narración'
                  : playState === 'playing'
                    ? 'Pausar audio'
                    : playState === 'paused'
                      ? 'Continuar audio'
                      : 'Reproducir audio'
              }
              icon={
                isGenerating ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                ) : playState === 'playing' ? (
                  <Pause className="size-4" strokeWidth={2} />
                ) : (
                  <Play className="size-4" strokeWidth={2} />
                )
              }
            />
            <IconButton
              onClick={onRestartPlayback}
              label="Reiniciar audio"
              icon={<RotateCcw className="size-4" strokeWidth={2} />}
            />
          </>
        ) : null}

        <IconButton
          onClick={onChangeVoice}
          label="Cambiar voz"
          icon={<Sparkles className="size-4" strokeWidth={2} />}
        />
      </div>
    </div>
  )
}

function ContentText({
  paragraphs,
  narratedLines,
  subtitleEnabled,
  getRevealedLines,
}: {
  paragraphs: string[]
  narratedLines: NarratedLine[][]
  subtitleEnabled: boolean
  getRevealedLines: (paragraphIndex: number) => number
}) {
  const fadedAfter = 1

  return (
    <div className="relative flex-1 overflow-hidden p-6">
      <div className="space-y-4 text-[20px] leading-[1.25] font-medium tracking-[-0.5px] text-black">
        {paragraphs.map((paragraph, index) => {
          const isNarrated = subtitleEnabled && index >= 1 && index <= narratedLines.length
          const lines = isNarrated ? narratedLines[index - 1] : null
          return (
            <div
              key={index}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards"
              style={{ animationDelay: `${index * 90 + 100}ms` }}
            >
              {lines ? (
                <NarratedParagraph
                  lines={lines}
                  revealedCount={getRevealedLines(index - 1)}
                />
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
  voice,
  onChangeVoice,
  onBack,
  onNext,
  narration,
}: ContentScreenProps) {
  const {
    audioRef,
    audioSrc,
    getRevealedLines,
    isGenerating,
    lines,
    playState,
    restartPlayback,
    subtitleEnabled,
    togglePlayback,
  } = useNarrationAudio({ narration })

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <audio ref={audioRef} src={audioSrc} preload="auto" className="hidden" />

      <div className="flex min-h-[480px] flex-1 flex-col gap-6 lg:flex-row">
        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl bg-white lg:w-[420px] lg:shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
          <ContentText
            paragraphs={step.paragraphs}
            narratedLines={lines}
            subtitleEnabled={subtitleEnabled}
            getRevealedLines={getRevealedLines}
          />
          <VoicePanel
            voice={voice}
            subtitleEnabled={subtitleEnabled}
            isGenerating={isGenerating}
            playState={playState}
            onChangeVoice={onChangeVoice}
            onTogglePlayback={togglePlayback}
            onRestartPlayback={restartPlayback}
          />
        </div>

        <div className="relative flex-1 overflow-hidden rounded-xl bg-black/4 animate-in fade-in zoom-in-95 duration-700">
          {step.video ? (
            <video
              key={step.video}
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
          <div className="absolute inset-0 flex items-end justify-end p-4">
            <SecondaryButton>Abrir</SecondaryButton>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <SecondaryButton onClick={onBack}>Volver</SecondaryButton>
        <p className="flex-1 text-center text-sm font-medium tracking-[-0.5px] text-black/30">
          Podrás avanzar hacia el próximo paso cuando finalices de ver el contenido.
        </p>
        <PrimaryButton onClick={onNext}>Siguiente</PrimaryButton>
      </div>
    </div>
  )
}
