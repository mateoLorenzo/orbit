'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Pencil, Video } from 'lucide-react'
import PageTransition from '@/components/scaffold/page-transition'

interface Level {
  id: string
  label: string
}

const LEVELS: Level[] = [
  { id: 'primary', label: 'Nivel secundario' },
  { id: 'secondary', label: 'Nivel terciario' },
  { id: 'tertiary', label: 'Posgrado' },
]

const CUSTOM_ID = 'custom'

export default function OnboardingLevelPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [customLabel, setCustomLabel] = useState('')

  const isCustomSelected = selected === CUSTOM_ID
  const canContinue =
    (selected !== null && !isCustomSelected) ||
    (isCustomSelected && customLabel.trim().length > 0)

  const handleCustomChange = (value: string) => {
    setCustomLabel(value)
    setSelected(CUSTOM_ID)
  }
  const handleCustomFocus = () => setSelected(CUSTOM_ID)

  const handleContinue = () => {
    if (!canContinue) return
    router.push('/onboarding/career')
  }

  return (
    <PageTransition pageKey="onboarding-level" variant="fade" className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-16">
          <h1 className="text-center text-[40px] font-semibold leading-[1.1] tracking-[-0.8px] text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
            ¿Qué estás estudiando?
          </h1>

          <div className="mt-12 flex flex-col gap-3">
            {LEVELS.map((level, i) => (
              <LevelCard
                key={level.id}
                level={level}
                selected={selected === level.id}
                onSelect={() => setSelected(level.id)}
                animationDelay={i * 80 + 300}
              />
            ))}
            <CustomLevelCard
              value={customLabel}
              selected={isCustomSelected}
              onValueChange={handleCustomChange}
              onFocus={handleCustomFocus}
              animationDelay={LEVELS.length * 80 + 300}
            />
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
            disabled={!canContinue}
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
      className={`group relative flex flex-row items-center gap-4 rounded-xl border-2 bg-white px-5 py-4 text-left transition-[border-color,box-shadow] [transition-duration:200ms] animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards ${selected
        ? 'border-black shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]'
        : 'border-black/8 hover:border-black/20'
        }`}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-black">
        <Video className="size-5 text-white" strokeWidth={2} />
      </div>

      <span className="flex-1 text-[22px] font-semibold leading-none tracking-[-0.5px] text-black">
        {level.label}
      </span>

      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors [transition-duration:200ms] ${selected
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
    </button>
  )
}

interface CustomLevelCardProps {
  value: string
  selected: boolean
  onValueChange: (value: string) => void
  onFocus: () => void
  animationDelay: number
}

function CustomLevelCard({
  value,
  selected,
  onValueChange,
  onFocus,
  animationDelay,
}: CustomLevelCardProps) {
  const filled = value.trim().length > 0
  const showCheck = selected && filled

  return (
    <label
      style={{ animationDelay: `${animationDelay}ms` }}
      className={`group relative flex cursor-text flex-row items-center gap-4 rounded-xl border-2 bg-white px-5 py-4 transition-[border-color,box-shadow] [transition-duration:200ms] animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards ${selected
        ? 'border-black shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]'
        : 'border-black/8 hover:border-black/20'
        }`}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-black">
        <Pencil className="size-5 text-white" strokeWidth={2} />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={onFocus}
        placeholder="Otro..."
        aria-label="Otro..."
        className="flex-1 bg-transparent text-[22px] font-semibold leading-none tracking-[-0.5px] text-black outline-none placeholder:font-medium placeholder:text-black/40"
      />

      {showCheck && (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black text-white">
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
    </label>
  )
}
