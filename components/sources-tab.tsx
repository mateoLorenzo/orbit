'use client'

import { useState, useCallback } from 'react'
import { useApp } from '@/lib/app-context'
import type { Subject, Source } from '@/lib/types'
import { Upload, FileText, X, Cloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SourcesTabProps {
  subject: Subject
}

export default function SourcesTab({ subject }: SourcesTabProps) {
  const { addSource, removeSource, generateContent } = useApp()
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    files.forEach((file) => {
      if (file.type === 'application/pdf') {
        const newSource: Source = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: 'pdf',
          size: formatFileSize(file.size),
          uploadedAt: new Date(),
          status: 'ready'
        }
        addSource(subject.id, newSource)
      }
    })
  }, [subject.id, addSource])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      if (file.type === 'application/pdf') {
        const newSource: Source = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: 'pdf',
          size: formatFileSize(file.size),
          uploadedAt: new Date(),
          status: 'ready'
        }
        addSource(subject.id, newSource)
      }
    })
    e.target.value = ''
  }

  const handleGoogleDriveConnect = () => {
    // Simulate Google Drive connection
    const mockDriveFile: Source = {
      id: Date.now().toString(),
      name: 'Documento-GoogleDrive.pdf',
      type: 'drive',
      size: '5.2 MB',
      uploadedAt: new Date(),
      status: 'ready'
    }
    addSource(subject.id, mockDriveFile)
  }

  const handleGenerateContent = async () => {
    if (subject.sources.length === 0) return
    
    setIsGenerating(true)
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    generateContent(subject.id)
    setIsGenerating(false)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getStatusIcon = (status: Source['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-warning" />
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-primary" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
    }
  }

  const getStatusText = (status: Source['status']) => {
    switch (status) {
      case 'uploading':
        return 'Subiendo...'
      case 'processing':
        return 'Procesando...'
      case 'ready':
        return 'Listo'
      case 'error':
        return 'Error'
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
          isDragging ? 'bg-primary/20' : 'bg-secondary'
        }`}>
          <Upload className={`h-7 w-7 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        
        <p className="mb-1 text-center font-medium text-foreground">
          Arrastra tus archivos PDF aquí
        </p>
        <p className="text-center text-sm text-muted-foreground">
          o haz clic para seleccionar archivos
        </p>
      </div>

      {/* Google Drive button */}
      <Button
        variant="outline"
        onClick={handleGoogleDriveConnect}
        className="w-full gap-2 border-border bg-card hover:bg-secondary"
      >
        <Cloud className="h-5 w-5" />
        Conectar con Google Drive
      </Button>

      {/* Sources list */}
      {subject.sources.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Fuentes cargadas ({subject.sources.length})
          </h3>
          
          <div className="space-y-2">
            {subject.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-card/80"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  source.type === 'drive' ? 'bg-blue-500/10' : 'bg-primary/10'
                }`}>
                  {source.type === 'drive' ? (
                    <Cloud className="h-5 w-5 text-blue-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-card-foreground">
                    {source.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{source.size}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(source.status)}
                      {getStatusText(source.status)}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => removeSource(subject.id, source.id)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate content button */}
      {subject.sources.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Genera automáticamente el contenido de estudio basado en tus fuentes usando IA.
          </p>
          <Button
            onClick={handleGenerateContent}
            disabled={isGenerating}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando contenido...
              </>
            ) : (
              <>
                <span className="text-lg">✨</span>
                Generar contenido con IA
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {subject.sources.length === 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no has cargado ninguna fuente. Sube tus PDFs o conecta Google Drive para comenzar.
          </p>
        </div>
      )}
    </div>
  )
}
