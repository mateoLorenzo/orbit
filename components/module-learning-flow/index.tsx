'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FIRST_LESSON_NARRATION, SECOND_LESSON_NARRATION } from './constants'
import { DoneScreen } from './done-screen'
import { ContentScreen } from './content-screen'
import { IntroScreen } from './intro-screen'
import { FlowHeader } from './primitives'
import { QuizScreen } from './quiz-screen'
import { TimelineScreen } from './timeline-screen'
import { buildSteps } from './steps'
import type { ModuleLearningFlowProps, Step } from './types'
import { useNarrationAudio } from './use-narration-audio'

export default function ModuleLearningFlow({
  subject,
  node,
  onExit,
  onContinueNext,
}: ModuleLearningFlowProps) {
  const steps = useMemo(() => buildSteps(node), [node])
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [selections, setSelections] = useState<Record<number, number>>({})

  const step = steps[currentStep]
  const hasCruceNarration = node.title === 'El Cruce de los Andes'
  const isFirstLessonAnimatedSlide =
    hasCruceNarration &&
    currentStep === 1 &&
    step.kind === 'content' &&
    step.paragraphs.length >= 3
  const isSecondLessonAnimatedSlide =
    hasCruceNarration &&
    currentStep === 3 &&
    step.kind === 'content' &&
    step.paragraphs.length >= 4
  const lessonNarration = isFirstLessonAnimatedSlide
    ? FIRST_LESSON_NARRATION
    : isSecondLessonAnimatedSlide
      ? SECOND_LESSON_NARRATION
      : undefined

  const narrationState = useNarrationAudio({ narration: lessonNarration })

  const isProgressStep = (kind: Step['kind']) =>
    kind === 'content' || kind === 'quiz' || kind === 'timeline'

  const isCurrentProgressStep = isProgressStep(step.kind)
  const isNarratedContent = step.kind === 'content' && Boolean(lessonNarration)
  const isVideoOnlyContent =
    step.kind === 'content' && Boolean(step.video) && !lessonNarration
  const audioFraction =
    narrationState.audioDuration > 0
      ? Math.min(1, narrationState.currentTime / narrationState.audioDuration)
      : 0

  // Reset video-driven progress when the step changes; ContentScreen reports
  // a fresh fraction once the next video starts playing.
  const [videoProgress, setVideoProgress] = useState(0)
  useEffect(() => {
    setVideoProgress(0)
  }, [currentStep])
  // Clamp to monotonically non-decreasing — looping videos reset currentTime
  // to 0 each cycle, but the progress bar should stay full once filled.
  const handleVideoProgress = useCallback((fraction: number) => {
    setVideoProgress((prev) => (fraction > prev ? fraction : prev))
  }, [])

  // Bar reflects this step's own progress, edge-to-edge:
  // - narrated content fills with the audio playback (0 → 100%)
  // - video-only content fills with the video playback (0 → 100%)
  // - other progress steps stay full (you've already passed through them)
  const progressPercent = !isCurrentProgressStep
    ? 0
    : isNarratedContent
      ? audioFraction * 100
      : isVideoOnlyContent
        ? videoProgress * 100
        : 100

  // Disable the CSS width transition while a media element is driving updates
  // at 60fps (rAF). Otherwise the bar visibly chases the target with a 700ms lag.
  const isProgressBarSmooth =
    !(isNarratedContent && narrationState.playState === 'playing') &&
    !isVideoOnlyContent

  const showHeader = isProgressStep(step.kind)

  const goNext = () => {
    setDirection('forward')
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }

  const goPrev = () => {
    setDirection('backward')
    if (currentStep > 0) setCurrentStep(currentStep - 1)
    else onExit()
  }

  const handleSelect = (index: number) =>
    setSelections((prev) => ({ ...prev, [currentStep]: index }))

  const enterAnimation =
    direction === 'forward'
      ? 'animate-in fade-in slide-in-from-right-4 duration-500 ease-out'
      : 'animate-in fade-in slide-in-from-left-4 duration-500 ease-out'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8] text-black">
      <audio
        ref={narrationState.audioRef}
        src={narrationState.audioSrc}
        preload="auto"
        className="hidden"
      />
      {showHeader && (
        <FlowHeader
          title={subject.name}
          percent={progressPercent}
          smooth={isProgressBarSmooth}
          onSeek={
            isNarratedContent
              ? (fraction) => narrationState.seek(fraction * narrationState.audioDuration)
              : undefined
          }
        />
      )}

      <div
        key={currentStep}
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${enterAnimation}`}
      >
        {step.kind === 'intro' && (
          <IntroScreen subject={subject} node={node} onStart={goNext} onExit={onExit} />
        )}
        {step.kind === 'content' && (
          <ContentScreen
            step={step}
            onBack={goPrev}
            onNext={goNext}
            narrationState={narrationState}
            onVideoProgress={isVideoOnlyContent ? handleVideoProgress : undefined}
          />
        )}
        {step.kind === 'timeline' && (
          <TimelineScreen step={step} onBack={goPrev} onNext={goNext} />
        )}
        {step.kind === 'quiz' && (
          <QuizScreen
            step={step}
            selectedIndex={selections[currentStep] ?? null}
            onSelect={handleSelect}
            onContinue={goNext}
            onBack={goPrev}
          />
        )}
        {step.kind === 'done' && (
          <DoneScreen
            node={node}
            onContinueNext={() => {
              if (onContinueNext) onContinueNext()
              else onExit()
            }}
            onBackToSubject={onExit}
          />
        )}
      </div>
    </div>
  )
}
