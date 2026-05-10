import type { ContentNode, Subject } from '@/lib/types'
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

// Synthetic Subject for the demo so demo pages can render synchronously
// without waiting for the network roundtrip that fetches subject metadata.
export function getDemoSubject(): Subject {
  return {
    id: 'demo-historia-procesos-independencia',
    slug: DEMO_SUBJECT_SLUG,
    name: 'Historia de los Procesos de Independencia Latinoamericana',
    description: 'Procesos políticos y militares de la independencia latinoamericana',
    color: 'from-amber-500 to-orange-600',
    icon: 'palette',
    createdAt: new Date('2024-01-15'),
    sources: [],
    content: HISTORIA_LESSONS,
  }
}
