'use client'

import { useMemo, useState } from 'react'
import { FlowHeader } from './primitives'
import { IntroScreen } from './intro-screen'
import { ContentScreen } from './content-screen'
import { QuizScreen } from './quiz-screen'
import { DoneScreen } from './done-screen'
import { useNodeAssets } from './use-lesson-data'
import { useSubmitQuiz } from './use-quiz-submit'
import type { QuizResult } from '@/lib/api/nodes'

interface Props {
  subjectName: string
  subjectId: string
  nodeId: string
  nodeTitle: string
  onExit: () => void
  onContinueNext?: () => void
}

type Step =
  | { kind: 'intro' }
  | { kind: 'content' }
  | { kind: 'quiz'; index: number }
  | { kind: 'done' }

export default function LessonFlowGeneric({
  subjectName,
  nodeId,
  nodeTitle,
  onExit,
  onContinueNext,
}: Props) {
  const assetsQuery = useNodeAssets(nodeId)
  const submitMutation = useSubmitQuiz(nodeId)

  const lesson = assetsQuery.data?.lesson ?? null

  const [step, setStep] = useState<Step>({ kind: 'intro' })
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)

  const totalQuiz = lesson?.quiz.length ?? 0
  const completedSteps = useMemo(() => {
    if (step.kind === 'intro') return 0
    if (step.kind === 'content') return 1
    if (step.kind === 'quiz') return 1 + step.index + 1
    return 1 + totalQuiz
  }, [step, totalQuiz])
  const totalSteps = 1 + totalQuiz
  const progressPercent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100)
  const showHeader = step.kind === 'content' || step.kind === 'quiz'

  // Loading state: lesson not generated yet.
  if (!lesson || lesson.paragraphs.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f8f8f8] text-center">
        <div className="size-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
        <p className="text-base font-medium tracking-[-0.32px] text-black/60">
          Generando lección a partir de tus materiales...
        </p>
        <p className="text-sm text-black/40">Esto suele tomar 5-15 segundos.</p>
      </div>
    )
  }

  const handleStart = () => setStep({ kind: 'content' })

  const handleContentNext = () => {
    if (totalQuiz === 0) {
      // Skip quiz, go to done immediately.
      submitMutation.mutate([], {
        onSuccess: (r) => {
          setResult(r)
          setStep({ kind: 'done' })
        },
      })
    } else {
      setStep({ kind: 'quiz', index: 0 })
    }
  }
  const handleContentBack = () => setStep({ kind: 'intro' })

  const handleQuizSelect = (i: number) => {
    if (step.kind !== 'quiz') return
    setSelections((s) => ({ ...s, [step.index]: i }))
  }

  const handleQuizContinue = () => {
    if (step.kind !== 'quiz') return
    const next = step.index + 1
    if (next < totalQuiz) {
      setStep({ kind: 'quiz', index: next })
    } else {
      const answers = Array.from({ length: totalQuiz }, (_, i) => selections[i] ?? -1)
      submitMutation.mutate(answers, {
        onSuccess: (r) => {
          setResult(r)
          setStep({ kind: 'done' })
        },
      })
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8] text-black">
      {showHeader && <FlowHeader title={subjectName} percent={progressPercent} />}

      <div className="flex min-h-0 flex-1 flex-col">
        {step.kind === 'intro' && (
          <IntroScreen subjectName={subjectName} nodeTitle={nodeTitle} onStart={handleStart} />
        )}
        {step.kind === 'content' && (
          <ContentScreen
            paragraphs={lesson.paragraphs}
            image={assetsQuery.data?.image ?? null}
            audio={assetsQuery.data?.audio ?? null}
            onBack={handleContentBack}
            onNext={handleContentNext}
          />
        )}
        {step.kind === 'quiz' && (
          <QuizScreen
            question={lesson.quiz[step.index].question}
            options={lesson.quiz[step.index].options}
            selectedIndex={selections[step.index] ?? null}
            onSelect={handleQuizSelect}
            onContinue={handleQuizContinue}
          />
        )}
        {step.kind === 'done' && result && (
          <DoneScreen
            result={result}
            questions={lesson.quiz}
            onContinueNext={onContinueNext}
            onBackToSubject={onExit}
          />
        )}
      </div>
    </div>
  )
}
