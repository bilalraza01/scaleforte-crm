import { useNavigate } from "react-router-dom"
import { useBrands, useClaimNextBrand } from "@/api/brands"
import { useAuth } from "@/auth/AuthProvider"

export function WorklistPage() {
  const { user } = useAuth()
  const { data: myBrands, isLoading } = useBrands()
  const claim = useClaimNextBrand()
  const navigate = useNavigate()

  if (!user) return null

  const drafts   = (myBrands ?? []).filter((b) => b.status === "draft" || b.status === "in_progress")
  const ready    = (myBrands ?? []).filter((b) => b.status === "ready")
  const recent   = (myBrands ?? []).filter((b) => b.status === "approved" || b.status === "pushed").slice(0, 10)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Worklist</h1>
        {user.role === "sdr" && (
          <button
            onClick={async () => {
              try {
                const brand = await claim.mutateAsync(undefined)
                navigate(`/brands/${brand.id}`)
              } catch {
                alert("No unclaimed brands available — ask your Manager to assign more.")
              }
            }}
            disabled={claim.isPending}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
          >
            {claim.isPending ? "Claiming…" : "Start Next Brand"}
          </button>
        )}
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      <Section title="Drafts / In Progress" brands={drafts} emptyText="No drafts. Click Start Next Brand to claim one." />
      <Section title="Ready / Awaiting review" brands={ready} emptyText="Nothing waiting for review." />
      <Section title="Recently approved or pushed" brands={recent} emptyText="—" />
    </div>
  )
}

function Section({ title, brands, emptyText }: { title: string; brands: import("@/types").Brand[]; emptyText: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-600 mb-2">{title} ({brands.length})</h2>
      {brands.length === 0 ? (
        <p className="text-slate-400 text-sm">{emptyText}</p>
      ) : (
        <div className="bg-white shadow rounded divide-y">
          {brands.map((b) => (
            <a
              key={b.id}
              href={`/brands/${b.id}`}
              className="block px-4 py-3 hover:bg-slate-50 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{b.brand_name || b.amazon_seller_id}</div>
                <div className="text-xs text-slate-500">
                  {b.amazon_seller_id} · {b.contacts.length} contact{b.contacts.length === 1 ? "" : "s"}
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-1 bg-slate-100 rounded">{b.status}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
