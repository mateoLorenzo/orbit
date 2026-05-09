import { UpdateProfileInputSchema, type Profile } from '../schemas'
import { store } from '../store'

export function getProfile(): Profile {
  return { ...store.profile }
}

export function updateProfile(input: unknown): Profile {
  const parsed = UpdateProfileInputSchema.parse(input)
  Object.assign(store.profile, parsed)
  return { ...store.profile }
}
