import type { ContentNode, Subject } from '@/lib/types'

export interface ModuleLearningFlowProps {
  subject: Subject
  node: ContentNode
  onExit: () => void
  onContinueNext?: () => void
}

export interface ContentStep {
  kind: 'content'
  image: string
  video?: string
  videoLoop?: boolean
  paragraphs: string[]
}

export interface QuizStep {
  kind: 'quiz'
  question: string
  options: string[]
  correctIndex: number
}

export interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  historicalImpact: string
}

export interface TimelineStep {
  kind: 'timeline'
  topic: string
  title: string
  subtitle: string
  intro: string
  events: TimelineEvent[]
}

export type Step =
  | { kind: 'intro' }
  | ContentStep
  | QuizStep
  | TimelineStep
  | { kind: 'done' }

export interface NarratedLine {
  text: string
  startSeconds: number
}

export interface LessonNarration {
  audioSrc: string
  generatingDelayMs?: number
  lines: NarratedLine[][]
}
