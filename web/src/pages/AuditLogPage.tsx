import { useQuery } from "@tanstack/react-query"
import { http } from "@/lib/http"

interface AuditLogEntry {
  id: number
  action: string
  user_id: number | null
  user_name: string | null
  resource_type: string | null
  resource_id: number | null
  ip_address: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export function AuditLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => (await http.get<AuditLogEntry[]>("/api/v1/audit_logs")).data,
  })

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <p className="text-slate-600 text-sm">
        Sensitive actions: sign-ins, invites, role changes, Smartlead config edits, pushes, classifications.
        Last 200 entries.
      </p>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      {data && (
        <table className="w-full bg-white shadow rounded text-sm">
          <thead className="text-left bg-slate-100 text-xs uppercase">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Who</th>
              <th className="p-2">Action</th>
              <th className="p-2">Resource</th>
              <th className="p-2">IP</th>
              <th className="p-2">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {data.map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="p-2 text-xs text-slate-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-2">{l.user_name ?? "system"}</td>
                <td className="p-2 font-mono text-xs">{l.action}</td>
                <td className="p-2 text-xs">{l.resource_type}{l.resource_id ? `#${l.resource_id}` : ""}</td>
                <td className="p-2 text-xs text-slate-500">{l.ip_address ?? "—"}</td>
                <td className="p-2 text-xs">
                  {Object.keys(l.metadata).length > 0 ? (
                    <pre className="font-mono text-[10px] bg-slate-50 p-1 rounded max-w-md overflow-auto">{JSON.stringify(l.metadata, null, 2)}</pre>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
