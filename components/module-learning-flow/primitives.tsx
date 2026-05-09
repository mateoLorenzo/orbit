'use client'

import type { ReactNode } from 'react'
import { ORANGE } from './constants'

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1 w-full overflow-hidden bg-black/4">
      <div
        className="h-full bg-black transition-[width] duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export function FlowHeader({ title, percent }: { title: string; percent: number }) {
  return (
    <div className="sticky top-0 z-10 bg-[#f8f8f8]">
      <div className="flex items-center justify-center px-6 py-3">
        <p className="text-base font-medium tracking-[-0.5px] text-black">{title}</p>
      </div>
      <ProgressBar percent={percent} />
    </div>
  )
}

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
}

export function PrimaryButton({ children, onClick, className = '' }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: ORANGE }}
      className={`inline-flex h-10 items-center justify-center gap-1 rounded-lg px-3 text-base font-medium tracking-[-0.32px] text-white transition-all hover:brightness-110 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, className = '' }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-black/12 bg-white px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-10 items-center justify-center rounded-lg border border-black/12 bg-white text-black transition-colors hover:bg-black/4 active:scale-[0.98]"
    >
      <span aria-hidden>{icon}</span>
      <span className="sr-only">{label}</span>
    </button>
  )
}
