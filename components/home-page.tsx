'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/app-context'
import type { Subject, ContentNode } from '@/lib/types'
import SubjectGrid from '@/components/subject-grid'
import SubjectDetail from '@/components/subject-detail'
import AddSubjectModal from '@/components/add-subject-modal'
import { Plus } from 'lucide-react'
import AppSidebar from '@/components/app-sidebar'
import CareerProgressShader from '@/components/career-progress-shader'

function flattenContent(nodes: ContentNode[]): ContentNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenContent(n.children) : [])])
}

function getSubjectProgress(subject: Subject): number {
  const all = flattenContent(subject.content)
  if (all.length === 0) return 0
  const completed = all.filter((n) => n.status === 'completado').length
  return Math.round((completed / all.length) * 100)
}

export default function HomePage() {
  const { subjects, selectedSubject, setSelectedSubject } = useApp()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'finished'>('active')

  const { activeSubjects, finishedSubjects, careerProgress } = useMemo(() => {
    const withProgress = subjects.map((s) => ({ subject: s, progress: getSubjectProgress(s) }))
    const finished = withProgress.filter((x) => x.progress === 100).map((x) => x.subject)
    const active = withProgress.filter((x) => x.progress < 100).map((x) => x.subject)
    const completedCount = finished.length
    const totalCount = subjects.length
    const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
    return {
      activeSubjects: active,
      finishedSubjects: finished,
      careerProgress: { completed: completedCount, total: totalCount, percent },
    }
  }, [subjects])

  if (selectedSubject) {
    return <SubjectDetail subject={selectedSubject} onBack={() => setSelectedSubject(null)} />
  }

  const visibleSubjects = activeTab === 'active' ? activeSubjects : finishedSubjects

  return (
    <div className="flex min-h-screen bg-[#f8f8f8] text-black">
      <AppSidebar />

      {/* Main feed */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto flex max-w-[1352px] flex-col gap-6 p-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[40px] leading-none font-medium tracking-[-0.5px]">
              Buenos días, Ian
            </h1>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex h-10 items-center gap-1 rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
            >
              <Plus className="size-5" strokeWidth={2} />
              Nueva materia
            </button>
          </div>

          {/* Career progress card */}
          <section
            aria-label="Progreso de la carrera"
            className="relative overflow-hidden rounded-xl p-6"
            style={{
              backgroundImage:
                'linear-gradient(96.07deg, rgb(0, 132, 255) 3.9%, rgb(0, 0, 0) 96.1%)',
            }}
          >
            <CareerProgressShader className="pointer-events-none absolute inset-0 h-full w-full" />
            <div className="relative flex flex-wrap items-start justify-between gap-4 text-white font-medium tracking-[-0.5px]">
              <div className="flex flex-col gap-4">
                <p className="text-base leading-none opacity-50">Progreso de la carrera</p>
                <p className="text-2xl leading-none">Licenciatura en Historia</p>
              </div>
              <div className="flex flex-col items-end gap-4 text-right">
                <p className="text-base leading-none opacity-50">
                  {careerProgress.completed} de {careerProgress.total} materias completas
                </p>
                <p className="text-2xl leading-none">{careerProgress.percent}%</p>
              </div>
            </div>
            <div className="relative mt-5 h-1 w-full overflow-hidden rounded-full bg-white/24 shadow-[0_1px_2px_2px_rgba(0,0,0,0.02)]">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${careerProgress.percent}%` }}
              />
            </div>
          </section>

          {/* Tabs */}
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`flex items-center justify-center px-3 py-3 text-base font-medium tracking-[-0.32px] transition-opacity ${
                activeTab === 'active'
                  ? 'border-b-2 border-black text-black'
                  : 'border-b-2 border-black/24 text-black opacity-40 hover:opacity-70'
              }`}
            >
              Materias activas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('finished')}
              className={`flex items-center justify-center px-3 py-3 text-base font-medium tracking-[-0.32px] transition-opacity ${
                activeTab === 'finished'
                  ? 'border-b-2 border-black text-black'
                  : 'border-b-2 border-black/24 text-black opacity-40 hover:opacity-70'
              }`}
            >
              Materias finalizadas
            </button>
          </div>

          {/* Subject grid */}
          <SubjectGrid
            subjects={visibleSubjects}
            onSelectSubject={(subject: Subject) => setSelectedSubject(subject)}
            getProgress={getSubjectProgress}
          />
        </div>
      </main>

      <AddSubjectModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  )
}
