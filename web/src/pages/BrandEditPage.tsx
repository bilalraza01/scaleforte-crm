import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import {
  useBrand, useUpdateBrand, useMarkBrandReady, useApproveBrand,
  useSendBackBrand, useSkipBrand,
  useCreateContact, useUpdateContact, useDeleteContact
} from "@/api/brands"
import type { Brand, Contact, User } from "@/types"
import { useAuth } from "@/auth/AuthProvider"
import type { ApiError } from "@/lib/http"
import { PainPointsPanel } from "@/components/PainPointsPanel"
import { AuditScreenshotsPanel } from "@/components/AuditScreenshotsPanel"
import { validateContactEmail } from "@/lib/email-validation"
import { COUNTRIES } from "@/lib/countries"

// Eight revenue buckets, must match Brand::REVENUE_BUCKETS on the BE.
const REVENUE_BUCKETS = [
  "0-10k", "10k-30k", "30k-50k", "50k-100k",
  "100k-250k", "250k-500k", "500k-1m", "1m+",
] as const

// Lightweight URL validator — accepts http(s) and requires a TLD-like
// pattern so `hhtps:dscasca.com` is rejected. Empty string is allowed
// (URL fields are individually optional; at least one is required at
// mark-ready time, enforced by the BE).
const URL_RE = /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i
const validateOptionalUrl = (v: string | null | undefined) =>
  !v || URL_RE.test(v) || "Must be a valid URL (https://example.com)"

export function BrandEditPage() {
  const { id } = useParams<{ id: string }>()
  const brandId = Number(id)
  const { user } = useAuth()
  const { data: brand, isLoading } = useBrand(brandId)

  if (!user || isLoading || !brand) {
    return <div className="p-6 text-slate-500">Loading…</div>
  }

  return <BrandEditor brand={brand} user={user} />
}

function BrandEditor({ brand, user }: { brand: Brand; user: User }) {
  const userRole = user.role
  const navigate = useNavigate()
  const update = useUpdateBrand(brand.id)
  const markReady = useMarkBrandReady(brand.id)
  const approve = useApproveBrand(brand.id)
  const sendBack = useSendBackBrand(brand.id)
  const skip = useSkipBrand(brand.id)
  const [missing, setMissing] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [showMarkReady, setShowMarkReady] = useState(false)
  const [showSkip, setShowSkip] = useState(false)

  const {
    register, handleSubmit, reset, getValues,
    formState: { isDirty, errors }
  } = useForm<Partial<Brand>>({ defaultValues: brand })

  // Re-sync form when the brand is refetched after mutations,
  // but keep any field the user has edited but not yet saved.
  useEffect(() => { reset(brand, { keepDirtyValues: true }) }, [brand, reset])

  const onSubmit = handleSubmit(async (input) => {
    await update.mutateAsync(input)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  })

  const onConfirmMarkReady = async () => {
    setMissing([])
    try {
      if (isDirty) await update.mutateAsync(getValues())
      await markReady.mutateAsync()
      setShowMarkReady(false)
    } catch (err) {
      const e = err as ApiError
      const m = (e.response?.data as { missing_fields?: string[] } | undefined)?.missing_fields
      if (m) setMissing(m)
      setShowMarkReady(false)
    }
  }

  const isAdmin   = userRole === "admin"
  const isManager = userRole === "manager"
  const isOwner   = user.id === brand.sdr_id
  // Owner SDRs (and admins) keep editing access even after marking Ready,
  // since fixes after submission are routine. Managers reviewing a Ready
  // brand stay in review-only mode to avoid accidental edits.
  const canEdit =
    brand.status === "draft" ||
    (brand.status === "ready" && (isOwner || isAdmin))
  const canMarkReady = brand.status === "draft"
  const canReview    = (isManager || isAdmin) && brand.status === "ready"

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

          <Field label="Amazon Seller ID" required {...register("amazon_seller_id")} disabled />
          <Field label="Brand name" required {...register("brand_name", { required: "Required" })} disabled={!canEdit} error={errors.brand_name?.message as string | undefined} />
          <Field label="Business name" required {...register("business_name", { required: "Required" })} disabled={!canEdit} error={errors.business_name?.message as string | undefined} />

          <SelectField label="Revenue bucket" {...register("revenue_bucket")} disabled={!canEdit}>
            <option value="">Pick a bucket</option>
            {REVENUE_BUCKETS.map((b) => (
              <option key={b} value={b}>${b}</option>
            ))}
          </SelectField>

          <SelectField label="Country" {...register("country")} disabled={!canEdit}>
            <option value="">Pick a country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </SelectField>

          <p className="text-xs text-slate-500 pt-1">
            At least one of Website / Facebook / Instagram / LinkedIn is required before marking Ready.
          </p>
          <Field label="Website"  {...register("website",  { validate: validateOptionalUrl })} disabled={!canEdit} error={errors.website?.message  as string | undefined} placeholder="https://example.com" />
          <Field label="Facebook" {...register("facebook_url", { validate: validateOptionalUrl })} disabled={!canEdit} error={errors.facebook_url?.message as string | undefined} placeholder="https://facebook.com/…" />
          <Field label="Instagram" {...register("instagram_url", { validate: validateOptionalUrl })} disabled={!canEdit} error={errors.instagram_url?.message as string | undefined} placeholder="https://instagram.com/…" />
          <Field label="Company LinkedIn" {...register("company_linkedin_url", { validate: validateOptionalUrl })} disabled={!canEdit} error={errors.company_linkedin_url?.message as string | undefined} placeholder="https://linkedin.com/company/…" />

          <Field label="ASIN" {...register("asin")} disabled={!canEdit} />
          <Field label="Amazon URL" {...register("amazon_link", { validate: validateOptionalUrl })} disabled={!canEdit} error={errors.amazon_link?.message as string | undefined} placeholder="https://amazon.com/dp/…" />

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={update.isPending || !canEdit} className="px-3 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50">
              {update.isPending ? "Saving…" : "Save draft"}
            </button>
            {canMarkReady && (
              <button
                type="button"
                onClick={() => setShowMarkReady(true)}
                disabled={markReady.isPending}
                className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                Mark Ready
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowSkip(true)}
                className="px-3 py-2 text-rose-600 hover:underline"
                title="Remove this brand from the active worklist without deleting it. Use Skip (not Delete) so the seller ID stays in the dedupe history."
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

        {/* Right column: contacts + pain points + audit screenshots */}
        <div className="space-y-4">
          <ContactsPanel brand={brand} canEdit={canEdit} />
          <div className="bg-white shadow rounded p-4">
            <PainPointsPanel brandId={brand.id} painPoints={brand.pain_points} canEdit={canEdit} />
          </div>
          <div className="bg-white shadow rounded p-4">
            <AuditScreenshotsPanel brandId={brand.id} screenshots={brand.audit_screenshots} canEdit={canEdit} />
          </div>
        </div>
      </div>

      {showMarkReady && (
        <ConfirmModal
          title="Mark this brand Ready?"
          body="Once marked Ready, the brand goes to your manager for review. Double-check everything (contacts, pain points, audit screenshots) is in order."
          confirmLabel={markReady.isPending ? "Submitting…" : "Yes, mark Ready"}
          confirmTone="emerald"
          onConfirm={onConfirmMarkReady}
          onClose={() => setShowMarkReady(false)}
        />
      )}

      {showSkip && (
        <SkipModal
          onClose={() => setShowSkip(false)}
          onSubmit={async (reason) => {
            await skip.mutateAsync(reason)
            setShowSkip(false)
          }}
          isPending={skip.isPending}
        />
      )}
    </div>
  )
}

const Field = ({ label, required, error, ...props }: {
  label: string
  required?: boolean
  error?: string
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label className="block text-xs font-semibold mb-1 text-slate-600">
      {label}{required && <span className="text-rose-600 ml-0.5">*</span>}
    </label>
    <input
      {...props}
      className="w-full border rounded px-2 py-1.5 disabled:bg-slate-100"
    />
    {error && <p className="text-rose-600 text-xs mt-0.5">{error}</p>}
  </div>
)

const SelectField = ({ label, required, children, ...props }: {
  label: string
  required?: boolean
  children: React.ReactNode
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div>
    <label className="block text-xs font-semibold mb-1 text-slate-600">
      {label}{required && <span className="text-rose-600 ml-0.5">*</span>}
    </label>
    <select {...props} className="w-full border rounded px-2 py-1.5 disabled:bg-slate-100">
      {children}
    </select>
  </div>
)

function ConfirmModal({ title, body, confirmLabel, confirmTone, onConfirm, onClose }: {
  title: string
  body: string
  confirmLabel: string
  confirmTone: "emerald" | "rose"
  onConfirm: () => void | Promise<void>
  onClose: () => void
}) {
  const btnClass = confirmTone === "emerald"
    ? "bg-emerald-600 hover:bg-emerald-700"
    : "bg-rose-600 hover:bg-rose-700"
  return (
    // Backdrop intentionally has no onClick — modal can only close via the
    // explicit Cancel button (Changes to be made in the CRM #3).
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-md p-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mt-2">{body}</p>
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-slate-600 hover:underline">Cancel</button>
          <button type="button" onClick={onConfirm} className={`px-3 py-1.5 text-white rounded ${btnClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function SkipModal({ onClose, onSubmit, isPending }: {
  onClose: () => void
  onSubmit: (reason: string) => void | Promise<void>
  isPending: boolean
}) {
  const [reason, setReason] = useState("")
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-md p-5">
        <h3 className="text-base font-semibold text-slate-900">Skip this brand</h3>
        <p className="text-sm text-slate-600 mt-2">
          Use Skip — not Delete — when a brand is out of business, a duplicate, or has no findable email. The seller ID stays in the dedupe history so it doesn't come back round the next month.
        </p>
        <label className="block text-xs font-semibold mt-3 mb-1 text-slate-600">
          Reason<span className="text-rose-600 ml-0.5">*</span>
        </label>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. out of business, duplicate seller, no email findable"
          className="w-full border rounded px-2 py-1.5 text-sm"
        />
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-slate-600 hover:underline">Cancel</button>
          <button
            type="button"
            disabled={!reason.trim() || isPending}
            onClick={() => onSubmit(reason.trim())}
            className="px-3 py-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50"
          >
            {isPending ? "Skipping…" : "Skip brand"}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const displayName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.name ||
    contact.email
  return (
    <div className="border rounded p-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{displayName}{contact.is_primary && <span className="ml-2 text-xs text-emerald-700">primary</span>}</div>
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
  onSubmit: (input: Partial<Contact> & { phone_dial?: string; phone_number?: string }) => Promise<void>
  saving: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<{
    first_name: string
    last_name: string
    designation: string
    email: string
    phone_dial: string
    phone_number: string
    personal_linkedin: string
    is_primary: boolean
  }>({ defaultValues: { phone_dial: "1" } })

  return (
    <form
      onSubmit={handleSubmit(async (input) => {
        // Compose phone E.164-ish from dial + number, but only if a number
        // was actually typed — empty number means "phone not on file".
        const phone = input.phone_number?.trim()
          ? `+${input.phone_dial}${input.phone_number.replace(/[^\d]/g, "")}`
          : undefined
        await onSubmit({
          first_name: input.first_name,
          last_name: input.last_name,
          designation: input.designation,
          email: input.email,
          phone,
          personal_linkedin: input.personal_linkedin || undefined,
          is_primary: input.is_primary,
        })
      })}
      className="border-2 border-dashed rounded p-3 space-y-2 bg-slate-50"
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold mb-1 text-slate-600">
            First name<span className="text-rose-600 ml-0.5">*</span>
          </label>
          <input
            {...register("first_name", { required: "Required" })}
            className="w-full border rounded px-2 py-1.5"
          />
          {errors.first_name?.message && <p className="text-rose-600 text-xs">{errors.first_name.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-slate-600">
            Last name<span className="text-rose-600 ml-0.5">*</span>
          </label>
          <input
            {...register("last_name", { required: "Required" })}
            className="w-full border rounded px-2 py-1.5"
          />
          {errors.last_name?.message && <p className="text-rose-600 text-xs">{errors.last_name.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 text-slate-600">
          Designation<span className="text-rose-600 ml-0.5">*</span>
        </label>
        <input
          {...register("designation", { required: "Required" })}
          placeholder="CEO"
          className="w-full border rounded px-2 py-1.5"
        />
        {errors.designation?.message && <p className="text-rose-600 text-xs">{errors.designation.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 text-slate-600">
          Email<span className="text-rose-600 ml-0.5">*</span>
        </label>
        <input
          type="email"
          placeholder="ceo@example.com"
          {...register("email", { required: "Email is required", validate: validateContactEmail })}
          aria-invalid={errors.email ? "true" : "false"}
          className="w-full border rounded px-2 py-1.5"
        />
        {errors.email?.message && (
          <p className="text-rose-600 text-xs">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 text-slate-600">
          Phone <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <div className="flex gap-1">
          <select
            {...register("phone_dial")}
            className="border rounded px-2 py-1.5 w-28 text-sm bg-white"
            aria-label="Country code"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.dial}>{c.code} +{c.dial}</option>
            ))}
          </select>
          <input
            {...register("phone_number")}
            placeholder="555-123-4567"
            className="flex-1 border rounded px-2 py-1.5"
            inputMode="tel"
          />
        </div>
      </div>

      <input
        placeholder="LinkedIn URL (optional)"
        {...register("personal_linkedin")}
        className="w-full border rounded px-2 py-1.5"
      />
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
