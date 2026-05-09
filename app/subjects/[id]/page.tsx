'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppSidebar from '@/components/app-sidebar'
import SubjectDetailView from '@/components/subject-detail-view'
import { useApp } from '@/lib/app-context'

export default function SubjectDetailPage() {
  const params = useParams()
  const id = (params.id as string) ?? ''
  const { subjects } = useApp()

  const subject = subjects.find((s) => s.id === id)

  if (!subject) {
    return (
      <div className="flex min-h-screen bg-[#f8f8f8] text-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-2xl font-medium tracking-[-0.5px]">Materia no encontrada</p>
            <p className="text-base text-black/50">
              No pudimos encontrar la materia que estás buscando.
            </p>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-base font-medium tracking-[-0.32px] text-white transition-colors hover:bg-black/90"
            >
              Volver al inicio
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return <SubjectDetailView subject={subject} />
}
