'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppSidebar from '@/components/app-sidebar'
import ModuleLearningFlow from '@/components/module-learning-flow'
import { useSubject } from '@/lib/hooks/use-subject'
import { useNodes } from '@/lib/hooks/use-nodes'
import { useNodeAssets } from '@/lib/hooks/use-assets'
import { mapSubjectRow } from '@/lib/domain/adapters'
import { isDemoSubject, getDemoLessons, getDemoNode } from '@/lib/demo'
import type { ContentNode } from '@/lib/types'

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const subjectSlug = (params.id as string) ?? ''
  const nodeSlug = (params.nodeId as string) ?? ''

  const subjectQuery = useSubject(subjectSlug)
  const subject = subjectQuery.data ? mapSubjectRow(subjectQuery.data) : null
  const isDemo = isDemoSubject(subject)
  const nodesQuery = useNodes(subjectSlug)

  const realNodes = nodesQuery.data ?? []
  const currentRealNode = realNodes.find((n) => n.slug === nodeSlug)
  const assetsQuery = useNodeAssets(currentRealNode?.id ?? '')

  const onExit = () => router.push(`/subjects/${subjectSlug}`)

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

  if (!subject) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Materia no encontrada</p>
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

  if (isDemo) {
    const demoNode = getDemoNode(nodeSlug)
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
          next ? () => router.push(`/subjects/${subjectSlug}/lessons/${next.id}`) : undefined
        }
      />
    )
  }

  if (!currentRealNode) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Lección no encontrada</p>
            <Link
              href={`/subjects/${subjectSlug}`}
              className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
            >
              Volver
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const idx = realNodes.findIndex((n) => n.slug === nodeSlug)
  const next = idx >= 0 ? realNodes[idx + 1] : undefined

  const nodeShim: ContentNode = {
    id: currentRealNode.id,
    title: currentRealNode.title,
    description: currentRealNode.contentBrief,
    type: 'clase',
    status: 'en-progreso',
    order: idx + 1,
  }

  const lesson = assetsQuery.data?.lesson
  const audio = assetsQuery.data?.audio
  const lessonData = lesson
    ? {
        paragraphs: lesson.paragraphs,
        quiz: lesson.quiz.map((q) => ({ question: q.question, options: q.options })),
        audioSrc: audio?.url,
      }
    : undefined

  if (!lessonData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f8f8f8] text-center">
        <div className="size-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
        <p className="text-base font-medium tracking-[-0.32px] text-black/60">
          Generando lección a partir de tus materiales...
        </p>
      </div>
    )
  }

  return (
    <ModuleLearningFlow
      subject={subject}
      node={nodeShim}
      lessonData={lessonData}
      audioSrc={audio?.url}
      onExit={onExit}
      onContinueNext={
        next ? () => router.push(`/subjects/${subjectSlug}/lessons/${next.slug}`) : undefined
      }
    />
  )
}
