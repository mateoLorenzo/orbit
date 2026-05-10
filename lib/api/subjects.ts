import { api } from './client'
import type { Subject as DBSubject } from '@/lib/db/schema'

export interface NodeWithProgress {
  id: string
  slug: string
  pathId: string
  title: string
  contentBrief: string
  progressStatus: 'locked' | 'available' | 'in_progress' | 'mastered'
}

export const listSubjects = () => api<{ subjects: DBSubject[] }>('/api/subjects')
export const getSubject = (slug: string) => api<{ subject: DBSubject }>(`/api/subjects/${slug}`)
export const createSubject = (input: { name: string; description?: string }) =>
  api<{ subject: DBSubject }>('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
export const listNodes = (subjectSlug: string) =>
  api<{ nodes: NodeWithProgress[] }>(`/api/subjects/${subjectSlug}/nodes`)
