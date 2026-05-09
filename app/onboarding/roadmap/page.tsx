'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'motion/react'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
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

interface RoadmapNode {
  id: string
  title: string
  description: string
  duration: string
}

const NODES: RoadmapNode[] = [
  {
    id: '1',
    title: 'La Revolución de Mayo',
    description:
      'Las tensiones políticas y sociales que impulsaron el inicio del proceso independentista en el Río de la Plata.',
    duration: '15 min',
  },
  {
    id: '2',
    title: 'El Cruce de los Andes',
    description:
      'La estrategia militar y política de José de San Martín para liberar Chile y avanzar sobre el Virreinato del Perú.',
    duration: '15 min',
  },
  {
    id: '3',
    title: 'Las Invasiones Inglesas',
    description:
      'El impacto de las invasiones británicas en Buenos Aires y el surgimiento de nuevas identidades políticas.',
    duration: '15 min',
  },
  {
    id: '4',
    title: 'La Asamblea del Año XIII',
    description:
      'Las primeras iniciativas para organizar políticamente las Provincias Unidas y consolidar la independencia.',
    duration: '15 min',
  },
  {
    id: '5',
    title: 'La Declaración de la Independencia',
    description:
      'El Congreso de Tucumán y el camino hacia la formal separación de la corona española.',
    duration: '15 min',
  },
  {
    id: '6',
    title: 'Las Guerras Civiles',
    description:
      'Los conflictos internos entre unitarios y federales que definieron la organización política del país.',
    duration: '15 min',
  },
]

export default function OnboardingRoadmapPage() {
  const router = useRouter()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setCanScrollLeft(el.scrollLeft > 1)
      setCanScrollRight(el.scrollLeft < max - 1)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', update)
      resizeObserver.disconnect()
    }
  }, [])

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector('article')
    const cardWidth = card?.clientWidth ?? 280
    const gap = 12
    el.scrollBy({ left: direction * (cardWidth + gap), behavior: 'smooth' })
  }

  const handleConfirm = () => {
    router.push('/onboarding/ready')
  }

  return (
    <PageTransition
      pageKey="onboarding-roadmap"
      variant="fade"
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <motion.div
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="visible"
          className="flex flex-col"
        >
          <motion.div
            variants={FADE_CHILD}
            className="mx-auto w-full max-w-3xl shrink-0 px-6 pt-8 text-center"
          >
            <h1 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.8px]">
              <span className="block text-[#FF5C00]">Proceso completado</span>
              <span className="block text-black">Tu ruta de aprendizaje</span>
            </h1>
            <p className="mt-2 text-sm text-black/45">
              Revisa tu camino y realiza los cambios que desees.
            </p>
          </motion.div>

          <motion.div variants={FADE_CHILD} className="mt-6 shrink-0">
            <div
              ref={scrollerRef}
              className="mx-auto flex w-full max-w-[1280px] snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-6 pb-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {NODES.map((node, i) => (
                <RoadmapCard key={node.id} index={i + 1} node={node} />
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={FADE_CHILD}
            className="mt-4 flex shrink-0 items-center justify-center gap-3"
          >
            <ArrowButton
              dir="left"
              onClick={() => scrollByCard(-1)}
              disabled={!canScrollLeft}
            />
            <ArrowButton
              dir="right"
              onClick={() => scrollByCard(1)}
              disabled={!canScrollRight}
            />
          </motion.div>
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
          className="mx-auto mt-auto flex w-full shrink-0 items-center justify-center px-6 pb-6 pt-6"
        >
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#FF5C00] px-6 text-base font-medium tracking-[-0.32px] text-white shadow-[0_8px_24px_-12px_rgba(255,92,0,0.6)] transition-[transform,filter] hover:brightness-110 hover:-translate-y-px"
          >
            Confirmar ruta de aprendizaje
          </button>
        </motion.footer>
      </div>
    </PageTransition>
  )
}

function ArrowButton({
  dir,
  onClick,
  disabled,
}: {
  dir: 'left' | 'right'
  onClick: () => void
  disabled?: boolean
}) {
  const Icon = dir === 'left' ? ArrowLeft : ArrowRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Anterior' : 'Siguiente'}
      className="flex size-11 items-center justify-center rounded-lg border border-black/12 bg-white text-black transition-[color,opacity,background-color] hover:bg-black/4 disabled:cursor-not-allowed disabled:border-black/6 disabled:bg-black/2 disabled:text-black/25 disabled:opacity-50 disabled:hover:bg-black/2"
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  )
}

function RoadmapCard({
  index,
  node,
}: {
  index: number
  node: RoadmapNode
}) {
  return (
    <article className="flex h-[320px] w-[268px] shrink-0 snap-start flex-col rounded-2xl border border-black/8 bg-white p-4">
      <div className="flex size-8 items-center justify-center rounded-md border border-black/12 text-base font-semibold tracking-[-0.32px] text-black">
        {index}
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <h3 className="text-[20px] font-semibold leading-[1.15] tracking-[-0.5px] text-black">
          {node.title}
        </h3>
        <p className="text-sm leading-snug text-black/45">{node.description}</p>
      </div>

      <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black">
        <Clock className="size-3.5 text-black/55" strokeWidth={2} />
        <span>{node.duration}</span>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-black/12 bg-white text-sm font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
      >
        Ver detalle
      </button>
    </article>
  )
}
