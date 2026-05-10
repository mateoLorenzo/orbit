import type { ContentNode } from '@/lib/types'
import { HISTORIA_LESSONS } from './historia/lessons'

export const DEMO_SUBJECT_SLUG = 'historia-procesos-independencia'

export function isDemoSubject(s: { slug?: string } | null | undefined): boolean {
  return !!s && s.slug === DEMO_SUBJECT_SLUG
}

export function getDemoLessons(): ContentNode[] {
  return HISTORIA_LESSONS
}

export function getDemoNode(nodeId: string): ContentNode | null {
  return HISTORIA_LESSONS.find((n) => n.id === nodeId) ?? null
}
