import type { ContentNode } from '@/lib/types'
import { HISTORIA_LESSONS } from './historia/lessons'

const DEMO_SUBJECT_ID = process.env.NEXT_PUBLIC_DEMO_SUBJECT_ID

export function isDemoSubject(s: { id: string } | null | undefined): boolean {
  return !!s && !!DEMO_SUBJECT_ID && s.id === DEMO_SUBJECT_ID
}

export function getDemoLessons(): ContentNode[] {
  return HISTORIA_LESSONS
}

export function getDemoNode(nodeId: string): ContentNode | null {
  return HISTORIA_LESSONS.find((n) => n.id === nodeId) ?? null
}
