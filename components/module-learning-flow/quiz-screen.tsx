'use client'

import { ArrowRight } from 'lucide-react'
import { PrimaryButton } from './primitives'
import type { QuizStep } from './types'

interface QuizScreenProps {
  step: QuizStep
  selectedIndex: number | null
  onSelect: (index: number) => void
  onContinue: () => void
}

export function QuizScreen({
  step,
  selectedIndex,
  onSelect,
  onContinue,
}: QuizScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 lg:px-[12vw]">
      <div className="flex w-full max-w-[640px] flex-col gap-2 text-center text-[40px] font-medium leading-none tracking-[-0.5px]">
        <p className="opacity-30 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
          Una breve pregunta
        </p>
        <p className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-backwards">
          {step.question}
        </p>
      </div>

      <div className="flex w-full max-w-[640px] flex-col gap-3">
        {step.options.map((option, index) => {
          const selected = selectedIndex === index

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(index)}
              style={{ animationDelay: `${index * 80 + 250}ms` }}
              className={`flex h-16 w-full items-center justify-center rounded-xl bg-white px-5 text-2xl font-medium tracking-[-0.5px] text-black transition-[border-color,box-shadow,transform] duration-200 animate-in fade-in slide-in-from-bottom-2 animation-duration-500 fill-mode-backwards ${
                selected
                  ? 'border-2 border-black shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                  : 'border-2 border-transparent hover:border-black/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-3 animate-in fade-in duration-500 delay-700 fill-mode-backwards">
        <PrimaryButton onClick={onContinue}>
          Continuar
          <ArrowRight className="size-5" strokeWidth={2} />
        </PrimaryButton>
        <p className="text-sm font-medium tracking-[-0.28px] text-black/40">
          Sabrás la respuesta correcta al finalizar el tema
        </p>
      </div>
    </div>
  )
}
