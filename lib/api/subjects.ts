import { api } from './client'
import type { Subject as DBSubject } from '@/lib/db/schema'

export interface NodeWithProgress {
  id: string
  pathId: string
  title: string
  contentBrief: string
  progressStatus: 'locked' | 'available' | 'in_progress' | 'mastered'
}

export const listSubjects = () => api<{ subjects: DBSubject[] }>('/api/subjects')
export const getSubject = (id: string) => api<{ subject: DBSubject }>(`/api/subjects/${id}`)
export const createSubject = (input: { name: string; description?: string }) =>
  api<{ subject: DBSubject }>('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
export const listNodes = (subjectId: string) =>
  api<{ nodes: NodeWithProgress[] }>(`/api/subjects/${subjectId}/nodes`)
