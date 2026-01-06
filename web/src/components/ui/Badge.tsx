import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Tone =
  | "neutral" | "indigo" | "emerald" | "amber" | "rose" | "slate" | "sky"

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  slate:   "bg-slate-200 text-slate-800",
  indigo:  "bg-indigo-50 text-indigo-700 border border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  amber:   "bg-amber-50 text-amber-800 border border-amber-100",
  rose:    "bg-rose-50 text-rose-700 border border-rose-100",
  sky:     "bg-sky-50 text-sky-700 border border-sky-100",
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

// Maps brand status -> tone for consistent badges across pages.
export function statusTone(status: string): Tone {
  switch (status) {
    case "draft":       return "slate"
    case "in_progress": return "indigo"
    case "ready":       return "amber"
    case "approved":    return "sky"
    case "pushed":      return "emerald"
    case "skipped":     return "rose"
    default:            return "neutral"
  }
}
