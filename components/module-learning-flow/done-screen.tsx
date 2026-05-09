'use client'

import { Check } from 'lucide-react'
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
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(60% 55% at 50% -8%, rgba(255,79,0,0.95) 0%, rgba(255,79,0,0) 70%)',
            'radial-gradient(60% 55% at 50% 108%, rgba(255,79,0,0.95) 0%, rgba(255,79,0,0) 70%)',
            'radial-gradient(50% 90% at -6% 50%, rgba(255,79,0,0.95) 0%, rgba(255,79,0,0) 70%)',
            'radial-gradient(50% 90% at 106% 50%, rgba(255,79,0,0.95) 0%, rgba(255,79,0,0) 70%)',
            '#f8f8f8',
          ].join(', '),
        }}
      />

      <div className="relative flex w-full max-w-[440px] flex-col items-center gap-6 text-center">
        <div className="rotate-[5deg] animate-in fade-in zoom-in-50 duration-700">
          <div
            className="flex size-16 items-center justify-center rounded-[12.8px]"
            style={{ backgroundColor: ORANGE }}
            aria-hidden
          >
            <Check className="size-8 text-white" strokeWidth={2.5} />
          </div>
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
        <div className="flex w-[300px] flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700 fill-mode-backwards">
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
