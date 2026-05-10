import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../client', () => ({
  db: { select: vi.fn() },
  schema: {
    nodes: { id: 'nodes.id', subjectId: 'nodes.subjectId', pathId: 'nodes.pathId',
             title: 'nodes.title', contentBrief: 'nodes.contentBrief', createdAt: 'nodes.createdAt' },
    paths: { id: 'paths.id', orderIndex: 'paths.orderIndex' },
    progress: { nodeId: 'progress.nodeId', userId: 'progress.userId', status: 'progress.status' },
  },
}))

vi.mock('@/lib/auth/current-user', () => ({
  CURRENT_USER_ID: '00000000-0000-4000-8000-000000000001',
}))

import { listNodesWithProgress } from '../queries'
import * as clientModule from '../client'

const mockDb = clientModule.db as unknown as { select: ReturnType<typeof vi.fn> }

describe('listNodesWithProgress', () => {
  beforeEach(() => mockDb.select.mockReset())

  it('returns nodes with progressStatus defaulted to available when no row', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { id: 'n1', pathId: 'p1', title: 'Intro', contentBrief: 'brief', progressStatus: null },
        { id: 'n2', pathId: 'p1', title: 'Next', contentBrief: 'brief2', progressStatus: 'mastered' },
      ]),
    }
    mockDb.select.mockReturnValue(chain)

    const result = await listNodesWithProgress('subj-1')
    expect(result).toEqual([
      { id: 'n1', pathId: 'p1', title: 'Intro', contentBrief: 'brief', progressStatus: 'available' },
      { id: 'n2', pathId: 'p1', title: 'Next', contentBrief: 'brief2', progressStatus: 'mastered' },
    ])
  })
})
