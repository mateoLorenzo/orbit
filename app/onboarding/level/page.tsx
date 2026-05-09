'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-16">
          <h1 className="text-center text-[40px] font-semibold leading-[1.1] tracking-[-0.8px] text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
            ¿Qué estás estudiando?
          </h1>

          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LEVELS.map((level, i) => (
              <LevelCard
                key={level.id}
                level={level}
                selected={selected === level.id}
                onSelect={() => setSelected(level.id)}
                animationDelay={i * 70 + 250}
              />
            ))}
          </div>
        </div>

        <footer className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700 fill-mode-backwards">
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
        </footer>
      </div>
    </PageTransition>
  )
}

interface LevelCardProps {
  level: Level
  selected: boolean
  onSelect: () => void
  animationDelay: number
}

function LevelCard({ level, selected, onSelect, animationDelay }: LevelCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={`group relative flex flex-col items-start gap-12 rounded-xl border-2 bg-white p-5 text-left transition-[border-color,box-shadow] [transition-duration:200ms] animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards ${
        selected
          ? 'border-black shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]'
          : 'border-black/8 hover:border-black/20'
      }`}
    >
      <div className="flex size-12 items-center justify-center rounded-lg bg-black">
        <Video className="size-5 text-white" strokeWidth={2} />
      </div>

      <div className="flex w-full items-center justify-between gap-3">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.5px] text-black">
          {level.label}
        </span>

        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors [transition-duration:200ms] ${
            selected
              ? 'bg-black text-white'
              : 'bg-transparent text-black/40 group-hover:text-black/70'
          }`}
        >
          {selected ? (
            <Check className="size-4" strokeWidth={3} />
          ) : (
            <ArrowRight
              className="size-5 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          )}
        </span>
      </div>
    </button>
  )
}
