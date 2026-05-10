'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Folder, Settings2 } from 'lucide-react'

export default function AppSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[88px] shrink-0 flex-col items-center gap-6 border-r border-black/8 p-6">
      <Link href="/" aria-label="Ir al inicio" className="shrink-0">
        <Image
          src="/svg/icon.svg"
          alt="Orbit"
          width={40}
          height={40}
          className="size-10"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      </Link>
      <div className="h-px w-4 shrink-0 bg-black/8" aria-hidden />

      <nav className="flex flex-1 flex-col items-center gap-3">
        <button
          type="button"
          aria-label="Materias"
          aria-current="page"
          className="flex size-10 items-center justify-center rounded-lg bg-black text-white"
        >
          <Folder className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Ajustes"
          className="flex size-10 items-center justify-center rounded-lg border border-black/8 text-black/50 transition-colors hover:text-black"
        >
          <Settings2 className="size-4" />
        </button>
      </nav>

      <button
        type="button"
        aria-label="Cuenta"
        className="flex size-10 items-center justify-center rounded-lg bg-black/4 text-base font-medium tracking-[-0.5px] text-black/40"
      >
        JV
      </button>
    </aside>
  )
}
