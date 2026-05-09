'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import PageTransition from '@/components/scaffold/page-transition'

export default function OnboardingSplashPage() {
  return (
    <PageTransition
      pageKey="onboarding-splash"
      variant="fade-slow"
      className="bg-orange-corners relative flex flex-1 items-center justify-center overflow-hidden"
    >
      <div className="flex flex-col items-center gap-10 px-6 text-center">
        <div className="animate-in fade-in zoom-in-95 duration-700">
          <BrandIcon />
        </div>

        <h1 className="text-[44px] font-semibold leading-[1.1] tracking-[-1.2px]">
          <span className="block text-black animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
            La manera de aprender,
          </span>
          <span className="block text-[#FF5C00] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
            ahora reimaginada
          </span>
        </h1>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500 fill-mode-backwards">
          <Link
            href="/onboarding/level"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#FF5C00] px-5 text-base font-medium tracking-[-0.32px] text-white shadow-[0_8px_24px_-12px_rgba(255,92,0,0.6)] transition-[transform,filter] hover:brightness-110 hover:-translate-y-px"
          >
            Comenzar
            <ArrowRight className="size-5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}

function BrandIcon() {
  return (
    <Image
      src="/svg/icon.svg"
      alt=""
      width={88}
      height={88}
      priority
      aria-hidden
      className="drop-shadow-[0_18px_24px_rgba(255,92,0,0.35)]"
    />
  )
}
