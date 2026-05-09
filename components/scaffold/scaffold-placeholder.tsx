'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface ScaffoldAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  withArrow?: boolean
}

interface ScaffoldPlaceholderProps {
  routeLabel: string
  title: string
  description?: string
  actions?: ScaffoldAction[]
  children?: ReactNode
}

export default function ScaffoldPlaceholder({
  routeLabel,
  title,
  description,
  actions,
  children,
}: ScaffoldPlaceholderProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-lg flex-col items-center gap-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-black/40">
          {routeLabel}
        </p>
        <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-0.5px] text-black">
          {title}
        </h1>
        {description && (
          <p className="max-w-md text-base leading-relaxed text-black/60">
            {description}
          </p>
        )}
        {children && <div className="w-full">{children}</div>}
        {actions && actions.length > 0 && (
          <div className="mt-4 flex w-full flex-col gap-2">
            {actions.map((action, idx) => {
              const className =
                action.variant === 'secondary'
                  ? 'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-black/12 bg-white px-4 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4'
                  : 'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FF5C00] px-4 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:brightness-110'
              const showArrow =
                action.withArrow !== false && action.variant !== 'secondary'
              const content = (
                <>
                  {action.label}
                  {showArrow && <ArrowRight className="size-4" strokeWidth={2.5} />}
                </>
              )
              return action.href ? (
                <Link key={idx} href={action.href} className={className}>
                  {content}
                </Link>
              ) : (
                <button
                  key={idx}
                  type="button"
                  onClick={action.onClick}
                  className={className}
                >
                  {content}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
