import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useBrands } from "@/api/brands"
import { useCreatePush, usePush, type PushReceipt } from "@/api/pushes"
import { useSmartleadConfig } from "@/api/smartlead"

export function PushPage() {
  const { data: config } = useSmartleadConfig()
  const { data: approvedResp, isLoading } = useBrands({ status: "approved", per_page: 200 })
  const approved = approvedResp?.data
  const create = useCreatePush()
  const navigate = useNavigate()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [smartleadCampaignId, setSmartleadCampaignId] = useState("")

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const onPush = async () => {
    if (selected.size === 0) return alert("Pick at least one brand.")
    if (!smartleadCampaignId) return alert("Enter the Smartlead campaign id.")
    const receipt = await create.mutateAsync({
      brand_ids: Array.from(selected),
      smartlead_campaign_id: Number(smartleadCampaignId),
    })
    navigate(`/acquisition/push/${receipt.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Push to Smartlead</h1>

      {!config?.configured && (
        <div className="bg-amber-100 text-amber-900 text-sm p-3 rounded">
          Smartlead is not configured yet. Add an API key in Settings before pushing.
        </div>
      )}

      <div className="bg-white shadow rounded p-4 space-y-2">
        <label className="block text-sm font-semibold">Smartlead campaign id</label>
        <input
          value={smartleadCampaignId}
          onChange={(e) => setSmartleadCampaignId(e.target.value)}
          placeholder="e.g. 4521"
          className="w-full border rounded px-2 py-1.5"
        />
        <p className="text-xs text-slate-500">
          Find this in the Smartlead dashboard or use the configured per-category default.
        </p>
      </div>

      {isLoading && <p className="text-slate-500">Loading approved brands…</p>}
      {approved && approved.length === 0 && (
        <p className="text-slate-400 text-sm">No approved brands. Have a Manager approve some first.</p>
      )}

      {approved && approved.length > 0 && (
        <table className="w-full bg-white shadow rounded">
          <thead className="text-left bg-slate-100">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === approved.length}
                  onChange={() =>
                    setSelected(selected.size === approved.length ? new Set() : new Set(approved.map((b) => b.id)))
                  }
                />
              </th>
              <th className="p-3">Brand</th>
              <th className="p-3">Sourced by</th>
              <th className="p-3">Primary contact</th>
            </tr>
          </thead>
          <tbody>
            {approved.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                </td>
                <td className="p-3 font-medium">{b.brand_name || b.amazon_seller_id}</td>
                <td className="p-3 text-slate-600">{b.sdr_name ?? "—"}</td>
                <td className="p-3 text-slate-600">
                  {b.contacts.find((c) => c.is_primary)?.email ?? b.contacts[0]?.email ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="sticky bottom-0 bg-white border-t shadow p-3 flex justify-between items-center">
        <span className="text-sm text-slate-600">{selected.size} selected</span>
        <button
          onClick={onPush}
          disabled={create.isPending || selected.size === 0 || !config?.configured}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          {create.isPending ? "Pushing…" : `Push ${selected.size} to Smartlead`}
        </button>
      </div>
    </div>
  )
}

export function PushDetailPage() {
  const id = Number(window.location.pathname.split("/").pop())
  const { data: receipt, isLoading } = usePush(id)
  if (isLoading || !receipt) return <div className="p-6 text-slate-500">Loading push…</div>
  return <PushDetail receipt={receipt} />
}

function PushDetail({ receipt }: { receipt: PushReceipt }) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Push #{receipt.id}</h1>

      <div className="bg-white shadow rounded p-4 grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-slate-500">Status</span>
        <span><span className="font-mono text-xs px-2 py-1 bg-slate-100 rounded">{receipt.status}</span></span>
        <span className="text-slate-500">Smartlead campaign</span>
        <span>{receipt.smartlead_campaign_id}</span>
        <span className="text-slate-500">Total / success / failure</span>
        <span>{receipt.total_count} / <span className="text-emerald-700">{receipt.success_count}</span> / <span className="text-rose-700">{receipt.failure_count}</span></span>
        <span className="text-slate-500">Started</span>
        <span>{receipt.started_at ? new Date(receipt.started_at).toLocaleString() : "—"}</span>
        <span className="text-slate-500">Finished</span>
        <span>{receipt.finished_at ? new Date(receipt.finished_at).toLocaleString() : "—"}</span>
      </div>

      {receipt.details.failures && receipt.details.failures.length > 0 && (
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-sm font-semibold text-rose-700 mb-2">Failures</h2>
          <ul className="text-sm space-y-1">
            {receipt.details.failures.map((f, i) => (
              <li key={i}>brand #{f.brand_id}: {f.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
