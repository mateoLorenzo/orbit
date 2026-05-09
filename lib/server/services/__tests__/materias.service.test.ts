import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../errors'
import { resetStore, store } from '../../store'
import {
  createMateria,
  deleteMateria,
  getMateria,
  listMaterias,
} from '../materias.service'

describe('MateriasService', () => {
  beforeEach(() => resetStore())

  it('creates a materia with id, nombre, createdAt', () => {
    const m = createMateria({ nombre: 'Cálculo' })
    expect(m.id).toMatch(/[0-9a-f-]{36}/)
    expect(m.nombre).toBe('Cálculo')
    expect(typeof m.createdAt).toBe('string')
    expect(store.materias).toHaveLength(1)
  })

  it('lists materias in insertion order', () => {
    createMateria({ nombre: 'A' })
    createMateria({ nombre: 'B' })
    const list = listMaterias()
    expect(list.map((m) => m.nombre)).toEqual(['A', 'B'])
  })

  it('getMateria returns the materia by id', () => {
    const m = createMateria({ nombre: 'A' })
    expect(getMateria(m.id)).toEqual(m)
  })

  it('getMateria throws 404 ApiError when not found', () => {
    expect(() => getMateria('nope')).toThrow(ApiError)
    try {
      getMateria('nope')
    } catch (err) {
      expect((err as ApiError).status).toBe(404)
      expect((err as ApiError).code).toBe('not_found')
    }
  })

  it('deleteMateria removes the materia', () => {
    const m = createMateria({ nombre: 'A' })
    deleteMateria(m.id)
    expect(store.materias).toHaveLength(0)
  })

  it('deleteMateria cascades to files of that materia', () => {
    const m = createMateria({ nombre: 'A' })
    store.files.push({
      id: 'f1',
      materiaId: m.id,
      fileName: 'x.pdf',
      fileType: 'application/pdf',
      filePath: 'mock://x',
      size: 1,
      uploadedAt: new Date().toISOString(),
    })
    store.files.push({
      id: 'f2',
      materiaId: 'other',
      fileName: 'y.pdf',
      fileType: 'application/pdf',
      filePath: 'mock://y',
      size: 1,
      uploadedAt: new Date().toISOString(),
    })
    deleteMateria(m.id)
    expect(store.files.map((f) => f.id)).toEqual(['f2'])
  })

  it('deleteMateria throws 404 when not found', () => {
    expect(() => deleteMateria('nope')).toThrow(ApiError)
  })
})
