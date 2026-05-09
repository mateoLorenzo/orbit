'use client'

import { AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'

export default function SlidesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8]">
      <AnimatePresence mode="wait">{children}</AnimatePresence>
    </div>
  )
}
