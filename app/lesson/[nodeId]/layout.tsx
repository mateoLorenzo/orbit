'use client'

import { AnimatePresence } from 'motion/react'
import { useParams, usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const FULL_BLEED_STAGES = new Set(['start', 'done'])

function progressForStage(stage: string | undefined): number {
  switch (stage) {
    case 'start':
      return 5
    case 'slides':
      return 50
    case 'quiz':
      return 80
    case 'done':
      return 100
    default:
      return 0
  }
}

export default function LessonLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const params = useParams()
  const nodeId = (params.nodeId as string) ?? ''
  const segments = pathname.split('/').filter(Boolean)
  const stage = segments[2]
  const isFullBleed = FULL_BLEED_STAGES.has(stage ?? '')
  const progress = progressForStage(stage)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8]">
      {!isFullBleed && (
        <header className="shrink-0">
          <div className="flex h-14 items-center justify-center">
            <span className="text-base font-medium tracking-[-0.32px] text-black">
              Lección · {nodeId}
            </span>
          </div>
          <div className="h-[3px] w-full bg-black/8">
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #000 0%, #FF5C00 100%)',
              }}
            />
          </div>
        </header>
      )}
      <main className="flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </main>
    </div>
  )
}
