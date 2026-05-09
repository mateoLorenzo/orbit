'use client'

import { ArrowRight } from 'lucide-react'

interface Props {
  subjectName: string
  nodeTitle: string
  onStart: () => void
}

export function IntroScreen({ subjectName, nodeTitle, onStart }: Props) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/40">{subjectName}</p>
        <h1 className="max-w-2xl text-4xl font-medium leading-tight tracking-[-0.5px] text-[#ff4f00]">
          {nodeTitle}
        </h1>
        <p className="text-base font-medium tracking-[-0.32px] text-black/60">
          ¿Listo para comenzar el tema?
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ff4f00] px-5 text-base font-medium text-white transition-opacity hover:opacity-90"
      >
        Comenzar
        <ArrowRight className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  )
}
