import { randomUUID } from 'node:crypto'
import {
  ProgressStatusSchema,
  type Progress,
  type ProgressStatus,
} from '../schemas'
import { store } from '../store'
import { getMateria } from './materias.service'

export interface ProgressSummary {
  total: number
  dominado: number
  enCurso: number
  disponible: number
  bloqueado: number
  percentDominado: number
}

export function upsertProgressStatus(nodoId: string, status: ProgressStatus): Progress {
  const validStatus = ProgressStatusSchema.parse(status)
  const completedAt = validStatus === 'dominado' ? new Date().toISOString() : null
  const existing = store.progress.find((p) => p.nodoId === nodoId)
  if (existing) {
    existing.status = validStatus
    existing.completedAt = completedAt
    return existing
  }
  const created: Progress = {
    id: randomUUID(),
    nodoId,
    status: validStatus,
    completedAt,
  }
  store.progress.push(created)
  return created
}

export function getProgressByMateria(materiaId: string): Progress[] {
  getMateria(materiaId)
  // TODO bloque 2: filtrar por nodos pertenecientes a esta materia.
  return [...store.progress]
}

export function getProgressSummaryByMateria(materiaId: string): ProgressSummary {
  const list = getProgressByMateria(materiaId)
  const counts = {
    total: list.length,
    dominado: list.filter((p) => p.status === 'dominado').length,
    enCurso: list.filter((p) => p.status === 'en_curso').length,
    disponible: list.filter((p) => p.status === 'disponible').length,
    bloqueado: list.filter((p) => p.status === 'bloqueado').length,
  }
  const percentDominado =
    counts.total === 0 ? 0 : Math.round((counts.dominado / counts.total) * 100)
  return { ...counts, percentDominado }
}
