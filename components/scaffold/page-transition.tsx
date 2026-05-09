'use client'

import { motion, type HTMLMotionProps, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

export type TransitionVariant =
  | 'fade'
  | 'fade-up'
  | 'fade-slow'
  | 'slide-horizontal'
  | 'slide-up'
  | 'scale'

const VARIANTS: Record<TransitionVariant, { variants: Variants; duration: number }> = {
  fade: {
    variants: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    duration: 0.3,
  },
  'fade-up': {
    variants: {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -16 },
    },
    duration: 0.35,
  },
  'fade-slow': {
    variants: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    duration: 0.7,
  },
  'slide-horizontal': {
    variants: {
      initial: { opacity: 0, x: 24 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -24 },
    },
    duration: 0.3,
  },
  'slide-up': {
    variants: {
      initial: { opacity: 0, y: 32 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -16 },
    },
    duration: 0.35,
  },
  scale: {
    variants: {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.02 },
    },
    duration: 0.3,
  },
}

interface PageTransitionProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate' | 'exit' | 'transition'> {
  variant?: TransitionVariant
  duration?: number
  delay?: number
  pageKey: string
  children: ReactNode
}

export default function PageTransition({
  variant = 'fade',
  duration,
  delay = 0,
  pageKey,
  children,
  className,
  ...rest
}: PageTransitionProps) {
  const preset = VARIANTS[variant]
  return (
    <motion.div
      key={pageKey}
      variants={preset.variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: duration ?? preset.duration,
        delay,
        ease: [0.32, 0.72, 0, 1],
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
