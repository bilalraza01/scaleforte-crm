import { useAuth } from "@/auth/AuthProvider"
import { useAdminDashboard, useManagerDashboard, useSdrDashboard } from "@/api/dashboards"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Stat } from "@/components/ui/Stat"
import { Table, THead, TR, TH, TD } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Activity, MailCheck, MailX, Send, Users, Layers, FileCheck2, Inbox, Target } from "lucide-react"
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat icon={<FileCheck2 size={16} />} tone="indigo" label="Completed today" value={data.today.completed} />
        <Stat icon={<Inbox      size={16} />} tone="amber"  label="Marked ready today" value={data.today.ready} />
        <Stat
          icon={<Activity size={16} />} tone="neutral"
          label="Month to date"
          value={data.month_to_date.completed}
          hint={pctToTarget !== null ? `${pctToTarget}% of target ${data.month_to_date.target}` : "no target set"}
        />
        <Stat
          icon={<MailCheck size={16} />} tone="emerald"
          label="Reply rate"
          value={`${data.engagement.reply_rate}%`}
          hint={`${data.engagement.replied}/${data.engagement.sent} sent`}
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

      <Card>
        <CardHeader title="Per-SDR" subtitle="Today's progress + month-to-date." />
        <Table>
          <THead>
            <TR>
              <TH>SDR</TH>
              <TH>Today</TH>
              <TH>MTD</TH><TH>Drafts</TH><TH>Ready</TH>
              <TH>Approved/Pushed</TH><TH>Reply rate</TH><TH>Bounce rate</TH>
            </TR>
          </THead>
          <tbody>
            {data.per_sdr.map((s) => {
              const hit = target > 0 && s.marked_ready_today >= target
              return (
                <TR key={s.id}>
                  <TD className="font-medium text-slate-900">{s.name}</TD>
                  <TD className="tabular-nums">
                    {target > 0 ? (
                      <Badge tone={hit ? "emerald" : s.marked_ready_today === 0 ? "rose" : "amber"}>
                        {s.marked_ready_today} / {target}
                      </Badge>
                    ) : (
                      <span className="text-slate-600 tabular-nums">{s.marked_ready_today}</span>
                    )}
                  </TD>
                  <TD className="tabular-nums">{s.mtd_completed}</TD>
                  <TD className="tabular-nums"><Badge tone="slate">{s.drafts}</Badge></TD>
                  <TD className="tabular-nums"><Badge tone="amber">{s.ready}</Badge></TD>
                  <TD className="tabular-nums"><Badge tone="emerald">{s.approved_or_pushed}</Badge></TD>
                  <TD className="tabular-nums">{s.engagement.reply_rate}%</TD>
                  <TD className="tabular-nums">{s.engagement.bounce_rate}%</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </>
  )
}

/* ---------------- Admin ---------------- */
function AdminView() {
  const { data, isLoading } = useAdminDashboard()
  if (isLoading || !data) return pageWrap(<p className="text-slate-500">Loading…</p>)

  const weekly = Object.entries(data.weekly_volume)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week: week.slice(5), count }))

  const categoryChart = data.per_category.map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 17) + "…" : c.name,
    reply_rate: c.engagement.reply_rate,
    bounce_rate: c.engagement.bounce_rate,
  }))

  return pageWrap(
    <>
      <PageHeader title="Executive dashboard" subtitle="Agency-wide reply, bounce, and throughput." />

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
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

        <Card>
          <CardHeader title="Reply vs bounce by category" />
          <CardBody>
            {categoryChart.length === 0 ? (
              <p className="text-sm text-slate-400">No categories yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryChart} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(226 232 240)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "rgb(100 116 139)" }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "rgb(100 116 139)" }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid rgb(226 232 240)", fontSize: 12 }} />
                  <Bar dataKey="reply_rate"  name="Reply %"  fill="oklch(0.65 0.16 145)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="bounce_rate" name="Bounce %" fill="oklch(0.62 0.20 25)"  radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Per-category performance" />
        <Table>
          <THead>
            <TR>
              <TH>Category</TH><TH>Brands</TH><TH>Pushed</TH>
              <TH>Sent</TH><TH>Reply rate</TH><TH>Bounce rate</TH>
            </TR>
          </THead>
          <tbody>
            {data.per_category.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-slate-900">{c.name}</TD>
                <TD className="tabular-nums">{c.brands_count}</TD>
                <TD className="tabular-nums"><Badge tone="emerald">{c.pushed_count}</Badge></TD>
                <TD className="tabular-nums">{c.engagement.sent}</TD>
                <TD className="tabular-nums">{c.engagement.reply_rate}%</TD>
                <TD className="tabular-nums">{c.engagement.bounce_rate}%</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Per-SDR" subtitle="Today + month-to-date." />
        <Table>
          <THead>
            <TR>
              <TH>SDR</TH><TH>Today</TH><TH>MTD</TH><TH>Sent</TH>
              <TH>Reply rate</TH><TH>Bounce rate</TH>
            </TR>
          </THead>
          <tbody>
            {data.per_sdr.map((s) => {
              const target = data.today.daily_target
              const hit = target > 0 && s.marked_ready_today >= target
              return (
                <TR key={s.id}>
                  <TD className="font-medium text-slate-900">{s.name}</TD>
                  <TD className="tabular-nums">
                    {target > 0 ? (
                      <Badge tone={hit ? "emerald" : s.marked_ready_today === 0 ? "rose" : "amber"}>
                        {s.marked_ready_today} / {target}
                      </Badge>
                    ) : (
                      <span className="text-slate-600 tabular-nums">{s.marked_ready_today}</span>
                    )}
                  </TD>
                  <TD className="tabular-nums">{s.mtd_completed}</TD>
                  <TD className="tabular-nums">{s.engagement.sent}</TD>
                  <TD className="tabular-nums">{s.engagement.reply_rate}%</TD>
                  <TD className="tabular-nums">{s.engagement.bounce_rate}%</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </>
  )
}
