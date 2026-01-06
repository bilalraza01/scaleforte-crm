import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Stat({
  label,
  value,
  delta,
  hint,
  icon,
  tone = "neutral",
  className,
}: {
  label: string
  value: ReactNode
  delta?: { value: string; positive?: boolean }
  hint?: string
  icon?: ReactNode
  tone?: "neutral" | "emerald" | "indigo" | "amber" | "rose"
  className?: string
}) {
  const accent = {
    neutral: "bg-slate-50 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo:  "bg-indigo-50 text-indigo-600",
    amber:   "bg-amber-50 text-amber-600",
    rose:    "bg-rose-50 text-rose-600",
  }[tone]

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
        {icon && <span className={cn("h-8 w-8 rounded-lg grid place-items-center", accent)}>{icon}</span>}
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-900 tabular-nums">{value}</div>
      {(delta || hint) && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {delta && (
            <span className={delta.positive ? "text-emerald-600" : "text-rose-600"}>
              {delta.value}
            </span>
          )}
          {hint && <span className="text-slate-500">{hint}</span>}
        </div>
      )}
    </div>
  )
}
