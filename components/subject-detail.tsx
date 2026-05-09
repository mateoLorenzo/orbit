'use client'

import { useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/app-context'
import type { Subject, ContentNode, Source } from '@/lib/types'
import { ArrowDownToLine, ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import AppSidebar from '@/components/app-sidebar'
import ModuleLearningFlow from '@/components/module-learning-flow'

interface SubjectDetailProps {
  subject: Subject
  onBack: () => void
}

type TabType = 'clases' | 'documentacion'

function flattenContent(nodes: ContentNode[]): ContentNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenContent(n.children) : [])])
}

function getSubjectProgress(subject: Subject): number {
  const all = flattenContent(subject.content)
  if (all.length === 0) return 0
  const completed = all.filter((n) => n.status === 'completado').length
  return Math.round((completed / all.length) * 100)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function statusLabel(status: Source['status']): string {
  switch (status) {
    case 'uploading':
      return 'Subiendo'
    case 'processing':
      return 'Procesando'
    case 'ready':
      return 'Listo'
    case 'error':
      return 'Error'
  }
}

interface ClassCardProps {
  node: ContentNode
  onGenerate: () => void
  onViewDetail: () => void
}

function ClassCard({ node, onGenerate, onViewDetail }: ClassCardProps) {
  const hasChildren = (node.children?.length ?? 0) > 0

  return (
    <article className="flex h-full min-w-0 flex-1 flex-col gap-4 overflow-hidden rounded-xl bg-white p-5">
      <div className="size-12 shrink-0 rounded-lg bg-black" aria-hidden />

      <div className="flex min-h-px flex-1 flex-col gap-3">
        <h3 className="w-full text-2xl font-medium leading-none tracking-[-0.5px] text-black">
          {node.title}
        </h3>
        <p className="w-full text-base font-medium leading-none tracking-[-0.32px] text-black opacity-40">
          {node.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
      >
        {hasChildren ? 'Regenerar contenido' : 'Generar contenido'}
        <ArrowRight className="size-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onViewDetail}
        className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-black/12 px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
      >
        Ver más detalle
      </button>
    </article>
  )
}

interface DocumentationTableProps {
  sources: Source[]
  onDownload: (source: Source) => void
}

function DocumentationTable({ sources, onDownload }: DocumentationTableProps) {
  const headerCellClass =
    'flex flex-1 min-w-px items-center px-6 py-4 text-base font-medium tracking-[-0.32px] text-black opacity-40'
  const cellClass =
    'flex flex-1 min-w-px items-center px-6 py-4 text-base font-medium tracking-[-0.32px] text-black'
  const verticalDivider = (
    <div className="h-4 w-px shrink-0 bg-black/12" aria-hidden />
  )

  return (
    <div className="w-full overflow-hidden rounded-xl border border-black/12 bg-white">
      {/* Header */}
      <div className="flex items-center border-b border-[#e7e7e7] bg-black/4">
        <div className={headerCellClass}>Nombre</div>
        {verticalDivider}
        <div className={headerCellClass}>Tipo</div>
        {verticalDivider}
        <div className={headerCellClass}>Tamaño</div>
        <div className={headerCellClass}>Estado</div>
        {verticalDivider}
        <div className={headerCellClass}>Subido</div>
        {verticalDivider}
        <div className={headerCellClass}>Acciones</div>
      </div>

      {/* Rows */}
      {sources.length === 0 ? (
        <div className="px-6 py-10 text-center text-base text-black/50">
          Aún no se cargaron documentos.
        </div>
      ) : (
        sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center border-b border-[#e7e7e7] bg-white last:border-b-0"
          >
            <div className={`${cellClass} truncate`} title={source.name}>
              <span className="truncate">{source.name}</span>
            </div>
            <div className={cellClass}>{source.type === 'drive' ? 'Drive' : 'PDF'}</div>
            <div className={cellClass}>{source.size}</div>
            <div className={cellClass}>{statusLabel(source.status)}</div>
            <div className={cellClass}>{formatDate(new Date(source.uploadedAt))}</div>
            <div className="flex flex-1 min-w-px items-center px-6 py-4">
              <button
                type="button"
                onClick={() => onDownload(source)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-black/12 px-2 text-sm font-medium tracking-[-0.28px] text-black transition-colors hover:bg-black/4"
              >
                <ArrowDownToLine className="size-4" strokeWidth={2} />
                Descargar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default function SubjectDetail({ subject, onBack }: SubjectDetailProps) {
  const { generateContent, addSource } = useApp()
  const [activeTab, setActiveTab] = useState<TabType>('clases')
  const [activeModule, setActiveModule] = useState<ContentNode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const progress = useMemo(() => getSubjectProgress(subject), [subject])
  const classes = subject.content

  const onAddDocumentsClick = () => {
    fileInputRef.current?.click()
  }

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files
      .filter((f) => f.type === 'application/pdf')
      .forEach((file) => {
        const newSource: Source = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          type: 'pdf',
          size: formatFileSize(file.size),
          uploadedAt: new Date(),
          status: 'ready',
        }
        addSource(subject.id, newSource)
      })
    e.target.value = ''
  }

  const onDownloadSource = (_: Source) => {
    /* Stubbed — wire to presigned-url download once API is ready */
  }

  if (activeModule) {
    const currentIndex = classes.findIndex((c) => c.id === activeModule.id)
    const nextNode = currentIndex >= 0 ? classes[currentIndex + 1] : undefined
    return (
      <ModuleLearningFlow
        subject={subject}
        node={activeModule}
        onExit={() => setActiveModule(null)}
        onContinueNext={
          nextNode
            ? () => setActiveModule(nextNode)
            : undefined
        }
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8f8f8] text-black">
      <AppSidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-[1352px] flex-col gap-6 p-6">
          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center gap-1 self-start rounded-lg border border-black/12 px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
          >
            <ArrowLeft className="size-5" strokeWidth={2} />
            Volver
          </button>

          {/* Title */}
          <h1 className="text-[40px] font-medium leading-none tracking-[-0.5px]">
            {subject.name}
          </h1>

          {/* Materia progress card — persistent across tabs to keep layout stable */}
          <section
            aria-label="Progreso de la materia"
            className="overflow-hidden rounded-xl border border-black/8 bg-[#f8f8f8] px-5 pb-6 pt-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 text-xl font-medium leading-[1.2] tracking-[-0.32px] text-black">
              <p>Progreso de la materia</p>
              <p className="text-right opacity-50">{progress}% completo</p>
            </div>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-black/12 shadow-[0_1px_2px_2px_rgba(0,0,0,0.02)]">
              <div
                className="h-full rounded-full bg-black transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

          {/* Tabs row (with right-side action on Documentación) */}
          <div className="flex w-full items-start gap-6">
            <div className="flex flex-1 min-w-px items-start">
              <button
                type="button"
                onClick={() => setActiveTab('clases')}
                className={`flex items-center justify-center px-3 py-3 text-base font-medium tracking-[-0.32px] transition-opacity ${
                  activeTab === 'clases'
                    ? 'border-b-2 border-black text-black'
                    : 'border-b-2 border-black/24 text-black opacity-40 hover:opacity-70'
                }`}
              >
                Clases
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documentacion')}
                className={`flex items-center justify-center px-3 py-3 text-base font-medium tracking-[-0.32px] transition-opacity ${
                  activeTab === 'documentacion'
                    ? 'border-b-2 border-black text-black'
                    : 'border-b-2 border-black/24 text-black opacity-40 hover:opacity-70'
                }`}
              >
                Documentación
              </button>
            </div>

            {activeTab === 'documentacion' && (
              <button
                type="button"
                onClick={onAddDocumentsClick}
                className="inline-flex h-10 items-center gap-1 rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
              >
                <Plus className="size-5" strokeWidth={2} />
                Añadir documentos
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />

          {/* Content */}
          {activeTab === 'clases' ? (
            classes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center">
                <p className="text-base text-black/50">
                  Aún no hay clases para esta materia.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {classes.map((node) => (
                  <ClassCard
                    key={node.id}
                    node={node}
                    onGenerate={() => generateContent(subject.id)}
                    onViewDetail={() => setActiveModule(node)}
                  />
                ))}
              </div>
            )
          ) : (
            <DocumentationTable sources={subject.sources} onDownload={onDownloadSource} />
          )}
        </div>
      </main>
    </div>
  )
}
