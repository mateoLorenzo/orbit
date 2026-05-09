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
      kind: 'timeline',
      topic: 'El Cruce de los Andes y el proyecto continental de San Martín',
      title: 'El Cruce de los Andes',
      subtitle: 'El plan continental de San Martín',
      intro:
        'Recorré la secuencia de hechos que hicieron posible la liberación de Chile y el avance hacia el Perú.',
      events: [
        {
          id: 'preparacion-mendoza',
          date: '1814–1816',
          title: 'Preparación del Ejército de los Andes en Mendoza',
          description:
            'San Martín asume el gobierno de Cuyo y dedica casi dos años a preparar un ejército disciplinado en Mendoza, organizando producción de armas, vestuario y víveres.',
          historicalImpact:
            'La preparación logística minuciosa fue la base que permitió todo lo que vino después: sin esa estructura, el cruce no era viable.',
        },
        {
          id: 'cruce-andes',
          date: 'Enero–Febrero 1817',
          title: 'Cruce de los Andes',
          description:
            'El Ejército de los Andes cruza la cordillera por seis pasos distintos para confundir al enemigo realista, en una marcha de cerca de tres semanas.',
          historicalImpact:
            'Logró el factor sorpresa y dejó al ejército realista descolocado, abriendo la posibilidad de una victoria rápida en Chile.',
        },
        {
          id: 'batalla-chacabuco',
          date: '12 de febrero de 1817',
          title: 'Batalla de Chacabuco',
          description:
            'Tras descender de los Andes, el ejército patriota derrota a las fuerzas realistas en la batalla de Chacabuco.',
          historicalImpact:
            'El triunfo confirmó la efectividad del plan y permitió avanzar de inmediato sobre Santiago, capital del Reino de Chile.',
        },
        {
          id: 'entrada-santiago',
          date: '14 de febrero de 1817',
          title: 'Entrada a Santiago de Chile',
          description:
            'El ejército ingresa a Santiago y se instala un gobierno independiente, con O’Higgins como Director Supremo.',
          historicalImpact:
            'Chile queda fuera del control español y se convierte en base operativa para la siguiente fase del plan continental.',
        },
        {
          id: 'plan-peru',
          date: '1820–1822',
          title: 'Continuación del plan continental hacia Perú',
          description:
            'Con Chile asegurado, San Martín organiza la Expedición Libertadora del Perú y desembarca en Paracas en 1820.',
          historicalImpact:
            'El avance al Perú apuntaba al corazón del poder colonial español en Sudamérica, completando la lógica del proyecto continental.',
        },
      ],
    },
    {
      kind: 'quiz',
      question:
        'Según la línea de tiempo, ¿qué hecho ocurrió apenas dos días después de la Batalla de Chacabuco?',
      options: [
        'El inicio de la preparación del Ejército de los Andes en Mendoza.',
        'La entrada a Santiago de Chile y la instalación de un gobierno independiente con O’Higgins como Director Supremo.',
        'El desembarco de la Expedición Libertadora del Perú en Paracas.',
        'El cruce de los Andes por seis pasos distintos para confundir al enemigo realista.',
      ],
      correctIndex: 1,
    },
    { kind: 'done' },
  ]
}
