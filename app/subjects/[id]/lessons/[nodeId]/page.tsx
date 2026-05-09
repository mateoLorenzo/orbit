'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppSidebar from '@/components/app-sidebar'
import ModuleLearningFlow from '@/components/module-learning-flow'
import { useApp } from '@/lib/app-context'
import type { ContentNode } from '@/lib/types'

function findNode(nodes: ContentNode[], nodeId: string): ContentNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node
    if (node.children?.length) {
      const found = findNode(node.children, nodeId)
      if (found) return found
    }
  }
  return null
}

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = (params.id as string) ?? ''
  const nodeId = (params.nodeId as string) ?? ''
  const { subjects } = useApp()

  const subject = subjects.find((s) => s.id === subjectId)
  const node = subject ? findNode(subject.content, nodeId) : null

  if (!subject || !node) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Lección no encontrada</p>
            <p className="text-base text-black/50">
              No pudimos abrir la lección que estás buscando.
            </p>
            <Link
              href={subject ? `/subjects/${subject.id}` : '/'}
              className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
            >
              Volver
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const siblingIndex = subject.content.findIndex((n) => n.id === node.id)
  const nextSibling =
    siblingIndex >= 0 ? subject.content[siblingIndex + 1] : undefined

  return (
    <ModuleLearningFlow
      subject={subject}
      node={node}
      onExit={() => router.push(`/subjects/${subject.id}`)}
      onContinueNext={
        nextSibling
          ? () => router.push(`/subjects/${subject.id}/lessons/${nextSibling.id}`)
          : undefined
      }
    />
  )
}
