import { api } from './client'
import type { FileRow } from '@/lib/db/schema'

export const listFiles = (subjectId: string) =>
  api<{ files: FileRow[] }>(`/api/subjects/${subjectId}/files`)

export const requestUpload = (
  subjectId: string,
  input: { filename: string; mimeType: string; sizeBytes: number },
) =>
  api<{ fileId: string; uploadUrl: string; requiredHeaders: Record<string, string> }>(
    `/api/subjects/${subjectId}/files`,
    { method: 'POST', body: JSON.stringify(input) },
  )

export async function putToS3(uploadUrl: string, file: File, headers: Record<string, string>) {
  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers })
  if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`)
}

export const deleteFile = async (subjectId: string, fileId: string) => {
  const res = await fetch(`/api/subjects/${subjectId}/files/${fileId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error(`DELETE failed: ${res.status}`)
}
