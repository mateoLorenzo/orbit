'use client'

import { ArrowRight } from 'lucide-react'

interface Props {
  question: string
  options: string[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  onContinue: () => void
}

export function QuizScreen({ question, options, selectedIndex, onSelect, onContinue }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-2xl font-light tracking-[-0.5px] text-black/40">Una breve pregunta</p>
        <h2 className="text-3xl font-medium leading-tight tracking-[-0.5px] text-black">
          {question}
        </h2>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-3">
        {options.map((opt, i) => {
          const isSelected = selectedIndex === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`rounded-2xl border px-5 py-4 text-center text-lg font-medium tracking-[-0.32px] transition-colors ${
                isSelected
                  ? 'border-[#ff4f00] bg-[#ff4f00]/10 text-[#ff4f00]'
                  : 'border-black/8 bg-white text-black hover:bg-black/4'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={selectedIndex === null}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ff4f00] px-5 text-base font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </button>
        <p className="text-sm text-black/40">Sabrás la respuesta correcta al finalizar el tema</p>
      </div>
    </div>
  )
}
