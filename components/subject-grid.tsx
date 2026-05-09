'use client'

import type { Subject } from '@/lib/types'

const SUBJECT_DOT_COLORS = [
  '#5639cc',
  '#4ccc39',
  '#cc3939',
  '#bdcc39',
  '#ac39cc',
  '#cc39ac',
  '#3994cc',
  '#cc7a39',
]

function dotStyle(color: string) {
  return {
    backgroundImage: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.35), rgba(0,0,0,0) 65%)`,
    backgroundColor: color,
  }
}

interface SubjectCardProps {
  subject: Subject
  progress: number
  color: string
  onClick: () => void
}

function SubjectCard({ subject, progress, color, onClick }: SubjectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-[187px] w-full flex-col items-start gap-4 overflow-hidden rounded-xl bg-white p-6 text-left transition-shadow hover:shadow-md"
    >
      <div
        className="size-12 shrink-0 rounded-full"
        style={dotStyle(color)}
        aria-hidden
      />

      <div className="w-full">
        <h3 className="w-full truncate text-2xl font-medium leading-none tracking-[-0.5px] text-black">
          {subject.name}
        </h3>
      </div>

      <div className="mt-auto flex w-full flex-col gap-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/12 shadow-[0_1px_2px_2px_rgba(0,0,0,0.02)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff4f00] to-black transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex w-full items-start justify-between text-base font-medium leading-[1.2]">
          <p className="text-black opacity-50">Progreso</p>
          <p className="text-right text-black">{progress}%</p>
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
      {subjects.map((subject, index) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          progress={getProgress(subject)}
          color={SUBJECT_DOT_COLORS[index % SUBJECT_DOT_COLORS.length]}
          onClick={() => onSelectSubject(subject)}
        />
      ))}
    </div>
  )
}
