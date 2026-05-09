'use client'

import { AnimatePresence } from 'motion/react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const PROGRESS_STEPS = [
  '/onboarding/level',
  '/onboarding/career',
  '/onboarding/upload',
  '/onboarding/generating',
  '/onboarding/roadmap',
  '/onboarding/ready',
]

const FULL_BLEED_ROUTES = new Set([
  '/onboarding',
  '/onboarding/generating',
  '/onboarding/ready',
])

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isFullBleed = FULL_BLEED_ROUTES.has(pathname)
  const idx = PROGRESS_STEPS.indexOf(pathname)
  const progress = idx >= 0 ? ((idx + 1) / PROGRESS_STEPS.length) * 100 : 0

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8]">
      {!isFullBleed && (
        <header className="shrink-0">
          <div className="flex h-14 items-center justify-center">
            <span className="text-base font-medium tracking-[-0.32px] text-black">
              Nueva materia
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
