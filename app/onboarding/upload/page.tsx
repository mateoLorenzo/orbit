'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'motion/react'
import { ArrowRight, FileText, Upload, X } from 'lucide-react'
import PageTransition from '@/components/scaffold/page-transition'

interface UploadedFile {
  id: string
  name: string
  size: number
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
const EASE = [0.32, 0.72, 0, 1] as const

const STAGGER_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const FADE_CHILD: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
}

export default function OnboardingUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const addFiles = (filelist: FileList | File[]) => {
    const incoming = Array.from(filelist).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: f.name,
      size: f.size,
    }))
    setFiles((prev) => [...prev, ...incoming])
  }

  const handleAttachClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const handleContinue = () => {
    router.push('/onboarding/generating')
  }

  const dropzoneBorder = isDragging
    ? 'border-2 border-dashed border-[#FF5C00] bg-[#FF5C00]/4'
    : 'border border-black/8'

  return (
    <PageTransition pageKey="onboarding-upload" variant="fade" className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col">
        <motion.div
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="visible"
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-16"
        >
          <motion.div
            variants={FADE_CHILD}
            className="flex flex-col items-center gap-3 text-center"
          >
            <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.8px] text-black">
              Carga todos tus
              <br />
              archivos de la materia
            </h1>
            <p className="max-w-md text-base leading-relaxed text-black/45">
              La IA se encargará de comprenderla y crear contenido personalizado.
              Podrás gestionar todos los documentos cuando quieras.
            </p>
          </motion.div>

          <motion.div
            variants={FADE_CHILD}
            className="mt-10 w-full"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={`overflow-hidden rounded-2xl bg-white transition-[border-color,background-color] ${dropzoneBorder}`}
            >
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-5 px-6 py-12">
                  <DocumentsIcon />
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-lg font-semibold tracking-[-0.32px] text-black">
                      Suelta o carga tus archivos
                    </p>
                    <p className="text-sm text-black/40">
                      PDF, JPG o PNG hasta 50mb
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-black/12 bg-white px-4 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
                  >
                    <Upload className="size-4" strokeWidth={2.5} />
                    Adjuntar archivos
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  <ul className="flex flex-col">
                    {files.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-3"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/4">
                          <FileText
                            className="size-5 text-black/55"
                            strokeWidth={1.6}
                          />
                        </span>
                        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                          <p
                            className="truncate text-base font-semibold leading-tight tracking-[-0.32px] text-black"
                            title={f.name}
                          >
                            {f.name}
                          </p>
                          <p className="text-sm text-black/40">
                            {formatBytes(f.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(f.id)}
                          aria-label={`Quitar ${f.name}`}
                          className="flex size-9 items-center justify-center rounded-lg border border-black/8 bg-white text-black/50 transition-colors hover:border-black/20 hover:text-black"
                        >
                          <X className="size-4" strokeWidth={2.5} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    className="inline-flex h-11 self-center items-center gap-2 rounded-lg border border-black/12 bg-white px-4 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
                  >
                    <Upload className="size-4" strokeWidth={2.5} />
                    Adjuntar archivos
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {files.length === 0 && (
            <motion.p
              variants={FADE_CHILD}
              className="mt-6 text-center text-sm text-black/40"
            >
              Podrás gestionar todos los documentos cuando quieras.
            </motion.p>
          )}
        </motion.div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
          className="mx-auto flex w-full max-w-3xl items-center justify-center px-6 py-8"
        >
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#FF5C00] px-6 text-base font-medium tracking-[-0.32px] text-white shadow-[0_8px_24px_-12px_rgba(255,92,0,0.6)] transition-[transform,filter] hover:brightness-110 hover:-translate-y-px"
          >
            Continuar
            <ArrowRight className="size-5" strokeWidth={2.5} />
          </button>
        </motion.footer>
      </div>
    </PageTransition>
  )
}

function DocumentsIcon() {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className="size-20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="rotate(-10 32 42)">
        <rect
          x="14"
          y="18"
          width="34"
          height="44"
          rx="3"
          fill="#E8E8E8"
          stroke="#D8D8D8"
        />
        <line x1="20" y1="28" x2="40" y2="28" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="20" y1="34" x2="40" y2="34" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="20" y1="40" x2="36" y2="40" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="20" y1="46" x2="40" y2="46" stroke="#C8C8C8" strokeWidth="1.6" />
      </g>
      <g transform="rotate(8 48 42)">
        <rect
          x="36"
          y="20"
          width="34"
          height="44"
          rx="3"
          fill="#F2F2F2"
          stroke="#D8D8D8"
        />
        <line x1="42" y1="30" x2="62" y2="30" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="42" y1="36" x2="62" y2="36" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="42" y1="42" x2="58" y2="42" stroke="#C8C8C8" strokeWidth="1.6" />
        <line x1="42" y1="48" x2="62" y2="48" stroke="#C8C8C8" strokeWidth="1.6" />
      </g>
    </svg>
  )
}
