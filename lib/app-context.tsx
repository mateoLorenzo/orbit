'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Subject, Source, ContentNode } from './types'
import { initialSubjects, subjectColors } from './data'

interface AppContextType {
  subjects: Subject[]
  selectedSubject: Subject | null
  setSelectedSubject: (subject: Subject | null) => void
  addSubject: (name: string, description: string, icon: string) => void
  addSource: (subjectId: string, source: Source) => void
  removeSource: (subjectId: string, sourceId: string) => void
  generateContent: (subjectId: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

  const addSubject = (name: string, description: string, icon: string) => {
    const newSubject: Subject = {
      id: Date.now().toString(),
      name,
      description,
      color: subjectColors[subjects.length % subjectColors.length],
      icon,
      createdAt: new Date(),
      sources: [],
      content: []
    }
    setSubjects([...subjects, newSubject])
  }

  const addSource = (subjectId: string, source: Source) => {
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          sources: [...subject.sources, source]
        }
      }
      return subject
    }))
    
    // Update selected subject if it's the one being modified
    if (selectedSubject?.id === subjectId) {
      setSelectedSubject({
        ...selectedSubject,
        sources: [...selectedSubject.sources, source]
      })
    }
  }

  const removeSource = (subjectId: string, sourceId: string) => {
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          sources: subject.sources.filter(s => s.id !== sourceId)
        }
      }
      return subject
    }))
    
    if (selectedSubject?.id === subjectId) {
      setSelectedSubject({
        ...selectedSubject,
        sources: selectedSubject.sources.filter(s => s.id !== sourceId)
      })
    }
  }

  const generateContent = (subjectId: string) => {
    // Simulate AI content generation
    const generatedContent: ContentNode[] = [
      {
        id: `gen-${Date.now()}-1`,
        title: 'Introducción al tema',
        description: 'Conceptos fundamentales generados por IA',
        type: 'tema',
        status: 'pendiente',
        order: 1,
        children: [
          {
            id: `gen-${Date.now()}-1-1`,
            title: 'Conceptos básicos',
            description: 'Definiciones y terminología esencial',
            type: 'clase',
            status: 'pendiente',
            order: 1
          },
          {
            id: `gen-${Date.now()}-1-2`,
            title: 'Ejemplos prácticos',
            description: 'Aplicaciones del tema en casos reales',
            type: 'ejercicio',
            status: 'pendiente',
            order: 2
          }
        ]
      },
      {
        id: `gen-${Date.now()}-2`,
        title: 'Desarrollo del contenido',
        description: 'Profundización en los temas principales',
        type: 'tema',
        status: 'pendiente',
        order: 2,
        children: [
          {
            id: `gen-${Date.now()}-2-1`,
            title: 'Análisis detallado',
            description: 'Estudio en profundidad de los conceptos',
            type: 'clase',
            status: 'pendiente',
            order: 1
          }
        ]
      }
    ]

    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          content: [...subject.content, ...generatedContent]
        }
      }
      return subject
    }))

    if (selectedSubject?.id === subjectId) {
      setSelectedSubject({
        ...selectedSubject,
        content: [...selectedSubject.content, ...generatedContent]
      })
    }
  }

  return (
    <AppContext.Provider value={{
      subjects,
      selectedSubject,
      setSelectedSubject,
      addSubject,
      addSource,
      removeSource,
      generateContent
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
