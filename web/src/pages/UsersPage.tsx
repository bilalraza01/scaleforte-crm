import { Link } from "react-router-dom"
import { useUsers, useDeactivateUser } from "@/api/users"
import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Table, THead, TR, TH, TD } from "@/components/ui/Table"
import { UserPlus } from "lucide-react"

export function UsersPage() {
  const { user } = useAuth()
  const { data: users, isLoading, error } = useUsers()
  const deactivate = useDeactivateUser()

  if (!user) return null
  const canInvite = user.role === "admin" || user.role === "manager"

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Users"
        subtitle="Admin and Manager accounts plus the SDR team."
        action={
          canInvite && (
            <Link to="/users/invite">
              <Button>
                <UserPlus size={14} />
                Invite a user
              </Button>
            </Link>
          )
        }
      />

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-rose-600">Could not load users.</p>}

      {users && (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Manager</TH>
                <TH>Status</TH>
                <TH></TH>
              </TR>
            </THead>
            <tbody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-slate-900">{u.name || u.email}</TD>
                  <TD className="text-slate-600">{u.email}</TD>
                  <TD>
                    <Badge tone={u.role === "admin" ? "indigo" : u.role === "manager" ? "sky" : "neutral"}>
                      {u.role}
                    </Badge>
                  </TD>
                  <TD className="text-slate-600">{u.manager_name ?? "—"}</TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      {u.active ? (
                        <Badge tone="emerald">active</Badge>
                      ) : (
                        <Badge tone="rose">deactivated</Badge>
                      )}
                      {u.invitation_pending && <Badge tone="amber">invite pending</Badge>}
                    </div>
                  </TD>
                  <TD className="text-right">
                    {u.active && u.id !== user.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deactivate.isPending}
                        onClick={() => {
                          if (confirm(`Deactivate ${u.name || u.email}?`)) deactivate.mutate(u.id)
                        }}
                      >
                        Deactivate
                      </Button>
                    )}
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
