import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../errors'
import { resetStore, store } from '../../store'
import { createMateria } from '../materias.service'
import {
  createFile,
  deleteFile,
  listFilesByMateria,
} from '../dataroom.service'

describe('DataRoomService', () => {
  beforeEach(() => resetStore())

  it('createFile attaches metadata to the materia', () => {
    const m = createMateria({ nombre: 'A' })
    const f = createFile(m.id, {
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
      size: 1234,
    })
    expect(f.materiaId).toBe(m.id)
    expect(f.fileName).toBe('doc.pdf')
    expect(f.fileType).toBe('application/pdf')
    expect(f.size).toBe(1234)
    expect(f.filePath).toBe(`mock://${m.id}/doc.pdf`)
    expect(typeof f.uploadedAt).toBe('string')
    expect(store.files).toHaveLength(1)
  })

  it('createFile throws 404 if materia missing', () => {
    expect(() =>
      createFile('nope', { fileName: 'a', fileType: 'application/pdf', size: 1 }),
    ).toThrow(ApiError)
  })

  it('createFile rejects empty fileName', () => {
    const m = createMateria({ nombre: 'A' })
    expect(() =>
      createFile(m.id, { fileName: '', fileType: 'application/pdf', size: 1 }),
    ).toThrow()
  })

  it('listFilesByMateria returns only matching files', () => {
    const m1 = createMateria({ nombre: 'A' })
    const m2 = createMateria({ nombre: 'B' })
    createFile(m1.id, { fileName: 'x.pdf', fileType: 'application/pdf', size: 1 })
    createFile(m2.id, { fileName: 'y.pdf', fileType: 'application/pdf', size: 1 })
    const list = listFilesByMateria(m1.id)
    expect(list).toHaveLength(1)
    expect(list[0].fileName).toBe('x.pdf')
  })

  it('listFilesByMateria throws 404 if materia missing', () => {
    expect(() => listFilesByMateria('nope')).toThrow(ApiError)
  })

  it('deleteFile removes the file by id', () => {
    const m = createMateria({ nombre: 'A' })
    const f = createFile(m.id, { fileName: 'x.pdf', fileType: 'application/pdf', size: 1 })
    deleteFile(f.id)
    expect(store.files).toHaveLength(0)
  })

  it('deleteFile throws 404 if file missing', () => {
    expect(() => deleteFile('nope')).toThrow(ApiError)
  })
})
