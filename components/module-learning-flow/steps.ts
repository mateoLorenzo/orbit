import type { ContentNode } from '@/lib/types'
import type { Step } from './types'

export function buildSteps(node: ContentNode): Step[] {
  return [
    { kind: 'intro' },
    {
      kind: 'content',
      image: '/learning-landscape.png',
      video: '/SanMartinAndes.mp4',
      paragraphs: [
        'San Martín planificó durante años el cruce de los Andes, coordinando logística, abastecimiento y rutas posibles a través de seis pasos diferentes para confundir al enemigo realista.',
        'El Ejército de los Andes partió en enero de 1817 desde Mendoza con cerca de cinco mil hombres, mulas, cañones y provisiones para alimentar a la tropa durante el cruce.',
        'La marcha duró aproximadamente tres semanas y combinó disciplina militar con un fuerte componente moral apoyado en banderas, símbolos y discursos.',
      ],
    },
    {
      kind: 'quiz',
      question: '¿Cuál fue una de las claves estratégicas del Cruce de los Andes?',
      options: [
        'La superioridad numérica frente al enemigo',
        'La combinación de logística, abastecimiento y rutas múltiples',
        'El apoyo de potencias europeas',
        'La rapidez del cruce sin planificación previa',
      ],
      correctIndex: 1,
    },
    {
      kind: 'content',
      image: '/learning-portrait.png',
      video: '/Historical.mp4',
      videoLoop: false,
      paragraphs: [
        'San Martín se formó como militar en España y participó en la guerra contra Napoleón antes de regresar a América para sumarse a la causa independentista.',
        'En Mendoza preparó al Ejército de los Andes, una fuerza disciplinada que integró a soldados criollos, indígenas y libertos.',
        'Su liderazgo combinó estrategia militar con un fuerte sentido de continentalidad: la libertad de un país no estaba completa sin la del resto.',
        'Tras cruzar los Andes, lideró las campañas que liberaron Chile y prepararon la independencia de Perú.',
      ],
    },
    {
      kind: 'quiz',
      question: '¿Qué idea guiaba el proyecto político y militar de San Martín?',
      options: [
        'Defender únicamente el territorio argentino',
        'Lograr una independencia continental en Sudamérica',
        'Evitar enfrentamientos militares con los realistas',
        'Regresar a España después de liberar Chile',
      ],
      correctIndex: 1,
    },
    {
      kind: 'content',
      image: '/learning-landscape.png',
      video: '/SanMartinAndes.mp4',
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
