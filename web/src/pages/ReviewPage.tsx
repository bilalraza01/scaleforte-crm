import { Link } from "react-router-dom"
import { useBrands } from "@/api/brands"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Badge, statusTone } from "@/components/ui/Badge"
import { ArrowRight, Inbox } from "lucide-react"

export function ReviewPage() {
  const { data, isLoading } = useBrands({ status: "ready", per_page: 200 })
  const brands = data?.data

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Awaiting review"
        subtitle="Brands marked Ready by an SDR, waiting for Manager / Admin to approve or send back."
      />

      {isLoading && <p className="text-slate-500">Loading…</p>}

      {brands && brands.length === 0 && (
        <Card className="p-10 text-center">
          <Inbox className="mx-auto text-slate-300 mb-3" size={32} />
          <p className="text-slate-500 text-sm">Nothing in the queue right now.</p>
        </Card>
      )}

      {brands && brands.length > 0 && (
        <Card className="divide-y divide-slate-100">
          {brands.map((b) => (
            <Link
              key={b.id}
              to={`/acquisition/brands/${b.id}`}
              className="block px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">{b.brand_name || b.amazon_seller_id}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Sourced by <span className="text-slate-700">{b.sdr_name || "—"}</span>
                    {" · "} {b.contacts.length} contact{b.contacts.length === 1 ? "" : "s"}
                    {" · "} {b.pain_points.length} pain point{b.pain_points.length === 1 ? "" : "s"}
                    {" · "} {b.audit_screenshots.length} screenshot{b.audit_screenshots.length === 1 ? "" : "s"}
                  </div>
                </div>
                <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500" />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}
