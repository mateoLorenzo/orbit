'use client'

import { useParams, usePathname } from 'next/navigation'
import { notFound } from 'next/navigation'
import PageTransition, { type TransitionVariant } from '@/components/scaffold/page-transition'
import ScaffoldPlaceholder from '@/components/scaffold/scaffold-placeholder'

interface Slide {
  title: string
  description: string
  variant: TransitionVariant
}

const SLIDES: Slide[] = [
  {
    title: 'La educación sigue siendo estática',
    description: 'Slide 1 — apertura emocional sobre el problema.',
    variant: 'fade',
  },
  {
    title: 'Pero las personas aprenden de formas distintas',
    description: 'Slide 2 — quiebre del statu quo.',
    variant: 'fade',
  },
  {
    title: '¿Qué es?',
    description: 'Slide 3 — pregunta retórica que abre la propuesta.',
    variant: 'fade',
  },
  {
    title: 'Un motor de aprendizaje adaptativo.',
    description: 'Slide 4 — definición.',
    variant: 'fade-slow',
  },
  {
    title:
      'Una capa de traducción entre contenido académico y cómo aprende cada persona.',
    description: 'Slide 5 — claim final.',
    variant: 'fade-slow',
  },
]

export default function SlideByIdxPage() {
  const params = useParams()
  const pathname = usePathname()
  const idx = Number(params.idx)
  const slide = Number.isFinite(idx) && idx >= 1 && idx <= SLIDES.length ? SLIDES[idx - 1] : null

  if (!slide) notFound()

  const isLast = idx === SLIDES.length
  const nextHref = isLast ? '/onboarding' : `/slides/${idx + 1}`

  return (
    <PageTransition
      pageKey={pathname}
      variant={slide.variant}
      className="flex flex-1 flex-col"
    >
      <ScaffoldPlaceholder
        routeLabel={`Slides intro · ${idx} / ${SLIDES.length}`}
        title={slide.title}
        description={slide.description}
        actions={[
          { label: isLast ? 'Comenzar' : 'Siguiente', href: nextHref },
          ...(idx > 1
            ? [
                {
                  label: 'Anterior',
                  href: `/slides/${idx - 1}`,
                  variant: 'secondary' as const,
                  withArrow: false,
                },
              ]
            : []),
        ]}
      />
    </PageTransition>
  )
}
