'use client'

import { usePathname, useParams } from 'next/navigation'
import type { ReactNode } from 'react'

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
  const progress = progressForStage(stage)

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f8]">
      <header>
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
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
