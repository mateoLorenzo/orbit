import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  schema: {
    progress: {
      userId: 'progress.userId',
      nodeId: 'progress.nodeId',
      id: 'progress.id',
      status: 'progress.status',
      completedAt: 'progress.completedAt',
      updatedAt: 'progress.updatedAt',
    },
    nodes: { id: 'nodes.id', subjectId: 'nodes.subjectId' },
    progressStatus: { enumValues: ['bloqueado', 'disponible', 'en_curso', 'dominado'] },
  },
}))

import {
  listProgressForSubject,
  summarizeProgressForSubject,
  upsertNodeProgress,
} from '../queries'
import * as clientModule from '../client'

const mockDb = clientModule.db

describe('progress queries', () => {
  beforeEach(() => {
    mockDb.select.mockReset()
    mockDb.insert.mockReset()
    mockDb.update.mockReset()
  })

  it('listProgressForSubject builds a join + filter query and returns rows', async () => {
    const rows = [{ id: 'p1', nodeId: 'n1', status: 'dominado', completedAt: new Date(), updatedAt: new Date() }]
    const where = vi.fn().mockResolvedValue(rows)
    const innerJoin = vi.fn(() => ({ where }))
    const from = vi.fn(() => ({ innerJoin }))
    mockDb.select.mockReturnValue({ from })

    const out = await listProgressForSubject('subject-1')
    expect(out).toEqual(rows)
    expect(mockDb.select).toHaveBeenCalled()
    expect(from).toHaveBeenCalled()
    expect(innerJoin).toHaveBeenCalled()
  })

  it('summarizeProgressForSubject computes counts and percent', async () => {
    const rows = [
      { id: '1', nodeId: 'n1', status: 'dominado', completedAt: null, updatedAt: new Date() },
      { id: '2', nodeId: 'n2', status: 'dominado', completedAt: null, updatedAt: new Date() },
      { id: '3', nodeId: 'n3', status: 'en_curso', completedAt: null, updatedAt: new Date() },
      { id: '4', nodeId: 'n4', status: 'disponible', completedAt: null, updatedAt: new Date() },
    ]
    const where = vi.fn().mockResolvedValue(rows)
    const innerJoin = vi.fn(() => ({ where }))
    const from = vi.fn(() => ({ innerJoin }))
    mockDb.select.mockReturnValue({ from })

    const summary = await summarizeProgressForSubject('subject-1')
    expect(summary).toEqual({
      total: 4,
      dominado: 2,
      enCurso: 1,
      disponible: 1,
      bloqueado: 0,
      percentDominado: 50,
    })
  })

  it('summarizeProgressForSubject returns 0% when no rows', async () => {
    const where = vi.fn().mockResolvedValue([])
    const innerJoin = vi.fn(() => ({ where }))
    const from = vi.fn(() => ({ innerJoin }))
    mockDb.select.mockReturnValue({ from })

    const summary = await summarizeProgressForSubject('subject-1')
    expect(summary.total).toBe(0)
    expect(summary.percentDominado).toBe(0)
  })

  it("upsertNodeProgress sets completedAt when status is 'dominado'", async () => {
    const returning = vi.fn().mockResolvedValue([
      { id: 'p1', userId: 'demo', nodeId: 'n1', status: 'dominado', completedAt: new Date(), updatedAt: new Date() },
    ])
    const onConflictDoUpdate = vi.fn(() => ({ returning }))
    const values = vi.fn(() => ({ onConflictDoUpdate }))
    mockDb.insert.mockReturnValue({ values })

    const out = await upsertNodeProgress('n1', 'dominado')
    expect(out.status).toBe('dominado')
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'n1', status: 'dominado', completedAt: expect.any(Date) }),
    )
  })

  it("upsertNodeProgress nulls completedAt when leaving 'dominado'", async () => {
    const returning = vi.fn().mockResolvedValue([
      { id: 'p1', userId: 'demo', nodeId: 'n1', status: 'en_curso', completedAt: null, updatedAt: new Date() },
    ])
    const onConflictDoUpdate = vi.fn(() => ({ returning }))
    const values = vi.fn(() => ({ onConflictDoUpdate }))
    mockDb.insert.mockReturnValue({ values })

    await upsertNodeProgress('n1', 'en_curso')
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'n1', status: 'en_curso', completedAt: null }),
    )
  })
})
