import type { Subject as UISubject, Source as UISource } from '@/lib/types'
import type { Subject as DBSubject, FileRow } from '@/lib/db/schema'

const COLORS = [
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-green-600',
  'from-purple-500 to-fuchsia-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-violet-600',
] as const

const ICONS = ['palette', 'book', 'atom', 'flask', 'globe', 'music'] as const

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function mapSubjectRow(row: DBSubject): UISubject {
  const h = hash(row.id)
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    color: COLORS[h % COLORS.length],
    icon: ICONS[h % ICONS.length],
    createdAt: row.createdAt,
    sources: [],
    content: [],
  }
}

const STATUS_MAP = {
  pending: 'uploading',
  processing: 'processing',
  processed: 'ready',
  failed: 'error',
} as const satisfies Record<FileRow['status'], UISource['status']>

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function mapFileRow(row: FileRow): UISource {
  return {
    id: row.id,
    name: row.originalFilename,
    type: 'pdf',
    size: formatSize(row.sizeBytes),
    uploadedAt: row.createdAt,
    status: STATUS_MAP[row.status],
  }
}
