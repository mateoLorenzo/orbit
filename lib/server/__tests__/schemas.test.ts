import { describe, expect, it } from 'vitest'
import {
  MateriaSchema,
  CreateMateriaInputSchema,
  FileSchema,
  ProgressSchema,
  ProgressStatusSchema,
  ProfileSchema,
  UpdateProfileInputSchema,
} from '../schemas'

describe('schemas', () => {
  it('Materia: rejects empty nombre', () => {
    expect(() => CreateMateriaInputSchema.parse({ nombre: '' })).toThrow()
  })

  it('Materia: accepts valid input', () => {
    expect(CreateMateriaInputSchema.parse({ nombre: 'Cálculo' })).toEqual({ nombre: 'Cálculo' })
  })

  it('Materia: full shape requires id, nombre, createdAt', () => {
    const m = MateriaSchema.parse({
      id: 'a',
      nombre: 'b',
      createdAt: new Date().toISOString(),
    })
    expect(m.id).toBe('a')
  })

  it('File: full shape parses', () => {
    const f = FileSchema.parse({
      id: 'f1',
      materiaId: 'm1',
      fileName: 'x.pdf',
      fileType: 'application/pdf',
      filePath: 'mock://m1/x.pdf',
      size: 100,
      uploadedAt: new Date().toISOString(),
    })
    expect(f.size).toBe(100)
  })

  it('ProgressStatus: only accepts the 4 values', () => {
    expect(ProgressStatusSchema.parse('dominado')).toBe('dominado')
    expect(() => ProgressStatusSchema.parse('foo')).toThrow()
  })

  it('Progress: accepts null completedAt', () => {
    const p = ProgressSchema.parse({
      id: 'p1',
      nodoId: 'n1',
      status: 'disponible',
      completedAt: null,
    })
    expect(p.completedAt).toBeNull()
  })

  it('Profile: full shape parses', () => {
    const p = ProfileSchema.parse({
      id: 'singleton',
      formatoPreferido: 'texto',
      horariosActivos: ['morning'],
      erroresRecurrentes: [],
      friccionPromedio: 0.5,
    })
    expect(p.id).toBe('singleton')
  })

  it('UpdateProfileInput: all fields optional, id stripped', () => {
    const out = UpdateProfileInputSchema.parse({ formatoPreferido: 'audio', id: 'ignored' } as Record<string, unknown>)
    expect(out.formatoPreferido).toBe('audio')
    expect((out as Record<string, unknown>).id).toBeUndefined()
  })

  it('Profile: friccionPromedio must be 0..1', () => {
    expect(() =>
      ProfileSchema.parse({
        id: 'singleton',
        formatoPreferido: 'texto',
        horariosActivos: [],
        erroresRecurrentes: [],
        friccionPromedio: 2,
      }),
    ).toThrow()
  })
})
