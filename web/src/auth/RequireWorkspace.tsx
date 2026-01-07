import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./AuthProvider"
import { HomeRedirect } from "./HomeRedirect"
import type { WorkspaceKey } from "@/types"

// Coarse gate at the workspace boundary. Mirrors WorkspacePolicy on the BE:
// admin always passes; everyone else needs the workspace key in their
// `workspace_access`. Bypass attempts redirect to the user's actual home.
export function RequireWorkspace({ ws }: { ws: WorkspaceKey }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  const allowed = user.role === "admin" || user.workspace_access.includes(ws)
  if (!allowed) return <HomeRedirect />
  return <Outlet />
}
