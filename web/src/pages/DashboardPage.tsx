import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/auth/AuthProvider"
import {
  useAdminDashboard, useManagerDashboard, useSdrDashboard,
  useMarkedReadyTimeseries, type ChartPeriod,
  type AdminDashboard, type ManagerDashboard,
} from "@/api/dashboards"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Stat } from "@/components/ui/Stat"
import { Table, THead, TR, TH, TD } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { Activity, MailCheck, MailX, Send, Users, Layers, FileCheck2, Inbox, Target, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts"

export function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role === "admin") return <AdminView />
  if (user.role === "manager") return <ManagerView />
  return <SdrView />
}

function pageWrap(children: React.ReactNode) {
  return <div className="px-8 py-8 max-w-7xl mx-auto">{children}</div>
}

/* ---------------- SDR ---------------- */
function SdrView() {
  const { user } = useAuth()
  const { data, isLoading } = useSdrDashboard()
  if (isLoading || !data) return pageWrap(<p className="text-slate-500">Loading…</p>)

  const pctToTarget = data.month_to_date.target > 0
    ? Math.round((data.month_to_date.completed / data.month_to_date.target) * 100)
    : null

  return pageWrap(
    <>
      <PageHeader title={`Welcome back, ${user?.name?.split(" ")[0] ?? ""}`} subtitle="Your prospecting work, at a glance." />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat icon={<FileCheck2 size={16} />} tone="indigo" label="Completed today" value={data.today.completed} />
        <Stat icon={<Inbox      size={16} />} tone="amber"  label="Marked ready today" value={data.today.ready} />
        <Stat
          icon={<Activity size={16} />} tone="neutral"
          label="Month to date"
          value={data.month_to_date.completed}
          hint={pctToTarget !== null ? `${pctToTarget}% of target ${data.month_to_date.target}` : "no target set"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader title="Status breakdown" />
          <CardBody className="space-y-2">
            {Object.keys(data.status_counts).length === 0 && (
              <p className="text-sm text-slate-400">No brands yet.</p>
            )}
            {Object.entries(data.status_counts).map(([status, count]) => {
              const total = Object.values(data.status_counts).reduce((s, n) => s + n, 0)
              const pct = total === 0 ? 0 : Math.round((count / total) * 100)
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 capitalize">{status.replace("_", " ")}</span>
                    <span className="tabular-nums text-slate-500">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent replies on your brands" />
          <CardBody className="p-0 divide-y divide-slate-100">
            {data.recent_replies.length === 0 && <p className="text-sm text-slate-400 p-5">No replies yet.</p>}
            {data.recent_replies.map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-0.5">
                  <span>{r.brand_name ?? "—"}</span>
                  <span>{r.occurred_at ? new Date(r.occurred_at).toLocaleString() : ""}</span>
                </div>
                <div className="font-medium text-slate-900 text-sm">{r.subject}</div>
                <div className="text-sm text-slate-600">{r.preview}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  )
}

/* ---------------- Manager ---------------- */
function ManagerView() {
  const { data, isLoading } = useManagerDashboard()
  if (isLoading || !data) return pageWrap(<p className="text-slate-500">Loading…</p>)

  const target  = data.daily_brand_target
  const teamCap = target * data.per_sdr.length
  const teamPct = teamCap > 0 ? Math.min(100, Math.round((data.team_marked_ready_today / teamCap) * 100)) : 0

  return pageWrap(
    <>
      <PageHeader title="Team dashboard" subtitle="Performance and queue health for your team." />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat icon={<Users size={16} />}      tone="indigo"  label="Team size" value={data.team_size} />
        <Stat icon={<Target size={16} />}     tone="emerald" label="Marked Ready today"
              value={target > 0 ? `${data.team_marked_ready_today} / ${teamCap}` : data.team_marked_ready_today}
              hint={target > 0 ? `${teamPct}% of team daily target` : "No daily target set"} />
        <Stat icon={<Inbox size={16} />}      tone="amber"   label="Awaiting review" value={data.awaiting_review_count} />
        <Stat icon={<MailCheck size={16} />}  tone="emerald" label="Active SDRs" value={data.per_sdr.length} />
      </div>

      <PerSdrTrendCard sdrs={data.per_sdr.map((s) => ({ id: s.id, name: s.name }))} />

      <ManagerPerSdrTable rows={data.per_sdr} periodTargets={data.period_targets} />
    </>
  )
}

function ManagerPerSdrTable({
  rows, periodTargets,
}: {
  rows: ManagerDashboard["per_sdr"]
  periodTargets: { day: number; week: number; month: number }
}) {
  const { sorted, sort, setSort } = useSortedSdrs(rows, { key: "today", dir: "desc" })
  return (
    <Card>
      <CardHeader title="Per-SDR" subtitle="Brands marked Ready by period + your review queue. Click any column to sort." />
      <Table>
        <THead>
          <TR>
            <SortableTH k="name"       sort={sort} setSort={setSort}>SDR</SortableTH>
            <SortableTH k="today"      sort={sort} setSort={setSort}>Today</SortableTH>
            <SortableTH k="yesterday"  sort={sort} setSort={setSort}>Yesterday</SortableTH>
            <SortableTH k="last_week"  sort={sort} setSort={setSort}>Last 5 days</SortableTH>
            <SortableTH k="last_month" sort={sort} setSort={setSort}>Last month</SortableTH>
            <SortableTH k="ready"      sort={sort} setSort={setSort}>Awaiting review</SortableTH>
          </TR>
        </THead>
        <tbody>
          {sorted.map((s) => (
            <TR key={s.id}>
              <TD className="font-medium text-slate-900">{s.name}</TD>
              <PeriodCell value={s.marked_ready_today}      target={periodTargets.day} />
              <PeriodCell value={s.marked_ready_yesterday}  target={periodTargets.day} />
              <PeriodCell value={s.marked_ready_last_week}  target={periodTargets.week} />
              <PeriodCell value={s.marked_ready_last_month} target={periodTargets.month} />
              <TD className="tabular-nums"><Badge tone="amber">{s.ready}</Badge></TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

/* ---------------- Admin ---------------- */
function AdminView() {
  const { data, isLoading } = useAdminDashboard()
  if (isLoading || !data) return pageWrap(<p className="text-slate-500">Loading…</p>)

  const weekly = Object.entries(data.weekly_volume)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week: week.slice(5), count }))

  return pageWrap(
    <>
      <PageHeader title="Executive dashboard" subtitle="Agency-wide brand pipeline + per-SDR performance." />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Stat icon={<Layers     size={16} />} label="Brands processed" value={data.totals.brands_processed} tone="indigo" />
        <Stat icon={<FileCheck2 size={16} />} label="Ready"            value={data.totals.ready}            tone="amber" />
        <Stat icon={<FileCheck2 size={16} />} label="Approved"         value={data.totals.approved}         tone="indigo" />
        <Stat icon={<Send       size={16} />} label="Pushed"           value={data.totals.pushed}           tone="emerald" />
        <Stat icon={<MailCheck  size={16} />} label="Replied"          value={data.totals.replied}          tone="emerald" />
        <Stat icon={<MailX      size={16} />} label="Bounced"          value={data.totals.bounced}          tone="rose" />
      </div>

      {/* Today's daily-target snapshot — the metric admins/managers care about most. */}
      <Card className="mb-6">
        <CardHeader
          title="Today"
          subtitle={
            data.today.daily_target > 0
              ? `Target: ${data.today.daily_target} brands per SDR`
              : "Set a daily target in Settings to track per-SDR progress."
          }
        />
        <CardBody>
          {(() => {
            const total  = data.today.marked_ready
            const cap    = data.today.daily_target * data.today.sdr_count
            const pct    = cap > 0 ? Math.min(100, Math.round((total / cap) * 100)) : 0
            const onPace = data.today.daily_target > 0 ? data.per_sdr.filter((s) => s.marked_ready_today >= data.today.daily_target).length : 0
            return (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                      {total}{cap > 0 && <span className="text-slate-400 font-normal"> / {cap}</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">brands marked Ready by {data.today.sdr_count} active SDR{data.today.sdr_count === 1 ? "" : "s"}</div>
                  </div>
                  {data.today.daily_target > 0 && (
                    <div className="text-right">
                      <div className="text-sm text-slate-700"><strong>{onPace}</strong> of {data.today.sdr_count} on or above target</div>
                      <div className="text-xs text-slate-500 mt-0.5">{pct}% of agency capacity</div>
                    </div>
                  )}
                </div>
                {cap > 0 && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full transition-[width] duration-300 bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })()}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Weekly volume" subtitle="Brands created per week, last 12 weeks." />
        <CardBody>
          {weekly.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.18 270)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.55 0.18 270)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(226 232 240)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "rgb(100 116 139)" }} />
                <YAxis tick={{ fontSize: 12, fill: "rgb(100 116 139)" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid rgb(226 232 240)", fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="oklch(0.55 0.18 270)" strokeWidth={2} fill="url(#brandGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Per-category performance" />
        <Table>
          <THead>
            <TR>
              <TH>Category</TH><TH>Brands</TH><TH>Pushed</TH>
            </TR>
          </THead>
          <tbody>
            {data.per_category.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-slate-900">{c.name}</TD>
                <TD className="tabular-nums">{c.brands_count}</TD>
                <TD className="tabular-nums"><Badge tone="emerald">{c.pushed_count}</Badge></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <PerSdrTrendCard sdrs={data.per_sdr.map((s) => ({ id: s.id, name: s.name }))} />

      <AdminPerSdrTable rows={data.per_sdr} periodTargets={data.period_targets} />
    </>
  )
}

function AdminPerSdrTable({
  rows, periodTargets,
}: {
  rows: AdminDashboard["per_sdr"]
  periodTargets: { day: number; week: number; month: number }
}) {
  const { sorted, sort, setSort } = useSortedSdrs(rows, { key: "today", dir: "desc" })
  return (
    <Card>
      <CardHeader title="Per-SDR" subtitle="Brands marked Ready by period. Click any column to sort." />
      <Table>
        <THead>
          <TR>
            <SortableTH k="name"       sort={sort} setSort={setSort}>SDR</SortableTH>
            <SortableTH k="today"      sort={sort} setSort={setSort}>Today</SortableTH>
            <SortableTH k="yesterday"  sort={sort} setSort={setSort}>Yesterday</SortableTH>
            <SortableTH k="last_week"  sort={sort} setSort={setSort}>Last 5 days</SortableTH>
            <SortableTH k="last_month" sort={sort} setSort={setSort}>Last month</SortableTH>
          </TR>
        </THead>
        <tbody>
          {sorted.map((s) => (
            <TR key={s.id}>
              <TD className="font-medium text-slate-900">{s.name}</TD>
              <PeriodCell value={s.marked_ready_today}      target={periodTargets.day} />
              <PeriodCell value={s.marked_ready_yesterday}  target={periodTargets.day} />
              <PeriodCell value={s.marked_ready_last_week}  target={periodTargets.week} />
              <PeriodCell value={s.marked_ready_last_month} target={periodTargets.month} />
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

/* ---------------- helpers / shared components ---------------- */

// Cell that renders "X / target" as a coloured pill — emerald at/over,
// amber partial, rose at zero, neutral when no target is set.
// Per-SDR table sort state. Keys cover both admin (4 period cols + name)
// and manager (+ "ready" review-queue count) tables.
type SdrSortKey = "name" | "today" | "yesterday" | "last_week" | "last_month" | "ready"
type SortDir = "asc" | "desc"
interface SortState { key: SdrSortKey; dir: SortDir }

interface SortableSdrRow {
  name: string
  marked_ready_today: number
  marked_ready_yesterday: number
  marked_ready_last_week: number
  marked_ready_last_month: number
  ready?: number
}

function useSortedSdrs<R extends SortableSdrRow>(rows: R[], initial: SortState) {
  const [sort, setSort] = useState<SortState>(initial)
  const sorted = useMemo(() => {
    const accessor = (s: R): string | number => {
      switch (sort.key) {
        case "name":       return s.name.toLowerCase()
        case "today":      return s.marked_ready_today
        case "yesterday":  return s.marked_ready_yesterday
        case "last_week":  return s.marked_ready_last_week
        case "last_month": return s.marked_ready_last_month
        case "ready":      return s.ready ?? 0
      }
    }
    return [...rows].sort((a, b) => {
      const av = accessor(a), bv = accessor(b)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === "asc" ? cmp : -cmp
    })
  }, [rows, sort])
  return { sorted, sort, setSort }
}

function SortableTH({
  k, sort, setSort, children, align = "left",
}: {
  k: SdrSortKey
  sort: SortState
  setSort: (s: SortState) => void
  children: React.ReactNode
  align?: "left" | "right"
}) {
  const active = sort.key === k
  const onClick = () => {
    if (active) {
      setSort({ key: k, dir: sort.dir === "asc" ? "desc" : "asc" })
    } else {
      // First click on a numerical column starts at desc (highest first)
      // since that's almost always what the admin wants. Name starts asc.
      setSort({ key: k, dir: k === "name" ? "asc" : "desc" })
    }
  }
  const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TH>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 font-medium uppercase tracking-wide text-xs transition-colors",
          "hover:text-slate-900",
          active ? "text-slate-900" : "text-slate-500",
          align === "right" && "ml-auto"
        )}
      >
        {children}
        <Icon size={11} className={active ? "text-slate-900" : "text-slate-300"} />
      </button>
    </TH>
  )
}

function PeriodCell({ value, target }: { value: number; target: number }) {
  if (target <= 0) return <TD className="tabular-nums text-slate-600">{value}</TD>
  const tone = value >= target ? "emerald" : value === 0 ? "rose" : "amber"
  return (
    <TD className="tabular-nums">
      <Badge tone={tone}>{value} / {target}</Badge>
    </TD>
  )
}

// Period buttons + multi-select SDR filter + recharts line chart
// showing per-day "marked Ready" counts. One coloured line per SDR.
function PerSdrTrendCard({ sdrs }: { sdrs: { id: number; name: string }[] }) {
  const [period, setPeriod] = useState<ChartPeriod>("7d")
  // Default: top 5 SDRs by id (keeps the line count readable). User can
  // open the multi-select to flip them on/off.
  const [selected, setSelected] = useState<Set<number>>(() => new Set(sdrs.slice(0, 5).map((s) => s.id)))

  // When the SDR list arrives later, populate defaults if we have none.
  useEffect(() => {
    if (selected.size === 0 && sdrs.length > 0) {
      setSelected(new Set(sdrs.slice(0, 5).map((s) => s.id)))
    }
  }, [sdrs.length])

  const { data: timeseries } = useMarkedReadyTimeseries(period, [...selected])

  // Recharts wants one row per day, with each SDR as a separate column.
  const chartData = useMemo(() => {
    if (!timeseries) return []
    return timeseries.days.map((day, i) => {
      const row: Record<string, string | number> = { day: day.slice(5) }  // MM-DD
      timeseries.by_sdr.forEach((s) => { row[s.name] = s.counts[i] })
      return row
    })
  }, [timeseries])

  const lineColors = [
    "oklch(0.55 0.18 270)", // brand
    "oklch(0.65 0.16 145)", // emerald
    "oklch(0.74 0.16 75)",  // amber
    "oklch(0.62 0.20 25)",  // rose
    "oklch(0.55 0.18 200)", // sky
    "oklch(0.55 0.18 320)", // pink
    "oklch(0.55 0.18 100)", // olive
    "oklch(0.55 0.18 30)",  // orange
    "oklch(0.45 0.10 270)", // dark indigo
    "oklch(0.40 0.10 145)", // dark green
  ]

  return (
    <Card className="mb-6">
      <CardHeader
        title="Marked Ready over time"
        subtitle="Per-SDR daily counts. Pick a period and which SDRs to chart."
        action={
          <div className="flex items-center gap-2">
            <PeriodToggle value={period} onChange={setPeriod} />
            <SdrMultiSelect sdrs={sdrs} selected={selected} onChange={setSelected} />
          </div>
        }
      />
      <CardBody>
        {!timeseries ? (
          <p className="text-sm text-slate-400">Loading chart…</p>
        ) : selected.size === 0 ? (
          <p className="text-sm text-slate-400">Pick at least one SDR to chart.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(226 232 240)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "rgb(100 116 139)" }} />
              <YAxis tick={{ fontSize: 11, fill: "rgb(100 116 139)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid rgb(226 232 240)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              {timeseries.by_sdr.map((s, i) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.name}
                  stroke={lineColors[i % lineColors.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  )
}

function PeriodToggle({ value, onChange }: { value: ChartPeriod; onChange: (p: ChartPeriod) => void }) {
  const opts: { v: ChartPeriod; label: string }[] = [
    { v: "7d", label: "7 days" },
    { v: "30d", label: "30 days" },
    { v: "6m", label: "6 months" },
  ]
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
      {opts.map(({ v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition-colors",
            value === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SdrMultiSelect({
  sdrs, selected, onChange,
}: {
  sdrs: { id: number; name: string }[]
  selected: Set<number>
  onChange: (next: Set<number>) => void
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

  const toggle = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  const allOn = sdrs.every((s) => selected.has(s.id))
  const allOff = selected.size === 0

  return (
    <div ref={ref} className="relative">
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>
        {selected.size === 0
          ? "Pick SDRs"
          : allOn
            ? `All ${sdrs.length} SDRs`
            : `${selected.size} of ${sdrs.length} SDRs`}
        <ChevronDown size={14} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-64 rounded-md border border-slate-200 bg-white shadow-lg py-1 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => onChange(new Set(sdrs.map((s) => s.id)))}
              className="text-slate-700 hover:underline"
              disabled={allOn}
            >Select all</button>
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="text-slate-700 hover:underline"
              disabled={allOff}
            >Clear</button>
          </div>
          {sdrs.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span className="text-slate-700">{s.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

