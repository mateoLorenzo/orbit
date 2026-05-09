import type { ContentNode } from '@/lib/types'
import type { Step } from './types'

export function buildSteps(node: ContentNode): Step[] {
  const baseParagraph = node.description?.trim()
    ? node.description.trim()
    : 'Este contenido fue generado a partir de tus materiales para acompañarte en el estudio del tema.'

  return [
    { kind: 'intro' },
    {
      kind: 'content',
      image: '/learning-landscape.png',
      paragraphs: [
        baseParagraph,
        'San Martín planificó durante años el cruce de los Andes, coordinando logística, abastecimiento y rutas posibles a través de seis pasos diferentes para confundir al enemigo realista.',
        'El Ejército de los Andes partió en enero de 1817 desde Mendoza con cerca de cinco mil hombres, mulas, cañones y provisiones para alimentar a la tropa durante el cruce.',
        'La marcha duró aproximadamente tres semanas y combinó disciplina militar con un fuerte componente moral apoyado en banderas, símbolos y discursos.',
      ],
    },
    {
      kind: 'quiz',
      question: '¿Quién fue quien pasó la Cordillera de Los Andes?',
      options: ['Belgrano', 'San Martín', 'Sarmiento', 'Lionel Messi'],
      correctIndex: 1,
    },
    {
      kind: 'content',
      image: '/learning-portrait.png',
      paragraphs: [
        'San Martín se formó como militar en España y participó en la guerra contra Napoleón antes de regresar a América para sumarse a la causa independentista.',
        'En Mendoza preparó al Ejército de los Andes, una fuerza disciplinada que integró a soldados criollos, indígenas y libertos.',
        'Su liderazgo combinó estrategia militar con un fuerte sentido de continentalidad: la libertad de un país no estaba completa sin la del resto.',
        'Tras cruzar los Andes, lideró las campañas que liberaron Chile y prepararon la independencia de Perú.',
      ],
    },
    {
      kind: 'quiz',
      question: '¿En qué año se completó el cruce de los Andes?',
      options: ['1810', '1817', '1820', '1853'],
      correctIndex: 1,
    },
    {
      kind: 'content',
      image: '/learning-landscape.png',
      paragraphs: [
        'El cruce permitió sorprender al ejército realista en Chacabuco, batalla decisiva que abrió las puertas de Santiago de Chile.',
        'Esta victoria reorganizó el equilibrio militar en el sur del continente y debilitó al poder español en el Pacífico.',
        'A partir de allí, el plan continental siguió avanzando hacia el Perú, donde se dio el último golpe definitivo al sistema colonial.',
        'El cruce de los Andes se convirtió en un símbolo de planificación, disciplina y voluntad colectiva en la historia americana.',
      ],
    },
    {
      kind: 'quiz',
      question: '¿Cuál fue el principal resultado político del cruce?',
      options: [
        'La consolidación del virreinato',
        'La liberación de Chile y el avance hacia Perú',
        'La firma de un armisticio con España',
        'La pérdida de Mendoza',
      ],
      correctIndex: 1,
    },
    { kind: 'done' },
  ]
}
