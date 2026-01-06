import { useAuth } from "@/auth/AuthProvider"
import { useAdminDashboard, useManagerDashboard, useSdrDashboard } from "@/api/dashboards"

export function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role === "admin") return <AdminView />
  if (user.role === "manager") return <ManagerView />
  return <SdrView />
}

const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="bg-white shadow rounded p-4">
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-xs text-slate-500 uppercase">{label}</div>
    {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
  </div>
)

function SdrView() {
  const { user } = useAuth()
  const { data, isLoading } = useSdrDashboard()
  if (isLoading || !data) return <div className="p-6 text-slate-500">Loading…</div>
  const pctToTarget = data.month_to_date.target > 0
    ? Math.round((data.month_to_date.completed / data.month_to_date.target) * 100)
    : null

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Completed today" value={data.today.completed} />
        <Stat label="Ready today" value={data.today.ready} />
        <Stat
          label="MTD completed"
          value={data.month_to_date.completed}
          sub={pctToTarget !== null ? `${pctToTarget}% of target ${data.month_to_date.target}` : "no target set"}
        />
        <Stat label="Reply rate" value={`${data.engagement.reply_rate}%`} sub={`${data.engagement.replied}/${data.engagement.sent} sent`} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-600 mb-2">Status breakdown</h2>
        <div className="bg-white shadow rounded p-4 grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
          {Object.entries(data.status_counts).map(([status, count]) => (
            <div key={status}>
              <div className="text-2xl font-semibold">{count}</div>
              <div className="text-xs text-slate-500 font-mono">{status}</div>
            </div>
          ))}
        </div>
      </section>

      {data.recent_replies.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-600 mb-2">Recent replies on your brands</h2>
          <div className="bg-white shadow rounded divide-y">
            {data.recent_replies.map((r) => (
              <div key={r.id} className="p-3">
                <div className="text-xs text-slate-500">
                  {r.brand_name ?? "—"} · {r.occurred_at ? new Date(r.occurred_at).toLocaleString() : ""}
                </div>
                <div className="font-medium">{r.subject}</div>
                <div className="text-sm text-slate-700">{r.preview}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ManagerView() {
  const { data, isLoading } = useManagerDashboard()
  if (isLoading || !data) return <div className="p-6 text-slate-500">Loading…</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Team dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Team size" value={data.team_size} />
        <Stat label="Awaiting review" value={data.awaiting_review_count} />
        <Stat label="Per-SDR rows" value={data.per_sdr.length} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-600 mb-2">Per-SDR (last 30 days)</h2>
        <table className="w-full bg-white shadow rounded">
          <thead className="text-left bg-slate-100 text-xs uppercase">
            <tr>
              <th className="p-3">SDR</th>
              <th className="p-3">MTD</th>
              <th className="p-3">Drafts</th>
              <th className="p-3">Ready</th>
              <th className="p-3">Approved/Pushed</th>
              <th className="p-3">Reply rate</th>
              <th className="p-3">Bounce rate</th>
            </tr>
          </thead>
          <tbody>
            {data.per_sdr.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.mtd_completed}</td>
                <td className="p-3">{s.drafts}</td>
                <td className="p-3">{s.ready}</td>
                <td className="p-3">{s.approved_or_pushed}</td>
                <td className="p-3">{s.engagement.reply_rate}%</td>
                <td className="p-3">{s.engagement.bounce_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function AdminView() {
  const { data, isLoading } = useAdminDashboard()
  if (isLoading || !data) return <div className="p-6 text-slate-500">Loading…</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Executive dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Brands processed" value={data.totals.brands_processed} />
        <Stat label="Ready" value={data.totals.ready} />
        <Stat label="Approved" value={data.totals.approved} />
        <Stat label="Pushed" value={data.totals.pushed} />
        <Stat label="Replied" value={data.totals.replied} />
        <Stat label="Bounced" value={data.totals.bounced} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-600 mb-2">Per-category performance</h2>
        <table className="w-full bg-white shadow rounded">
          <thead className="text-left bg-slate-100 text-xs uppercase">
            <tr>
              <th className="p-3">Category</th>
              <th className="p-3">Brands</th>
              <th className="p-3">Pushed</th>
              <th className="p-3">Sent</th>
              <th className="p-3">Reply rate</th>
              <th className="p-3">Bounce rate</th>
            </tr>
          </thead>
          <tbody>
            {data.per_category.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.brands_count}</td>
                <td className="p-3">{c.pushed_count}</td>
                <td className="p-3">{c.engagement.sent}</td>
                <td className="p-3">{c.engagement.reply_rate}%</td>
                <td className="p-3">{c.engagement.bounce_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-600 mb-2">Per-SDR (sortable in v1.1)</h2>
        <table className="w-full bg-white shadow rounded">
          <thead className="text-left bg-slate-100 text-xs uppercase">
            <tr>
              <th className="p-3">SDR</th>
              <th className="p-3">MTD</th>
              <th className="p-3">Sent</th>
              <th className="p-3">Reply rate</th>
              <th className="p-3">Bounce rate</th>
            </tr>
          </thead>
          <tbody>
            {data.per_sdr.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.mtd_completed}</td>
                <td className="p-3">{s.engagement.sent}</td>
                <td className="p-3">{s.engagement.reply_rate}%</td>
                <td className="p-3">{s.engagement.bounce_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-600 mb-2">Weekly brand volume (last 12 weeks)</h2>
        <div className="bg-white shadow rounded p-4">
          {Object.keys(data.weekly_volume).length === 0 ? (
            <p className="text-slate-400 text-sm">No data yet.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {Object.entries(data.weekly_volume)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([week, count]) => {
                  const max = Math.max(...Object.values(data.weekly_volume))
                  const h = max === 0 ? 0 : Math.round((count / max) * 100)
                  return (
                    <div key={week} className="flex-1 flex flex-col items-center gap-1" title={`${week}: ${count}`}>
                      <div className="bg-emerald-500 rounded-t w-full" style={{ height: `${h}%` }} />
                      <div className="text-[10px] text-slate-500">{count}</div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
