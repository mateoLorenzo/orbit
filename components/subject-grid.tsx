'use client'

import { useApp } from '@/lib/app-context'
import type { Subject } from '@/lib/types'
import { Plus } from 'lucide-react'

interface SubjectCardProps {
  subject: Subject
  onClick: () => void
}

function SubjectCard({ subject, onClick }: SubjectCardProps) {
  const sourcesCount = subject.sources.length
  const contentCount = subject.content.length

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card border border-border p-5 text-left transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
    >
      {/* Gradient header */}
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${subject.color}`} />
      
      {/* Icon */}
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${subject.color} text-2xl shadow-lg`}>
        {subject.icon}
      </div>

      {/* Content */}
      <h3 className="mb-1 text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
        {subject.name}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
        {subject.description}
      </p>

      {/* Stats */}
      <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {sourcesCount} {sourcesCount === 1 ? 'fuente' : 'fuentes'}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {contentCount} {contentCount === 1 ? 'tema' : 'temas'}
        </span>
      </div>
    </button>
  )
}

interface AddSubjectCardProps {
  onClick: () => void
}

function AddSubjectCard({ onClick }: AddSubjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-8 text-muted-foreground transition-all duration-300 hover:border-primary hover:bg-card hover:text-primary"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary/10">
        <Plus className="h-6 w-6" />
      </div>
      <span className="font-medium">Agregar materia</span>
    </button>
  )
}

interface SubjectGridProps {
  onSelectSubject: (subject: Subject) => void
  onAddSubject: () => void
}

export default function SubjectGrid({ onSelectSubject, onAddSubject }: SubjectGridProps) {
  const { subjects } = useApp()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          onClick={() => onSelectSubject(subject)}
        />
      ))}
      <AddSubjectCard onClick={onAddSubject} />
    </div>
  )
}
