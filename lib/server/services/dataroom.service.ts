import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ApiError } from '../errors'
import { type FileEntry } from '../schemas'
import { store } from '../store'
import { getMateria } from './materias.service'

const CreateFileMetaSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  size: z.number().int().nonnegative(),
})

export type CreateFileMeta = z.infer<typeof CreateFileMetaSchema>

export function createFile(materiaId: string, input: unknown): FileEntry {
  getMateria(materiaId) // throws 404 if missing
  const parsed = CreateFileMetaSchema.parse(input)
  const file: FileEntry = {
    id: randomUUID(),
    materiaId,
    fileName: parsed.fileName,
    fileType: parsed.fileType,
    filePath: `mock://${materiaId}/${parsed.fileName}`,
    size: parsed.size,
    uploadedAt: new Date().toISOString(),
  }
  store.files.push(file)
  return file
}

export function listFilesByMateria(materiaId: string): FileEntry[] {
  getMateria(materiaId)
  return store.files.filter((f) => f.materiaId === materiaId)
}

export function deleteFile(id: string): void {
  const idx = store.files.findIndex((f) => f.id === id)
  if (idx === -1) {
    throw new ApiError(404, 'not_found', `File ${id} not found`)
  }
  store.files.splice(idx, 1)
}
