'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import PageTransition from '@/components/scaffold/page-transition'

export default function OnboardingReadyPage() {
  return (
    <PageTransition
      pageKey="onboarding-ready"
      variant="fade-slow"
      className="bg-orange-corners relative flex flex-1 items-center justify-center overflow-hidden"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-8 px-6 text-center">
        <div className="animate-in fade-in zoom-in-95 duration-700">
          <CheckIcon />
        </div>

        <h1 className="text-[44px] font-semibold leading-[1.1] tracking-[-1.2px]">
          <span className="block text-[#FF5C00] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
            ¡Bien hecho!
          </span>
          <span className="block text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
            Ya podes comenzar
          </span>
          <span className="block text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-backwards">
            a aprender
          </span>
        </h1>

        <div className="flex w-full flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700 fill-mode-backwards">
          <Link
            href="/subjects/1/lessons/c2"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#FF5C00] px-5 text-base font-medium tracking-[-0.32px] text-white shadow-[0_8px_24px_-12px_rgba(255,92,0,0.6)] transition-[transform,filter] hover:brightness-110 hover:-translate-y-px"
          >
            Comenzar ahora
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-black/12 bg-white px-5 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
          >
            Ir a Mis materias
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}

function CheckIcon() {
  return (
    <div
      className="flex size-[88px] -rotate-[8deg] items-center justify-center rounded-[22px] shadow-[0_18px_40px_-12px_rgba(255,92,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]"
      style={{
        background: 'linear-gradient(150deg, #FF7A1F 0%, #FF5C00 55%, #E64A00 100%)',
      }}
      aria-hidden
    >
      <Check className="size-11 text-white" strokeWidth={3} />
    </div>
  )
}
