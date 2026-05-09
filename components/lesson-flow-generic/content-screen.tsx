'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'

interface Props {
  paragraphs: string[]
  onBack: () => void
  onNext: () => void
}

export function ContentScreen({ paragraphs, onBack, onNext }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-3xl flex-col gap-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed tracking-[-0.32px] text-black">
              {p}
            </p>
          ))}
        </div>
      </div>
      <footer className="flex items-center justify-between border-t border-black/8 bg-white px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/12 px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Volver
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-opacity hover:opacity-90"
        >
          Siguiente
          <ArrowRight className="size-4" strokeWidth={2} />
        </button>
      </footer>
    </div>
  )
}
