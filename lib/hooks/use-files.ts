'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { deleteFile, listFiles, putToS3, requestUpload } from '@/lib/api/files'
import type { FileRow } from '@/lib/db/schema'

export function useFiles(subjectId: string) {
  return useQuery({
    queryKey: qk.files(subjectId),
    queryFn: () => listFiles(subjectId),
    select: (data) => data.files,
    enabled: !!subjectId,
    refetchInterval: (query) => {
      const files = (query.state.data as { files: FileRow[] } | undefined)?.files ?? []
      const inFlight = files.some((f) => f.status === 'pending' || f.status === 'processing')
      return inFlight ? 3000 : false
    },
  })
}

export function useUploadFile(subjectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const { fileId, uploadUrl, requiredHeaders } = await requestUpload(subjectId, {
        filename: file.name,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
      })
      await putToS3(uploadUrl, file, requiredHeaders)
      return fileId
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.files(subjectId) })
      qc.invalidateQueries({ queryKey: qk.nodes(subjectId) })
    },
  })
}

export function useDeleteFile(subjectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => deleteFile(subjectId, fileId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.files(subjectId) })
      qc.invalidateQueries({ queryKey: qk.nodes(subjectId) })
    },
  })
}
