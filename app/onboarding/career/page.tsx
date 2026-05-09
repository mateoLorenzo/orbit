'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import PageTransition from '@/components/scaffold/page-transition'

const EASE = [0.32, 0.72, 0, 1] as const

const STAGGER_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const FADE_CHILD: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
}

export default function OnboardingCareerPage() {
  const router = useRouter()
  const [career, setCareer] = useState('')
  const trimmed = career.trim()
  const canContinue = trimmed.length > 0

  const handleContinue = () => {
    if (!canContinue) return
    router.push('/onboarding/upload')
  }

  return (
    <PageTransition pageKey="onboarding-career" variant="fade" className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col">
        <motion.div
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="visible"
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-16"
        >
          <motion.h1
            variants={FADE_CHILD}
            className="text-center text-[40px] font-semibold leading-[1.1] tracking-[-0.8px] text-black"
          >
            <span className="block">Para comenzar, asigna</span>
            <span className="block text-[#FF5C00]">un nombre a tu carrera</span>
          </motion.h1>

          <motion.div variants={FADE_CHILD} className="mt-12 w-full">
            <input
              type="text"
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canContinue) handleContinue()
              }}
              placeholder="Ingresa tu carrera"
              autoFocus
              aria-label="Nombre de la carrera"
              className="w-full rounded-2xl bg-white px-8 py-6 text-center text-[22px] font-medium tracking-[-0.5px] text-black shadow-[0_2px_16px_-6px_rgba(0,0,0,0.08)] outline-none transition-shadow placeholder:text-black/35 focus:shadow-[0_2px_20px_-4px_rgba(0,0,0,0.12)]"
            />
          </motion.div>
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
          className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-8"
        >
          <Link
            href="/onboarding/upload"
            className="inline-flex h-11 items-center rounded-lg border border-black/12 bg-white px-4 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
          >
            Saltar
          </Link>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#FF5C00] px-5 text-base font-medium tracking-[-0.32px] text-white shadow-[0_8px_24px_-12px_rgba(255,92,0,0.6)] transition-[transform,filter,opacity] hover:brightness-110 hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-black/8 disabled:text-black/40 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100"
          >
            Continuar
            <ArrowRight className="size-5" strokeWidth={2.5} />
          </button>
        </motion.footer>
      </div>
    </PageTransition>
  )
}
