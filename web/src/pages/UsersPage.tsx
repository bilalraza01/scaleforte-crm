import { useState } from "react"
import { Link } from "react-router-dom"
import { useUsers, useDeactivateUser } from "@/api/users"
import { useCategories } from "@/api/categories"
import { useCategoryAssignments, useAssignCategory, useUnassignCategory } from "@/api/categoryAssignments"
import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Table, THead, TR, TH, TD } from "@/components/ui/Table"
import { UserPlus, X, Plus } from "lucide-react"
import type { User } from "@/types"

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
            <Link to="/settings/users/new">
              <Button>
                <UserPlus size={14} />
                New user
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
                <TH>Categories</TH>
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
                  <TD className="text-slate-600">
                    {u.role === "sdr" ? <CategoryAssignmentsCell sdr={u} viewer={user} /> : <span className="text-slate-300">—</span>}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      {u.active ? (
                        <Badge tone="emerald">active</Badge>
                      ) : (
                        <Badge tone="rose">deactivated</Badge>
                      )}
                    </div>
                  </TD>
                  <TD className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link to={`/settings/users/${u.id}/edit`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
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
                    </div>
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

// Inline editor showing the SDR's assigned categories with an add/remove
// affordance. Manager sees it for SDRs they manage; Admin sees it everywhere.
function CategoryAssignmentsCell({ sdr, viewer }: { sdr: User; viewer: User }) {
  const canEdit = viewer.role === "admin" || (viewer.role === "manager" && sdr.manager_id === viewer.id)
  const { data: assignments } = useCategoryAssignments(sdr.id)
  const { data: categories } = useCategories()
  const assign = useAssignCategory(sdr.id)
  const unassign = useUnassignCategory(sdr.id)
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState("")

  const assignedIds = new Set((assignments ?? []).map((a) => a.category_id))
  const unassignedCategories = (categories ?? []).filter((c) => !assignedIds.has(c.id))

  const onAdd = async () => {
    if (!pending) return
    await assign.mutateAsync(Number(pending))
    setPending("")
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(assignments ?? []).map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {a.category_name}
          {canEdit && (
            <button
              onClick={() => unassign.mutate(a.id)}
              className="text-slate-400 hover:text-rose-600"
              aria-label={`Remove ${a.category_name}`}
              type="button"
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}
      {canEdit && !adding && unassignedCategories.length > 0 && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
        >
          <Plus size={12} /> Add
        </button>
      )}
      {canEdit && adding && (
        <span className="inline-flex items-center gap-1">
          <select
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            className="text-xs border border-slate-200 rounded px-1.5 py-0.5"
            autoFocus
          >
            <option value="">— pick —</option>
            {unassignedCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pending || assign.isPending}
            onClick={onAdd}
            className="text-xs px-1.5 py-0.5 rounded bg-slate-900 text-white disabled:opacity-50"
          >
            ok
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setPending("") }}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Cancel"
          >
            <X size={12} />
          </button>
        </span>
      )}
      {(assignments ?? []).length === 0 && !canEdit && <span className="text-slate-300 text-xs">none</span>}
    </div>
  )
}
