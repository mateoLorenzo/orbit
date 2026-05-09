import { randomUUID } from 'node:crypto'
import { ApiError } from '../errors'
import { CreateMateriaInputSchema, type Materia } from '../schemas'
import { store } from '../store'

export function listMaterias(): Materia[] {
  return [...store.materias]
}

export function getMateria(id: string): Materia {
  const found = store.materias.find((m) => m.id === id)
  if (!found) {
    throw new ApiError(404, 'not_found', `Materia ${id} not found`)
  }
  return found
}

export function createMateria(input: unknown): Materia {
  const parsed = CreateMateriaInputSchema.parse(input)
  const materia: Materia = {
    id: randomUUID(),
    nombre: parsed.nombre,
    createdAt: new Date().toISOString(),
  }
  store.materias.push(materia)
  return materia
}

export function deleteMateria(id: string): void {
  const idx = store.materias.findIndex((m) => m.id === id)
  if (idx === -1) {
    throw new ApiError(404, 'not_found', `Materia ${id} not found`)
  }
  store.materias.splice(idx, 1)
  // cascade: drop files belonging to this materia
  store.files = store.files.filter((f) => f.materiaId !== id)
}
