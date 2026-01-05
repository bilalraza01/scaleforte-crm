import { Outlet, Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/AuthProvider"

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="font-bold">
              Scaleforte CRM
            </Link>
            <Link to="/dashboard" className="text-sm text-slate-700 hover:underline">
              Dashboard
            </Link>
            {(user.role === "admin" || user.role === "manager") && (
              <Link to="/users" className="text-sm text-slate-700 hover:underline">
                Users
              </Link>
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
