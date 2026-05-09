import { z } from 'zod'

export const ISODateString = z.string().datetime({ offset: true }).or(z.string().datetime())

// Materia
export const MateriaSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  createdAt: z.string(),
})
export type Materia = z.infer<typeof MateriaSchema>

export const CreateMateriaInputSchema = z.object({
  nombre: z.string().min(1).trim(),
})
export type CreateMateriaInput = z.infer<typeof CreateMateriaInputSchema>

// File
export const FileSchema = z.object({
  id: z.string().min(1),
  materiaId: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  filePath: z.string().min(1),
  size: z.number().int().nonnegative(),
  uploadedAt: z.string(),
})
export type FileEntry = z.infer<typeof FileSchema>

// Progress
export const ProgressStatusSchema = z.enum(['bloqueado', 'disponible', 'en_curso', 'dominado'])
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>

export const ProgressSchema = z.object({
  id: z.string().min(1),
  nodoId: z.string().min(1),
  status: ProgressStatusSchema,
  completedAt: z.string().nullable(),
})
export type Progress = z.infer<typeof ProgressSchema>

export const UpdateProgressStatusInputSchema = z.object({
  status: ProgressStatusSchema,
})

// Profile
export const FormatoPreferidoSchema = z.enum(['texto', 'audio', 'video', 'visual', 'podcast'])

export const ProfileSchema = z.object({
  id: z.literal('singleton'),
  formatoPreferido: FormatoPreferidoSchema,
  horariosActivos: z.array(z.string()),
  erroresRecurrentes: z.array(z.string()),
  friccionPromedio: z.number().min(0).max(1),
})
export type Profile = z.infer<typeof ProfileSchema>

export const UpdateProfileInputSchema = ProfileSchema.omit({ id: true }).partial()
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>
