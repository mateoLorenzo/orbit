'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/query/keys'
import { getNodeAssets, submitQuiz, type NodeAssets } from '@/lib/api/nodes'

export function useNodeAssets(nodeId: string) {
  return useQuery({
    queryKey: qk.nodeAssets(nodeId),
    queryFn: () => getNodeAssets(nodeId),
    enabled: !!nodeId,
    refetchInterval: (query) => {
      const data = query.state.data as NodeAssets | undefined
      return data?.status === 'ready' ? false : 3000
    },
  })
}

export function useSubmitQuiz(nodeId: string) {
  return useMutation({
    mutationFn: (answers: number[]) => submitQuiz(nodeId, answers),
  })
}
