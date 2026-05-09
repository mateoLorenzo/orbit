'use client'

import Link from 'next/link'
import { motion, type Variants } from 'motion/react'
import { Check } from 'lucide-react'
import PageTransition from '@/components/scaffold/page-transition'

const EASE = [0.32, 0.72, 0, 1] as const

const FADE_CHILD: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7, ease: EASE } },
}

const FADE_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
}

export default function OnboardingReadyPage() {
  return (
    <PageTransition
      pageKey="onboarding-ready"
      variant="fade-slow"
      className="relative flex flex-1 items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 70% 80% at 50% 50%, #ffffff 0%, #ffffff 28%, rgba(255, 92, 0, 0.45) 75%, #FF5C00 100%)',
      }}
    >
      <motion.div
        variants={FADE_CONTAINER}
        initial="hidden"
        animate="visible"
        className="flex w-full max-w-md flex-col items-center gap-8 px-6 text-center"
      >
        <motion.div variants={FADE_CHILD}>
          <CheckIcon />
        </motion.div>

        <motion.h1
          variants={FADE_CHILD}
          className="text-[44px] font-semibold leading-[1.1] tracking-[-1.2px]"
        >
          <span className="block text-[#FF5C00]">¡Bien hecho!</span>
          <span className="block text-black">Ya podes comenzar</span>
          <span className="block text-black">a aprender</span>
        </motion.h1>

        <motion.div variants={FADE_CHILD} className="flex w-full flex-col gap-2">
          <Link
            href="/lesson/demo/start"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#FF5C00] px-5 text-base font-medium tracking-[-0.32px] text-white shadow-[0_8px_24px_-12px_rgba(255,92,0,0.6)] transition-[transform,filter] hover:brightness-110 hover:-translate-y-px"
          >
            Comenzar ahora
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-black/12 bg-white px-5 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
          >
            Ir a Mis materias
          </Link>
        </motion.div>
      </motion.div>
    </PageTransition>
  )
}

function CheckIcon() {
  return (
    <div
      className="flex size-[88px] -rotate-[8deg] items-center justify-center rounded-[22px] shadow-[0_18px_40px_-12px_rgba(255,92,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]"
      style={{
        background: 'linear-gradient(150deg, #FF7A1F 0%, #FF5C00 55%, #E64A00 100%)',
      }}
      aria-hidden
    >
      <Check className="size-11 text-white" strokeWidth={3} />
    </div>
  )
}
