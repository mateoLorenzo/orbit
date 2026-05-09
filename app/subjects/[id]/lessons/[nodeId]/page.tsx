'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppSidebar from '@/components/app-sidebar'
import ModuleLearningFlow from '@/components/module-learning-flow'
import LessonFlowGeneric from '@/components/lesson-flow-generic'
import { useSubject } from '@/lib/hooks/use-subject'
import { useNodes } from '@/lib/hooks/use-nodes'
import { mapSubjectRow } from '@/lib/domain/adapters'
import { isDemoSubject, getDemoLessons, getDemoNode } from '@/lib/demo'

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = (params.id as string) ?? ''
  const nodeId = (params.nodeId as string) ?? ''

  const subjectQuery = useSubject(subjectId)
  const isDemo = isDemoSubject(subjectQuery.data ?? null)
  const nodesQuery = useNodes(subjectId)

  const onExit = () => router.push(`/subjects/${subjectId}`)

  if (subjectQuery.isLoading) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <p className="text-base text-black/50">Cargando lección...</p>
        </main>
      </div>
    )
  }

  if (!subjectQuery.data) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Lección no encontrada</p>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
            >
              Volver al inicio
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const subject = mapSubjectRow(subjectQuery.data)

  // Demo branch: use the existing ModuleLearningFlow with the local fixture.
  if (isDemo) {
    const demoNode = getDemoNode(nodeId)
    if (!demoNode) return null
    const lessons = getDemoLessons()
    const idx = lessons.findIndex((l) => l.id === demoNode.id)
    const next = idx >= 0 ? lessons[idx + 1] : undefined
    return (
      <ModuleLearningFlow
        subject={{ ...subject, content: lessons }}
        node={demoNode}
        onExit={onExit}
        onContinueNext={
          next ? () => router.push(`/subjects/${subjectId}/lessons/${next.id}`) : undefined
        }
      />
    )
  }

  // Generic branch: real backend-generated lesson.
  const realNodes = nodesQuery.data ?? []
  const currentNode = realNodes.find((n) => n.id === nodeId)
  if (!currentNode) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Lección no encontrada</p>
            <Link
              href={`/subjects/${subjectId}`}
              className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
            >
              Volver
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const idx = realNodes.findIndex((n) => n.id === nodeId)
  const next = idx >= 0 ? realNodes[idx + 1] : undefined

  return (
    <LessonFlowGeneric
      subjectName={subject.name}
      subjectId={subjectId}
      nodeId={nodeId}
      nodeTitle={currentNode.title}
      onExit={onExit}
      onContinueNext={
        next ? () => router.push(`/subjects/${subjectId}/lessons/${next.id}`) : undefined
      }
    />
  )
}
