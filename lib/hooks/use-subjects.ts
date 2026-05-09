'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { qk } from '@/lib/query/keys'
import { createSubject, listSubjects } from '@/lib/api/subjects'

export function useSubjects() {
  return useQuery({
    queryKey: qk.subjects(),
    queryFn: listSubjects,
    select: (data) => data.subjects,
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: createSubject,
    onSuccess: ({ subject }) => {
      qc.invalidateQueries({ queryKey: qk.subjects() })
      router.push(`/subjects/${subject.id}`)
    },
  })
}
