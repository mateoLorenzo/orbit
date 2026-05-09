import Link from 'next/link'

const ROUTES = [
  {
    section: 'Slides intro',
    items: [
      { href: '/slides/1', label: '/slides/1 — apertura' },
      { href: '/slides/2', label: '/slides/2' },
      { href: '/slides/3', label: '/slides/3' },
      { href: '/slides/4', label: '/slides/4' },
      { href: '/slides/5', label: '/slides/5 — claim final' },
    ],
  },
  {
    section: 'Onboarding',
    items: [
      { href: '/onboarding', label: '/onboarding — splash' },
      { href: '/onboarding/level', label: '/onboarding/level' },
      { href: '/onboarding/career', label: '/onboarding/career' },
      { href: '/onboarding/upload', label: '/onboarding/upload' },
      { href: '/onboarding/generating', label: '/onboarding/generating' },
      { href: '/onboarding/roadmap', label: '/onboarding/roadmap' },
      { href: '/onboarding/ready', label: '/onboarding/ready' },
    ],
  },
  {
    section: 'Lesson (nodeId = "demo")',
    items: [
      { href: '/lesson/demo/start', label: '/lesson/demo/start' },
      { href: '/lesson/demo/slides/0', label: '/lesson/demo/slides/0' },
      { href: '/lesson/demo/slides/1', label: '/lesson/demo/slides/1' },
      { href: '/lesson/demo/quiz/0', label: '/lesson/demo/quiz/0' },
      { href: '/lesson/demo/done', label: '/lesson/demo/done' },
    ],
  },
  {
    section: 'App actual',
    items: [{ href: '/', label: '/ — home actual (sin migrar todavía)' }],
  },
]

export default function DevIndexPage() {
  return (
    <div className="min-h-screen bg-[#f8f8f8] p-10 text-black">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-black/40">
            Dev · Index de rutas
          </p>
          <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-0.5px]">
            Scaffolds
          </h1>
          <p className="text-base text-black/60">
            Cada ruta es un placeholder — describe la pantalla y avanza al
            siguiente paso. La UI real se construye encima en pasos sucesivos.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {ROUTES.map((group) => (
            <section key={group.section} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-black/50">
                {group.section}
              </h2>
              <ul className="flex flex-col overflow-hidden rounded-xl border border-black/8 bg-white">
                {group.items.map((item) => (
                  <li key={item.href} className="border-b border-black/6 last:border-b-0">
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-base font-medium tracking-[-0.32px] text-black transition-colors hover:bg-black/4"
                    >
                      <span className="font-mono text-sm">{item.label}</span>
                      <span className="text-xs text-black/40">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
