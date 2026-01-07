import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "./AuthProvider"
import { HomeRedirect } from "./HomeRedirect"
import type { Role } from "@/types/user"
import type { ReactNode } from "react"

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode
  roles?: Role[]
}) {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === "loading") {
    return <div className="p-6 text-slate-500">Loading…</div>
  }

  if (state.status === "anonymous") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (roles && !roles.includes(state.user.role)) {
    return <HomeRedirect />
  }

  return <>{children}</>
}
