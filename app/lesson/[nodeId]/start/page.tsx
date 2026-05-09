'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, type Variants } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import PageTransition from '@/components/scaffold/page-transition'

const EASE = [0.32, 0.72, 0, 1] as const

const FADE_CHILD: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7, ease: EASE } },
}

const FADE_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
}

const MOCK_LESSON = {
  number: 2,
  topic: 'El cruce de los Andes',
}

export default function LessonStartPage() {
  const params = useParams()
  const nodeId = (params.nodeId as string) ?? 'demo'

  return (
    <PageTransition
      pageKey="lesson-start"
      variant="fade-slow"
      className="relative flex flex-1 items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 70% 80% at 50% 50%, #ffffff 0%, #ffffff 28%, rgba(255, 92, 0, 0.45) 75%, #FF5C00 100%)',
      }}
    >
      <motion.div
        variants={FADE_CONTAINER}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-6 px-6 text-center"
      >
        <motion.div variants={FADE_CHILD}>
          <span className="inline-flex items-center rounded-lg border border-black/12 bg-white px-4 py-2 text-base font-medium tracking-[-0.32px] text-black">
            Clase {MOCK_LESSON.number}
          </span>
        </motion.div>

        <motion.h1
          variants={FADE_CHILD}
          className="text-[44px] font-semibold leading-[1.1] tracking-[-1.2px]"
        >
          <span className="block text-[#FF5C00]">{MOCK_LESSON.topic}</span>
          <span className="block text-black">¿Listo para comenzar el tema?</span>
        </motion.h1>

        <motion.div variants={FADE_CHILD}>
          <Link
            href={`/lesson/${nodeId}/slides/0`}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#FF5C00] px-5 text-base font-medium tracking-[-0.32px] text-white shadow-[0_8px_24px_-12px_rgba(255,92,0,0.6)] transition-[transform,filter] hover:brightness-110 hover:-translate-y-px"
          >
            Comenzar
            <ArrowRight className="size-5" strokeWidth={2.5} />
          </Link>
        </motion.div>
      </motion.div>
    </PageTransition>
  )
}
