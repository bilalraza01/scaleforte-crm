import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCampaigns, useCreateCampaign, useAssignSdrToCampaign } from "@/api/campaigns"
import { useCategories } from "@/api/categories"
import { useUsers } from "@/api/users"
import type { Campaign } from "@/types"

const schema = z.object({
  category_id: z.coerce.number().int().positive(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2025).max(2099),
  status: z.enum(["draft", "active", "closed"]),
})
type Input = z.infer<typeof schema>

export function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: categories } = useCategories()
  const { data: users } = useUsers()
  const create = useCreateCampaign()
  const [assigningTo, setAssigningTo] = useState<Campaign | null>(null)

  const now = new Date()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear(), status: "active" },
  })

  const onSubmit = async (input: Input) => {
    await create.mutateAsync(input)
    reset({ month: now.getMonth() + 1, year: now.getFullYear(), status: "active" })
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Campaigns</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded p-4 grid grid-cols-5 gap-2 items-end">
        <div className="col-span-2">
          <label className="block text-xs font-semibold mb-1">Category</label>
          <select {...register("category_id")} className="w-full border rounded px-2 py-1.5">
            <option value="">— pick —</option>
            {(categories ?? []).filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.category_id && <p className="text-rose-600 text-xs mt-1">required</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Month</label>
          <input type="number" min={1} max={12} {...register("month")} className="w-full border rounded px-2 py-1.5" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Year</label>
          <input type="number" min={2025} max={2099} {...register("year")} className="w-full border rounded px-2 py-1.5" />
        </div>
        <button type="submit" disabled={create.isPending} className="bg-slate-900 text-white rounded py-2 hover:bg-slate-700 disabled:opacity-50">
          {create.isPending ? "Creating…" : "Create campaign"}
        </button>
      </form>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <table className="w-full bg-white shadow rounded">
          <thead className="text-left bg-slate-100">
            <tr>
              <th className="p-3">Campaign</th>
              <th className="p-3">Status</th>
              <th className="p-3">SDRs</th>
              <th className="p-3">Brands</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(campaigns ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.label}</td>
                <td className="p-3"><span className="font-mono text-xs">{c.status}</span></td>
                <td className="p-3">{c.assignments_count}</td>
                <td className="p-3">{c.brands_count}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setAssigningTo(c)} className="text-sm text-blue-600 hover:underline">Assign SDR</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {assigningTo && (
        <AssignModal
          campaign={assigningTo}
          sdrs={(users ?? []).filter((u) => u.role === "sdr" && u.active)}
          onClose={() => setAssigningTo(null)}
        />
      )}
    </div>
  )
}

function AssignModal({ campaign, sdrs, onClose }: {
  campaign: Campaign
  sdrs: { id: number; name: string; email: string }[]
  onClose: () => void
}) {
  const assign = useAssignSdrToCampaign(campaign.id)
  const [sdrId, setSdrId] = useState<number | "">("")
  const [target, setTarget] = useState(50)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Assign SDR to {campaign.label}</h2>
        {error && <div className="bg-rose-100 text-rose-900 text-sm p-2 rounded">{error}</div>}
        <div>
          <label className="block text-xs font-semibold mb-1">SDR</label>
          <select value={sdrId} onChange={(e) => setSdrId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border rounded px-2 py-1.5">
            <option value="">— pick an SDR —</option>
            {sdrs.map((s) => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Target brand count</label>
          <input type="number" min={0} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-full border rounded px-2 py-1.5" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-3 py-2 text-slate-600 hover:underline">Cancel</button>
          <button
            onClick={async () => {
              if (sdrId === "") return setError("Pick an SDR")
              try {
                await assign.mutateAsync({ sdr_id: Number(sdrId), target_count: target })
                onClose()
              } catch {
                setError("Could not assign — already assigned?")
              }
            }}
            disabled={assign.isPending}
            className="px-3 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
          >
            {assign.isPending ? "Saving…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  )
}
