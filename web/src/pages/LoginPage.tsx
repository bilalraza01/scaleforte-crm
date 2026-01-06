import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/AuthProvider"
import type { ApiError } from "@/lib/http"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label, FieldError } from "@/components/ui/Input"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white text-lg font-semibold mb-3">
            S
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Scaleforte CRM</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to continue.</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2.5 rounded-md">
                {serverError}
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" autoFocus {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              <FieldError>{errors.password?.message}</FieldError>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
