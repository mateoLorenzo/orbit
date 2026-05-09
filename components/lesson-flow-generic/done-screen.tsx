'use client'

import { Check, X } from 'lucide-react'
import type { QuizResult } from '@/lib/api/nodes'

interface Props {
  result: QuizResult
  questions: Array<{ question: string; options: string[] }>
  onContinueNext?: () => void
  onBackToSubject: () => void
}

export function DoneScreen({ result, questions, onContinueNext, onBackToSubject }: Props) {
  const { score, perQuestion, passed } = result
  const headlineColor = passed ? '#17a758' : '#d62828'
  const headline = passed ? '¡Bien hecho!' : 'Casi'
  const subtitle = passed
    ? `Acertaste ${score.correct} de ${score.total}.`
    : `Acertaste ${score.correct} de ${score.total}. Necesitás 2 de 3 para avanzar.`

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-medium leading-tight tracking-[-0.5px]" style={{ color: headlineColor }}>
          {headline}
        </h1>
        <p className="text-2xl font-medium tracking-[-0.5px] text-black">{subtitle}</p>
      </div>

      <ul className="flex w-full max-w-2xl flex-col gap-4">
        {questions.map((q, i) => {
          const r = perQuestion[i]
          const correct = r.correct === r.selected
          return (
            <li key={i} className="rounded-2xl border border-black/8 bg-white p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: correct ? '#17a758' : '#d62828' }}
                >
                  {correct ? (
                    <Check className="size-4 text-white" strokeWidth={3} />
                  ) : (
                    <X className="size-4 text-white" strokeWidth={3} />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-base font-medium tracking-[-0.32px] text-black">{q.question}</p>
                  <p className="text-sm text-black/60">
                    Respuesta correcta: <strong>{q.options[r.correct]}</strong>
                  </p>
                  {!correct && r.selected >= 0 && (
                    <p className="text-sm text-[#d62828]">
                      Respondiste: {q.options[r.selected]}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col items-center gap-2">
        {passed && onContinueNext ? (
          <button
            type="button"
            onClick={onContinueNext}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff4f00] px-5 text-base font-medium text-white transition-opacity hover:opacity-90"
          >
            Continuar hacia el siguiente
          </button>
        ) : null}
        <button
          type="button"
          onClick={onBackToSubject}
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/12 px-5 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
        >
          Volver a la materia
        </button>
      </div>
    </div>
  )
}
