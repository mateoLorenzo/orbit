import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore } from '../../store'
import { getProfile, updateProfile } from '../profile.service'

describe('ProfileService', () => {
  beforeEach(() => resetStore())

  it('getProfile returns the singleton', () => {
    const p = getProfile()
    expect(p.id).toBe('singleton')
    expect(p.formatoPreferido).toBe('texto')
  })

  it('updateProfile merges partial fields', () => {
    const p = updateProfile({ formatoPreferido: 'audio', friccionPromedio: 0.8 })
    expect(p.formatoPreferido).toBe('audio')
    expect(p.friccionPromedio).toBe(0.8)
    expect(p.id).toBe('singleton')
    expect(p.horariosActivos).toEqual([])
  })

  it('updateProfile ignores incoming id', () => {
    const p = updateProfile({ id: 'hacked' } as Record<string, unknown>)
    expect(p.id).toBe('singleton')
  })

  it('updateProfile rejects invalid formato', () => {
    expect(() => updateProfile({ formatoPreferido: 'invalid' as never })).toThrow()
  })

  it('updateProfile rejects friccionPromedio out of range', () => {
    expect(() => updateProfile({ friccionPromedio: 2 })).toThrow()
  })

  it('updateProfile replaces array fields when provided', () => {
    const p = updateProfile({ horariosActivos: ['morning'], erroresRecurrentes: ['x'] })
    expect(p.horariosActivos).toEqual(['morning'])
    expect(p.erroresRecurrentes).toEqual(['x'])
  })
})
