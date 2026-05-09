'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ORANGE } from './constants'

export function ProgressBar({
  percent,
  smooth = true,
  onSeek,
}: {
  percent: number
  smooth?: boolean
  onSeek?: (fraction: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const interactive = Boolean(onSeek)

  const computeFraction = (clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return 0
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onSeek) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    onSeek(computeFraction(event.clientX))
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || !onSeek) return
    onSeek(computeFraction(event.clientX))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsDragging(false)
  }

  const showWidthTransition = smooth && !isDragging
  const fillWidthClass = showWidthTransition
    ? 'transition-[width] duration-700 ease-out'
    : ''

  if (!interactive) {
    return (
      <div className="h-1 w-full overflow-hidden bg-black/4">
        <div
          className={`h-full bg-black ${fillWidthClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    )
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="group relative h-3 w-full cursor-pointer touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden bg-black/4 transition-[height] duration-150 ${
          isDragging ? 'h-1.5' : 'h-1 group-hover:h-1.5'
        }`}
      >
        <div
          className={`h-full bg-black ${fillWidthClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div
        aria-hidden
        className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow-sm transition-opacity duration-150 ${
          isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{ left: `${percent}%` }}
      />
    </div>
  )
}

export function FlowHeader({
  title,
  percent,
  smooth,
  onSeek,
}: {
  title: string
  percent: number
  smooth?: boolean
  onSeek?: (fraction: number) => void
}) {
  return (
    <div className="sticky top-0 z-10 bg-[#f8f8f8]">
      <div className="flex items-center justify-center px-6 py-3">
        <p className="text-base font-medium tracking-[-0.5px] text-black">{title}</p>
      </div>
      <ProgressBar percent={percent} smooth={smooth} onSeek={onSeek} />
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
