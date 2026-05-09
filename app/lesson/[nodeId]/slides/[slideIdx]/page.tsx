'use client'

import { useParams } from 'next/navigation'
import ScaffoldPlaceholder from '@/components/scaffold/scaffold-placeholder'

const TOTAL_SLIDES = 3

export default function LessonSlidePage() {
  const params = useParams()
  const nodeId = (params.nodeId as string) ?? 'demo'
  const slideIdx = Number(params.slideIdx ?? 0)
  const isLast = slideIdx >= TOTAL_SLIDES - 1
  const isFirst = slideIdx <= 0

  const nextHref = isLast
    ? `/lesson/${nodeId}/quiz/0`
    : `/lesson/${nodeId}/slides/${slideIdx + 1}`
  const prevHref = isFirst
    ? `/lesson/${nodeId}/start`
    : `/lesson/${nodeId}/slides/${slideIdx - 1}`

  return (
    <ScaffoldPlaceholder
      routeLabel={`Lección · Slide ${slideIdx + 1} / ${TOTAL_SLIDES}`}
      title={`Contenido del slide ${slideIdx + 1}`}
      description="Pantalla cinematográfica con texto guiado, imagen contextual, narrador (TTS) y barra de lectura sincronizada. Acá vive la experiencia central de la lección."
      actions={[
        { label: 'Siguiente', href: nextHref },
        {
          label: 'Volver',
          href: prevHref,
          variant: 'secondary',
          withArrow: false,
        },
      ]}
    />
  )
}
