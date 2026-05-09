import type { LessonNarration } from './types'

export const ORANGE = '#ff4f00'
export const VOICE_OPTIONS = [
  'Narración IA',
  'Narración IA',
  'Narración IA',
  'Narración IA',
]

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
