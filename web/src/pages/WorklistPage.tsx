import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  useBrands, useBrandLookup, useCreateBrand, useBulkReassignBrands,
  exportContactsCsv, type BrandFilters,
} from "@/api/brands"
import { useCampaigns } from "@/api/campaigns"
import { useCategories } from "@/api/categories"
import { useSubcategories, useCreateSubcategory } from "@/api/subcategories"
import { useUsers } from "@/api/users"
import { useTodayProgress } from "@/api/systemConfig"
import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge, statusTone } from "@/components/ui/Badge"
import { Input, Select, Label, FieldError } from "@/components/ui/Input"
import { Table, THead, TR, TH, TD } from "@/components/ui/Table"
import {
  ArrowRight, Plus, Search, X, Briefcase, Download, UserCog, Target,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react"
import type { ApiError } from "@/lib/http"
import type { BrandStatus } from "@/types"

const STATUSES: { value: BrandStatus | "all"; label: string }[] = [
  { value: "all",      label: "All statuses" },
  { value: "draft",    label: "Draft" },
  { value: "ready",    label: "Ready" },
  { value: "approved", label: "Approved" },
  { value: "pushed",   label: "Pushed" },
  { value: "skipped",  label: "Skipped" },
]
const PAGE_SIZES = [10, 50, 100] as const

type FilterKey = "subcategory" | "campaign" | "sdr" | "status" | "created"
interface FilterDef {
  key: FilterKey
  label: string
  // SDR filter is only meaningful when the viewer manages someone else's
  // brands — i.e., admin or manager.
  requiresReassignRole?: boolean
}
const SECONDARY_FILTERS: FilterDef[] = [
  { key: "status",      label: "Status" },
  { key: "subcategory", label: "Subcategory" },
  // Campaigns are an admin/manager reporting tool — SDRs work at the
  // Category level only and don't need to think about monthly campaigns.
  { key: "campaign",    label: "Campaign", requiresReassignRole: true },
  { key: "sdr",         label: "SDR", requiresReassignRole: true },
  { key: "created",     label: "Created date" },
]

export function WorklistPage() {
  const { user } = useAuth()
  const { data: campaigns } = useCampaigns()
  const { data: categories } = useCategories()
  const [showNewBrand, setShowNewBrand] = useState(false)

  // Inputs the user types into — kept separate from the *committed* search
  // so we can debounce keystrokes before refetching.
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<BrandStatus | "all">("all")
  const [categoryId, setCategoryId] = useState<string>("all")
  const [subcategoryId, setSubcategoryId] = useState<string>("all")
  const [campaignId, setCampaignId] = useState<string>("all")
  const [sdrFilterId, setSdrFilterId] = useState<string>("all")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<(typeof PAGE_SIZES)[number]>(50)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showReassign, setShowReassign] = useState(false)
  // Which secondary-filter chips the user has added. Category is always
  // visible; everything else is on-demand via the "+ Filter" menu.
  const [visibleFilters, setVisibleFilters] = useState<Set<FilterKey>>(new Set())

  // Default to the user's first assigned category — but ONLY once, on
  // first load. Without this guard the effect re-fires every time the
  // user picks "All categories" and snaps the dropdown back to the
  // assigned one, making "All" effectively unreachable.
  const assignedIds = user?.assigned_category_ids ?? []
  const didDefaultCategoryRef = useRef(false)
  useEffect(() => {
    if (didDefaultCategoryRef.current) return
    if (assignedIds.length === 0) return
    didDefaultCategoryRef.current = true
    setCategoryId(String(assignedIds[0]))
  }, [assignedIds.join(",")])

  // Admins land on the Worklist primarily to find brands ready to push to
  // Smartlead — default the status filter to "approved" on first load and
  // surface the chip so they can change it. Same one-shot ref pattern as
  // the category default so flipping back to "all" sticks.
  const didDefaultStatusRef = useRef(false)
  useEffect(() => {
    if (didDefaultStatusRef.current) return
    if (!user) return
    didDefaultStatusRef.current = true
    if (user.role === "admin") {
      setStatus("approved")
      setVisibleFilters((prev) => new Set([...prev, "status"]))
    }
  }, [user?.role])

  // Subcategories filtered to the chosen category.
  const selectedCategoryId = categoryId !== "all" ? Number(categoryId) : null
  const { data: subcategories } = useSubcategories(selectedCategoryId)

  // If category changes, drop the subcategory + campaign filters since they're scoped by category.
  useEffect(() => {
    setSubcategoryId("all")
    setCampaignId("all")
  }, [categoryId])

  // Debounce search input → committed search.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Any filter change resets the cursor to page 1 + clears the row selection
  // (otherwise checkboxes from a different filter set would still be active).
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [search, status, categoryId, subcategoryId, campaignId, sdrFilterId, createdFrom, createdTo, perPage])

  // Page change clears selection too — a checkbox on page 1 shouldn't carry
  // over into a bulk action covering page 2.
  useEffect(() => { setSelectedIds(new Set()) }, [page])

  const filterArgs = useMemo<BrandFilters>(() => {
    const f: BrandFilters = { page, per_page: perPage }
    if (status !== "all")        f.status = status
    if (categoryId !== "all")    f.category_id = Number(categoryId)
    if (subcategoryId !== "all") f.subcategory_id = Number(subcategoryId)
    if (campaignId !== "all")    f.campaign_id = Number(campaignId)
    if (sdrFilterId !== "all")   f.sdr_id = Number(sdrFilterId)
    if (search.trim())           f.search = search.trim()
    if (createdFrom)             f.created_from = createdFrom
    if (createdTo)               f.created_to = createdTo
    return f
  }, [status, categoryId, subcategoryId, campaignId, sdrFilterId, search, createdFrom, createdTo, page, perPage])

  const { data, isLoading, isFetching } = useBrands(filterArgs)
  const brands = data?.data ?? []
  const pagination = data?.pagination

  const campaignLookup = useMemo(() => {
    const m = new Map<number, string>()
    ;(campaigns ?? []).forEach((c) => m.set(c.id, c.label))
    return m
  }, [campaigns])

  const filtersActive = !!(
    search || status !== "all" || campaignId !== "all" ||
    subcategoryId !== "all" || sdrFilterId !== "all" || createdFrom || createdTo
  )
  const clearFilters = () => {
    setSearchInput("")
    setSearch("")
    setStatus("all")
    setCampaignId("all")
    setSubcategoryId("all")
    setSdrFilterId("all")
    setCreatedFrom("")
    setCreatedTo("")
    // Note: deliberately keeps `categoryId` since it scopes the user's view.
  }

  // Removing a chip: drop it from the visible set AND reset its value so
  // it stops affecting the query. (Hiding a chip without resetting would
  // leave a "ghost filter" silently constraining the table.)
  const removeFilterChip = (key: FilterKey) => {
    setVisibleFilters((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    if (key === "subcategory") setSubcategoryId("all")
    if (key === "campaign")    setCampaignId("all")
    if (key === "sdr")         setSdrFilterId("all")
    if (key === "status")      setStatus("all")
    if (key === "created")     { setCreatedFrom(""); setCreatedTo("") }
  }

  // Campaigns scoped to the selected category for the campaign-filter dropdown.
  const visibleCampaigns = useMemo(() => {
    const cs = campaigns ?? []
    return categoryId === "all" ? cs : cs.filter((c) => c.category_id === Number(categoryId))
  }, [campaigns, categoryId])

  const [exporting, setExporting] = useState(false)
  const onExport = async () => {
    setExporting(true)
    try {
      // Send the same filters the table is using; server returns every
      // matching contact (no pagination on the export).
      const { page: _p, per_page: _pp, ...exportFilters } = filterArgs
      const { blob, filename } = await exportContactsCsv(exportFilters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!user) return null
  const isAdmin   = user.role === "admin"
  const isManager = user.role === "manager"
  const canReassign = isAdmin || isManager

  // Active SDRs for the filter + reassign-target dropdowns.
  const { data: allUsers } = useUsers()
  const sdrOptions = useMemo(
    () => (allUsers ?? []).filter((u) => u.role === "sdr" && u.active),
    [allUsers]
  )

  const visibleIdSet = new Set(brands.map((b) => b.id))
  const allOnPageSelected = brands.length > 0 && brands.every((b) => selectedIds.has(b.id))
  const togglePageSelection = () => {
    if (allOnPageSelected) {
      const next = new Set(selectedIds)
      visibleIdSet.forEach((id) => next.delete(id))
      setSelectedIds(next)
    } else {
      setSelectedIds(new Set([...selectedIds, ...visibleIdSet]))
    }
  }
  const toggleOne = (id: number) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Worklist"
        subtitle="All your brands. Add a new one or pick up where you left off."
        action={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button size="lg" variant="secondary" onClick={onExport} disabled={exporting}>
                <Download size={16} />
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            )}
            <Button size="lg" variant="success" onClick={() => setShowNewBrand(true)}>
              <Plus size={16} />
              New Brand
            </Button>
          </div>
        }
      />

      {user.role === "sdr" && <DailyTargetBanner />}

      <div className="space-y-3 mb-4">
        {/* Top row: search + add-filter + per-page */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by brand, seller ID, or SDR…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <AddFilterMenu
            available={SECONDARY_FILTERS.filter(
              (f) => !visibleFilters.has(f.key) && (!f.requiresReassignRole || canReassign)
            )}
            onAdd={(key) => setVisibleFilters(new Set([...visibleFilters, key]))}
          />
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Per page</span>
            <Select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value) as (typeof PAGE_SIZES)[number])}
              className="w-20"
              aria-label="Per page"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Filter chips: Category is always visible; others appear when added */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip label="Category">
            <ChipSelect value={categoryId} onChange={setCategoryId} aria-label="Category">
              <option value="all">All</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </ChipSelect>
          </Chip>

          {visibleFilters.has("subcategory") && (
            <Chip label="Subcategory" onRemove={() => removeFilterChip("subcategory")}>
              <ChipSelect
                value={subcategoryId}
                onChange={setSubcategoryId}
                disabled={selectedCategoryId === null}
                aria-label="Subcategory"
              >
                <option value="all">All</option>
                {(subcategories ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </ChipSelect>
            </Chip>
          )}

          {visibleFilters.has("campaign") && (
            <Chip label="Campaign" onRemove={() => removeFilterChip("campaign")}>
              <ChipSelect value={campaignId} onChange={setCampaignId} aria-label="Campaign">
                <option value="all">All</option>
                {visibleCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </ChipSelect>
            </Chip>
          )}

          {visibleFilters.has("sdr") && canReassign && (
            <Chip label="SDR" onRemove={() => removeFilterChip("sdr")}>
              <ChipSelect value={sdrFilterId} onChange={setSdrFilterId} aria-label="SDR">
                <option value="all">All</option>
                {sdrOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </ChipSelect>
            </Chip>
          )}

          {visibleFilters.has("status") && (
            <Chip label="Status" onRemove={() => removeFilterChip("status")}>
              <ChipSelect
                value={status}
                onChange={(v) => setStatus(v as BrandStatus | "all")}
                aria-label="Status"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </ChipSelect>
            </Chip>
          )}

          {visibleFilters.has("created") && (
            <Chip label="Created" onRemove={() => removeFilterChip("created")}>
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="bg-transparent border-0 outline-none text-sm font-medium text-slate-900 cursor-pointer"
                aria-label="From date"
              />
              <span className="text-slate-400 text-xs">→</span>
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="bg-transparent border-0 outline-none text-sm font-medium text-slate-900 cursor-pointer"
                aria-label="To date"
              />
            </Chip>
          )}

          {filtersActive && (
            <button
              type="button"
              onClick={() => { clearFilters(); setVisibleFilters(new Set()) }}
              className="text-xs text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : brands.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-slate-500">
            <Briefcase size={20} className="text-slate-300 mx-auto mb-2" />
            {filtersActive
              ? "No brands match these filters."
              : "No brands yet. Click New Brand to add your first one."}
          </CardBody>
        </Card>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                {canReassign && (
                  <TH className="w-8">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={togglePageSelection}
                      aria-label="Select all on this page"
                    />
                  </TH>
                )}
                <TH>Brand</TH>
                <TH>Seller ID</TH>
                <TH>Subcategory</TH>
                {canReassign && <TH>Campaign</TH>}
                {canReassign && <TH>SDR</TH>}
                <TH className="text-right">Contacts</TH>
                <TH>Status</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <tbody className={isFetching ? "opacity-60 transition-opacity" : ""}>
              {brands.map((b) => (
                <TR key={b.id} className="cursor-pointer">
                  {canReassign && (
                    <TD className="w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(b.id)}
                        onChange={() => toggleOne(b.id)}
                        aria-label={`Select ${b.brand_name || b.amazon_seller_id}`}
                      />
                    </TD>
                  )}
                  <TD className="font-medium text-slate-900">
                    <Link to={`/acquisition/brands/${b.id}`} className="block">
                      {b.brand_name || <span className="text-slate-400 italic">unnamed</span>}
                    </Link>
                  </TD>
                  <TD className="font-mono text-xs text-slate-600">{b.amazon_seller_id}</TD>
                  <TD className="text-slate-600">{b.subcategory_name ?? <span className="text-slate-300">—</span>}</TD>
                  {canReassign && <TD className="text-slate-600">{campaignLookup.get(b.campaign_id) ?? "—"}</TD>}
                  {canReassign && <TD className="text-slate-600">{b.sdr_name ?? "—"}</TD>}
                  <TD className="text-right tabular-nums">{b.contacts.length}</TD>
                  <TD>
                    <Badge tone={statusTone(b.status)}>{b.status.replace("_", " ")}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link to={`/acquisition/brands/${b.id}`} className="text-slate-300 hover:text-slate-600">
                      <ArrowRight size={14} />
                    </Link>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>

          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              totalCount={pagination.total_count}
              perPage={pagination.per_page}
              onPage={setPage}
            />
          )}
        </>
      )}

      {showNewBrand && (
        <NewBrandModal
          onClose={() => setShowNewBrand(false)}
          defaultCategoryId={selectedCategoryId}
          defaultSubcategoryId={subcategoryId !== "all" ? Number(subcategoryId) : null}
          showCampaignPicker={isAdmin || isManager}
          // SDRs can only create brands inside their assigned categories;
          // filter the dropdown so they can't pick a forbidden one. Empty
          // set = "no restriction" for admin/manager.
          allowedCategoryIds={isAdmin || isManager ? null : new Set(user.assigned_category_ids)}
        />
      )}

      {canReassign && selectedIds.size > 0 && (
        <SelectionActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onReassign={() => setShowReassign(true)}
        />
      )}

      {showReassign && (
        <ReassignModal
          brandIds={[...selectedIds]}
          sdrOptions={sdrOptions}
          onClose={() => setShowReassign(false)}
          onDone={() => {
            setShowReassign(false)
            setSelectedIds(new Set())
          }}
        />
      )}
    </div>
  )
}

function DailyTargetBanner() {
  const { data: progress } = useTodayProgress()
  if (!progress) return null
  const { marked_ready_today: done, daily_brand_target: target, remaining } = progress
  if (target === 0) return null  // admin hasn't set a target — hide the banner

  const pct = Math.min(100, Math.round((done / target) * 100))
  const hit = remaining === 0

  return (
    <div className={`mb-4 rounded-xl border ${hit ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"} p-4 shadow-[var(--shadow-card)]`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Target size={16} className={hit ? "text-emerald-600" : "text-slate-500"} />
          <span className="text-sm font-medium text-slate-900">
            {hit ? "Today's target hit. " : ""}
            <strong>{done}</strong> of <strong>{target}</strong> brands marked Ready today.
          </span>
        </div>
        <span className={`text-sm font-medium ${hit ? "text-emerald-700" : "text-slate-700"}`}>
          {hit ? "🎉 great work" : `${remaining} remaining`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full transition-[width] duration-300 ${hit ? "bg-emerald-500" : "bg-slate-900"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SelectionActionBar({
  count, onClear, onReassign,
}: { count: number; onClear: () => void; onReassign: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border border-slate-200 bg-white shadow-lg px-4 py-2">
      <span className="text-sm text-slate-700">
        <strong>{count}</strong> brand{count === 1 ? "" : "s"} selected
      </span>
      <span className="h-4 w-px bg-slate-200" />
      <Button size="sm" onClick={onReassign}>
        <UserCog size={14} />
        Reassign…
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        <X size={14} />
        Clear
      </Button>
    </div>
  )
}

function ReassignModal({
  brandIds, sdrOptions, onClose, onDone,
}: {
  brandIds: number[]
  sdrOptions: { id: number; name: string; email: string }[]
  onClose: () => void
  onDone: () => void
}) {
  const reassign = useBulkReassignBrands()
  const [targetSdrId, setTargetSdrId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ reassigned: number; skipped: number; name: string } | null>(null)

  const onConfirm = async () => {
    setError(null)
    if (!targetSdrId) return setError("Pick a target SDR")
    try {
      const r = await reassign.mutateAsync({ brand_ids: brandIds, sdr_id: Number(targetSdrId) })
      setResult({
        reassigned: r.reassigned_count,
        skipped:    r.skipped_unauthorized,
        name:       r.target_sdr_name,
      })
    } catch (err) {
      const e = err as ApiError
      setError(e.response?.data?.error ?? "Reassign failed")
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader
          title={`Reassign ${brandIds.length} brand${brandIds.length === 1 ? "" : "s"}`}
          subtitle="Move ownership to another SDR. Use this when an SDR leaves or coverage shifts."
          action={<button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>}
        />
        <CardBody className="space-y-3">
          {result ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-2.5 rounded-md">
                Reassigned <strong>{result.reassigned}</strong> brand{result.reassigned === 1 ? "" : "s"} to <strong>{result.name}</strong>.
                {result.skipped > 0 && (
                  <> {result.skipped} skipped (you don't manage their owning SDR).</>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={onDone}>Done</Button>
              </div>
            </>
          ) : (
            <>
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2.5 rounded-md">{error}</div>
              )}
              <div>
                <Label>Target SDR</Label>
                <Select value={targetSdrId} onChange={(e) => setTargetSdrId(e.target.value)}>
                  <option value="">— pick an SDR —</option>
                  {sdrOptions.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
                <Button type="button" disabled={reassign.isPending || !targetSdrId} onClick={onConfirm}>
                  {reassign.isPending ? "Reassigning…" : `Reassign ${brandIds.length}`}
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// ---- Filter UI primitives ------------------------------------------------

function Chip({
  label, children, onRemove,
}: {
  label: string
  children: React.ReactNode
  onRemove?: () => void
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-[var(--shadow-card)]">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-slate-400 hover:text-rose-600"
          aria-label={`Remove ${label} filter`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// Native <select> styled to feel like part of a chip — flat, no border,
// uses the chip's surface as its background.
function ChipSelect({
  value, onChange, children, disabled, "aria-label": ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  disabled?: boolean
  "aria-label"?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className="bg-transparent border-0 outline-none text-sm font-medium text-slate-900 cursor-pointer focus:outline-none focus:ring-0 pr-1 disabled:text-slate-400 disabled:cursor-not-allowed"
    >
      {children}
    </select>
  )
}

function AddFilterMenu({
  available, onAdd,
}: {
  available: FilterDef[]
  onAdd: (key: FilterKey) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        size="md"
        variant="secondary"
        onClick={() => setOpen((o) => !o)}
        disabled={available.length === 0}
      >
        <Plus size={14} />
        Filter
      </Button>
      {open && available.length > 0 && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] rounded-md border border-slate-200 bg-white shadow-lg py-1">
          {available.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { onAdd(f.key); setOpen(false) }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Pagination({
  page, totalPages, totalCount, perPage, onPage,
}: {
  page: number
  totalPages: number
  totalCount: number
  perPage: number
  onPage: (p: number) => void
}) {
  const first = totalCount === 0 ? 0 : (page - 1) * perPage + 1
  const last  = Math.min(page * perPage, totalCount)
  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
      <span>
        {totalCount === 0 ? "No results" : <>Showing <strong>{first}–{last}</strong> of <strong>{totalCount}</strong></>}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onPage(1)} disabled={prevDisabled} aria-label="First page">
          <ChevronsLeft size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onPage(page - 1)} disabled={prevDisabled} aria-label="Previous page">
          <ChevronLeft size={14} />
        </Button>
        <span className="px-2 tabular-nums">Page {page} of {Math.max(totalPages, 1)}</span>
        <Button variant="ghost" size="sm" onClick={() => onPage(page + 1)} disabled={nextDisabled} aria-label="Next page">
          <ChevronRight size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onPage(totalPages)} disabled={nextDisabled} aria-label="Last page">
          <ChevronsRight size={14} />
        </Button>
      </div>
    </div>
  )
}

const newBrandSchema = z.object({
  campaign_id: z.coerce.number().int().positive().optional().or(z.literal(0).transform(() => undefined)),
  subcategory_id: z.coerce.number().int().positive().optional().or(z.literal(0).transform(() => undefined)),
  amazon_seller_id: z.string().min(3, "Seller ID is required"),
  brand_name: z.string().optional(),
  amazon_link: z.string().url("Must be a URL").optional().or(z.literal("")),
})
type NewBrandInput = z.infer<typeof newBrandSchema>

function NewBrandModal({
  onClose, defaultCategoryId, defaultSubcategoryId, showCampaignPicker, allowedCategoryIds,
}: {
  onClose: () => void
  defaultCategoryId: number | null
  defaultSubcategoryId: number | null
  // Admin/Manager get an explicit Campaign dropdown; SDR doesn't need it
  // and the BE auto-resolves to the current month's active campaign for
  // the chosen category.
  showCampaignPicker: boolean
  // null = no restriction (admin/manager). Set = SDR's assigned categories.
  allowedCategoryIds: Set<number> | null
}) {
  const navigate = useNavigate()
  const create = useCreateBrand()
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns()
  const { data: categories } = useCategories()
  const visibleCategories = (categories ?? []).filter(
    (c) => allowedCategoryIds === null || allowedCategoryIds.has(c.id)
  )
  const [serverError, setServerError] = useState<string | null>(null)

  // Category drives the dependent campaign + subcategory dropdowns. Default
  // to whatever the Worklist had selected so the SDR doesn't have to re-pick.
  const [categoryId, setCategoryId] = useState<number | null>(defaultCategoryId)
  const { data: subcategories } = useSubcategories(categoryId)
  const createSubcategory = useCreateSubcategory(categoryId ?? 0)
  const [newSubName, setNewSubName] = useState("")
  const [showAddSub, setShowAddSub] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<NewBrandInput>({
    resolver: zodResolver(newBrandSchema),
    defaultValues: {
      subcategory_id: defaultSubcategoryId ?? undefined,
    },
  })

  // Changing Category invalidates whatever subcategory + campaign were
  // chosen under the old category. Skip the very first run so the
  // pre-selected default from the Worklist isn't immediately wiped out.
  const initialCategoryRef = useRef(true)
  useEffect(() => {
    if (initialCategoryRef.current) {
      initialCategoryRef.current = false
      return
    }
    resetField("subcategory_id")
    resetField("campaign_id")
  }, [categoryId, resetField])

  // Debounce the seller_id input so we don't ping the API on every keystroke.
  const sellerIdRaw = watch("amazon_seller_id") ?? ""
  const [debouncedSellerId, setDebouncedSellerId] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSellerId(sellerIdRaw.trim()), 300)
    return () => clearTimeout(t)
  }, [sellerIdRaw])
  const lookup = useBrandLookup(debouncedSellerId)
  const duplicate = lookup.data?.exists === true
  const duplicateEditable = duplicate && lookup.data?.editable_by_me === true
  const duplicateBrandId = lookup.data?.brand_id ?? null

  const onSubmit = async (input: NewBrandInput) => {
    setServerError(null)
    if (duplicate) return  // BE also blocks via DB unique index, but fail fast here
    if (!categoryId) {
      setServerError("Pick a category")
      return
    }
    try {
      const brand = await create.mutateAsync({
        // SDR path sends category_id only; BE auto-resolves to the
        // current month's active campaign. Admin/Manager may override
        // by picking a specific campaign.
        category_id: categoryId,
        campaign_id: showCampaignPicker ? input.campaign_id : undefined,
        subcategory_id: input.subcategory_id || undefined,
        amazon_seller_id: input.amazon_seller_id,
        brand_name: input.brand_name || undefined,
        amazon_link: input.amazon_link || undefined,
      })
      navigate(`/acquisition/brands/${brand.id}`)
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

  const usableCampaigns = (campaigns ?? []).filter(
    (c) => (c.status === "active" || c.status === "draft") &&
           (categoryId === null || c.category_id === categoryId)
  )

  const onAddSubcategory = async () => {
    const name = newSubName.trim()
    if (!name || !categoryId) return
    try {
      const created = await createSubcategory.mutateAsync(name)
      setValue("subcategory_id", created.id)
      setNewSubName("")
      setShowAddSub(false)
    } catch (err) {
      const e = err as ApiError
      setServerError(e.response?.data?.error ?? "Could not create subcategory")
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader
          title="New brand"
          subtitle="Pick the category + paste the Amazon Seller ID. Fill in the rest on the next screen."
          action={<button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>}
        />
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {serverError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2.5 rounded-md">{serverError}</div>
            )}

            <div>
              <Label>Category</Label>
              <Select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— pick a category —</option>
                {visibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              {visibleCategories.length === 0 && (
                <p className="text-rose-600 text-xs mt-1">
                  You haven't been assigned to any categories yet. Ask an admin to grant access.
                </p>
              )}
            </div>

            <div>
              <Label>Subcategory (optional)</Label>
              {!showAddSub ? (
                <div className="flex gap-2">
                  <Select {...register("subcategory_id")} disabled={!categoryId} className="flex-1">
                    <option value="">— none —</option>
                    {(subcategories ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                  <Button type="button" variant="ghost" size="sm" disabled={!categoryId} onClick={() => setShowAddSub(true)}>
                    <Plus size={14} />
                    Add
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="New subcategory name"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void onAddSubcategory() } }}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={onAddSubcategory} disabled={createSubcategory.isPending || !newSubName.trim()}>
                    {createSubcategory.isPending ? "…" : "Save"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddSub(false); setNewSubName("") }}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {showCampaignPicker && (
              <div>
                <Label>Campaign (optional)</Label>
                <Select {...register("campaign_id")} disabled={loadingCampaigns || !categoryId}>
                  <option value="">— current month, auto-picked —</option>
                  {usableCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </Select>
                <FieldError>{errors.campaign_id?.message}</FieldError>
              </div>
            )}

            <div>
              <Label>Amazon Seller ID</Label>
              <Input placeholder="A1B2C3D4E5F6G7" autoFocus {...register("amazon_seller_id")} />
              <FieldError>{errors.amazon_seller_id?.message}</FieldError>
              {duplicate && duplicateEditable && duplicateBrandId && (
                <p className="text-emerald-700 text-xs mt-1">
                  Brand already exists.{" "}
                  <Link to={`/brands/${duplicateBrandId}`} onClick={onClose} className="underline font-medium">
                    Edit?
                  </Link>
                </p>
              )}
              {duplicate && !duplicateEditable && (
                <p className="text-rose-600 text-xs mt-1">
                  Brand already exists.
                </p>
              )}
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
              <Button type="submit" disabled={isSubmitting || create.isPending || duplicate}>
                {create.isPending ? "Creating…" : "Create + edit"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
