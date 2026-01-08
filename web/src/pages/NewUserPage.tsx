import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCreateUser, useUsers } from "@/api/users"
import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Select, Label, FieldError } from "@/components/ui/Input"
import { ArrowLeft } from "lucide-react"
import { WORKSPACES } from "@/lib/workspaces"
import type { ApiError } from "@/lib/http"
import type { Role, WorkspaceKey } from "@/types/user"

// Per-role default workspaces (mirrors the BE WorkspaceDefaults concern at
// api/app/models/concerns/workspace_defaults.rb). Used to pre-check the
// admin's workspace-access checkboxes when role changes.
const DEFAULT_WORKSPACES: Record<Role, WorkspaceKey[]> = {
  admin:      ["acquisition", "onboarding", "retention", "invoicing", "settings"],
  manager:    ["acquisition", "settings"],
  sdr:        ["acquisition"],
  onboarder:  ["onboarding"],
  accountant: ["invoicing"],
}

const schema = z.object({
  name:     z.string().min(1, "Name is required"),
  email:    z.string().email("Valid email required"),
  role:     z.enum(["admin", "manager", "sdr", "onboarder", "accountant"]),
  password: z.string().min(8, "At least 8 characters"),
  password_confirmation: z.string(),
  manager_id: z.coerce.number().int().positive().nullable().optional(),
  workspace_access: z.array(z.enum(["acquisition","onboarding","retention","invoicing","settings"])).min(1, "Pick at least one workspace"),
}).refine((d) => d.password === d.password_confirmation, {
  message: "Passwords don't match",
  path: ["password_confirmation"],
})
type FormInput = z.infer<typeof schema>

export function NewUserPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const create = useCreateUser()
  const { data: users } = useUsers()
  const [serverError, setServerError] = useState<string | null>(null)

  const isAdmin = user?.role === "admin"

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "sdr",
      // Manager creating: BE forces manager_id = current_user.id, so this
      // is just a placeholder. Admin must pick.
      manager_id: isAdmin ? null : (user?.id ?? null),
      workspace_access: DEFAULT_WORKSPACES.sdr,
    },
  })

  const role = watch("role")
  const requiresManager = role === "sdr"
  const workspaceAccess = watch("workspace_access") ?? []

  const managerOptions = (users ?? []).filter((u) => u.role === "manager" && u.active)

  // When admin flips role, refresh the workspace-access defaults.
  // Doesn't fire for managers (role is locked to sdr for them).
  const onRoleChange = (newRole: Role) => {
    setValue("role", newRole)
    setValue("workspace_access", DEFAULT_WORKSPACES[newRole])
  }

  const toggleWorkspace = (key: WorkspaceKey) => {
    const next = new Set(workspaceAccess)
    next.has(key) ? next.delete(key) : next.add(key)
    setValue("workspace_access", [...next] as WorkspaceKey[])
  }

  const onSubmit = async (input: FormInput) => {
    setServerError(null)
    try {
      await create.mutateAsync({
        name:             input.name,
        email:            input.email,
        password:         input.password,
        // Manager submissions don't carry these — BE ignores/forces.
        role:             isAdmin ? input.role : "sdr",
        manager_id:       requiresManager ? input.manager_id ?? null : null,
        // Admin sees the checkboxes; manager defaults via BE.
        workspace_access: isAdmin ? input.workspace_access : undefined,
      })
      navigate("/settings/users", { replace: true })
    } catch (err) {
      const e = err as ApiError
      const errs = e.response?.data?.errors as Record<string, string[]> | undefined
      if (errs) {
        setServerError(Object.entries(errs).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" · "))
      } else {
        setServerError(e.response?.data?.error ?? "Could not create user")
      }
    }
  }

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <Link to="/settings/users" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline mb-2">
        <ArrowLeft size={14} /> Users
      </Link>
      <PageHeader title="New user" subtitle="Add a teammate. They'll log in with the password you set here." />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2.5 rounded-md">{serverError}</div>
        )}

        <Card>
          <CardHeader title="Profile" />
          <CardBody className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoFocus {...register("name")} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            {isAdmin && (
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={role}
                  onChange={(e) => onRoleChange(e.target.value as Role)}
                >
                  <option value="sdr">SDR</option>
                  <option value="manager">Manager</option>
                  <option value="onboarder">Onboarder</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
            )}
            {requiresManager && (
              <div>
                <Label>Manager {isAdmin ? "" : "(you)"}</Label>
                {isAdmin ? (
                  <Select {...register("manager_id", { setValueAs: (v) => (v === "" ? null : Number(v)) })}>
                    <option value="">— pick a manager —</option>
                    {managerOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.name || m.email}</option>
                    ))}
                  </Select>
                ) : (
                  <p className="text-sm text-slate-600 px-2 py-1.5 bg-slate-50 rounded-md">
                    {user?.name} (you)
                  </p>
                )}
                <FieldError>{errors.manager_id?.message}</FieldError>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Initial password" subtitle="The user can change this themselves later from their profile." />
          <CardBody className="space-y-3">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              <FieldError>{errors.password?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="password_confirmation">Confirm password</Label>
              <Input id="password_confirmation" type="password" autoComplete="new-password" {...register("password_confirmation")} />
              <FieldError>{errors.password_confirmation?.message}</FieldError>
            </div>
          </CardBody>
        </Card>

        {isAdmin && (
          <Card>
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
                      checked={workspaceAccess.includes(w.key)}
                      onChange={() => toggleWorkspace(w.key)}
                      disabled={role === "admin"}
                    />
                    <span>{w.label}</span>
                  </label>
                ))}
              </div>
              {role === "admin" && (
                <p className="text-xs text-slate-500 mt-2">
                  Admins always see all workspaces — checkboxes are disabled.
                </p>
              )}
              <FieldError>{errors.workspace_access?.message}</FieldError>
            </CardBody>
          </Card>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" type="button" onClick={() => navigate("/settings/users")}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || create.isPending}>
            {create.isPending ? "Creating…" : "Create user"}
          </Button>
        </div>
      </form>
    </div>
  )
}
