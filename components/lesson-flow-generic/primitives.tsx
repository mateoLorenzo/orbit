'use client'

interface FlowHeaderProps {
  title: string
  percent: number
}

export function FlowHeader({ title, percent }: FlowHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-black/8 bg-white px-6 py-4">
      <p className="text-center text-base font-medium tracking-[-0.32px] text-black">{title}</p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/8">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </header>
  )
}
