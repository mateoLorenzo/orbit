import type { Subject } from './types'

export const initialSubjects: Subject[] = [
  {
    id: '1',
    name: 'Matemáticas Avanzadas',
    description: 'Cálculo diferencial e integral',
    color: 'from-emerald-500 to-teal-600',
    icon: 'ruler',
    createdAt: new Date('2024-01-15'),
    sources: [
      {
        id: 's1',
        name: 'Cálculo-Tomo1.pdf',
        type: 'pdf',
        size: '15.2 MB',
        uploadedAt: new Date('2024-01-16'),
        status: 'ready'
      },
      {
        id: 's2',
        name: 'Ejercicios-Integrales.pdf',
        type: 'pdf',
        size: '8.4 MB',
        uploadedAt: new Date('2024-01-17'),
        status: 'ready'
      }
    ],
    content: [
      {
        id: 'c1',
        title: 'Límites y Continuidad',
        description: 'Conceptos fundamentales de límites, propiedades y aplicaciones',
        type: 'tema',
        status: 'completado',
        order: 1,
        children: [
          {
            id: 'c1-1',
            title: 'Definición formal de límite',
            description: 'Definición epsilon-delta',
            type: 'clase',
            status: 'completado',
            order: 1
          },
          {
            id: 'c1-2',
            title: 'Propiedades de los límites',
            description: 'Suma, producto, cociente de límites',
            type: 'clase',
            status: 'completado',
            order: 2
          }
        ]
      },
      {
        id: 'c2',
        title: 'Derivadas',
        description: 'Técnicas de derivación y aplicaciones',
        type: 'tema',
        status: 'en-progreso',
        order: 2,
        children: [
          {
            id: 'c2-1',
            title: 'Regla de la cadena',
            description: 'Derivación de funciones compuestas',
            type: 'clase',
            status: 'en-progreso',
            order: 1
          },
          {
            id: 'c2-2',
            title: 'Derivadas implícitas',
            description: 'Derivación de ecuaciones implícitas',
            type: 'clase',
            status: 'pendiente',
            order: 2
          }
        ]
      },
      {
        id: 'c3',
        title: 'Integrales',
        description: 'Integración y sus aplicaciones',
        type: 'tema',
        status: 'pendiente',
        order: 3,
        children: [
          {
            id: 'c3-1',
            title: 'Integral definida',
            description: 'Concepto y propiedades',
            type: 'clase',
            status: 'pendiente',
            order: 1
          }
        ]
      }
    ]
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
