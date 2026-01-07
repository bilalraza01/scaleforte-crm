import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/AuthProvider"
import { cn } from "@/lib/utils"
import { LogOut } from "lucide-react"
import {
  WORKSPACES, visibleWorkspaces, visibleSubNav, workspaceFromPath,
} from "@/lib/workspaces"

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  if (!user) return null

  const workspaces = visibleWorkspaces(user)
  const activeKey = workspaceFromPath(location.pathname) ?? workspaces[0]?.key
  const active = WORKSPACES.find((w) => w.key === activeKey) ?? workspaces[0]
  const subNav = active ? visibleSubNav(active, user.role) : []

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Tier 1 — workspace rail (60px, dark) */}
      <aside className="fixed top-0 left-0 h-full w-[60px] bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3 gap-1 z-30">
        <div className="h-9 w-9 rounded-lg bg-white text-slate-900 grid place-items-center text-sm font-semibold mb-2">
          S
        </div>
        {workspaces.map((w) => {
          const target = visibleSubNav(w, user.role)[0]?.to ?? `/${w.key}`
          const isActive = activeKey === w.key
          const Icon = w.icon
          return (
            <NavLink
              key={w.key}
              to={target}
              title={w.label}
              className={cn(
                "h-10 w-10 grid place-items-center rounded-lg transition-colors",
                isActive
                  ? "bg-white text-slate-900"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon size={18} />
            </NavLink>
          )
        })}
      </aside>

      {/* Tier 2 — sub-nav (200px, white) */}
      <aside className="fixed top-0 left-[60px] h-full w-[200px] bg-white border-r border-slate-200 flex flex-col z-20">
        <div className="px-4 py-5 border-b border-slate-100">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">Workspace</div>
          <div className="font-semibold text-slate-900 tracking-tight mt-0.5">
            {active?.label ?? "—"}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {subNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )
              }
            >
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 px-1 py-1.5 rounded-md hover:bg-slate-50 text-left"
          >
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white grid place-items-center text-xs font-medium">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
              <div className="text-xs text-slate-500 capitalize">{user.role}</div>
            </div>
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              navigate("/login", { replace: true })
            }}
            className="mt-1 w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="ml-[260px] min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
