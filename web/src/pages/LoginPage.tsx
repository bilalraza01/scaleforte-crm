import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/AuthProvider"
import type { ApiError } from "@/lib/http"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
})
type LoginInput = z.infer<typeof loginSchema>

export function LoginPage() {
  const { state, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  if (state.status === "authenticated") {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (input: LoginInput) => {
    setServerError(null)
    try {
      await signIn(input.email, input.password)
      const from = (location.state as { from?: string } | null)?.from ?? "/dashboard"
      navigate(from, { replace: true })
    } catch (err) {
      const e = err as ApiError
      setServerError(e.response?.data?.error ?? "Invalid email or password")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white shadow rounded-lg p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-bold">Sign in to Scaleforte CRM</h1>

        {serverError && (
          <div className="bg-rose-100 text-rose-900 text-sm p-2 rounded">{serverError}</div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            {...register("email")}
            className="w-full border rounded px-2 py-1.5"
          />
          {errors.email && <p className="text-rose-600 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="w-full border rounded px-2 py-1.5"
          />
          {errors.password && (
            <p className="text-rose-600 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white rounded py-2 hover:bg-slate-700 disabled:opacity-50"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  )
}
