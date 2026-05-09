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
  paragraphs: string[]
}

export interface QuizStep {
  kind: 'quiz'
  question: string
  options: string[]
  correctIndex: number
}

export type Step = { kind: 'intro' } | ContentStep | QuizStep | { kind: 'done' }

export interface NarratedLine {
  text: string
  startSeconds: number
}

export interface LessonNarration {
  audioSrc: string
  generatingDelayMs?: number
  lines: NarratedLine[][]
}
