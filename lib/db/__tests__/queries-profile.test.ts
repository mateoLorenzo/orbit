import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  schema: {
    profiles: { userId: 'profiles.userId' },
    formatoPreferido: { enumValues: ['texto', 'audio', 'video', 'visual', 'podcast'] },
  },
}))

import { getProfile, updateProfile } from '../queries'
import * as clientModule from '../client'

const mockDb = clientModule.db

const seed = {
  userId: 'demo',
  formatoPreferido: 'texto',
  horariosActivos: [],
  erroresRecurrentes: [],
  friccionPromedio: 50,
  updatedAt: new Date(),
}

describe('profile queries', () => {
  beforeEach(() => {
    mockDb.select.mockReset()
    mockDb.insert.mockReset()
    mockDb.update.mockReset()
  })

  it('getProfile returns the existing row', async () => {
    const limit = vi.fn().mockResolvedValue([seed])
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    mockDb.select.mockReturnValue({ from })

    const out = await getProfile()
    expect(out).toEqual(seed)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('getProfile auto-seeds when missing', async () => {
    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    mockDb.select.mockReturnValue({ from })

    const returning = vi.fn().mockResolvedValue([seed])
    const values = vi.fn(() => ({ returning }))
    mockDb.insert.mockReturnValue({ values })

    const out = await getProfile()
    expect(out).toEqual(seed)
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('updateProfile merges fields and returns the updated row', async () => {
    const limit = vi.fn().mockResolvedValue([seed])
    const where1 = vi.fn(() => ({ limit }))
    const from1 = vi.fn(() => ({ where: where1 }))
    mockDb.select.mockReturnValue({ from: from1 })

    const returning = vi.fn().mockResolvedValue([{ ...seed, formatoPreferido: 'audio' }])
    const where2 = vi.fn(() => ({ returning }))
    const set = vi.fn(() => ({ where: where2 }))
    mockDb.update.mockReturnValue({ set })

    const out = await updateProfile({ formatoPreferido: 'audio' })
    expect(out.formatoPreferido).toBe('audio')
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ formatoPreferido: 'audio', updatedAt: expect.any(Date) }),
    )
  })
})
