'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'motion/react'
import { ArrowRight, Check, Video } from 'lucide-react'
import PageTransition from '@/components/scaffold/page-transition'

interface Level {
  id: string
  label: string
}

const LEVELS: Level[] = [
  { id: 'primary', label: 'Nivel primario' },
  { id: 'secondary', label: 'Nivel secundario' },
  { id: 'university', label: 'Nivel universitario' },
  { id: 'postgrad', label: 'Posgrado' },
  { id: 'masters', label: 'Maestría' },
  { id: 'particular', label: 'Particular' },
]

const EASE = [0.32, 0.72, 0, 1] as const

const STAGGER_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const FADE_CHILD: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
}

export default function OnboardingLevelPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const handleContinue = () => {
    if (!selected) return
    router.push('/onboarding/career')
  }

  return (
    <PageTransition pageKey="onboarding-level" variant="fade" className="flex flex-1 flex-col">
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
            ¿Qué estás estudiando?
          </motion.h1>

          <motion.div
            variants={FADE_CHILD}
            className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {LEVELS.map((level) => (
              <LevelCard
                key={level.id}
                level={level}
                selected={selected === level.id}
                onSelect={() => setSelected(level.id)}
              />
            ))}
          </motion.div>
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
          className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-8"
        >
          <Link
            href="/onboarding/career"
            className="inline-flex h-11 items-center rounded-lg border border-black/12 bg-white px-4 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
          >
            Saltar
          </Link>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selected}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#FF5C00] px-5 text-base font-medium tracking-[-0.32px] text-white shadow-[0_8px_24px_-12px_rgba(255,92,0,0.6)] transition-[transform,filter,opacity] hover:brightness-110 hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-black/12 disabled:text-black/40 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100"
          >
            Continuar
            <ArrowRight className="size-5" strokeWidth={2.5} />
          </button>
        </motion.footer>
      </div>
    </PageTransition>
  )
}

interface LevelCardProps {
  level: Level
  selected: boolean
  onSelect: () => void
}

function LevelCard({ level, selected, onSelect }: LevelCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex flex-col items-start gap-12 rounded-xl bg-white p-5 text-left transition-[border-color,box-shadow] ${
        selected
          ? 'border-2 border-black shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]'
          : 'border border-black/8 hover:border-black/20'
      }`}
    >
      <div className="flex size-12 items-center justify-center rounded-lg bg-black">
        <Video className="size-5 text-white" strokeWidth={2} />
      </div>

      <div className="flex w-full items-center justify-between gap-3">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.5px] text-black">
          {level.label}
        </span>

        {selected ? (
          <span className="flex size-7 items-center justify-center rounded-full bg-black text-white">
            <Check className="size-4" strokeWidth={3} />
          </span>
        ) : (
          <ArrowRight
            className="size-5 text-black/40 transition-transform group-hover:translate-x-0.5 group-hover:text-black/70"
            strokeWidth={2}
          />
        )}
      </div>
    </button>
  )
}
