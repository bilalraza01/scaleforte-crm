import { Link, useNavigate } from "react-router-dom"
import { useBrands, useClaimNextBrand } from "@/api/brands"
import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge, statusTone } from "@/components/ui/Badge"
import { ArrowRight, PlayCircle, Briefcase } from "lucide-react"
import type { Brand } from "@/types"

export function WorklistPage() {
  const { user } = useAuth()
  const { data: myBrands, isLoading } = useBrands()
  const claim = useClaimNextBrand()
  const navigate = useNavigate()

  if (!user) return null

  const drafts = (myBrands ?? []).filter((b) => b.status === "draft" || b.status === "in_progress")
  const ready  = (myBrands ?? []).filter((b) => b.status === "ready")
  const recent = (myBrands ?? []).filter((b) => b.status === "approved" || b.status === "pushed").slice(0, 10)

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Worklist"
        subtitle="Claim your next brand and work through your queue."
        action={
          user.role === "sdr" && (
            <Button
              size="lg"
              variant="success"
              disabled={claim.isPending}
              onClick={async () => {
                try {
                  const brand = await claim.mutateAsync(undefined)
                  navigate(`/brands/${brand.id}`)
                } catch {
                  alert("No unclaimed brands available.")
                }
              }}
            >
              <PlayCircle size={16} />
              {claim.isPending ? "Claiming…" : "Start Next Brand"}
            </Button>
          )
        }
      />

      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Drafts / In progress" brands={drafts} emptyText="No drafts. Click Start Next Brand to claim one." />
        <Section title="Ready / Awaiting review" brands={ready} emptyText="Nothing waiting for review." />
        <Section title="Recently approved or pushed" brands={recent} emptyText="—" />
      </div>
    </div>
  )
}

function Section({ title, brands, emptyText }: { title: string; brands: Brand[]; emptyText: string }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={`${brands.length} brand${brands.length === 1 ? "" : "s"}`} />
      <CardBody className="p-0 divide-y divide-slate-100">
        {brands.length === 0 ? (
          <p className="text-sm text-slate-400 p-5 flex items-center gap-2">
            <Briefcase size={14} className="text-slate-300" />
            {emptyText}
          </p>
        ) : (
          brands.map((b) => (
            <Link
              key={b.id}
              to={`/brands/${b.id}`}
              className="block px-5 py-3 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{b.brand_name || b.amazon_seller_id}</div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {b.amazon_seller_id} · {b.contacts.length} contact{b.contacts.length === 1 ? "" : "s"}
                  </div>
                </div>
                <Badge tone={statusTone(b.status)}>{b.status.replace("_", " ")}</Badge>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </Link>
          ))
        )}
      </CardBody>
    </Card>
  )
}
