'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import PageTransition from '@/components/scaffold/page-transition'

const EASE = [0.32, 0.72, 0, 1] as const
const AUTO_ADVANCE_MS = 4500

const SKELETONS = [
  { delay: 0, lineWidths: [60, 80, 50] },
  { delay: 0.4, lineWidths: [70, 60, 75] },
  { delay: 0.8, lineWidths: [55, 75, 65] },
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
            <SkeletonCard key={i} delay={s.delay} lineWidths={s.lineWidths} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.8px]">
            <span className="block text-black">Estamos construyendo tu</span>
            <span className="block text-[#FF5C00]">ruta de aprendizaje</span>
          </h1>
          <p className="text-base text-black/40">
            Esto puede demorar un momento...
          </p>
        </motion.div>
      </div>
    </PageTransition>
  )
}

interface SkeletonCardProps {
  delay: number
  lineWidths: number[]
}

function SkeletonCard({ delay, lineWidths }: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 + delay * 0.4, ease: EASE }}
    >
      <motion.div
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay,
          ease: 'easeInOut',
        }}
        className="flex w-[84px] flex-col gap-2 rounded-xl border border-black/4 bg-[#EEEEEE] px-3 py-4"
      >
        {lineWidths.map((w, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-black/12"
            style={{ width: `${w}%` }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
