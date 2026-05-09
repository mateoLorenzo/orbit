'use client'

import type { ContentNode } from '@/lib/types'
import { ORANGE } from './constants'
import { PrimaryButton, SecondaryButton } from './primitives'

interface DoneScreenProps {
  node: ContentNode
  onContinueNext: () => void
  onBackToSubject: () => void
}

export function DoneScreen({
  node,
  onContinueNext,
  onBackToSubject,
}: DoneScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="flex w-full max-w-[460px] flex-col items-center gap-6 text-center">
        <div className="rotate-[5deg] animate-in fade-in zoom-in-50 duration-700">
          <div className="size-16 shrink-0 rounded-[12.8px] bg-black" aria-hidden />
        </div>
        <div className="flex flex-col gap-1 text-[40px] font-medium leading-none tracking-[-0.5px]">
          <p
            className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards"
            style={{ color: ORANGE }}
          >
            ¡Bien hecho!
          </p>
          <p className="text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
            Completaste el tema
          </p>
          <p className="text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-backwards">
            {node.title}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700 fill-mode-backwards">
          <PrimaryButton onClick={onContinueNext} className="w-full">
            Continuar hacia el siguiente
          </PrimaryButton>
          <SecondaryButton onClick={onBackToSubject} className="w-full">
            Volver a Historia
          </SecondaryButton>
        </div>
      </div>
    </div>
  )
}
