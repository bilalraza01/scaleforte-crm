import { useState, useRef, type DragEvent } from "react"
import {
  useDeleteAuditScreenshot,
  useUploadAuditScreenshot,
} from "@/api/auditScreenshots"
import type { AuditScreenshot } from "@/types"
import { cn } from "@/lib/utils"

const MAX_BYTES = 5 * 1024 * 1024
const MAX_PER_BRAND = 5
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function AuditScreenshotsPanel({
  brandId,
  screenshots,
  canEdit,
}: {
  brandId: number
  screenshots: AuditScreenshot[]
  canEdit: boolean
}) {
  const upload = useUploadAuditScreenshot(brandId)
  const del = useDeleteAuditScreenshot(brandId)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = Math.max(0, MAX_PER_BRAND - screenshots.length)
  const atCap = remaining === 0

  const handleFiles = async (files: FileList | null) => {
    setError(null)
    if (!files) return
    const incoming = Array.from(files)
    if (incoming.length > remaining) {
      setError(`Can only attach ${remaining} more (${MAX_PER_BRAND} max per brand). Extras were ignored.`)
    }
    for (const file of incoming.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`${file.name}: only JPG/PNG/WebP allowed`)
        continue
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: exceeds 5 MB`)
        continue
      }
      try {
        await upload.mutateAsync(file)
      } catch {
        setError(`${file.name}: upload failed`)
      }
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (canEdit && !atCap) void handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-600">
          Audit screenshots ({screenshots.length} / {MAX_PER_BRAND})
        </h3>
      </div>

      {error && <div className="bg-rose-100 text-rose-900 text-sm p-2 rounded mb-2">{error}</div>}

      {canEdit && (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!atCap) setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => { if (!atCap) inputRef.current?.click() }}
          className={cn(
            "border-2 border-dashed rounded p-4 text-center text-sm transition-colors",
            atCap
              ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
              : "cursor-pointer " + (dragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")
          )}
          aria-disabled={atCap}
        >
          {atCap
            ? `Limit reached — delete one to add another (max ${MAX_PER_BRAND} per brand).`
            : upload.isPending
              ? "Uploading…"
              : `Drop a screenshot here, or click to pick a file (JPG/PNG/WebP, ≤ 5 MB). ${remaining} slot${remaining === 1 ? "" : "s"} left.`}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            disabled={atCap}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2">
        {screenshots.map((s) => (
          <div key={s.id} className="border rounded overflow-hidden bg-white relative group">
            <img src={s.url} alt={s.filename} className="w-full h-32 object-cover" />
            <div className="p-1 text-xs text-slate-600 truncate" title={s.filename}>
              {s.filename}
            </div>
            {canEdit && (
              <button
                onClick={() => confirm("Delete screenshot?") && del.mutate(s.id)}
                className="absolute top-1 right-1 bg-rose-600 text-white rounded text-xs px-1.5 py-0.5 opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
