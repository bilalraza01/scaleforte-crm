import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)]", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide">
      {children}
    </thead>
  )
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cn("border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50", className)} />
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={cn("text-left font-medium px-4 py-3", className)} />
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cn("px-4 py-3 text-slate-700", className)} />
}
