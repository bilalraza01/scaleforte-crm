import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useBrands, useCreateBrand } from "@/api/brands"
import { useCampaigns } from "@/api/campaigns"
import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge, statusTone } from "@/components/ui/Badge"
import { Input, Select, Label, FieldError } from "@/components/ui/Input"
import { ArrowRight, Plus, Briefcase, X } from "lucide-react"
import type { ApiError } from "@/lib/http"
import type { Brand } from "@/types"

export function WorklistPage() {
  const { user } = useAuth()
  const { data: myBrands, isLoading } = useBrands()
  const [showNewBrand, setShowNewBrand] = useState(false)

  if (!user) return null

  const drafts = (myBrands ?? []).filter((b) => b.status === "draft" || b.status === "in_progress")
  const ready  = (myBrands ?? []).filter((b) => b.status === "ready")
  const recent = (myBrands ?? []).filter((b) => b.status === "approved" || b.status === "pushed").slice(0, 10)

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Worklist"
        subtitle="Add a new brand to the campaign you're working on, or pick up a draft."
        action={
          <Button size="lg" variant="success" onClick={() => setShowNewBrand(true)}>
            <Plus size={16} />
            New Brand
          </Button>
        }
      />

      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Drafts / In progress" brands={drafts} emptyText="No drafts. Click New Brand to add one." />
        <Section title="Ready / Awaiting review" brands={ready} emptyText="Nothing waiting for review." />
        <Section title="Recently approved or pushed" brands={recent} emptyText="—" />
      </div>

      {showNewBrand && <NewBrandModal onClose={() => setShowNewBrand(false)} />}
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

const newBrandSchema = z.object({
  campaign_id: z.coerce.number().int().positive("Pick a campaign"),
  amazon_seller_id: z.string().min(3, "Seller ID is required"),
  brand_name: z.string().optional(),
  amazon_link: z.string().url("Must be a URL").optional().or(z.literal("")),
})
type NewBrandInput = z.infer<typeof newBrandSchema>

function NewBrandModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateBrand()
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NewBrandInput>({
    resolver: zodResolver(newBrandSchema),
  })

  const onSubmit = async (input: NewBrandInput) => {
    setServerError(null)
    try {
      const brand = await create.mutateAsync({
        campaign_id: input.campaign_id,
        amazon_seller_id: input.amazon_seller_id,
        brand_name: input.brand_name || undefined,
        amazon_link: input.amazon_link || undefined,
      })
      navigate(`/brands/${brand.id}`)
    } catch (err) {
      const e = err as ApiError
      const errs = e.response?.data?.errors as Record<string, string[]> | undefined
      if (errs) {
        setServerError(Object.entries(errs).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" · "))
      } else {
        setServerError(e.response?.data?.error ?? "Could not create brand")
      }
    }
  }

  const usableCampaigns = (campaigns ?? []).filter((c) => c.status === "active" || c.status === "draft")

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader
          title="New brand"
          subtitle="Pick the campaign + paste the Amazon Seller ID. Fill in the rest on the next screen."
          action={<button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>}
        />
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {serverError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2.5 rounded-md">{serverError}</div>
            )}

            <div>
              <Label>Campaign</Label>
              <Select {...register("campaign_id")} disabled={loadingCampaigns}>
                <option value="">— pick a campaign you're assigned to —</option>
                {usableCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
              <FieldError>{errors.campaign_id?.message}</FieldError>
            </div>

            <div>
              <Label>Amazon Seller ID</Label>
              <Input placeholder="A1B2C3D4E5F6G7" autoFocus {...register("amazon_seller_id")} />
              <FieldError>{errors.amazon_seller_id?.message}</FieldError>
            </div>

            <div>
              <Label>Brand name (optional)</Label>
              <Input placeholder="TAHIRO" {...register("brand_name")} />
            </div>

            <div>
              <Label>Amazon listing URL (optional)</Label>
              <Input placeholder="https://amazon.com/dp/B0…" {...register("amazon_link")} />
              <FieldError>{errors.amazon_link?.message}</FieldError>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || create.isPending}>
                {create.isPending ? "Creating…" : "Create + edit"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
