import { api } from './client'

export interface NodeAssets {
  status: 'partial' | 'ready'
  lesson: {
    paragraphs: string[]
    quiz: Array<{ question: string; options: string[] }>
  } | null
  image: { url: string } | null
  audio: { url: string; durationSec: number } | null
  podcast: { url: string; durationSec: number } | null
  video: { url: string; durationSec: number } | null
}

export interface QuizResult {
  passed: boolean
  score: { correct: number; total: number }
  perQuestion: Array<{ correct: number; selected: number }>
}

export const getNodeAssets = (nodeId: string) =>
  api<NodeAssets>(`/api/nodes/${nodeId}/assets`)

export const submitQuiz = (nodeId: string, answers: number[]) =>
  api<QuizResult>(`/api/nodes/${nodeId}/quiz`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
