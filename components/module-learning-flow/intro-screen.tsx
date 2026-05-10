'use client'

import { ArrowRight, X } from 'lucide-react'
import type { ContentNode, Subject } from '@/lib/types'
import { ORANGE } from './constants'

interface IntroScreenProps {
  subject: Subject
  node: ContentNode
  onStart: () => void
  onExit: () => void
}

const TYPE_LABEL: Record<ContentNode['type'], string> = {
  tema: 'Tema',
  clase: 'Clase',
  ejercicio: 'Ejercicio',
}

export function IntroScreen({ subject: _subject, node, onStart, onExit }: IntroScreenProps) {
  const label = `${TYPE_LABEL[node.type] ?? 'Clase'} ${node.order}`

  return (
    <div className="bg-orange-corners relative flex flex-1 items-center justify-center overflow-hidden">
      <button
        type="button"
        onClick={onExit}
        aria-label="Salir"
        title="Salir"
        className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-lg border border-black/12 bg-white text-black transition-colors hover:bg-black/4 active:scale-[0.98]"
      >
        <X className="size-5" strokeWidth={2} />
        <span className="sr-only">Salir</span>
      </button>
      <div className="relative flex w-full max-w-[920px] flex-col items-center gap-6 px-6 text-center">
        <div className="inline-flex h-10 items-center justify-center rounded-lg border border-black/12 bg-transparent px-3 animate-in fade-in zoom-in-95 duration-700 fill-mode-backwards">
          <p className="text-base font-medium tracking-[-0.32px] text-black">{label}</p>
        </div>

        <div className="flex flex-col gap-1 text-[40px] font-medium leading-none tracking-[-0.5px]">
          <p
            style={{ color: ORANGE }}
            className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards"
          >
            {node.title}
          </p>
          <p className="text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
            ¿Listo para comenzar el tema?
          </p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500 fill-mode-backwards">
          <button
            type="button"
            onClick={onStart}
            style={{ backgroundColor: ORANGE }}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-lg px-3 text-base font-medium tracking-[-0.32px] text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Comenzar
            <ArrowRight className="size-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
