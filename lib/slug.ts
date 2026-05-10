export function slugify(input: string): string {
  const normalized = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'untitled'
}

export function uniquifySlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let i = 2
  while (existing.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}
