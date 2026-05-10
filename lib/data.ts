import type { Subject } from './types'

export const initialSubjects: Subject[] = [
  {
    id: 'historia-independencia',
    name: 'Historia de los Procesos de Independencia Latinoamericana',
    description: 'Procesos políticos y militares de la independencia latinoamericana',
    color: 'from-amber-500 to-orange-600',
    icon: 'palette',
    createdAt: new Date('2026-04-15'),
    sources: [],
    content: [
      {
        id: 'historia-independencia-1',
        title: 'La Revolución de Mayo',
        description:
          'Las tensiones políticas y sociales que impulsaron el inicio del proceso independentista en el Río de la Plata.',
        type: 'clase',
        status: 'en-progreso',
        order: 1,
      },
      {
        id: 'historia-independencia-2',
        title: 'El Cruce de los Andes',
        description:
          'La estrategia militar y política de José de San Martín para liberar Chile y avanzar sobre el Virreinato del Perú.',
        type: 'clase',
        status: 'pendiente',
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
    ],
  },
  {
    id: '1',
    name: 'Historia de los Procesos de Independencia Latinoamericana',
    description: 'Procesos políticos y militares de la independencia latinoamericana',
    color: 'from-amber-500 to-orange-600',
    icon: 'palette',
    createdAt: new Date('2024-01-15'),
    sources: [],
    content: [
      {
        id: 'c1',
        title: 'La Revolución de Mayo',
        description:
          'Las tensiones políticas y sociales que impulsaron el inicio del proceso independentista en el Río de la Plata.',
        type: 'clase',
        status: 'en-progreso',
        order: 1,
      },
      {
        id: 'c2',
        title: 'El Cruce de los Andes',
        description:
          'La estrategia militar y política de José de San Martín para liberar Chile y avanzar sobre el Virreinato del Perú.',
        type: 'clase',
        status: 'pendiente',
        order: 2,
      },
      {
        id: 'c3',
        title: 'Las Invasiones Inglesas',
        description:
          'El impacto de las invasiones británicas en Buenos Aires y el surgimiento de nuevas identidades políticas.',
        type: 'clase',
        status: 'pendiente',
        order: 3,
      },
      {
        id: 'c4',
        title: 'La Asamblea del Año XIII',
        description:
          'Las primeras iniciativas para organizar políticamente las Provincias Unidas y consolidar la independencia.',
        type: 'clase',
        status: 'pendiente',
        order: 4,
      },
    ],
  },
  {
    id: '2',
    name: 'Física Cuántica',
    description: 'Introducción a la mecánica cuántica',
    color: 'from-violet-500 to-purple-600',
    icon: 'atom',
    createdAt: new Date('2024-02-01'),
    sources: [
      {
        id: 's3',
        name: 'Mecánica-Cuántica-Básica.pdf',
        type: 'pdf',
        size: '22.1 MB',
        uploadedAt: new Date('2024-02-02'),
        status: 'ready'
      }
    ],
    content: [
      {
        id: 'c4',
        title: 'Fundamentos',
        description: 'Bases de la mecánica cuántica',
        type: 'tema',
        status: 'en-progreso',
        order: 1,
        children: [
          {
            id: 'c4-1',
            title: 'Dualidad onda-partícula',
            description: 'Comportamiento dual de la materia',
            type: 'clase',
            status: 'completado',
            order: 1
          }
        ]
      }
    ]
  },
  {
    id: '3',
    name: 'Programación',
    description: 'Estructuras de datos y algoritmos',
    color: 'from-blue-500 to-cyan-600',
    icon: 'laptop',
    createdAt: new Date('2024-02-10'),
    sources: [],
    content: []
  },
  {
    id: '4',
    name: 'Historia del Arte',
    description: 'Del Renacimiento al Arte Moderno',
    color: 'from-amber-500 to-orange-600',
    icon: 'palette',
    createdAt: new Date('2024-02-15'),
    sources: [
      {
        id: 's4',
        name: 'Historia-Arte-Renacimiento.pdf',
        type: 'pdf',
        size: '45.8 MB',
        uploadedAt: new Date('2024-02-16'),
        status: 'ready'
      },
      {
        id: 's5',
        name: 'Impresionismo-Guía.pdf',
        type: 'pdf',
        size: '18.3 MB',
        uploadedAt: new Date('2024-02-17'),
        status: 'processing'
      }
    ],
    content: [
      {
        id: 'c5',
        title: 'El Renacimiento',
        description: 'Arte y cultura del Renacimiento italiano',
        type: 'tema',
        status: 'completado',
        order: 1,
        children: [
          {
            id: 'c5-1',
            title: 'Leonardo da Vinci',
            description: 'Vida y obras principales',
            type: 'clase',
            status: 'completado',
            order: 1
          },
          {
            id: 'c5-2',
            title: 'Miguel Ángel',
            description: 'Escultura y pintura',
            type: 'clase',
            status: 'completado',
            order: 2
          }
        ]
      }
    ]
  }
]

export const subjectColors = [
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-600'
]

export { subjectIcons } from './subject-icons'
