import { describe, expect, it } from 'vitest'
import { mapSubjectRow, mapFileRow } from '../adapters'

describe('mapSubjectRow', () => {
  it('maps a DB row to UI Subject with deterministic color/icon', () => {
    const row = {
      id: 'a-uuid',
      userId: 'u',
      name: 'Historia',
      description: 'desc',
      lastUploadAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    }
    const ui = mapSubjectRow(row)
    expect(ui.id).toBe('a-uuid')
    expect(ui.name).toBe('Historia')
    expect(ui.description).toBe('desc')
    expect(ui.color).toMatch(/^from-/)
    expect(ui.icon).toBeTypeOf('string')
    expect(ui.sources).toEqual([])
    expect(ui.content).toEqual([])
  })

  it('handles null description', () => {
    const row = { id: 'x', userId: 'u', name: 'X', description: null, lastUploadAt: null,
                  createdAt: new Date(), updatedAt: new Date() }
    const ui = mapSubjectRow(row)
    expect(ui.description).toBe('')
  })
})

describe('mapFileRow', () => {
  it('maps DB status to UI status label', () => {
    const base = {
      id: 'f1', subjectId: 's1', userId: 'u', s3Key: 'k', originalFilename: 'x.pdf',
      mimeType: 'application/pdf', fileType: 'pdf' as const, sizeBytes: 1024,
      errorMessage: null, summary: null, keywords: null, processedAt: null, createdAt: new Date(),
    }
    expect(mapFileRow({ ...base, status: 'pending' }).status).toBe('uploading')
    expect(mapFileRow({ ...base, status: 'processing' }).status).toBe('processing')
    expect(mapFileRow({ ...base, status: 'processed' }).status).toBe('ready')
    expect(mapFileRow({ ...base, status: 'failed' }).status).toBe('error')
  })
})
