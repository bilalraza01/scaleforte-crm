import { Navigate } from "react-router-dom"
import { useAuth } from "./AuthProvider"
import { homePathFor } from "@/lib/workspaces"

// Lands signed-in users on the first item of their first allowed workspace.
// Sign-in, role-failure fallbacks, the catch-all, and the bare "/" path all
// route through here so we don't hard-code "/dashboard" anywhere.
export function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homePathFor(user)} replace />
}
