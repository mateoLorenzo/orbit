'use client'

import { Folder, Settings2, User } from 'lucide-react'

export default function AppSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[88px] shrink-0 flex-col items-center gap-6 border-r border-black/8 p-6">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e1e1e1] text-black/45"
        aria-hidden
      >
        <User className="size-5" strokeWidth={2} />
      </div>
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
