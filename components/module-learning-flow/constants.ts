import type { LessonNarration } from './types'

export const ORANGE = '#ff4f00'

export const FIRST_LESSON_NARRATION: LessonNarration = {
  audioSrc: '/audio/lesson-1.mp3',
  generatingDelayMs: 1600,
  lines: [
    [
      { text: 'San Martín planificó durante años el cruce de los Andes,', startSeconds: 0.0 },
      {
        text: 'coordinando logística, abastecimiento y rutas posibles a través de seis pasos diferentes',
        startSeconds: 4,
      },
      { text: 'para confundir al enemigo realista.', startSeconds: 9 },
    ],
    [
      {
        text: 'El Ejército de los Andes partió en enero de 1817 desde Mendoza',
        startSeconds: 12,
      },
      {
        text: 'con cerca de cinco mil hombres, mulas, cañones y provisiones',
        startSeconds: 17,
      },
      { text: 'para alimentar a la tropa durante el cruce.', startSeconds: 20 },
    ],
    [
      { text: 'La marcha duró aproximadamente tres semanas', startSeconds: 25 },
      {
        text: 'y combinó disciplina militar con un fuerte componente moral',
        startSeconds: 28.5,
      },
      { text: 'apoyado en banderas, símbolos y discursos.', startSeconds: 30.5 },
    ],
  ],
}

export const SECOND_LESSON_NARRATION: LessonNarration = {
  audioSrc: '/audio/lesson-2.mp3',
  generatingDelayMs: 1600,
  lines: [
    [
      { text: 'San Martín se formó como militar en España', startSeconds: 0.0 },
      {
        text: 'y participó en la guerra contra Napoleón antes de regresar a América',
        startSeconds: 3,
      },
      { text: 'para sumarse a la causa independentista.', startSeconds: 6 },
    ],
    [
      { text: 'En Mendoza preparó al Ejército de los Andes,', startSeconds: 8 },
      {
        text: 'una fuerza disciplinada que integró a soldados criollos, indígenas',
        startSeconds: 11,
      },
      { text: 'y libertos.', startSeconds: 14 },
    ],
    [
      { text: 'Su liderazgo combinó estrategia militar', startSeconds: 16 },
      {
        text: 'con un fuerte sentido de continentalidad:',
        startSeconds: 19,
      },
      { text: 'la libertad de un país no estaba completa sin la del resto.', startSeconds: 22 },
    ],
    [
      { text: 'Tras cruzar los Andes,', startSeconds: 25 },
      {
        text: 'lideró las campañas que liberaron Chile',
        startSeconds: 27.5,
      },
      { text: 'y prepararon la independencia de Perú.', startSeconds: 30 },
    ],
  ],
}
