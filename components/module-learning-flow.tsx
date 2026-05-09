'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { ContentNode, Subject } from '@/lib/types'

interface ModuleLearningFlowProps {
  subject: Subject
  node: ContentNode
  onExit: () => void
  onContinueNext?: () => void
}

interface ContentStep {
  kind: 'content'
  image: string
  video?: string
  videoLoop?: boolean
  paragraphs: string[]
}

interface QuizStep {
  kind: 'quiz'
  question: string
  options: string[]
  correctIndex: number
}

type Step = { kind: 'intro' } | ContentStep | QuizStep | { kind: 'done' }

const ORANGE = '#ff4f00'

function buildSteps(node: ContentNode): Step[] {
  const baseParagraph = node.description?.trim()
    ? node.description.trim()
    : 'Este contenido fue generado a partir de tus materiales para acompañarte en el estudio del tema.'

  return [
    { kind: 'intro' },
    {
      kind: 'content',
      image: '/learning-landscape.png',
      video: '/SanMartinAndes.mp4',
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
      question: '¿En qué año se completó el cruce de los Andes?',
      options: ['1810', '1817', '1820', '1853'],
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


function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1 w-full overflow-hidden bg-black/4">
      <div
        className="h-full bg-black transition-[width] duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function FlowHeader({ title, percent }: { title: string; percent: number }) {
  return (
    <div className="sticky top-0 z-10 bg-[#f8f8f8]">
      <div className="flex items-center justify-center px-6 py-3">
        <p className="text-base font-medium tracking-[-0.5px] text-black">{title}</p>
      </div>
      <ProgressBar percent={percent} />
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: ORANGE }}
      className={`inline-flex h-10 items-center justify-center gap-1 rounded-lg px-3 text-base font-medium tracking-[-0.32px] text-white transition-all hover:brightness-110 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-black/12 bg-white px-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

interface IntroScreenProps {
  subject: Subject
  node: ContentNode
  onStart: () => void
}

function IntroScreen({ subject, node, onStart }: IntroScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="flex w-full max-w-[920px] flex-col items-center gap-6 text-center">
        <div className="rotate-[5deg] animate-in fade-in zoom-in-95 duration-700">
          <div className="size-16 shrink-0 rounded-[12.8px] bg-black" aria-hidden />
        </div>
        <div className="flex flex-col gap-1 text-[40px] font-medium leading-none tracking-[-0.5px]">
          <p className="opacity-30 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
            {subject.name}
          </p>
          <p className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
            ¿Listo para comenzar el tema?
          </p>
        </div>
        <p className="max-w-md text-base text-black/50 animate-in fade-in duration-700 delay-500 fill-mode-backwards">
          {node.title}
        </p>
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500 fill-mode-backwards">
          <PrimaryButton onClick={onStart}>
            Comenzar
            <ArrowRight className="size-5" strokeWidth={2} />
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

interface ContentScreenProps {
  step: ContentStep
  voice: string
  onChangeVoice: () => void
  onBack: () => void
  onNext: () => void
}

function ContentScreen({ step, voice, onChangeVoice, onBack, onNext }: ContentScreenProps) {
  const fadedAfter = 1
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex min-h-[480px] flex-1 flex-col gap-6 lg:flex-row">
        {/* Left column - text + voice */}
        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl bg-white lg:w-[420px] lg:shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="relative flex-1 overflow-hidden p-6">
            <div className="space-y-4 text-[20px] leading-[1.25] font-medium tracking-[-0.5px] text-black">
              {step.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`${i > fadedAfter ? 'text-black/24' : 'text-black'} animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards`}
                  style={{ animationDelay: `${i * 90 + 100}ms` }}
                >
                  {p}
                </p>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
          </div>
          <div className="border-t border-black/4 p-6">
            <div className="flex items-center gap-3 rounded-xl bg-[#f8f8f8] p-4">
              <div className="size-10 shrink-0 rounded-full bg-black/10" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium leading-none tracking-[-0.5px] text-black/40">
                  Voz elegida
                </p>
                <p className="mt-1 truncate text-base font-medium leading-none tracking-[-0.5px] text-black">
                  {voice}
                </p>
              </div>
              <SecondaryButton onClick={onChangeVoice}>Cambiar</SecondaryButton>
            </div>
          </div>
        </div>

        {/* Right column - media (video or image) */}
        <div className="relative flex-1 overflow-hidden rounded-xl bg-black/4 animate-in fade-in zoom-in-95 duration-700">
          {step.video ? (
            <video
              key={step.video}
              src={step.video}
              poster={step.image}
              autoPlay
              loop={step.videoLoop !== false}
              muted
              playsInline
              onEnded={(e) => {
                // Park on the last frame instead of resetting / showing controls
                const v = e.currentTarget
                v.pause()
                v.currentTime = Math.max(0, v.duration - 0.001)
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={step.image}
              alt="Ilustración del tema"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 flex items-end justify-end p-4">
            <SecondaryButton>Abrir</SecondaryButton>
          </div>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-6">
        <SecondaryButton onClick={onBack}>Volver</SecondaryButton>
        <p className="flex-1 text-center text-sm font-medium tracking-[-0.5px] text-black/30">
          Podrás avanzar hacia el próximo paso cuando finalices de ver el contenido.
        </p>
        <PrimaryButton onClick={onNext}>Siguiente</PrimaryButton>
      </div>
    </div>
  )
}

interface QuizScreenProps {
  step: QuizStep
  selectedIndex: number | null
  onSelect: (index: number) => void
  onContinue: () => void
}

function QuizScreen({ step, selectedIndex, onSelect, onContinue }: QuizScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 lg:px-[12vw]">
      <div className="flex w-full max-w-[640px] flex-col gap-2 text-center text-[40px] font-medium leading-none tracking-[-0.5px]">
        <p className="opacity-30 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
          Una breve pregunta
        </p>
        <p className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-backwards">
          {step.question}
        </p>
      </div>

      <div className="flex w-full max-w-[640px] flex-col gap-3">
        {step.options.map((option, i) => {
          const selected = selectedIndex === i
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(i)}
              style={{ animationDelay: `${i * 80 + 250}ms` }}
              className={`flex h-16 w-full items-center justify-center rounded-xl bg-white px-5 text-2xl font-medium tracking-[-0.5px] text-black transition-[border-color,box-shadow,transform] duration-200 animate-in fade-in slide-in-from-bottom-2 animation-duration-500 fill-mode-backwards ${
                selected
                  ? 'border-2 border-black shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                  : 'border-2 border-transparent hover:border-black/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-3 animate-in fade-in duration-500 delay-700 fill-mode-backwards">
        <PrimaryButton onClick={onContinue}>
          Continuar
          <ArrowRight className="size-5" strokeWidth={2} />
        </PrimaryButton>
        <p className="text-sm font-medium tracking-[-0.28px] text-black/40">
          Sabrás la respuesta correcta al finalizar el tema
        </p>
      </div>
    </div>
  )
}

interface DoneScreenProps {
  node: ContentNode
  onContinueNext: () => void
  onBackToSubject: () => void
}

function DoneScreen({ node, onContinueNext, onBackToSubject }: DoneScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="flex w-full max-w-[460px] flex-col items-center gap-6 text-center">
        <div className="rotate-[5deg] animate-in fade-in zoom-in-50 duration-700">
          <div className="size-16 shrink-0 rounded-[12.8px] bg-black" aria-hidden />
        </div>
        <div className="flex flex-col gap-1 text-[40px] font-medium leading-none tracking-[-0.5px]">
          <p
            className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards"
            style={{ color: ORANGE }}
          >
            ¡Bien hecho!
          </p>
          <p className="text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
            Completaste el tema
          </p>
          <p className="text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-backwards">
            {node.title}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700 fill-mode-backwards">
          <PrimaryButton onClick={onContinueNext} className="w-full">
            Continuar hacia el siguiente
          </PrimaryButton>
          <SecondaryButton onClick={onBackToSubject} className="w-full">
            Volver a Historia
          </SecondaryButton>
        </div>
      </div>
    </div>
  )
}

const VOICE_OPTIONS = ['San Martín', 'Belgrano', 'Sarmiento', 'Voz neutra']

export default function ModuleLearningFlow({
  subject,
  node,
  onExit,
  onContinueNext,
}: ModuleLearningFlowProps) {
  const steps = useMemo(() => buildSteps(node), [node])
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [voiceIndex, setVoiceIndex] = useState(0)

  const step = steps[currentStep]
  const totalProgressSteps = steps.filter((s) => s.kind === 'content' || s.kind === 'quiz').length
  const completedProgressSteps = steps
    .slice(0, currentStep + 1)
    .filter((s) => s.kind === 'content' || s.kind === 'quiz').length
  const progressPercent =
    step.kind === 'intro' || step.kind === 'done'
      ? 0
      : (completedProgressSteps / totalProgressSteps) * 100

  const showHeader = step.kind === 'content' || step.kind === 'quiz'

  const goNext = () => {
    setDirection('forward')
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }
  const goPrev = () => {
    setDirection('backward')
    if (currentStep > 0) setCurrentStep(currentStep - 1)
    else onExit()
  }
  const cycleVoice = () => setVoiceIndex((v) => (v + 1) % VOICE_OPTIONS.length)
  const handleSelect = (index: number) =>
    setSelections((prev) => ({ ...prev, [currentStep]: index }))

  const enterAnimation =
    direction === 'forward'
      ? 'animate-in fade-in slide-in-from-right-4 duration-500 ease-out'
      : 'animate-in fade-in slide-in-from-left-4 duration-500 ease-out'

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f8] text-black">
      {showHeader && <FlowHeader title={subject.name} percent={progressPercent} />}

      <div key={currentStep} className={`flex flex-1 flex-col ${enterAnimation}`}>
        {step.kind === 'intro' && (
          <IntroScreen subject={subject} node={node} onStart={goNext} />
        )}
        {step.kind === 'content' && (
          <ContentScreen
            step={step}
            voice={VOICE_OPTIONS[voiceIndex]}
            onChangeVoice={cycleVoice}
            onBack={goPrev}
            onNext={goNext}
          />
        )}
        {step.kind === 'quiz' && (
          <QuizScreen
            step={step}
            selectedIndex={selections[currentStep] ?? null}
            onSelect={handleSelect}
            onContinue={goNext}
          />
        )}
        {step.kind === 'done' && (
          <DoneScreen
            node={node}
            onContinueNext={() => {
              if (onContinueNext) onContinueNext()
              else onExit()
            }}
            onBackToSubject={onExit}
          />
        )}
      </div>
    </div>
  )
}
