'use client'

import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  LockKeyhole,
  Plus,
} from 'lucide-react'
import AppSidebar from '@/components/app-sidebar'
import { useFiles, useUploadFile, useDeleteFile } from '@/lib/hooks/use-files'
import { useNodes } from '@/lib/hooks/use-nodes'
import { mapFileRow } from '@/lib/domain/adapters'
import type { ContentNode, Source, Subject } from '@/lib/types'

type TabType = 'clases' | 'documentacion'
type CardState = 'completed' | 'active' | 'locked'

const PAGE_SIZE = 4
const ESTIMATED_LESSON_MINUTES = 15

function flattenContent(nodes: ContentNode[]): ContentNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenContent(n.children) : [])])
}

function getSubjectProgress(subject: Subject): number {
  const all = flattenContent(subject.content)
  if (all.length === 0) return 0
  const completed = all.filter((n) => n.status === 'completado').length
  return Math.round((completed / all.length) * 100)
}

function getSubjectProgressFromLessons(lessons: ContentNode[]): number {
  if (lessons.length === 0) return 0
  const completed = lessons.filter((n) => n.status === 'completado').length
  return Math.round((completed / lessons.length) * 100)
}

function getCardStates(content: ContentNode[]): CardState[] {
  const states: CardState[] = []
  let activeAssigned = false
  for (const node of content) {
    if (node.status === 'completado') {
      states.push('completed')
      continue
    }
    if (!activeAssigned) {
      states.push('active')
      activeAssigned = true
      continue
    }
    states.push('locked')
  }
  return states
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

function nodeToContentNode(
  n: { id: string; title: string; contentBrief: string; progressStatus: 'locked' | 'available' | 'in_progress' | 'mastered' },
  index: number,
): ContentNode {
  const statusMap = {
    locked: 'pendiente',
    available: 'pendiente',
    in_progress: 'en-progreso',
    mastered: 'completado',
  } as const
  return {
    id: n.id,
    title: n.title,
    description: n.contentBrief,
    type: 'clase',
    status: statusMap[n.progressStatus],
    order: index + 1,
  }
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

const numberBadgeClass =
  'flex size-12 shrink-0 items-center justify-center rounded-lg border border-black/8 text-2xl font-medium leading-none tracking-[-0.5px] text-black'

const durationPillClass =
  'inline-flex items-center justify-center gap-1 rounded-full border border-black/8 px-2 py-1.5 text-sm font-medium tracking-[-0.28px]'

interface LessonCardProps {
  index: number
  node: ContentNode
  onStart: () => void
}

function CompletedLessonCard({ index, node }: Omit<LessonCardProps, 'onStart'>) {
  return (
    <article className="relative flex h-[431px] min-w-0 flex-col gap-4 overflow-hidden rounded-xl bg-white p-5">
      <div className="flex w-full items-start justify-between">
        <div className={numberBadgeClass}>{index + 1}</div>
        <div className="inline-flex items-center justify-center gap-1 rounded-full bg-[#17a758]/12 px-2 py-1 text-sm font-medium tracking-[-0.28px] text-[#17a758]">
          <Check className="size-4" strokeWidth={2.5} />
          Completada
        </div>
      </div>

      <div className="flex min-h-px flex-1 flex-col gap-3">
        <h3 className="text-2xl font-medium leading-none tracking-[-0.5px] text-black">
          {node.title}
        </h3>
        <p className="text-base font-medium leading-none tracking-[-0.32px] text-black/40">
          {node.description}
        </p>
      </div>

      <div className={`${durationPillClass} self-start text-black/60`}>
        <Clock3 className="size-3.5 opacity-60" strokeWidth={2} />
        {ESTIMATED_LESSON_MINUTES} min
      </div>

      <div className="relative -mx-5 -mb-5 px-5 pb-5">
        <div className="flex gap-3 overflow-hidden">
          <div className="relative h-40 w-[124px] shrink-0 overflow-hidden rounded-lg bg-black/5">
            <Image
              src="/learning-portrait.png"
              alt=""
              fill
              sizes="124px"
              className="object-cover"
            />
          </div>
          <div className="relative h-40 w-[124px] shrink-0 overflow-hidden rounded-lg bg-black/5">
            <Image
              src="/learning-landscape.png"
              alt=""
              fill
              sizes="124px"
              className="object-cover"
            />
          </div>
          <div className="relative h-40 w-[124px] shrink-0 overflow-hidden rounded-lg bg-black/5">
            <Image
              src="/learning-portrait.png"
              alt=""
              fill
              sizes="124px"
              className="object-cover"
            />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-12"
          style={{ background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))' }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-12"
          style={{ background: 'linear-gradient(to left, #fff, rgba(255,255,255,0))' }}
        />
      </div>
    </article>
  )
}

function ActiveLessonCard({ index, node, onStart }: LessonCardProps) {
  return (
    <article className="group relative flex h-[431px] min-w-0 flex-col gap-4 overflow-hidden rounded-xl bg-black p-5 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[272px] size-[478px] -translate-x-1/2 rounded-full bg-[#ea580c] transition-[top] duration-300 ease-out group-hover:top-[252px]"
        style={{ filter: 'blur(126.8px)' }}
      />
      <div className="relative flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-2xl font-medium leading-none tracking-[-0.5px] text-black">
        {index + 1}
      </div>

      <div className="relative flex min-h-px flex-1 flex-col gap-3">
        <h3 className="text-2xl font-medium leading-none tracking-[-0.5px] text-white">
          {node.title}
        </h3>
        <p className="text-base font-medium leading-[1.2] tracking-[-0.32px] text-white/60">
          {node.description}
        </p>
      </div>

      <div className="relative inline-flex items-center justify-center gap-1 self-start rounded-full border border-white/10 px-2 py-1.5 text-sm font-medium tracking-[-0.28px] text-white/60">
        <Clock3 className="size-3.5 opacity-60" strokeWidth={2} />
        {ESTIMATED_LESSON_MINUTES} min
      </div>

      <button
        type="button"
        onClick={onStart}
        className="relative inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-white px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-white/90"
      >
        Comenzar clase
        <ArrowRight className="size-5" strokeWidth={2} />
      </button>
    </article>
  )
}

function LockedLessonCard({ index, node }: Omit<LessonCardProps, 'onStart'>) {
  return (
    <article className="flex h-[431px] min-w-0 flex-col gap-4 overflow-hidden rounded-xl bg-white p-5 opacity-50">
      <div className={numberBadgeClass}>{index + 1}</div>

      <div className="flex min-h-px flex-1 flex-col gap-3">
        <h3 className="text-2xl font-medium leading-none tracking-[-0.5px] text-black">
          {node.title}
        </h3>
        <p className="text-base font-medium leading-none tracking-[-0.32px] text-black/40">
          {node.description}
        </p>
      </div>

      <div className={`${durationPillClass} self-start text-black/60`}>
        <Clock3 className="size-3.5 opacity-60" strokeWidth={2} />
        {ESTIMATED_LESSON_MINUTES} min
      </div>

      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="h-px w-full bg-black/8" aria-hidden />
        <p className="text-center text-sm font-medium tracking-[-0.28px] text-black/40">
          Completá la clase anterior para avanzar
        </p>
        <button
          type="button"
          disabled
          className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-[#eaeaea] px-3 text-base font-medium tracking-[-0.32px] text-black/30"
        >
          <LockKeyhole className="size-5" strokeWidth={2} />
          No disponible
        </button>
      </div>
    </article>
  )
}

interface DocumentationTableProps {
  sources: Source[]
  onDownload: (source: Source) => void
  onDelete: (source: Source) => void
  isLoading?: boolean
}

function DocumentationTable({ sources, onDownload, onDelete, isLoading }: DocumentationTableProps) {
  const headerCellClass =
    'flex flex-1 min-w-px items-center px-6 py-4 text-base font-medium tracking-[-0.32px] text-black opacity-40'
  const cellClass =
    'flex flex-1 min-w-px items-center px-6 py-4 text-base font-medium tracking-[-0.32px] text-black'
  const verticalDivider = (
    <div className="h-4 w-px shrink-0 bg-black/12" aria-hidden />
  )

  return (
    <div className="w-full overflow-hidden rounded-xl border border-black/12 bg-white">
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

      {isLoading ? (
        <div className="px-6 py-10 text-center text-base text-black/50">
          Cargando documentos...
        </div>
      ) : sources.length === 0 ? (
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
            <div className="flex flex-1 min-w-px items-center gap-2 px-6 py-4">
              <button
                type="button"
                onClick={() => onDownload(source)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-black/12 px-2 text-sm font-medium tracking-[-0.28px] text-black transition-colors hover:bg-black/4"
              >
                <ArrowDownToLine className="size-4" strokeWidth={2} />
                Descargar
              </button>
              <button
                type="button"
                onClick={() => onDelete(source)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-300 px-2 text-sm font-medium tracking-[-0.28px] text-red-600 transition-colors hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

interface SubjectDetailViewProps {
  subject: Subject
}

export default function SubjectDetailView({ subject }: SubjectDetailViewProps) {
  const router = useRouter()
  const filesQuery = useFiles(subject.id)
  const uploadMutation = useUploadFile(subject.id)
  const deleteMutation = useDeleteFile(subject.id)
  const sources = (filesQuery.data ?? []).map(mapFileRow)
  const [activeTab, setActiveTab] = useState<TabType>('clases')
  const [page, setPage] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nodesQuery = useNodes(subject.id)
  const lessons: ContentNode[] = useMemo(
    () => (nodesQuery.data ?? []).map((n, i) => nodeToContentNode(n, i)),
    [nodesQuery.data],
  )
  const progress = useMemo(() => getSubjectProgressFromLessons(lessons), [lessons])
  const cardStates = useMemo(() => getCardStates(lessons), [lessons])

  const totalPages = Math.max(1, Math.ceil(lessons.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const startIndex = safePage * PAGE_SIZE
  const visibleClasses = lessons.slice(startIndex, startIndex + PAGE_SIZE)
  const visibleStates = cardStates.slice(startIndex, startIndex + PAGE_SIZE)

  const onAddDocumentsClick = () => {
    fileInputRef.current?.click()
  }

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const accepted = files.filter((f) =>
      f.type === 'application/pdf' ||
      f.type === 'application/msword' ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      f.type.startsWith('image/'),
    )
    for (const file of accepted) {
      uploadMutation.mutate(file)
    }
    e.target.value = ''
  }

  const onDownloadSource = (_: Source) => {
    /* Wire to presigned-url download once API is ready */
  }

  const onStartLesson = (node: ContentNode) => {
    router.push(`/subjects/${subject.id}/lessons/${node.id}`)
  }

  return (
    <div className="flex min-h-screen bg-[#f8f8f8] text-black">
      <AppSidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-[1352px] flex-col gap-6 p-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex h-10 items-center gap-1 self-start rounded-lg border border-black/12 px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
          >
            <ArrowLeft className="size-5" strokeWidth={2} />
            Volver
          </button>

          <h1 className="text-[40px] font-medium leading-none tracking-[-0.5px]">
            {subject.name}
          </h1>

          <section
            aria-label="Progreso de la materia"
            className="overflow-hidden rounded-xl border border-black/8 bg-[#f8f8f8] px-5 pb-6 pt-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 text-xl font-medium leading-[1.2] tracking-[-0.32px] text-black">
              <p>Progreso de la materia</p>
              <p className="text-right text-base opacity-50">{progress}% completo</p>
            </div>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-black/12 shadow-[0_1px_2px_2px_rgba(0,0,0,0.02)]">
              <div
                className="h-full rounded-full bg-black transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

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

          {activeTab === 'clases' ? (
            nodesQuery.isLoading ? (
              <div className="px-6 py-10 text-center text-base text-black/50">
                Cargando lecciones...
              </div>
            ) : lessons.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <p className="text-base font-medium tracking-[-0.32px] text-black">
                  Estamos generando las lecciones a partir de tus PDFs.
                </p>
                <p className="text-sm text-black/50">
                  Esto suele tomar 1-3 minutos. Esta página se va a actualizar sola.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleClasses.map((node, i) => {
                    const state = visibleStates[i]
                    const absoluteIndex = startIndex + i
                    if (state === 'completed') {
                      return (
                        <CompletedLessonCard
                          key={node.id}
                          index={absoluteIndex}
                          node={node}
                        />
                      )
                    }
                    if (state === 'active') {
                      return (
                        <ActiveLessonCard
                          key={node.id}
                          index={absoluteIndex}
                          node={node}
                          onStart={() => onStartLesson(node)}
                        />
                      )
                    }
                    return (
                      <LockedLessonCard
                        key={node.id}
                        index={absoluteIndex}
                        node={node}
                      />
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-start justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      aria-label="Página anterior"
                      className="flex size-10 items-center justify-center rounded-lg border border-black/12 text-black transition-colors hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft className="size-5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={safePage >= totalPages - 1}
                      aria-label="Página siguiente"
                      className="flex size-10 items-center justify-center rounded-lg border border-black/12 text-black transition-colors hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowRight className="size-5" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </>
            )
          ) : (
            <DocumentationTable
              sources={sources}
              onDownload={onDownloadSource}
              onDelete={(source) => deleteMutation.mutate(source.id)}
              isLoading={filesQuery.isLoading}
            />
          )}
        </div>
      </main>
    </div>
  )
}
