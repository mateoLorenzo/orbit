export const qk = {
  subjects: () => ['subjects'] as const,
  subject: (id: string) => ['subjects', id] as const,
  files: (subjectId: string) => ['subjects', subjectId, 'files'] as const,
  nodes: (subjectId: string) => ['subjects', subjectId, 'nodes'] as const,
  nodeAssets: (nodeId: string) => ['nodes', nodeId, 'assets'] as const,
  progressSummary: (subjectId: string) => ['subjects', subjectId, 'progress'] as const,
  profile: () => ['profile'] as const,
  stats: () => ['profile', 'stats'] as const,
}
