'use client'

import type { Subject } from '@/lib/types'
import { SubjectIcon } from '@/lib/subject-icons'

interface SubjectCardProps {
  subject: Subject
  progress: number
  onClick: () => void
}

function SubjectCard({ subject, progress, onClick }: SubjectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-[187px] w-full flex-col items-start gap-4 overflow-hidden rounded-xl bg-white p-6 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-black text-white">
        <SubjectIcon name={subject.icon} className="size-6" />
      </div>

      <div className="w-full">
        <h3 className="w-full truncate text-2xl font-medium leading-none tracking-[-0.5px] text-black">
          {subject.name}
        </h3>
      </div>

      <div className="mt-auto flex w-full flex-col gap-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/12 shadow-[0_1px_2px_2px_rgba(0,0,0,0.02)]">
          <div
            className="h-full rounded-full bg-black transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex w-full items-start justify-between text-base font-medium leading-[1.2] text-black">
          <p className="opacity-50">Progreso</p>
          <p className="text-right opacity-50">{progress}%</p>
        </div>
      </div>
    </button>
  )
}

interface SubjectGridProps {
  subjects: Subject[]
  onSelectSubject: (subject: Subject) => void
  getProgress: (subject: Subject) => number
}

export default function SubjectGrid({ subjects, onSelectSubject, getProgress }: SubjectGridProps) {
  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center">
        <p className="text-base text-black/50">No hay materias para mostrar.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          progress={getProgress(subject)}
          onClick={() => onSelectSubject(subject)}
        />
      ))}
    </div>
  )
}
