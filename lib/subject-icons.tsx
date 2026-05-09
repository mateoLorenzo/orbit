import type { LucideIcon } from 'lucide-react'
import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Laptop,
  Library,
  Music,
  Palette,
  Ruler,
} from 'lucide-react'

export const subjectIconMap: Record<string, LucideIcon> = {
  book: BookOpen,
  ruler: Ruler,
  atom: Atom,
  laptop: Laptop,
  palette: Palette,
  flask: FlaskConical,
  library: Library,
  calculator: Calculator,
  globe: Globe,
  music: Music,
}

export const subjectIcons: string[] = Object.keys(subjectIconMap)

interface SubjectIconProps {
  name: string
  className?: string
  strokeWidth?: number
}

export function SubjectIcon({ name, className, strokeWidth = 2 }: SubjectIconProps) {
  const Icon = subjectIconMap[name] ?? BookOpen
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />
}
