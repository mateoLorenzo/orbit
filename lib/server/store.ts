import type { FileEntry, Materia, Profile, Progress } from './schemas'

interface Store {
  materias: Materia[]
  files: FileEntry[]
  progress: Progress[]
  profile: Profile
}

function defaultProfile(): Profile {
  return {
    id: 'singleton',
    formatoPreferido: 'texto',
    horariosActivos: [],
    erroresRecurrentes: [],
    friccionPromedio: 0.5,
  }
}

export const store: Store = {
  materias: [],
  files: [],
  progress: [],
  profile: defaultProfile(),
}

export function resetStore(): void {
  store.materias.length = 0
  store.files.length = 0
  store.progress.length = 0
  Object.assign(store.profile, defaultProfile())
}
