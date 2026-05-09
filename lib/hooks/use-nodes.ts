'use client'

import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { listNodes } from '@/lib/api/subjects'

export function useNodes(subjectId: string) {
  return useQuery({
    queryKey: qk.nodes(subjectId),
    queryFn: () => listNodes(subjectId),
    select: (data) => data.nodes,
    enabled: !!subjectId,
    refetchInterval: (query) => {
      const nodes = (query.state.data as { nodes: unknown[] } | undefined)?.nodes ?? []
      return nodes.length === 0 ? 5000 : false
    },
  })
}
