import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore, store } from '../store'

describe('store', () => {
  beforeEach(() => resetStore())

  it('starts empty for collections', () => {
    expect(store.materias).toEqual([])
    expect(store.files).toEqual([])
    expect(store.progress).toEqual([])
  })

  it('seeds the singleton profile', () => {
    expect(store.profile.id).toBe('singleton')
    expect(store.profile.formatoPreferido).toBe('texto')
    expect(store.profile.friccionPromedio).toBe(0.5)
    expect(store.profile.horariosActivos).toEqual([])
    expect(store.profile.erroresRecurrentes).toEqual([])
  })

  it('resetStore clears mutations', () => {
    store.materias.push({ id: '1', nombre: 'X', createdAt: new Date().toISOString() })
    store.profile.formatoPreferido = 'audio'
    resetStore()
    expect(store.materias).toEqual([])
    expect(store.profile.formatoPreferido).toBe('texto')
  })
})
