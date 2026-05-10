import { z } from 'zod'
import { generate } from '../_shared/ai'

const LessonTextSchema = z.object({
  paragraphs: z
    .array(z.string().min(50).max(800))
    .min(3)
    .max(4),
  quiz: z
    .array(
      z.object({
        question: z.string().min(10).max(250),
        options: z.array(z.string().min(1).max(200)).length(4),
        correctIndex: z.number().int().min(0).max(3),
      }),
    )
    .min(2)
    .max(3),
})

export type LessonText = z.infer<typeof LessonTextSchema>

interface SynthInput {
  subjectName: string
  nodeTitle: string
  nodeContentBrief: string
  chunks: string[]    // ordered, top-relevant chunks
  interests: string[] // user.interests for analogies
}

const SYSTEM = `Sos un tutor experto que crea contenido de estudio personalizado en español rioplatense.
Tu tarea: convertir un brief de tema + extractos de los materiales del estudiante en una lección breve + un quiz multiple-choice.

Reglas:
1. NUNCA inventes información que no esté en los chunks proporcionados. Si no hay datos suficientes, hacé párrafos genéricos basados en el brief, pero indicá implícitamente "según los materiales del curso".
2. Los párrafos deben ser entre 3 y 4, cada uno de 2-4 oraciones.
3. El quiz tiene exactamente 2 o 3 preguntas multiple-choice con 4 opciones cada una. Solo UNA respuesta correcta (correctIndex 0-3).
4. Las preguntas deben validar comprensión real, no memoria de detalles triviales.
5. Si el estudiante tiene intereses cargados, usalos como contexto analógico EN LOS PÁRRAFOS (no en las preguntas), sin distorsionar la precisión.
6. Tono: explicativo, claro, segunda persona singular ("podés ver que...").`


export async function generateLessonText(input: SynthInput): Promise<LessonText> {
  const interestsLine =
    input.interests.length > 0
      ? `\n\nIntereses del estudiante (usá como contexto analógico en los párrafos): ${input.interests.join(', ')}.`
      : ''

  const userPrompt = `Materia: ${input.subjectName}

Tema: ${input.nodeTitle}

Brief del tema:
${input.nodeContentBrief}

Extractos relevantes de los materiales:
${input.chunks.map((c, i) => `--- chunk ${i + 1} ---\n${c}`).join('\n\n')}${interestsLine}

Generá la lección con párrafos + quiz.`

  return generate({
    tier: 'fast',
    schema: LessonTextSchema,
    schemaName: 'LessonText',
    schemaDescription:
      'Lección estructurada con párrafos explicativos y quiz multiple-choice. 3-4 párrafos, 2-3 preguntas con 4 opciones cada una y un correctIndex.',
    system: SYSTEM,
    prompt: userPrompt,
    maxTokens: 4096,
  })
}
