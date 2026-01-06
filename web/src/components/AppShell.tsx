import { Outlet, Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/AuthProvider"

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null
  const isAdmin = user.role === "admin"
  const isManager = user.role === "manager"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="font-bold">Scaleforte CRM</Link>
            <Link to="/dashboard" className="text-sm text-slate-700 hover:underline">Dashboard</Link>
            <Link to="/worklist" className="text-sm text-slate-700 hover:underline">Worklist</Link>
            {(isAdmin || isManager) && (
              <>
                <Link to="/review" className="text-sm text-slate-700 hover:underline">Review</Link>
                <Link to="/replies" className="text-sm text-slate-700 hover:underline">Replies</Link>
                <Link to="/users" className="text-sm text-slate-700 hover:underline">Users</Link>
              </>
            )}
            {isAdmin && (
              <>
                <Link to="/categories" className="text-sm text-slate-700 hover:underline">Categories</Link>
                <Link to="/campaigns" className="text-sm text-slate-700 hover:underline">Campaigns</Link>
                <Link to="/push" className="text-sm text-slate-700 hover:underline">Push</Link>
                <Link to="/audit-log" className="text-sm text-slate-700 hover:underline">Audit</Link>
                <Link to="/settings" className="text-sm text-slate-700 hover:underline">Settings</Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              {user.name} · <span className="font-mono">{user.role}</span>
            </span>
            <button
              type="button"
              onClick={async () => {
                await signOut()
                navigate("/login", { replace: true })
              }}
              className="text-rose-600 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
