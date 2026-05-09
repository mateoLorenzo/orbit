'use client'

import { useMemo, useState } from 'react'
import { FIRST_LESSON_NARRATION, SECOND_LESSON_NARRATION, VOICE_OPTIONS } from './constants'
import { DoneScreen } from './done-screen'
import { ContentScreen } from './content-screen'
import { IntroScreen } from './intro-screen'
import { FlowHeader } from './primitives'
import { QuizScreen } from './quiz-screen'
import { buildSteps } from './steps'
import type { ModuleLearningFlowProps } from './types'

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
  const [voiceIndex] = useState(0)

  const step = steps[currentStep]
  const isFirstLessonAnimatedSlide =
    currentStep === 1 && step.kind === 'content' && step.paragraphs.length >= 4
  const isSecondLessonAnimatedSlide =
    currentStep === 3 && step.kind === 'content' && step.paragraphs.length >= 4
  const lessonNarration = isFirstLessonAnimatedSlide
    ? FIRST_LESSON_NARRATION
    : isSecondLessonAnimatedSlide
      ? SECOND_LESSON_NARRATION
      : undefined

  const totalProgressSteps = steps.filter((item) => item.kind === 'content' || item.kind === 'quiz').length
  const completedProgressSteps = steps
    .slice(0, currentStep + 1)
    .filter((item) => item.kind === 'content' || item.kind === 'quiz').length

  const progressPercent =
    step.kind === 'intro' || step.kind === 'done'
      ? 0
      : (completedProgressSteps / totalProgressSteps) * 100

  const showHeader = step.kind === 'content' || step.kind === 'quiz'

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
    <div className="flex min-h-screen flex-col bg-[#f8f8f8] text-black">
      {showHeader && <FlowHeader title={subject.name} percent={progressPercent} />}

      <div key={currentStep} className={`flex flex-1 flex-col ${enterAnimation}`}>
        {step.kind === 'intro' && (
          <IntroScreen subject={subject} node={node} onStart={goNext} />
        )}
        {step.kind === 'content' && (
          <ContentScreen
            step={step}
            voice={VOICE_OPTIONS[voiceIndex]}
            onBack={goPrev}
            onNext={goNext}
            narration={lessonNarration}
          />
        )}
        {step.kind === 'quiz' && (
          <QuizScreen
            step={step}
            selectedIndex={selections[currentStep] ?? null}
            onSelect={handleSelect}
            onContinue={goNext}
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
