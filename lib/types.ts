export interface Subject {
  id: string
  slug: string
  name: string
  description: string
  color: string
  icon: string
  createdAt: Date
  sources: Source[]
  content: ContentNode[]
}

export interface Source {
  id: string
  name: string
  type: 'pdf' | 'drive'
  size: string
  uploadedAt: Date
  status: 'uploading' | 'processing' | 'ready' | 'error'
}

export interface ContentNode {
  id: string
  title: string
  description: string
  type: 'tema' | 'clase' | 'ejercicio'
  status: 'pendiente' | 'en-progreso' | 'completado'
  children?: ContentNode[]
  order: number
}
