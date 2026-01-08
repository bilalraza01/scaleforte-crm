import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useUser, useUpdateUser, useUsers, useDeactivateUser, useResetUserPassword } from "@/api/users"
import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Select, Label, FieldError } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { ArrowLeft } from "lucide-react"
import { WORKSPACES } from "@/lib/workspaces"
import type { ApiError } from "@/lib/http"
import type { Role, User, WorkspaceKey } from "@/types"

export function EditUserPage() {
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)
  const { user: viewer } = useAuth()
  const { data: target, isLoading } = useUser(userId)
  const { data: allUsers } = useUsers()
  const update = useUpdateUser(userId)
  const deactivate = useDeactivateUser()
  const resetPassword = useResetUserPassword()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)

  // Local form state — initialized once `target` arrives.
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("sdr")
  const [managerId, setManagerId] = useState<string>("")
  const [workspaceAccess, setWorkspaceAccess] = useState<Set<WorkspaceKey>>(new Set())

  useEffect(() => {
    if (!target) return
    setName(target.name)
    setRole(target.role)
    setManagerId(target.manager_id ? String(target.manager_id) : "")
    setWorkspaceAccess(new Set(target.workspace_access))
  }, [target?.id])

  if (!viewer) return null
  if (isLoading || !target) return <div className="px-8 py-8 text-slate-500">Loading…</div>

  const isAdmin   = viewer.role === "admin"
  const isManager = viewer.role === "manager"
  // Manager can only edit SDRs they manage.
  const canEdit = isAdmin || (isManager && target.manager_id === viewer.id)
  // Only admin can change role, manager assignment, and workspace access.
  // Managers can edit name only.
  const canEditAdminFields = isAdmin

  const managers = (allUsers ?? []).filter((u) => u.role === "manager" && u.active)

  const onSave = async () => {
    setError(null)
    try {
      const payload: Partial<User> = { name }
      if (canEditAdminFields) {
        payload.role = role
        // manager_id is only meaningful when role=sdr; null otherwise.
        payload.manager_id = role === "sdr"
          ? (managerId ? Number(managerId) : null)
          : null
        payload.workspace_access = [...workspaceAccess]
      }
      await update.mutateAsync(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      const e = err as ApiError
      const errs = e.response?.data?.errors as Record<string, string[]> | undefined
      if (errs) {
        setError(Object.entries(errs).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" · "))
      } else {
        setError(e.response?.data?.error ?? "Could not save")
      }
    }
  }

  const toggleWorkspace = (key: WorkspaceKey) => {
    const next = new Set(workspaceAccess)
    next.has(key) ? next.delete(key) : next.add(key)
    setWorkspaceAccess(next)
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <Link to="/settings/users" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline mb-2">
        <ArrowLeft size={14} /> Users
      </Link>
      <PageHeader
        title={target.name || target.email}
        subtitle={target.email}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={target.role === "admin" ? "indigo" : target.role === "manager" ? "sky" : "neutral"}>
              {target.role}
            </Badge>
            {target.active ? <Badge tone="emerald">active</Badge> : <Badge tone="rose">deactivated</Badge>}
          </div>
        }
      />

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-2.5 rounded-md mb-3">Saved.</div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2.5 rounded-md mb-3">{error}</div>
      )}

      <Card className="mb-4">
        <CardHeader title="Profile" />
        <CardBody className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={target.email} disabled />
            <FieldError>Email is the user's login identity and can't be changed here.</FieldError>
          </div>
          {canEditAdminFields && (
            <div>
              <Label>Role</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="sdr">SDR</option>
                <option value="manager">Manager</option>
                <option value="onboarder">Onboarder</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
          )}
        </CardBody>
      </Card>

      {role === "sdr" && (
        <Card className="mb-4">
          <CardHeader title="Manager" subtitle="Which manager this SDR reports to. Reassign to move the SDR onto a different team." />
          <CardBody>
            <Select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={!canEditAdminFields}
            >
              <option value="">— pick a manager —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name || m.email}</option>
              ))}
            </Select>
            {!canEditAdminFields && (
              <FieldError>Only admins can reassign SDRs between managers.</FieldError>
            )}
          </CardBody>
        </Card>
      )}

      {canEditAdminFields && (
        <Card className="mb-4">
          <CardHeader
            title="Workspace access"
            subtitle="Which top-level workspaces this user can enter. Admin always has full access regardless."
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-2">
              {WORKSPACES.map((w) => (
                <label key={w.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={workspaceAccess.has(w.key)}
                    onChange={() => toggleWorkspace(w.key)}
                    disabled={role === "admin"}
                  />
                  <span className="capitalize">{w.label}</span>
                </label>
              ))}
            </div>
            {role === "admin" && (
              <p className="text-xs text-slate-500 mt-2">Admins always see all workspaces — checkboxes are disabled.</p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={onSave} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate("/settings/users")}>Cancel</Button>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="secondary" onClick={() => setShowResetModal(true)}>
              Reset password
            </Button>
          )}
          {target.active && target.id !== viewer.id && canEdit && (
            <Button
              variant="danger"
              disabled={deactivate.isPending}
              onClick={async () => {
                if (!confirm(`Deactivate ${target.name || target.email}?`)) return
                await deactivate.mutateAsync(target.id)
                navigate("/settings/users")
              }}
            >
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {showResetModal && (
        <ResetPasswordModal
          userId={target.id}
          userName={target.name || target.email}
          onClose={() => setShowResetModal(false)}
          onDone={() => setShowResetModal(false)}
          mutation={resetPassword}
        />
      )}
    </div>
  )
}

function ResetPasswordModal({
  userId, userName, onClose, onDone, mutation,
}: {
  userId: number
  userName: string
  onClose: () => void
  onDone: () => void
  mutation: ReturnType<typeof useResetUserPassword>
}) {
  const [pwd, setPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setErr(null)
    if (pwd.length < 8) return setErr("Password must be at least 8 characters")
    if (pwd !== confirmPwd) return setErr("Passwords don't match")
    try {
      await mutation.mutateAsync({ id: userId, password: pwd })
      setDone(true)
      setTimeout(onDone, 1200)
    } catch {
      setErr("Reset failed — try again.")
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CardHeader title="Reset password" subtitle={`Set a new password for ${userName}.`} />
        <CardBody className="space-y-3">
          {done ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-2.5 rounded-md">
              Password reset. The user can now sign in with the new password.
            </div>
          ) : (
            <>
              {err && <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2.5 rounded-md">{err}</div>}
              <div>
                <Label htmlFor="rp">New password</Label>
                <Input id="rp" type="password" autoFocus value={pwd} onChange={(e) => setPwd(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rpc">Confirm</Label>
                <Input id="rpc" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={submit} disabled={mutation.isPending}>
                  {mutation.isPending ? "Resetting…" : "Reset password"}
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
