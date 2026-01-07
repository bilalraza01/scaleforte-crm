import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { acceptInvitation, previewInvitation } from "@/api/auth"
import type { User } from "@/types/user"
import type { ApiError } from "@/lib/http"
import { useAuth } from "@/auth/AuthProvider"

const acceptSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    password: z.string().min(8, "At least 8 characters"),
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match",
  })
type AcceptInput = z.infer<typeof acceptSchema>

export function AcceptInvitationPage() {
  const { token = "" } = useParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [invitee, setInvitee] = useState<User | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    void previewInvitation(token)
      .then((u) => setInvitee(u))
      .catch(() => setLoadError("Invitation invalid or expired"))
  }, [token])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AcceptInput>({
    resolver: zodResolver(acceptSchema),
  })

  const onSubmit = async (input: AcceptInput) => {
    setServerError(null)
    try {
      await acceptInvitation({
        invitation_token: token,
        password: input.password,
        password_confirmation: input.password_confirmation,
        name: input.name,
      })
      await refresh()
      // HomeRedirect resolves the right landing page based on the new
      // user's role + workspace_access.
      navigate("/", { replace: true })
    } catch (err) {
      const e = err as ApiError
      setServerError(e.response?.data?.error ?? "Could not accept invitation")
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white shadow rounded-lg p-6 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-2">Invitation invalid</h1>
          <p className="text-sm text-slate-600">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!invitee) {
    return <div className="p-6 text-slate-500">Loading invitation…</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Set up your account</h1>
        <p className="text-sm text-slate-600">
          Inviting: <span className="font-mono">{invitee.email}</span> · {invitee.role}
        </p>

        {serverError && (
          <div className="bg-rose-100 text-rose-900 text-sm p-2 rounded">{serverError}</div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Name</label>
          <input defaultValue={invitee.name} {...register("name")} className="w-full border rounded px-2 py-1.5" />
          {errors.name && <p className="text-rose-600 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Password</label>
          <input type="password" autoComplete="new-password" {...register("password")} className="w-full border rounded px-2 py-1.5" />
          {errors.password && <p className="text-rose-600 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Confirm password</label>
          <input type="password" autoComplete="new-password" {...register("password_confirmation")} className="w-full border rounded px-2 py-1.5" />
          {errors.password_confirmation && <p className="text-rose-600 text-xs mt-1">{errors.password_confirmation.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white rounded py-2 hover:bg-slate-700 disabled:opacity-50">
          {isSubmitting ? "Setting up…" : "Set password and sign in"}
        </button>
      </form>
    </div>
  )
}
