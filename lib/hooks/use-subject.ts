'use client'

import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { getSubject } from '@/lib/api/subjects'

export function useSubject(id: string) {
  return useQuery({
    queryKey: qk.subject(id),
    queryFn: () => getSubject(id),
    select: (data) => data.subject,
    enabled: !!id,
  })
}
