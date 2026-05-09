'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import PageTransition from '@/components/scaffold/page-transition'

const AUTO_ADVANCE_MS = 4500

const SKELETONS = [
  { entryDelay: 150, breathingDelay: 0, lineWidths: [60, 80, 50] },
  { entryDelay: 300, breathingDelay: 0.4, lineWidths: [70, 60, 75] },
  { entryDelay: 450, breathingDelay: 0.8, lineWidths: [55, 75, 65] },
]

export default function OnboardingGeneratingPage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => {
      router.push('/onboarding/roadmap')
    }, AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [router])

  return (
    <PageTransition
      pageKey="onboarding-generating"
      variant="fade-slow"
      className="flex flex-1 items-center justify-center px-6"
    >
      <div className="flex flex-col items-center gap-12">
        <div className="flex items-end gap-3">
          {SKELETONS.map((s, i) => (
            <SkeletonCard
              key={i}
              entryDelay={s.entryDelay}
              breathingDelay={s.breathingDelay}
              lineWidths={s.lineWidths}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.8px]">
            <span className="block text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700 fill-mode-backwards">
              Estamos construyendo tu
            </span>
            <span
              style={{ animationDelay: '850ms' }}
              className="block text-[#FF5C00] animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards"
            >
              ruta de aprendizaje
            </span>
          </h1>
          <p className="text-base text-black/40 animate-in fade-in duration-700 delay-1000 fill-mode-backwards">
            Esto puede demorar un momento...
          </p>
        </div>
      </div>
    </PageTransition>
  )
}

interface SkeletonCardProps {
  entryDelay: number
  breathingDelay: number
  lineWidths: number[]
}

function SkeletonCard({ entryDelay, breathingDelay, lineWidths }: SkeletonCardProps) {
  return (
    <div
      style={{ animationDelay: `${entryDelay}ms` }}
      className="animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-backwards"
    >
      <motion.div
        animate={{ backgroundColor: ['#ECECEC', '#CFCFCF', '#ECECEC'] }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          delay: breathingDelay,
          ease: 'easeInOut',
        }}
        className="flex w-[84px] flex-col gap-2 rounded-xl border border-black/4 bg-[#ECECEC] px-3 py-4"
      >
        {lineWidths.map((w, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-black/20"
            style={{ width: `${w}%` }}
          />
        ))}
      </motion.div>
    </div>
  )
}
