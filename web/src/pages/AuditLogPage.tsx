import { useQuery } from "@tanstack/react-query"
import { http } from "@/lib/http"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Table, THead, TR, TH, TD } from "@/components/ui/Table"

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
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Audit log"
        subtitle="Sensitive actions: sign-ins, invites, role changes, Smartlead config edits, pushes, classifications. Last 200 entries."
      />

      {isLoading && <p className="text-slate-500">Loading…</p>}

      {data && (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>When</TH><TH>Who</TH><TH>Action</TH><TH>Resource</TH><TH>IP</TH><TH>Metadata</TH>
              </TR>
            </THead>
            <tbody>
              {data.map((l) => (
                <TR key={l.id}>
                  <TD className="text-xs text-slate-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TD>
                  <TD>{l.user_name ?? <span className="text-slate-400">system</span>}</TD>
                  <TD><Badge tone="indigo">{l.action}</Badge></TD>
                  <TD className="text-xs">{l.resource_type}{l.resource_id ? ` #${l.resource_id}` : ""}</TD>
                  <TD className="text-xs text-slate-500">{l.ip_address ?? "—"}</TD>
                  <TD className="text-xs">
                    {Object.keys(l.metadata).length > 0 ? (
                      <pre className="font-mono text-[10px] bg-slate-50 border border-slate-200 p-1.5 rounded max-w-md overflow-auto">
                        {JSON.stringify(l.metadata, null, 2)}
                      </pre>
                    ) : "—"}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}
