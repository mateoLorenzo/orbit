'use client'

import { useState } from 'react'
import { useCreateSubject } from '@/lib/hooks/use-subjects'
import { subjectIcons, SubjectIcon } from '@/lib/subject-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface AddSubjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddSubjectModal({ isOpen, onClose }: AddSubjectModalProps) {
  const createMutation = useCreateSubject()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(subjectIcons[0])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
          setSelectedIcon(subjectIcons[0])
          onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="Cerrar modal"
        className="absolute inset-0 cursor-pointer bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-xl font-semibold text-card-foreground">
          Nueva Materia
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Icon selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Icono
            </label>
            <div className="flex flex-wrap gap-2">
              {subjectIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                    selectedIcon === icon
                      ? 'bg-primary/20 text-primary ring-2 ring-primary'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  <SubjectIcon name={icon} className="size-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Nombre de la materia
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Matemáticas, Física, Historia..."
              className="bg-input"
              autoFocus
            />
          </div>

          {/* Description input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Descripción
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del contenido..."
              className="bg-input"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear materia'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
