'use client'

import { useState } from 'react'
import type { Subject } from '@/lib/types'
import { ArrowLeft, FileText, BookOpen } from 'lucide-react'
import SourcesTab from './sources-tab'
import ContentTab from './content-tab'

interface SubjectDetailProps {
  subject: Subject
  onBack: () => void
}

type TabType = 'contenido' | 'fuentes'

export default function SubjectDetail({ subject, onBack }: SubjectDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('contenido')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${subject.color} text-2xl shadow-lg`}>
              {subject.icon}
            </div>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{subject.name}</h1>
              <p className="text-sm text-muted-foreground">{subject.description}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('contenido')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'contenido'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Contenido
            </button>
            <button
              onClick={() => setActiveTab('fuentes')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'fuentes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              Fuentes
              {subject.sources.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs text-primary">
                  {subject.sources.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {activeTab === 'contenido' ? (
          <ContentTab subject={subject} />
        ) : (
          <SourcesTab subject={subject} />
        )}
      </main>
    </div>
  )
}
