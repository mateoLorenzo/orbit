# Orbit

**El tutor con IA que solo enseña lo que vos subiste.**

## El problema

Cuando un estudiante usa un asistente de IA para repasar, suele recibir respuestas correctas pero genéricas — basadas en lo que el modelo "sabe", no en lo que está en sus apuntes. El resultado: estudia conceptos que no le toman, o respuestas que el profesor consideraría fuera de tema.

## Qué hace Orbit

Orbit es una plataforma de estudio donde el estudiante sube su material (PDFs, apuntes, presentaciones, videos), y la IA construye sobre ese material un camino de estudio personalizado:

- **Mapa de conceptos navegable.** La IA parsea el material y arma un grafo dirigido de temas con relaciones de prerrequisito. El estudiante ve su progreso encima del mapa: dominado, en curso, bloqueado.
- **Cinco formatos de contenido por nodo.** Resumen en texto, infografía visual, narración en audio, mini-video explicativo y un podcast a dos voces (escéptico vs. entusiasta). El estudiante elige el formato que mejor se le da y la plataforma aprende sus preferencias.
- **Tutor con memoria que guía en lugar de resolver.** Si el alumno pide "la respuesta", el tutor responde con preguntas que lo lleven a pensarla. Recuerda dificultades pasadas, conceptos dominados y profundidad preferida.
- **Validación de comprensión por mini-quiz.** Después de cada nodo, 2-3 preguntas abiertas en lenguaje natural. La IA evalúa, marca correcto/parcial/incorrecto con feedback puntual y desbloquea el siguiente concepto solo si el alumno demostró entender.
- **Dashboard de progreso.** Porcentaje dominado, próximo nodo óptimo en el camino, conceptos con más fricción y recordatorios de spaced repetition.

## La regla que nos diferencia

**La IA nunca inventa contenido fuera del material subido.** Si un tema no está en lo que el alumno cargó, el tutor lo dice explícitamente. Esto mantiene el estudio alineado con lo que efectivamente va a caer en el examen — sin alucinaciones que arruinen una respuesta.

## Personalización adaptativa

Cada estudiante define un perfil de intereses (fútbol, gaming, música, programación, lo que sea). Orbit reescribe explicaciones, analogías y narraciones usando esas referencias — la mitocondria explicada como "el servidor de hosting de la célula" para el alumno de CS, o "la red eléctrica del estadio" para el fanático del fútbol. La precisión del concepto no cambia; lo que cambia es cómo se cuenta.

## Stack

- **Frontend**: Next.js 16 + React 19, Tailwind v4, shadcn/ui
- **Backend**: Supabase (Postgres con pgvector + RLS), Drizzle ORM
- **Procesamiento async**: AWS Lambdas + SQS (FIFO con concurrency caps), orquestado con SST
- **IA**: Claude Haiku/Sonnet (síntesis y tutoría), Voyage (embeddings semánticos), FAL (generación de imágenes), AWS Polly (TTS)
- **Storage**: S3 con lifecycle de 30 días para PDFs originales y artefactos generados

## Equipo — team-25

Platanus Hack 26 · Buenos Aires · Track 🛸 Future

- Ain Ponce ([@ainponce](https://github.com/ainponce))
- Gonzalo Martinesse ([@DevMartinese](https://github.com/DevMartinese))
- Juan Cruz Murguia ([@juanMurguia](https://github.com/juanMurguia))
- Juan Manuel Venezia Estevez ([@juanvenezia](https://github.com/juanvenezia))
- Mateo Lorenzo ([@mateoLorenzo](https://github.com/mateoLorenzo))
