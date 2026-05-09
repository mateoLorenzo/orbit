'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import type { Subject } from '@/lib/types'
import SubjectGrid from '@/components/subject-grid'
import SubjectDetail from '@/components/subject-detail'
import AddSubjectModal from '@/components/add-subject-modal'
import { GraduationCap, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { selectedSubject, setSelectedSubject } = useApp()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject)
  }

  const handleBack = () => {
    setSelectedSubject(null)
  }

  if (selectedSubject) {
    return <SubjectDetail subject={selectedSubject} onBack={handleBack} />
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mi espacio de estudio</p>
                <h1 className="text-2xl font-bold text-foreground">
                  Hola, Estudiante
                </h1>
              </div>
            </div>
            
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nueva materia
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <h2 className="mb-6 text-lg font-semibold text-foreground">
            Mis Materias
          </h2>
          <SubjectGrid
            onSelectSubject={handleSelectSubject}
            onAddSubject={() => setIsAddModalOpen(true)}
          />
        </section>
      </main>

      {/* Add Subject Modal */}
      <AddSubjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  )
}
