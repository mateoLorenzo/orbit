'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppSidebar from '@/components/app-sidebar'
import ModuleLearningFlow from '@/components/module-learning-flow'
import { useSubject } from '@/lib/hooks/use-subject'
import { useNodes } from '@/lib/hooks/use-nodes'
import { useNodeAssets, useSubmitQuiz } from '@/lib/hooks/use-assets'
import { mapSubjectRow } from '@/lib/domain/adapters'
import {
  DEMO_SUBJECT_SLUG,
  getDemoLessons,
  getDemoNode,
  getDemoSubject,
  isDemoSubject,
} from '@/lib/demo'
import type { ContentNode } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

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
  const submitQuizMutation = useSubmitQuiz(currentRealNode?.id ?? '', subjectSlug)

  const onExit = () => router.push(`/subjects/${subjectSlug}`)

  // Demo lessons render synchronously from hardcoded data — no skeleton flash
  // while the (unnecessary) subject network request is in flight.
  if (subjectSlug === DEMO_SUBJECT_SLUG) {
    const demoNode = getDemoNode(nodeSlug)
    if (!demoNode) return null
    const lessons = getDemoLessons()
    const idx = lessons.findIndex((l) => l.id === demoNode.id)
    const next = idx >= 0 ? lessons[idx + 1] : undefined
    return (
      <ModuleLearningFlow
        subject={getDemoSubject()}
        node={demoNode}
        onExit={onExit}
        onContinueNext={
          next ? () => router.push(`/subjects/${subjectSlug}/lessons/${next.id}`) : undefined
        }
      />
    )
  }

  if (subjectQuery.isLoading) {
    return <LessonPageSkeleton />
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
    return <LessonPageSkeleton />
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
      onLessonComplete={(answers) => submitQuizMutation.mutateAsync(answers)}
    />
  )
}

function LessonPageSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8] text-black">
      {/* Header: title + progress bar (matches FlowHeader) */}
      <div className="bg-[#f8f8f8]">
        <div className="flex items-center justify-center px-6 py-3">
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="h-1 w-full bg-black/4">
          <Skeleton className="h-full w-1/4 rounded-none bg-black/20" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 px-6 py-6">
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          {/* Left text card */}
          <div className="flex w-full shrink-0 flex-col gap-3 overflow-hidden rounded-xl bg-white p-6 lg:w-[420px]">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-10/12" />
            <div className="h-2" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-8/12" />
            <div className="h-2" />
            <Skeleton className="h-5 w-9/12" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-7/12" />
          </div>

          {/* Right media area */}
          <Skeleton className="min-h-0 flex-1 rounded-xl" />
        </div>

        {/* Bottom action row */}
        <div className="flex items-center gap-6">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <div className="flex flex-1 justify-center">
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
