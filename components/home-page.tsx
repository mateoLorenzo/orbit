'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/app-context'
import type { Subject, ContentNode } from '@/lib/types'
import SubjectGrid from '@/components/subject-grid'
import AddSubjectModal from '@/components/add-subject-modal'
import { ArrowRight, Flame, Plus } from 'lucide-react'
import AppSidebar from '@/components/app-sidebar'

function flattenContent(nodes: ContentNode[]): ContentNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenContent(n.children) : [])])
}

function getSubjectProgress(subject: Subject): number {
  const all = flattenContent(subject.content)
  if (all.length === 0) return 0
  const completed = all.filter((n) => n.status === 'completado').length
  return Math.round((completed / all.length) * 100)
}

function getDailyChallenge(activeSubjects: Subject[]) {
  for (const subject of activeSubjects) {
    const flat = flattenContent(subject.content)
    const next =
      flat.find((n) => n.status === 'en-progreso') ?? flat.find((n) => n.status === 'pendiente')
    if (next) return { subject, node: next }
  }
  return null
}

export default function HomePage() {
  const router = useRouter()
  const { subjects } = useApp()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'finished'>('active')

  const { activeSubjects, finishedSubjects, careerProgress, dailyChallenge } = useMemo(() => {
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
      dailyChallenge: getDailyChallenge(active),
    }
  }, [subjects])

  const visibleSubjects = activeTab === 'active' ? activeSubjects : finishedSubjects

  const handleStartChallenge = () => {
    if (!dailyChallenge) return
    router.push(`/subjects/${dailyChallenge.subject.id}`)
  }

  return (
    <div className="flex min-h-screen bg-[#f8f8f8] text-black">
      <AppSidebar />

      {/* Main feed */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto flex max-w-[1352px] flex-col gap-8 p-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[40px] leading-none font-medium tracking-[-0.5px]">
              Buenos días, Ian
            </h1>
            <div className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#ff4f00]/12 px-3 text-[#ff4f00]">
              <Flame className="size-4" strokeWidth={2} />
              <span className="text-base font-medium leading-none tracking-[-0.32px]">
                24 días de racha
              </span>
            </div>
          </div>

          {/* Top cards row */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Career progress card */}
            <section
              aria-label="Progreso de la carrera"
              className="relative flex h-[220px] flex-col gap-6 overflow-hidden rounded-xl bg-[#ff4f00] p-6 text-white"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'radial-gradient(120% 120% at 100% 50%, rgba(0,0,0,0.18) 0%, transparent 55%)',
                }}
              />
              <div className="relative flex flex-1 flex-col gap-4 font-medium tracking-[-0.5px]">
                <p className="text-base leading-none opacity-50">Progreso de la carrera</p>
                <p className="text-2xl leading-none">Licenciatura en Historia</p>
              </div>
              <div className="relative flex flex-col gap-4">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/24 shadow-[0_1px_2px_2px_rgba(0,0,0,0.02)]">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${careerProgress.percent}%` }}
                  />
                </div>
                <div className="flex items-end justify-between text-lg font-medium leading-none tracking-[-0.5px]">
                  <p>{careerProgress.percent}%</p>
                  <p>
                    {careerProgress.completed} de {careerProgress.total} materias completas
                  </p>
                </div>
              </div>
            </section>

            {/* Daily challenge card */}
            <section
              aria-label="Desafío del día"
              className="relative flex h-[220px] flex-col gap-6 overflow-hidden rounded-xl bg-black p-6 text-white"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'radial-gradient(120% 120% at 100% 50%, rgba(255,255,255,0.06) 0%, transparent 55%)',
                }}
              />
              <div className="relative flex flex-1 flex-col gap-4 font-medium tracking-[-0.5px]">
                <p className="text-base leading-none opacity-50">Desafío del día</p>
                <p className="max-w-[341px] text-2xl leading-tight">
                  Completá el desafío del día en base a tus últimos aprendizajes
                </p>
              </div>
              <div className="relative flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5 text-base font-medium leading-none tracking-[-0.32px]">
                  <p className="opacity-50">{dailyChallenge?.subject.name ?? 'Historia'}</p>
                  <p className="truncate">
                    {dailyChallenge?.node.title ?? 'Cruce de los Andes'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartChallenge}
                  disabled={!dailyChallenge}
                  className="inline-flex h-10 items-center gap-1 rounded-lg bg-white px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Comenzar
                  <ArrowRight className="size-5" strokeWidth={2} />
                </button>
              </div>
            </section>
          </div>

          {/* Tabs + Nueva materia */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center">
              <div className="flex flex-1 items-center">
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
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#ff4f00] px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-[#ff4f00]/90"
              >
                <Plus className="size-5" strokeWidth={2} />
                Nueva materia
              </button>
            </div>

            {/* Subject grid */}
            <SubjectGrid
              subjects={visibleSubjects}
              onSelectSubject={(subject: Subject) => router.push(`/subjects/${subject.id}`)}
              getProgress={getSubjectProgress}
            />
          </div>
        </div>
      </main>

      <AddSubjectModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  )
}
