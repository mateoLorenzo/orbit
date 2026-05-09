'use client'

import { useMemo, useState } from 'react'
import { JSONUIProvider, Renderer, type ComponentRegistry } from '@json-render/react'
import type { Spec } from '@json-render/core'
import { PrimaryButton, SecondaryButton } from './primitives'
import type { TimelineStep } from './types'

interface TimelineScreenProps {
  step: TimelineStep
  onBack: () => void
  onNext: () => void
}

const TRACK_DRAW_MS = 900
const NODE_STAGGER_MS = 140
const NODE_BASE_DELAY_MS = 200

export function TimelineScreen({ step, onBack, onNext }: TimelineScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const total = step.events.length

  const registry: ComponentRegistry = useMemo(() => {
    const gridStyle = { gridTemplateColumns: `repeat(${total}, 200px)` } as React.CSSProperties

    return {
      TimelineLayout: ({ children }) => (
        <div className="flex min-h-0 flex-1 gap-6">{children}</div>
      ),

      EventList: ({ children }) => (
        <aside className="flex w-[420px] shrink-0 flex-col gap-3 self-stretch overflow-y-auto rounded-xl bg-black/4 p-4">
          {children}
        </aside>
      ),

      EventListItem: ({ element }) => {
        const props = element.props as {
          index: number
          isActive: boolean
          number: string
          description: string
          historicalImpact: string
        }
        const { index, isActive, number, description, historicalImpact } = props

        if (isActive) {
          return (
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              className="flex w-full flex-col gap-3 rounded-xl border border-[#ff4f00] bg-white p-6 text-left animate-in fade-in zoom-in-95 duration-300"
            >
              <span className="text-sm font-medium leading-none tracking-[-0.28px] text-[#ff4f00]">
                {number}
              </span>
              <p className="text-base font-medium leading-[1.25] tracking-[-0.5px] text-black">
                {description}
              </p>
              <div className="h-px w-full bg-black/10" />
              <p className="text-base font-medium leading-[1.25] tracking-[-0.5px] text-black/40">
                {historicalImpact}
              </p>
            </button>
          )
        }

        return (
          <button
            type="button"
            onClick={() => setActiveIndex(index)}
            className="flex w-full flex-col gap-2.5 rounded-xl border border-black/8 p-6 text-left transition-colors hover:bg-white/40"
          >
            <span className="text-sm font-medium leading-none tracking-[-0.28px] text-black">
              {number}
            </span>
            <p className="text-base font-medium leading-[1.25] tracking-[-0.5px] text-black">
              {description}
            </p>
          </button>
        )
      },

      MainContent: ({ children }) => (
        <main className="flex min-w-0 flex-1 flex-col gap-10 self-stretch overflow-hidden rounded-xl bg-white p-10">
          {children}
        </main>
      ),

      Header: ({ element }) => {
        const props = element.props as { title: string; intro: string }
        return (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
            <h2 className="text-[40px] font-medium leading-none tracking-[-0.5px] text-black">
              <span className="block">Línea de tiempo</span>
              <span className="block">{props.title}</span>
            </h2>
            <p className="text-sm font-medium leading-none tracking-[-0.28px] text-black/40">
              {props.intro}
            </p>
          </div>
        )
      },

      ScrollArea: ({ children }) => (
        <div className="flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden">
          <div className="flex flex-col gap-10">{children}</div>
        </div>
      ),

      CardGrid: ({ children }) => (
        <div className="grid w-fit gap-3" style={gridStyle}>
          {children}
        </div>
      ),

      EventCard: ({ element }) => {
        const props = element.props as {
          index: number
          isActive: boolean
          isPast: boolean
          number: string
          title: string
        }
        const { index, isActive, isPast, number, title } = props
        const showNumber = isActive || isPast
        const numberColor = isActive ? 'text-[#ff4f00]' : 'text-white'
        const borderClass = isActive ? 'border-[#ff4f00]' : 'border-black/8'
        const delay = NODE_BASE_DELAY_MS + index * NODE_STAGGER_MS
        const imageIndex = (index % 5) + 1
        const bgImage = `/timeline/san-martin-card-timeline-${imageIndex}.png`

        return (
          <button
            type="button"
            onClick={() => setActiveIndex(index)}
            style={{
              ['--delay' as string]: `${delay}ms`,
              backgroundImage: `url(${bgImage})`,
            }}
            className={`relative flex aspect-square w-[200px] flex-col items-start gap-3 overflow-hidden rounded-xl border bg-white bg-cover bg-center p-6 text-left transition-all duration-200 hover:scale-[1.02] [animation:timeline-card-in_400ms_cubic-bezier(0.34,1.56,0.64,1)_var(--delay)_both] ${borderClass}`}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10"
            />
            {showNumber ? (
              <span
                className={`relative text-sm font-medium leading-none tracking-[-0.28px] ${numberColor}`}
              >
                {number}
              </span>
            ) : null}
            <p className="relative mt-auto text-base font-medium leading-[1.25] tracking-[-0.5px] text-white">
              {title}
            </p>
          </button>
        )
      },

      Track: ({ children }) => (
        <div className="relative w-fit">
          <div
            className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 origin-left rounded-full bg-[#ff4f00] [animation:timeline-track-draw_var(--track-ms)_cubic-bezier(0.22,1,0.36,1)_120ms_forwards]"
            style={
              {
                transform: 'translateY(-50%) scaleX(0)',
                '--track-ms': `${TRACK_DRAW_MS}ms`,
              } as React.CSSProperties
            }
          />
          <div className="relative grid gap-3" style={gridStyle}>
            {children}
          </div>
        </div>
      ),

      TrackNode: ({ element }) => {
        const props = element.props as { index: number; isActive: boolean }
        const { index, isActive } = props
        const delay = NODE_BASE_DELAY_MS + index * NODE_STAGGER_MS

        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ir al evento ${index + 1}`}
              style={{ ['--delay' as string]: `${delay}ms` }}
              className={`relative flex size-8 cursor-pointer items-center justify-center rounded-full border-[3px] border-[#ff4f00] transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ff4f00]/30 [animation:timeline-node-in_400ms_cubic-bezier(0.34,1.56,0.64,1)_var(--delay)_both] ${
                isActive ? 'bg-[#ff4f00]' : 'bg-white'
              }`}
            >
              {isActive ? (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-[#ff4f00]/35 [animation:timeline-node-pulse_2400ms_ease-in-out_infinite]"
                  />
                  <span className="block size-2.5 rounded-full bg-white" />
                </>
              ) : null}
            </button>
          </div>
        )
      },

      DateGrid: ({ children }) => (
        <div className="grid w-fit gap-3" style={gridStyle}>
          {children}
        </div>
      ),

      DateButton: ({ element }) => {
        const props = element.props as {
          index: number
          isActive: boolean
          date: string
        }
        const { index, isActive, date } = props
        return (
          <button
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`flex h-9 items-center justify-center rounded-lg px-2 text-sm font-medium tracking-[-0.5px] transition-colors ${
              isActive
                ? 'bg-[#ff4f00] text-white'
                : 'bg-black/4 text-black hover:bg-black/8'
            }`}
          >
            {date}
          </button>
        )
      },
    }
  }, [total])

  const spec = useMemo<Spec>(() => {
    const elements: Spec['elements'] = {}

    step.events.forEach((event, i) => {
      const isActive = i === activeIndex
      const isPast = i < activeIndex
      const number = String(i + 1)

      elements[`left-${i}`] = {
        type: 'EventListItem',
        props: {
          index: i,
          isActive,
          isPast,
          number,
          description: event.description,
          historicalImpact: event.historicalImpact,
        },
      }

      elements[`card-${i}`] = {
        type: 'EventCard',
        props: {
          index: i,
          isActive,
          isPast,
          number,
          title: event.title,
        },
      }

      elements[`track-${i}`] = {
        type: 'TrackNode',
        props: { index: i, isActive, isPast },
      }

      elements[`date-${i}`] = {
        type: 'DateButton',
        props: { index: i, isActive, isPast, date: event.date },
      }
    })

    elements.eventList = {
      type: 'EventList',
      props: {},
      children: step.events.map((_, i) => `left-${i}`),
    }

    elements.header = {
      type: 'Header',
      props: { title: step.title, intro: step.intro },
    }

    elements.cardGrid = {
      type: 'CardGrid',
      props: {},
      children: step.events.map((_, i) => `card-${i}`),
    }

    elements.track = {
      type: 'Track',
      props: {},
      children: step.events.map((_, i) => `track-${i}`),
    }

    elements.dateGrid = {
      type: 'DateGrid',
      props: {},
      children: step.events.map((_, i) => `date-${i}`),
    }

    elements.scrollArea = {
      type: 'ScrollArea',
      props: {},
      children: ['cardGrid', 'track', 'dateGrid'],
    }

    elements.mainContent = {
      type: 'MainContent',
      props: {},
      children: ['header', 'scrollArea'],
    }

    elements.layout = {
      type: 'TimelineLayout',
      props: {},
      children: ['eventList', 'mainContent'],
    }

    return {
      root: 'layout',
      elements,
    }
  }, [step, activeIndex])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 px-6 py-6">
      <style>{`
        @keyframes timeline-track-draw {
          from { transform: translateY(-50%) scaleX(0); }
          to { transform: translateY(-50%) scaleX(1); }
        }
        @keyframes timeline-node-in {
          0% { opacity: 0; transform: scale(0.4); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes timeline-card-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes timeline-node-pulse {
          0%, 100% { transform: scale(1); opacity: 0; }
          50% { transform: scale(1.6); opacity: 0.55; }
        }
      `}</style>

      <JSONUIProvider registry={registry}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>

      <div className="flex items-center gap-6">
        <SecondaryButton onClick={onBack}>Volver</SecondaryButton>
        <p className="flex-1 text-center text-sm font-medium tracking-[-0.5px] text-black/30">
          Interactúa con cada nodo para ver el detalle.
        </p>
        <PrimaryButton onClick={onNext}>Siguiente</PrimaryButton>
      </div>
    </div>
  )
}
