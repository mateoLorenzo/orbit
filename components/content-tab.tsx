'use client'

import type { Subject, ContentNode } from '@/lib/types'
import { BookOpen, GraduationCap, FileQuestion, CheckCircle, Clock, Circle } from 'lucide-react'

interface ContentTabProps {
  subject: Subject
}

function ContentNodeCard({ node, depth = 0 }: { node: ContentNode; depth?: number }) {
  const getTypeIcon = () => {
    switch (node.type) {
      case 'tema':
        return <BookOpen className="h-5 w-5" />
      case 'clase':
        return <GraduationCap className="h-5 w-5" />
      case 'ejercicio':
        return <FileQuestion className="h-5 w-5" />
    }
  }

  const getTypeLabel = () => {
    switch (node.type) {
      case 'tema':
        return 'Tema'
      case 'clase':
        return 'Clase'
      case 'ejercicio':
        return 'Ejercicio'
    }
  }

  const getStatusIcon = () => {
    switch (node.status) {
      case 'completado':
        return <CheckCircle className="h-4 w-4 text-primary" />
      case 'en-progreso':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'pendiente':
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusLabel = () => {
    switch (node.status) {
      case 'completado':
        return 'Completado'
      case 'en-progreso':
        return 'En progreso'
      case 'pendiente':
        return 'Pendiente'
    }
  }

  const getTypeColor = () => {
    switch (node.type) {
      case 'tema':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'clase':
        return 'bg-accent/10 text-accent border-accent/20'
      case 'ejercicio':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    }
  }

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-border pl-4' : ''}>
      <div className="group rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${getTypeColor()}`}>
            {getTypeIcon()}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getTypeColor()}`}>
                {getTypeLabel()}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {getStatusIcon()}
                {getStatusLabel()}
              </span>
            </div>
            <h4 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
              {node.title}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {node.description}
            </p>
          </div>

          {/* Connection line for visual flow */}
          {node.children && node.children.length > 0 && (
            <div className="hidden sm:flex h-full items-center">
              <div className="h-px w-4 bg-border" />
            </div>
          )}
        </div>
      </div>
      
      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <ContentNodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ContentTab({ subject }: ContentTabProps) {
  if (subject.content.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Sin contenido generado
        </h3>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Carga tus fuentes en la pestaña &quot;Fuentes&quot; y genera el contenido automáticamente con IA.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          <span className="text-sm text-card-foreground">
            <strong>{subject.content.filter(c => c.status === 'completado').length}</strong> completados
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <span className="text-sm text-card-foreground">
            <strong>{subject.content.filter(c => c.status === 'en-progreso').length}</strong> en progreso
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-card-foreground">
            <strong>{subject.content.filter(c => c.status === 'pendiente').length}</strong> pendientes
          </span>
        </div>
      </div>

      {/* Content tree */}
      <div className="space-y-4">
        {subject.content.map((node) => (
          <ContentNodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  )
}
