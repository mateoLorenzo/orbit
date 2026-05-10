'use client'

import { useRef, useState } from 'react'
import { useCreateSubject } from '@/lib/hooks/use-subjects'
import { subjectIcons, SubjectIcon } from '@/lib/subject-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Upload, X } from 'lucide-react'

interface AddSubjectModalProps {
  isOpen: boolean
  onClose: () => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
}

export default function AddSubjectModal({ isOpen, onClose }: AddSubjectModalProps) {
  const createMutation = useCreateSubject()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(subjectIcons[0])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const resetForm = () => {
    setName('')
    setDescription('')
    setSelectedIcon(subjectIcons[0])
    setFiles([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          resetForm()
          onClose()
        },
      },
    )
  }

  const addFiles = (filelist: FileList | File[]) => {
    const incoming = Array.from(filelist).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: f.name,
      size: f.size,
    }))
    setFiles((prev) => [...prev, ...incoming])
  }

  const handleAttachClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const dropzoneBorder = isDragging
    ? 'border-2 border-dashed border-[#FF5C00] bg-[#FF5C00]/4'
    : 'border border-black/8'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="Cerrar modal"
        className="absolute inset-0 cursor-pointer bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 pt-6">
          <h2 className="text-xl font-semibold text-card-foreground">
            Nueva Materia
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
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

            {/* File upload */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Archivos
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`overflow-hidden rounded-xl bg-white transition-[border-color,background-color] ${dropzoneBorder}`}
              >
                {files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-8">
                    <DocumentsIcon />
                    <div className="flex flex-col items-center gap-1 text-center">
                      <p className="text-sm font-semibold tracking-[-0.32px] text-black">
                        Suelta o carga tus archivos
                      </p>
                      <p className="text-xs text-black/40">
                        PDF, JPG o PNG
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAttachClick}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/12 bg-white px-3 text-sm font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
                    >
                      <Upload className="size-3.5" strokeWidth={2.5} />
                      Adjuntar archivos
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-3">
                    <ul className="flex flex-col">
                      {files.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center gap-3 rounded-lg px-2 py-2"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/4">
                            <FileText
                              className="size-4 text-black/55"
                              strokeWidth={1.6}
                            />
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p
                              className="truncate text-sm font-semibold leading-tight tracking-[-0.32px] text-black"
                              title={f.name}
                            >
                              {f.name}
                            </p>
                            <p className="text-xs text-black/40">
                              {formatBytes(f.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(f.id)}
                            aria-label={`Quitar ${f.name}`}
                            className="flex size-8 items-center justify-center rounded-lg border border-black/8 bg-white text-black/50 transition-colors hover:border-black/20 hover:text-black"
                          >
                            <X className="size-3.5" strokeWidth={2.5} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={handleAttachClick}
                      className="inline-flex h-9 items-center gap-2 self-center rounded-lg border border-black/12 bg-white px-3 text-sm font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
                    >
                      <Upload className="size-3.5" strokeWidth={2.5} />
                      Adjuntar más
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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

function DocumentsIcon() {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className="size-14"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="rotate(-10 32 42)">
        <rect
          x="14"
          y="18"
          width="34"
          height="44"
          rx="3"
          fill="#E8E8E8"
          stroke="#D8D8D8"
        />
        <line x1="20" y1="28" x2="40" y2="28" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="20" y1="34" x2="40" y2="34" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="20" y1="40" x2="36" y2="40" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="20" y1="46" x2="40" y2="46" stroke="#C8C8C8" strokeWidth="1.6" />
      </g>
      <g transform="rotate(8 48 42)">
        <rect
          x="36"
          y="20"
          width="34"
          height="44"
          rx="3"
          fill="#F2F2F2"
          stroke="#D8D8D8"
        />
        <line x1="42" y1="30" x2="62" y2="30" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="42" y1="36" x2="62" y2="36" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="42" y1="42" x2="58" y2="42" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="42" y1="48" x2="62" y2="48" stroke="#C8C8C8" strokeWidth="1.6" />
      </g>
    </svg>
  )
}
