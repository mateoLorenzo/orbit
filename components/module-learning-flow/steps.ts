import type { ContentNode } from '@/lib/types'
import type { Step } from './types'

export function buildSteps(node: ContentNode): Step[] {
  if (node.title === 'La Revolución de Mayo') {
    return buildMayoSteps()
  }
  return buildCruceSteps()
}

function buildCruceSteps(): Step[] {
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

function buildMayoSteps(): Step[] {
  return [
    { kind: 'intro' },
    {
      kind: 'content',
      image: '/learning-landscape.png',
      video: '/revolucion-3.mp4',
      paragraphs: [
        'El 25 de junio de 1806, una flota británica al mando del comodoro Home Popham y el general William Carr Beresford desembarcó 1.600 soldados en las playas de Quilmes. Buenos Aires, capital del Virreinato del Río de la Plata, no tenía defensas preparadas para un ataque por el sur.',
        'La operación no fue ordenada por el gobierno británico: Popham la lanzó por iniciativa propia, buscando abrir nuevos mercados para el comercio inglés en plena guerra contra Napoleón.',
        'El virrey Sobremonte, advertido tarde, no pudo organizar una resistencia efectiva.',
      ],
    },
    {
      kind: 'content',
      image: '/learning-portrait.png',
      video: '/revolution-5.mp4',
      videoLoop: false,
      paragraphs: [
        'El 27 de junio, dos días después del desembarco, las tropas británicas entraron a Buenos Aires sin encontrar resistencia. El virrey Rafael de Sobremonte había huido hacia Córdoba llevándose el tesoro real, decisión que la población nunca le perdonó.',
        'Beresford fue nombrado gobernador. Decretó la libertad de comercio — algo que los criollos venían pidiendo hacía décadas. Por un momento, parte de la elite local consideró que el cambio podía ser ventajoso.',
        'Pero la Union Jack ondeando sobre el Fuerte fue una herida que el pueblo no estuvo dispuesto a tolerar.',
      ],
    },
    {
      kind: 'quiz',
      question: '¿Por qué Popham lanzó la invasión a Buenos Aires en 1806?',
      options: [
        'Por orden directa del gobierno británico para extender el imperio.',
        'Por iniciativa propia, buscando abrir nuevos mercados al comercio inglés.',
        'Para apoyar a las tropas españolas en la guerra contra Napoleón.',
        'Para liberar a los criollos del dominio español.',
      ],
      correctIndex: 1,
    },
    {
      kind: 'content',
      image: '/learning-landscape.png',
      video: '/revolucion-2.mp4',
      videoLoop: false,
      paragraphs: [
        'Mientras Beresford gobernaba la ciudad, un movimiento de resistencia se gestaba en secreto. No fue obra de un solo héroe: criollos, mestizos, esclavos liberados y mujeres se reunían en casas particulares, planeando la reconquista.',
        'Santiago de Liniers, oficial francés al servicio de la corona española, cruzó el Río de la Plata desde Montevideo con refuerzos. Martín de Álzaga, comerciante vasco, financió y coordinó desde la sombra.',
        'Por primera vez, Buenos Aires se defendía sin esperar órdenes de Madrid. Esa idea — la de poder gobernarse a sí misma — ya no se iría nunca más.',
      ],
    },
    {
      kind: 'quiz',
      question: '¿Qué tuvo de novedoso la organización de la resistencia contra los británicos?',
      options: [
        'Fue dirigida directamente por el virrey Sobremonte desde Córdoba.',
        'Buenos Aires se defendió por iniciativa propia, sin esperar órdenes de Madrid.',
        'Se trató de una operación militar enviada desde España.',
        'Se limitó a un grupo reducido de oficiales españoles profesionales.',
      ],
      correctIndex: 1,
    },
    {
      kind: 'content',
      image: '/learning-portrait.png',
      video: '/revolucion-1.mp4',
      videoLoop: false,
      paragraphs: [
        'El 12 de agosto de 1806, las tropas de Liniers atacaron la ciudad. Pero la verdadera batalla la dio el pueblo de Buenos Aires.',
        'Los británicos, entrenados para combatir en campo abierto, se vieron atrapados en un infierno urbano. Desde las azoteas, mujeres como Manuela Pedraza y vecinas anónimas arrojaban agua hirviendo, aceite, ladrillos y todo lo que tuvieran a mano. Los criollos disparaban desde las esquinas, esclavos peleaban junto a sus amos.',
        'Esa tarde, Beresford se rindió. La ciudad había sido reconquistada por sí misma.',
      ],
    },
    {
      kind: 'quiz',
      question: '¿Quiénes hicieron posible la Reconquista de Buenos Aires el 12 de agosto de 1806?',
      options: [
        'Refuerzos enviados desde Madrid por la corona española.',
        'El virrey Sobremonte al mando de un ejército regular.',
        'El pueblo movilizado: criollos, esclavos y mujeres combatiendo desde las azoteas.',
        'Una alianza con tropas portuguesas llegadas desde Brasil.',
      ],
      correctIndex: 2,
    },
    {
      kind: 'content',
      image: '/learning-landscape.png',
      video: '/revolution-4.mp4',
      videoLoop: false,
      paragraphs: [
        'Beresford entregó su espada a Liniers en la Plaza Mayor. La primera invasión inglesa había terminado en 47 días. Pero algo más profundo había cambiado para siempre.',
        'Buenos Aires había sido invadida, gobernada por extranjeros, y liberada por su propia gente — sin ayuda de España, sin órdenes del rey. El pueblo descubrió que podía organizarse, armarse y vencer.',
        'Cuatro años después, en mayo de 1810, ese mismo pueblo daría el primer paso hacia la independencia. Las invasiones inglesas no fueron solo una guerra: fueron el ensayo general de la Revolución de Mayo.',
      ],
    },
    {
      kind: 'timeline',
      topic: 'Las invasiones inglesas y el ensayo general de la Revolución de Mayo',
      title: 'La Revolución de Mayo',
      subtitle: 'Las invasiones inglesas como ensayo general',
      intro:
        'Recorré los hechos que despertaron en Buenos Aires la conciencia de poder gobernarse a sí misma.',
      events: [
        {
          id: 'desembarco-quilmes',
          date: '25 de junio de 1806',
          title: 'El desembarco inesperado en Quilmes',
          description:
            'Una flota británica al mando de Popham y Beresford desembarca 1.600 soldados en las playas de Quilmes. Buenos Aires no tiene defensas preparadas para un ataque por el sur.',
          historicalImpact:
            'La iniciativa privada de Popham, sin órdenes de Londres, expuso la fragilidad militar del Virreinato y abrió un escenario inédito para Buenos Aires.',
        },
        {
          id: 'ocupacion-britanica',
          date: '27 de junio de 1806',
          title: 'Buenos Aires sin defensa',
          description:
            'Las tropas británicas entran a la ciudad sin resistencia. El virrey Sobremonte huye hacia Córdoba con el tesoro real y Beresford asume el gobierno y decreta la libertad de comercio.',
          historicalImpact:
            'La fuga del virrey y la ocupación extranjera quebraron la legitimidad de la autoridad colonial y dejaron a la elite local frente a un dilema político inédito.',
        },
        {
          id: 'resistencia-secreta',
          date: 'Julio de 1806',
          title: 'La resistencia se organiza',
          description:
            'Criollos, mestizos, esclavos liberados y mujeres se reúnen en casas particulares para planear la reconquista. Liniers cruza desde Montevideo con refuerzos y Álzaga coordina desde la sombra.',
          historicalImpact:
            'Por primera vez la ciudad se defendía sin esperar órdenes de Madrid: la idea de poder gobernarse a sí misma comenzaba a tomar forma concreta.',
        },
        {
          id: 'reconquista',
          date: '12 de agosto de 1806',
          title: 'La Reconquista',
          description:
            'Las tropas de Liniers atacan la ciudad y el pueblo combate desde azoteas y esquinas. Mujeres como Manuela Pedraza arrojan agua hirviendo y proyectiles mientras criollos y esclavos pelean codo a codo.',
          historicalImpact:
            'El combate urbano demostró que un pueblo movilizado podía vencer a un ejército profesional, consolidando una nueva conciencia política.',
        },
        {
          id: 'rendicion',
          date: '12 de agosto de 1806',
          title: 'Una rendición que cambió todo',
          description:
            'Beresford entrega su espada a Liniers en la Plaza Mayor. La primera invasión inglesa termina en 47 días, pero el descubrimiento es definitivo: la ciudad puede organizarse, armarse y vencer por sí misma.',
          historicalImpact:
            'Las invasiones inglesas fueron el ensayo general de la Revolución de Mayo: cuatro años después, ese mismo pueblo daría el primer paso hacia la independencia.',
        },
      ],
    },
    {
      kind: 'quiz',
      question:
        'Según la línea de tiempo, ¿cuántos días pasaron entre el desembarco británico en Quilmes y la rendición de Beresford?',
      options: [
        'Cerca de un año entero.',
        '47 días, lo que duró la primera invasión inglesa.',
        'Apenas una semana de combates.',
        'Tres meses de ocupación continua.',
      ],
      correctIndex: 1,
    },
    { kind: 'done' },
  ]
}
