import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const fieldClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props }, ref
) {
  return <input ref={ref} {...props} className={cn(fieldClass, className)} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props }, ref
) {
  return (
    <select ref={ref} {...props} className={cn(fieldClass, "pr-8 appearance-none bg-no-repeat bg-right", className)}>
      {children}
    </select>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props }, ref
) {
  return <textarea ref={ref} {...props} className={cn(fieldClass, "resize-y", className)} />
})

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-xs font-medium text-slate-700 mb-1.5", className)}>
      {children}
    </label>
  )
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p className="text-rose-600 text-xs mt-1">{children}</p>
}
