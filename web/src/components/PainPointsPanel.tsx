import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useCreatePainPoint,
  useDeletePainPoint,
  useUpdatePainPoint,
  type PainPointInput,
} from "@/api/painPoints"
import { http } from "@/lib/http"
import type { PainPoint, PainPointCategory } from "@/types"
import { ChevronUp, ChevronDown } from "lucide-react"

const CATEGORIES: { value: PainPointCategory; label: string }[] = [
  { value: "listing_copy", label: "Listing copy" },
  { value: "images", label: "Images" },
  { value: "reviews", label: "Reviews" },
  { value: "ppc", label: "PPC" },
  { value: "inventory", label: "Inventory" },
  { value: "pricing", label: "Pricing" },
  { value: "other", label: "Other" },
]

export function PainPointsPanel({
  brandId,
  painPoints,
  canEdit,
}: {
  brandId: number
  painPoints: PainPoint[]
  canEdit: boolean
}) {
  const qc = useQueryClient()
  const create = useCreatePainPoint(brandId)
  const del = useDeletePainPoint(brandId)
  const [showForm, setShowForm] = useState(painPoints.length === 0)
  const [moving, setMoving] = useState(false)

  // Pain points are pushed to Smartlead as numbered merge vars
  // (pain_point_1, pain_point_2, …) and pair with audit screenshots in
  // the same slot order — so the SDR controls that pairing here by
  // moving items up/down (Changes to be made in the CRM #11).
  const sorted = [...painPoints].sort((a, b) =>
    a.display_order === b.display_order ? a.id - b.id : a.display_order - b.display_order
  )

  // Swap the display_order of two adjacent pain points. Two parallel
  // PATCHes (one per row) then invalidate the brand query so the panel
  // re-renders in the new order.
  const swap = async (a: PainPoint, b: PainPoint) => {
    setMoving(true)
    try {
      await Promise.all([
        http.patch(`/api/v1/brands/${brandId}/pain_points/${a.id}`, {
          pain_point: { display_order: b.display_order },
        }),
        http.patch(`/api/v1/brands/${brandId}/pain_points/${b.id}`, {
          pain_point: { display_order: a.display_order },
        }),
      ])
      await qc.invalidateQueries({ queryKey: ["brands", brandId] })
    } finally {
      setMoving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-600">Pain points ({painPoints.length})</h3>
        {canEdit && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-sm text-blue-600 hover:underline">
            + Add pain point
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sorted.map((p, idx) => (
          <Row
            key={p.id}
            brandId={brandId}
            pp={p}
            canEdit={canEdit}
            onDelete={() => del.mutate(p.id)}
            canMoveUp={canEdit && idx > 0 && !moving}
            canMoveDown={canEdit && idx < sorted.length - 1 && !moving}
            onMoveUp={() => swap(sorted[idx], sorted[idx - 1])}
            onMoveDown={() => swap(sorted[idx], sorted[idx + 1])}
          />
        ))}

        {showForm && canEdit && (
          <PainPointForm
            onCancel={() => setShowForm(false)}
            onSubmit={async (input) => {
              await create.mutateAsync(input)
              setShowForm(false)
            }}
            saving={create.isPending}
          />
        )}
      </div>
    </div>
  )
}

function Row({ brandId, pp, canEdit, onDelete, canMoveUp, canMoveDown, onMoveUp, onMoveDown }: {
  brandId: number
  pp: PainPoint
  canEdit: boolean
  onDelete: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [editing, setEditing] = useState(false)
  const update = useUpdatePainPoint(brandId, pp.id)

  if (editing) {
    return (
      <PainPointForm
        defaultValue={{ category: pp.category, description: pp.description ?? "" }}
        onCancel={() => setEditing(false)}
        onSubmit={async (input) => {
          await update.mutateAsync(input)
          setEditing(false)
        }}
        saving={update.isPending}
      />
    )
  }

  const labelFor = CATEGORIES.find((c) => c.value === pp.category)?.label ?? pp.category

  return (
    <div className="border rounded p-2 flex justify-between items-start">
      <div className="flex-1">
        <div className="text-xs font-mono text-slate-500">{labelFor}</div>
        <div className="text-sm">{pp.description}</div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 text-sm ml-2">
          <div className="flex flex-col">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move up"
              title="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move down"
              title="Move down"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <button onClick={() => setEditing(true)} className="text-blue-600 hover:underline">Edit</button>
          <button onClick={() => confirm("Delete?") && onDelete()} className="text-rose-600 hover:underline">Delete</button>
        </div>
      )}
    </div>
  )
}

function PainPointForm({
  defaultValue,
  onSubmit,
  onCancel,
  saving,
}: {
  defaultValue?: PainPointInput
  onSubmit: (input: PainPointInput) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [category, setCategory] = useState<PainPointCategory>(defaultValue?.category ?? "listing_copy")
  const [description, setDescription] = useState(defaultValue?.description ?? "")

  return (
    <div className="border-2 border-dashed rounded p-2 space-y-2 bg-slate-50">
      <select value={category} onChange={(e) => setCategory(e.target.value as PainPointCategory)} className="w-full border rounded px-2 py-1.5 text-sm">
        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <textarea
        rows={2}
        maxLength={500}
        placeholder="Free-text observation (max 500 chars)"
        value={description ?? ""}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border rounded px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit({ category, description })}
          disabled={saving}
          className="px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50 text-sm"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-slate-600 hover:underline text-sm">Cancel</button>
      </div>
    </div>
  )
}
