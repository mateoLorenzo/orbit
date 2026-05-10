import { api } from './client'
import type { Profile } from '@/lib/db/schema'

export interface ProfileStats {
  streakDays: number
  subjectsCompleted: number
  totalSubjects: number
  formatUsage: Record<string, number>
}

export const getProfile = () => api<{ profile: Profile }>('/api/profile')
export const updateProfile = (input: Partial<Pick<Profile, 'displayName' | 'interests' | 'preferredFormat'>>) =>
  api<{ profile: Profile }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
export const getStats = () => api<ProfileStats>('/api/profile/stats')
