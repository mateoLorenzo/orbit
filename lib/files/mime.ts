import type { schema } from '../db/client'

export type FileTypeEnum = 'pdf' | 'doc' | 'image' | 'audio' | 'video'

const MIME_MAP: Record<string, FileTypeEnum> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
}

export function fileTypeForMime(mime: string): FileTypeEnum | null {
  return MIME_MAP[mime] ?? null
}

export function inferMimeFromFilename(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return null
  switch (ext) {
    case 'pdf':
      return 'application/pdf'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'mp4':
      return 'video/mp4'
    case 'mov':
      return 'video/quicktime'
    case 'webm':
      return 'video/webm'
    default:
      return null
  }
}
