'use client'

import { useParams } from 'next/navigation'
import ScaffoldPlaceholder from '@/components/scaffold/scaffold-placeholder'

const TOTAL_QUESTIONS = 1

export default function LessonQuizPage() {
  const params = useParams()
  const nodeId = (params.nodeId as string) ?? 'demo'
  const questionIdx = Number(params.questionIdx ?? 0)
  const isLast = questionIdx >= TOTAL_QUESTIONS - 1

  const nextHref = isLast
    ? `/lesson/${nodeId}/done`
    : `/lesson/${nodeId}/quiz/${questionIdx + 1}`

  return (
    <ScaffoldPlaceholder
      routeLabel={`Lección · Quiz ${questionIdx + 1} / ${TOTAL_QUESTIONS}`}
      title="Una breve pregunta"
      description="Mini-validación de comprensión: pregunta + opciones, feedback inmediato, integrada en el flujo (no examen)."
      actions={[{ label: 'Continuar', href: nextHref }]}
    />
  )
}
