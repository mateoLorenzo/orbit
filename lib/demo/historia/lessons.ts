import type { ContentNode } from '@/lib/types'

export const HISTORIA_LESSONS: ContentNode[] = [
  {
    id: 'historia-independencia-1',
    title: 'La Revolución de Mayo',
    description:
      'Las tensiones políticas y sociales que impulsaron el inicio del proceso independentista en el Río de la Plata.',
    type: 'clase',
    status: 'completado',
    order: 1,
  },
  {
    id: 'historia-independencia-2',
    title: 'El Cruce de los Andes',
    description:
      'La estrategia militar y política de José de San Martín para liberar Chile y avanzar sobre el Virreinato del Perú.',
    type: 'clase',
    status: 'en-progreso',
    order: 2,
  },
  {
    id: 'historia-independencia-3',
    title: 'Las Invasiones Inglesas',
    description:
      'El impacto de las invasiones británicas en Buenos Aires y el surgimiento de nuevas identidades políticas.',
    type: 'clase',
    status: 'pendiente',
    order: 3,
  },
  {
    id: 'historia-independencia-4',
    title: 'La Asamblea del Año XIII',
    description:
      'Las primeras iniciativas para organizar políticamente las Provincias Unidas y consolidar la independencia.',
    type: 'clase',
    status: 'pendiente',
    order: 4,
  },
]
