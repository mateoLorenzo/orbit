import { describe, expect, it } from 'vitest'
import { slugify, uniquifySlug } from '../slug'

describe('slugify', () => {
  it('lowercases + dashes', () => {
    expect(slugify('Historia de los Procesos')).toBe('historia-de-los-procesos')
  })
  it('strips accents', () => {
    expect(slugify('La Revolución de Mayo')).toBe('la-revolucion-de-mayo')
  })
  it('strips non-alphanumerics', () => {
    expect(slugify('Node.js & TypeScript!')).toBe('node-js-typescript')
  })
  it('collapses dashes + trims', () => {
    expect(slugify('  --foo--bar--  ')).toBe('foo-bar')
  })
  it('returns "untitled" if input is empty', () => {
    expect(slugify('   ')).toBe('untitled')
  })
})

describe('uniquifySlug', () => {
  it('returns base if not in set', () => {
    expect(uniquifySlug('foo', new Set())).toBe('foo')
  })
  it('appends -2 if base exists', () => {
    expect(uniquifySlug('foo', new Set(['foo']))).toBe('foo-2')
  })
  it('appends next available int', () => {
    expect(uniquifySlug('foo', new Set(['foo', 'foo-2', 'foo-3']))).toBe('foo-4')
  })
})
