'use client'

import { useMemo } from 'react'
import { JSONUIProvider, Renderer, type ComponentRegistry } from '@json-render/react'
import type { Spec } from '@json-render/core'
import { ORANGE } from './constants'
import { PrimaryButton, SecondaryButton } from './primitives'
import type { TimelineStep } from './types'

interface TimelineScreenProps {
  step: TimelineStep
  onBack: () => void
  onNext: () => void
}

const TRACK_DRAW_MS = 1200
const NODE_STAGGER_MS = 220
const NODE_BASE_DELAY_MS = TRACK_DRAW_MS - 200

const registry: ComponentRegistry = {
  TimelineTrack: ({ children }) => (
    <div className="relative w-full px-12">
      <div className="absolute left-12 right-12 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/8" />
      <div
        className="absolute left-12 right-12 top-1/2 h-[3px] -translate-y-1/2 origin-left rounded-full bg-[#ff4f00] [animation:timeline-track-draw_var(--track-ms)_cubic-bezier(0.22,1,0.36,1)_120ms_forwards]"
        style={
          {
            transform: 'scaleX(0)',
            '--track-ms': `${TRACK_DRAW_MS}ms`,
          } as React.CSSProperties
        }
      />
      <div className="relative flex items-center justify-between">{children}</div>
    </div>
  ),
  TimelineNode: ({ element }) => {
    const props = element.props as {
      date?: string
      title?: string
      description?: string
      historicalImpact?: string
      index?: number
      total?: number
    }
    const { date, title, description, historicalImpact, index = 0 } = props
    const isAbove = index % 2 === 0
    const delay = NODE_BASE_DELAY_MS + index * NODE_STAGGER_MS

    return (
      <div className="relative flex flex-1 items-center justify-center">
        <div
          className="group relative flex items-center justify-center [animation:timeline-node-in_500ms_cubic-bezier(0.34,1.56,0.64,1)_var(--delay)_forwards]"
          style={
            {
              opacity: 0,
              transform: 'scale(0.4)',
              '--delay': `${delay}ms`,
            } as React.CSSProperties
          }
        >
          <button
            type="button"
            aria-label={`${date} — ${title}`}
            className="relative flex size-8 cursor-pointer items-center justify-center rounded-full border-[3px] border-[#ff4f00] bg-white transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ff4f00]/30"
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[#ff4f00]/30 [animation:timeline-node-pulse_2400ms_ease-in-out_infinite] [animation-delay:var(--delay)]"
              style={{ ['--delay' as string]: `${delay + 200}ms` }}
            />
            <span className="block size-2.5 rounded-full bg-[#ff4f00]" />
          </button>

          <div
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 flex w-32 flex-col items-center gap-1 text-center transition-opacity duration-200 ${
              isAbove ? 'bottom-[calc(100%+18px)]' : 'top-[calc(100%+18px)]'
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#ff4f00]">
              {date}
            </span>
            <span className="text-[13px] font-medium leading-[1.2] tracking-[-0.28px] text-black">
              {title}
            </span>
          </div>

          <div
            role="tooltip"
            className={`pointer-events-none absolute left-1/2 z-20 w-[280px] -translate-x-1/2 scale-95 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100 ${
              isAbove ? 'bottom-[calc(100%+82px)]' : 'top-[calc(100%+82px)]'
            }`}
          >
            <div className="rounded-xl border border-[#ff4f00]/30 bg-white p-3 shadow-[0_12px_32px_rgba(255,79,0,0.18)]">
              <p className="text-sm leading-[1.35] tracking-[-0.28px] text-black">
                {description}
              </p>
              {historicalImpact ? (
                <p className="mt-2 rounded-md bg-[#fff4ee] px-2 py-1.5 text-xs font-medium leading-[1.35] tracking-[-0.24px] text-[#ff4f00]">
                  {historicalImpact}
                </p>
              ) : null}
            </div>
            <span
              aria-hidden
              className={`absolute left-1/2 -translate-x-1/2 size-3 rotate-45 border border-[#ff4f00]/30 bg-white ${
                isAbove
                  ? '-bottom-[7px] border-l-transparent border-t-transparent'
                  : '-top-[7px] border-r-transparent border-b-transparent'
              }`}
            />
          </div>
        </div>
      </div>
    )
  },
}

function buildTimelineSpec(step: TimelineStep): Spec {
  const total = step.events.length
  const eventEntries = step.events.map((event, index) => {
    const key = `event-${event.id}`
    return [
      key,
      {
        type: 'TimelineNode',
        props: {
          date: event.date,
          title: event.title,
          description: event.description,
          historicalImpact: event.historicalImpact,
          index,
          total,
        },
      },
    ] as const
  })

  return {
    root: 'track',
    elements: {
      track: {
        type: 'TimelineTrack',
        props: {},
        children: eventEntries.map(([key]) => key),
      },
      ...Object.fromEntries(eventEntries),
    },
  }
}

export function TimelineScreen({ step, onBack, onNext }: TimelineScreenProps) {
  const spec = useMemo(() => buildTimelineSpec(step), [step])

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <style>{`
        @keyframes timeline-track-draw {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes timeline-node-in {
          0% { opacity: 0; transform: scale(0.4); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes timeline-node-pulse {
          0%, 100% { transform: scale(1); opacity: 0; }
          50% { transform: scale(1.8); opacity: 0.55; }
        }
      `}</style>

      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-2 text-center animate-in fade-in slide-in-from-top-2 duration-500">
        <p
          className="text-xs font-semibold uppercase tracking-[1px]"
          style={{ color: ORANGE }}
        >
          Línea de tiempo
        </p>
        <h2 className="text-[32px] font-medium leading-[1.05] tracking-[-0.5px] text-black">
          {step.title}
        </h2>
        <p className="text-base leading-[1.3] tracking-[-0.32px] text-black/60">
          {step.intro}
        </p>
      </div>

      <div className="flex flex-1 items-center overflow-visible rounded-xl bg-white py-32 animate-in fade-in zoom-in-95 duration-700">
        <JSONUIProvider registry={registry}>
          <Renderer spec={spec} registry={registry} />
        </JSONUIProvider>
      </div>

      <div className="flex items-center gap-6">
        <SecondaryButton onClick={onBack}>Volver</SecondaryButton>
        <p className="flex-1 text-center text-sm font-medium tracking-[-0.5px] text-black/30">
          Pasá el cursor por cada nodo para ver el detalle.
        </p>
        <PrimaryButton onClick={onNext}>Siguiente</PrimaryButton>
      </div>
    </div>
  )
}
