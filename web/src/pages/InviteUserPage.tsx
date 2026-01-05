import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useInviteUser, useUsers } from "@/api/users"
import { useAuth } from "@/auth/AuthProvider"
import type { ApiError } from "@/lib/http"

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "manager", "sdr"]),
  manager_id: z.coerce.number().int().positive().nullable().optional(),
})
type InviteInput = z.infer<typeof baseSchema>

export function InviteUserPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const invite = useInviteUser()
  const { data: users } = useUsers()
  const [serverError, setServerError] = useState<string | null>(null)

  const isAdmin = user?.role === "admin"
  const allowedRoles: ("admin" | "manager" | "sdr")[] = isAdmin
    ? ["admin", "manager", "sdr"]
    : ["sdr"]

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteInput>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      role: "sdr",
      manager_id: isAdmin ? null : (user?.id ?? null),
    },
  })

  const role = watch("role")
  const requiresManager = role === "sdr"

  const managerOptions = (users ?? []).filter((u) => u.role === "manager" && u.active)

  const onSubmit = async (input: InviteInput) => {
    setServerError(null)
    try {
      const payload = {
        ...input,
        manager_id: requiresManager ? input.manager_id ?? null : null,
      }
      await invite.mutateAsync(payload)
      navigate("/users", { replace: true })
    } catch (err) {
      const e = err as ApiError
      const errs = e.response?.data?.errors
      if (errs) {
        setServerError(
          Object.entries(errs)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join(" · ")
        )
      } else {
        setServerError(e.response?.data?.error ?? "Could not send invitation")
      }
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Invite a user</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white shadow rounded p-4 space-y-3"
      >
        {serverError && (
          <div className="bg-rose-100 text-rose-900 text-sm p-2 rounded">{serverError}</div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Name</label>
          <input
            autoFocus
            {...register("name")}
            className="w-full border rounded px-2 py-1.5"
          />
          {errors.name && <p className="text-rose-600 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Email</label>
          <input
            type="email"
            {...register("email")}
            className="w-full border rounded px-2 py-1.5"
          />
          {errors.email && <p className="text-rose-600 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Role</label>
          <select {...register("role")} className="w-full border rounded px-2 py-1.5">
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {requiresManager && (
          <div>
            <label className="block text-sm font-semibold mb-1">
              Manager {isAdmin ? "" : "(you)"}
            </label>
            {isAdmin ? (
              <select
                {...register("manager_id", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
                className="w-full border rounded px-2 py-1.5"
              >
                <option value="">— pick a manager —</option>
                {managerOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="hidden"
                {...register("manager_id", { setValueAs: () => user?.id ?? null })}
              />
            )}
            {!isAdmin && (
              <p className="text-xs text-slate-600 mt-1">
                Will be assigned to you ({user?.name}).
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || invite.isPending}
          className="w-full bg-slate-900 text-white rounded py-2 hover:bg-slate-700 disabled:opacity-50"
        >
          {invite.isPending ? "Sending…" : "Send invitation"}
        </button>
      </form>
    </div>
  )
}
