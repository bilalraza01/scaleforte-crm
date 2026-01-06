import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/AuthProvider"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Briefcase, ClipboardCheck, MessageSquare, Users,
  FolderTree, Calendar, Send, ScrollText, Settings, LogOut
} from "lucide-react"
import type { Role } from "@/types"

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles?: Role[]
}

const NAV: NavItem[] = [
  { to: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { to: "/worklist",    label: "Worklist",    icon: Briefcase },
  { to: "/review",      label: "Review",      icon: ClipboardCheck, roles: ["admin", "manager"] },
  { to: "/replies",     label: "Replies",     icon: MessageSquare,  roles: ["admin", "manager"] },
  { to: "/users",       label: "Users",       icon: Users,          roles: ["admin", "manager"] },
  { to: "/categories",  label: "Categories",  icon: FolderTree,     roles: ["admin"] },
  { to: "/campaigns",   label: "Campaigns",   icon: Calendar,       roles: ["admin"] },
  { to: "/push",        label: "Push",        icon: Send,           roles: ["admin"] },
  { to: "/audit-log",   label: "Audit log",   icon: ScrollText,     roles: ["admin"] },
  { to: "/settings",    label: "Settings",    icon: Settings,       roles: ["admin"] },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="font-semibold text-slate-900 tracking-tight">Scaleforte CRM</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mt-0.5">Prospecting workbench</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white grid place-items-center text-xs font-medium">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
              <div className="text-xs text-slate-500 capitalize">{user.role}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => { await signOut(); navigate("/login", { replace: true }) }}
            className="mt-1 w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-60 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
