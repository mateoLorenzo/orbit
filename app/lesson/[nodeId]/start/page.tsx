'use client'

import { useParams } from 'next/navigation'
import ScaffoldPlaceholder from '@/components/scaffold/scaffold-placeholder'

export default function LessonStartPage() {
  const params = useParams()
  const nodeId = (params.nodeId as string) ?? 'demo'

  return (
    <ScaffoldPlaceholder
      routeLabel="Lección · Inicio"
      title="¿Listo para comenzar el tema?"
      description={`Pantalla previa al estudio del nodo "${nodeId}". Acá va el ícono inclinado de la materia, el nombre del tema en gris claro y el CTA naranja para arrancar.`}
      actions={[{ label: 'Comenzar', href: `/lesson/${nodeId}/slides/0` }]}
    />
  )
}
