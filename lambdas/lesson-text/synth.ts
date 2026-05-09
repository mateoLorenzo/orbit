import { callTool } from '../_shared/anthropic'

export interface LessonText {
  paragraphs: string[]
  quiz: Array<{
    question: string
    options: string[]   // exactly 4
    correctIndex: number  // 0-3
  }>
}

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

const TOOL_SCHEMA = {
  type: 'object',
  properties: {
    paragraphs: {
      type: 'array',
      items: { type: 'string', minLength: 50, maxLength: 800 },
      minItems: 3,
      maxItems: 4,
    },
    quiz: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', minLength: 10, maxLength: 250 },
          options: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 200 },
            minItems: 4,
            maxItems: 4,
          },
          correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
        },
        required: ['question', 'options', 'correctIndex'],
      },
    },
  },
  required: ['paragraphs', 'quiz'],
}

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

  return callTool<LessonText>({
    model: 'fast',
    system: SYSTEM,
    user: userPrompt,
    toolName: 'submit_lesson',
    toolDescription: 'Devuelve la lección estructurada con párrafos explicativos y quiz multiple-choice.',
    inputSchema: TOOL_SCHEMA,
    maxTokens: 4096,
  })
}
