import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../errors'
import { resetStore, store } from '../../store'
import { createMateria } from '../materias.service'
import {
  getProgressByMateria,
  getProgressSummaryByMateria,
  upsertProgressStatus,
} from '../progress.service'

describe('ProgressService', () => {
  beforeEach(() => resetStore())

  it('upsertProgressStatus creates a new Progress when missing', () => {
    const p = upsertProgressStatus('node-1', 'disponible')
    expect(p.nodoId).toBe('node-1')
    expect(p.status).toBe('disponible')
    expect(p.completedAt).toBeNull()
    expect(store.progress).toHaveLength(1)
  })

  it('upsertProgressStatus updates an existing Progress', () => {
    upsertProgressStatus('node-1', 'disponible')
    const updated = upsertProgressStatus('node-1', 'en_curso')
    expect(store.progress).toHaveLength(1)
    expect(updated.status).toBe('en_curso')
    expect(updated.completedAt).toBeNull()
  })

  it("upsertProgressStatus sets completedAt when status becomes 'dominado'", () => {
    const p = upsertProgressStatus('node-1', 'dominado')
    expect(p.status).toBe('dominado')
    expect(p.completedAt).not.toBeNull()
  })

  it("upsertProgressStatus clears completedAt when leaving 'dominado'", () => {
    upsertProgressStatus('node-1', 'dominado')
    const p = upsertProgressStatus('node-1', 'en_curso')
    expect(p.completedAt).toBeNull()
  })

  it('upsertProgressStatus rejects invalid status', () => {
    expect(() => upsertProgressStatus('node-1', 'foo' as never)).toThrow()
  })

  it('getProgressByMateria validates materia exists and returns all progress', () => {
    const m = createMateria({ nombre: 'A' })
    upsertProgressStatus('node-1', 'dominado')
    upsertProgressStatus('node-2', 'disponible')
    const list = getProgressByMateria(m.id)
    expect(list).toHaveLength(2)
  })

  it('getProgressByMateria throws 404 when materia missing', () => {
    expect(() => getProgressByMateria('nope')).toThrow(ApiError)
  })

  it('getProgressSummaryByMateria returns counts and percent', () => {
    const m = createMateria({ nombre: 'A' })
    upsertProgressStatus('n1', 'dominado')
    upsertProgressStatus('n2', 'dominado')
    upsertProgressStatus('n3', 'en_curso')
    upsertProgressStatus('n4', 'disponible')
    const summary = getProgressSummaryByMateria(m.id)
    expect(summary).toEqual({
      total: 4,
      dominado: 2,
      enCurso: 1,
      disponible: 1,
      bloqueado: 0,
      percentDominado: 50,
    })
  })

  it('getProgressSummaryByMateria returns 0% with no progress entries', () => {
    const m = createMateria({ nombre: 'A' })
    const summary = getProgressSummaryByMateria(m.id)
    expect(summary.total).toBe(0)
    expect(summary.percentDominado).toBe(0)
  })
})
