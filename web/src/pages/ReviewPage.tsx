import { Link } from "react-router-dom"
import { useBrands } from "@/api/brands"

export function ReviewPage() {
  const { data: brands, isLoading } = useBrands({ status: "ready" })

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Awaiting review</h1>
      <p className="text-slate-600 text-sm">
        Brands marked Ready by an SDR, waiting for Manager / Admin to approve or send back.
      </p>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      {brands && brands.length === 0 && (
        <p className="text-slate-400 text-sm">Nothing in the queue right now.</p>
      )}

      {brands && brands.length > 0 && (
        <div className="bg-white shadow rounded divide-y">
          {brands.map((b) => (
            <Link
              key={b.id}
              to={`/brands/${b.id}`}
              className="block px-4 py-3 hover:bg-slate-50 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{b.brand_name || b.amazon_seller_id}</div>
                <div className="text-xs text-slate-500">
                  Sourced by {b.sdr_name || "—"} · {b.contacts.length} contact{b.contacts.length === 1 ? "" : "s"}
                  · {b.pain_points.length} pain point{b.pain_points.length === 1 ? "" : "s"}
                  · {b.audit_screenshots.length} screenshot{b.audit_screenshots.length === 1 ? "" : "s"}
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-1 bg-slate-100 rounded">{b.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
