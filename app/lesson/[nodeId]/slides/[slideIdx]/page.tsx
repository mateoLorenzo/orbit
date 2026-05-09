'use client'

import { useParams } from 'next/navigation'
import ScaffoldPlaceholder from '@/components/scaffold/scaffold-placeholder'

export default function LessonSlidePage() {
  const params = useParams()
  const nodeId = (params.nodeId as string) ?? 'demo'
  const slideIdx = Number(params.slideIdx ?? 0)

  return (
    <ScaffoldPlaceholder
      routeLabel={`Lección · Slide ${slideIdx + 1}`}
      title={`Contenido del slide ${slideIdx + 1}`}
      description="Pantalla cinematográfica con texto guiado, imagen contextual, narrador (TTS) y barra de lectura sincronizada. Acá vive la experiencia central de la lección."
      actions={[
        { label: 'Siguiente', href: `/lesson/${nodeId}/slides/${slideIdx + 1}` },
        {
          label: 'Volver',
          href: `/lesson/${nodeId}/start`,
          variant: 'secondary',
          withArrow: false,
        },
      ]}
    />
  )
}
