'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './primitives'
import type { QuizStep } from './types'

interface QuizScreenProps {
  step: QuizStep
  selectedIndex: number | null
  onSelect: (index: number) => void
  onContinue: () => void
  onBack: () => void
  onWrongAnswer: () => void
}

const CORRECT_GREEN = '#17a758'
const WRONG_RED = '#dc2626'
// How long the red feedback animates before we send the user back to the
// previous lesson step. Lines up with the option's 500ms color transition
// plus a moment for the X badge zoom-in to settle.
const WRONG_REDIRECT_MS = 1100

export function QuizScreen({
  step,
  selectedIndex,
  onSelect,
  onContinue,
  onBack,
  onWrongAnswer,
}: QuizScreenProps) {
  const isAnswered = selectedIndex !== null
  const correctIndex = step.correctIndex
  const userPickedCorrectly = isAnswered && selectedIndex === correctIndex
  // Only the correct answer locks the quiz on success. A wrong pick triggers
  // a redirect back to the previous lesson, so we also lock during the brief
  // delay before the redirect fires.
  const [isRedirectingAfterWrong, setIsRedirectingAfterWrong] = useState(false)
  const redirectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const isLocked = userPickedCorrectly || isRedirectingAfterWrong

  const handleOptionClick = (index: number) => {
    if (isLocked) return
    onSelect(index)
    if (index !== correctIndex) {
      setIsRedirectingAfterWrong(true)
      redirectTimerRef.current = window.setTimeout(() => {
        onWrongAnswer()
      }, WRONG_REDIRECT_MS)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 lg:px-[10vw]">
      <div className="flex w-full max-w-[880px] flex-col gap-2 text-center text-[40px] font-medium leading-none tracking-[-0.5px]">
        <p className="opacity-30 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
          Una breve pregunta
        </p>
        <p className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-backwards">
          {step.question}
        </p>
      </div>

      <div className="flex w-full max-w-[820px] flex-col gap-3">
        {step.options.map((option, index) => {
          const isCorrectOption = index === correctIndex
          const userPickedThis = index === selectedIndex
          // Only show the correct answer (in green) once the user has picked it.
          // Don't reveal it on a wrong pick — they should keep trying.
          const celebrate = userPickedCorrectly && isCorrectOption
          const showWrong = userPickedThis && !isCorrectOption
          // Dim the other options only after the user has locked in the correct
          // answer; otherwise keep them clickable for retries.
          const dimmed = isLocked && !userPickedThis

          let stateClass: string
          if (celebrate) {
            stateClass =
              'border-[#17a758] bg-[#17a758]/8 text-[#17a758] shadow-[0_10px_32px_-8px_rgba(23,167,88,0.45)] scale-[1.02] ease-[cubic-bezier(0.34,1.56,0.64,1)]'
          } else if (showWrong) {
            stateClass =
              'border-[#dc2626] bg-[#dc2626]/6 text-[#dc2626] shadow-[0_4px_16px_-8px_rgba(220,38,38,0.25)]'
          } else if (dimmed) {
            stateClass = 'border-transparent opacity-40'
          } else {
            stateClass =
              'border-transparent hover:border-black/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
          }

          return (
            <button
              key={option}
              type="button"
              onClick={() => handleOptionClick(index)}
              disabled={isLocked}
              style={{ animationDelay: `${index * 80 + 250}ms` }}
              className={`relative flex min-h-16 w-full items-center justify-center rounded-xl border-2 bg-white px-6 py-3 text-2xl font-medium tracking-[-0.5px] text-black transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 animation-duration-500 fill-mode-backwards ${stateClass}`}
            >
              {/* Celebratory ring (one-shot pulse) on the correct answer the user picked */}
              {celebrate && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl border-2"
                  style={{
                    borderColor: CORRECT_GREEN,
                    animation: 'quiz-correct-ring 900ms cubic-bezier(0.16, 1, 0.3, 1) 1 forwards',
                  }}
                />
              )}

              <span>{option}</span>

              {celebrate && (
                <span
                  aria-hidden
                  className="absolute right-5 inline-flex size-7 items-center justify-center rounded-full text-white animate-in zoom-in-50 fade-in duration-500 ease-out"
                  style={{ backgroundColor: CORRECT_GREEN }}
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}

              {showWrong && (
                <span
                  aria-hidden
                  className="absolute right-5 inline-flex size-7 items-center justify-center rounded-full text-white animate-in zoom-in-50 fade-in duration-500 ease-out"
                  style={{ backgroundColor: WRONG_RED }}
                >
                  <X className="size-4" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 animate-in fade-in duration-500 delay-700 fill-mode-backwards">
        <SecondaryButton onClick={onBack}>Volver</SecondaryButton>
        <PrimaryButton onClick={onContinue}>
          Continuar
          <ArrowRight className="size-5" strokeWidth={2} />
        </PrimaryButton>
      </div>

      <style jsx>{`
        @keyframes quiz-correct-ring {
          0% {
            opacity: 0.9;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.06);
          }
        }
      `}</style>
    </div>
  )
}
