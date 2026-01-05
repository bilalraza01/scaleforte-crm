import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import {
  useBrand, useUpdateBrand, useMarkBrandReady, useApproveBrand,
  useSendBackBrand, useSkipBrand,
  useCreateContact, useUpdateContact, useDeleteContact
} from "@/api/brands"
import type { Brand, Contact } from "@/types"
import { useAuth } from "@/auth/AuthProvider"
import type { ApiError } from "@/lib/http"

export function BrandEditPage() {
  const { id } = useParams<{ id: string }>()
  const brandId = Number(id)
  const { user } = useAuth()
  const { data: brand, isLoading } = useBrand(brandId)

  if (!user || isLoading || !brand) {
    return <div className="p-6 text-slate-500">Loading…</div>
  }

  return <BrandEditor brand={brand} userRole={user.role} />
}

function BrandEditor({ brand, userRole }: { brand: Brand; userRole: string }) {
  const navigate = useNavigate()
  const update = useUpdateBrand(brand.id)
  const markReady = useMarkBrandReady(brand.id)
  const approve = useApproveBrand(brand.id)
  const sendBack = useSendBackBrand(brand.id)
  const skip = useSkipBrand(brand.id)
  const [missing, setMissing] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, reset } = useForm<Partial<Brand>>({
    defaultValues: brand,
  })

  // Re-sync form when the brand is refetched after mutations.
  useEffect(() => { reset(brand) }, [brand, reset])

  const onSubmit = handleSubmit(async (input) => {
    await update.mutateAsync(input)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  })

  const onMarkReady = async () => {
    setMissing([])
    try {
      await markReady.mutateAsync()
    } catch (err) {
      const e = err as ApiError
      const m = (e.response?.data as { missing_fields?: string[] } | undefined)?.missing_fields
      if (m) setMissing(m)
    }
  }

  const isManager = userRole === "manager" || userRole === "admin"
  const canEdit   = brand.status === "draft" || brand.status === "in_progress"
  const canReview = isManager && brand.status === "ready"

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:underline mb-1">← back</button>
          <h1 className="text-2xl font-bold">{brand.brand_name || brand.amazon_seller_id}</h1>
        </div>
        <span className="font-mono text-xs px-3 py-1.5 bg-slate-200 rounded">{brand.status}</span>
      </div>

      {saved && <div className="bg-emerald-100 text-emerald-900 text-sm p-2 rounded mb-3">Saved.</div>}
      {missing.length > 0 && (
        <div className="bg-rose-100 text-rose-900 text-sm p-2 rounded mb-3">
          Missing required: {missing.join(", ")}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: brand fields */}
        <form onSubmit={onSubmit} className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Brand details</h2>

          <Field label="Amazon Seller ID" {...register("amazon_seller_id")} disabled />
          <Field label="Brand name"      {...register("brand_name")} disabled={!canEdit} />
          <Field label="Business name"   {...register("business_name")} disabled={!canEdit} />
          <Field label="Revenue"         {...register("revenue")} disabled={!canEdit} />
          <Field label="Country"         {...register("country")} disabled={!canEdit} />
          <Field label="Website"         {...register("website")} disabled={!canEdit} />
          <Field label="ASIN"            {...register("asin")} disabled={!canEdit} />
          <Field label="Amazon URL"      {...register("amazon_link")} disabled={!canEdit} />
          <Field label="Facebook"        {...register("facebook_url")} disabled={!canEdit} />
          <Field label="Instagram"       {...register("instagram_url")} disabled={!canEdit} />
          <Field label="Company LinkedIn" {...register("company_linkedin_url")} disabled={!canEdit} />

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={update.isPending || !canEdit} className="px-3 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50">
              {update.isPending ? "Saving…" : "Save draft"}
            </button>
            {canEdit && (
              <button type="button" onClick={onMarkReady} disabled={markReady.isPending} className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
                Mark Ready
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={async () => {
                  const reason = prompt("Reason for skipping?")
                  if (reason) await skip.mutateAsync(reason)
                }}
                className="px-3 py-2 text-rose-600 hover:underline"
              >
                Skip
              </button>
            )}
          </div>

          {canReview && (
            <div className="flex gap-2 pt-2 border-t">
              <button type="button" onClick={() => approve.mutate()} className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                Approve for push
              </button>
              <button
                type="button"
                onClick={async () => {
                  const c = prompt("Send-back comment?") ?? undefined
                  await sendBack.mutateAsync(c)
                }}
                className="px-3 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                Send back
              </button>
            </div>
          )}
        </form>

        {/* Right column: contacts */}
        <ContactsPanel brand={brand} canEdit={canEdit} />
      </div>
    </div>
  )
}

const Field = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label className="block text-xs font-semibold mb-1 text-slate-600">{label}</label>
    <input
      {...props}
      className="w-full border rounded px-2 py-1.5 disabled:bg-slate-100"
    />
  </div>
)

function ContactsPanel({ brand, canEdit }: { brand: Brand; canEdit: boolean }) {
  const create = useCreateContact(brand.id)
  const del = useDeleteContact(brand.id)
  const [showAdd, setShowAdd] = useState(brand.contacts.length === 0)

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-600">Contacts ({brand.contacts.length})</h2>
        {canEdit && !showAdd && (
          <button onClick={() => setShowAdd(true)} className="text-sm text-blue-600 hover:underline">+ Add contact</button>
        )}
      </div>

      <div className="space-y-3">
        {brand.contacts.map((c) => (
          <ContactRow key={c.id} brandId={brand.id} contact={c} canEdit={canEdit} onDelete={() => del.mutate(c.id)} />
        ))}

        {showAdd && canEdit && (
          <ContactForm
            onCancel={() => setShowAdd(false)}
            onSubmit={async (input) => {
              await create.mutateAsync(input)
              setShowAdd(false)
            }}
            saving={create.isPending}
          />
        )}
      </div>
    </div>
  )
}

function ContactRow({ brandId, contact, canEdit, onDelete }: { brandId: number; contact: Contact; canEdit: boolean; onDelete: () => void }) {
  const update = useUpdateContact(brandId, contact.id)
  return (
    <div className="border rounded p-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{contact.name || contact.email}{contact.is_primary && <span className="ml-2 text-xs text-emerald-700">primary</span>}</div>
          <div className="text-xs text-slate-500">{contact.designation} · {contact.email}</div>
          {contact.phone && <div className="text-xs text-slate-500">{contact.phone}</div>}
        </div>
        {canEdit && (
          <div className="flex gap-2 text-sm">
            {!contact.is_primary && (
              <button onClick={() => update.mutate({ is_primary: true })} className="text-blue-600 hover:underline">Make primary</button>
            )}
            <button onClick={() => confirm("Delete?") && onDelete()} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

function ContactForm({ onCancel, onSubmit, saving }: {
  onCancel: () => void
  onSubmit: (input: Partial<Contact>) => Promise<void>
  saving: boolean
}) {
  const { register, handleSubmit } = useForm<Partial<Contact>>()
  return (
    <form
      onSubmit={handleSubmit(async (input) => onSubmit(input))}
      className="border-2 border-dashed rounded p-3 space-y-2 bg-slate-50"
    >
      <input placeholder="Name" {...register("name")} className="w-full border rounded px-2 py-1.5" />
      <input placeholder="Designation" {...register("designation")} className="w-full border rounded px-2 py-1.5" />
      <input placeholder="Email" type="email" {...register("email", { required: true })} className="w-full border rounded px-2 py-1.5" />
      <input placeholder="Phone" {...register("phone")} className="w-full border rounded px-2 py-1.5" />
      <input placeholder="LinkedIn" {...register("personal_linkedin")} className="w-full border rounded px-2 py-1.5" />
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("is_primary")} />
        Primary contact
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50">
          {saving ? "Saving…" : "Add"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-slate-600 hover:underline">Cancel</button>
      </div>
    </form>
  )
}
