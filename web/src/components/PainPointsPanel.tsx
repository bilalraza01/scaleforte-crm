import { useState } from "react"
import {
  useCreatePainPoint,
  useDeletePainPoint,
  useUpdatePainPoint,
  type PainPointInput,
} from "@/api/painPoints"
import type { PainPoint, PainPointCategory } from "@/types"

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
  const create = useCreatePainPoint(brandId)
  const del = useDeletePainPoint(brandId)
  const [showForm, setShowForm] = useState(painPoints.length === 0)

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
        {painPoints.map((p) => (
          <Row key={p.id} brandId={brandId} pp={p} canEdit={canEdit} onDelete={() => del.mutate(p.id)} />
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

function Row({ brandId, pp, canEdit, onDelete }: {
  brandId: number; pp: PainPoint; canEdit: boolean; onDelete: () => void
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
        <div className="flex gap-2 text-sm ml-2">
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
