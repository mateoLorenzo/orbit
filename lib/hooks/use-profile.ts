'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { getProfile, getStats, updateProfile } from '@/lib/api/profile'

export function useProfile() {
  return useQuery({ queryKey: qk.profile(), queryFn: getProfile, select: (d) => d.profile })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile() }),
  })
}

export function useStats() {
  return useQuery({ queryKey: qk.stats(), queryFn: getStats })
}
