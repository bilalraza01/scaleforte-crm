import { useAuth } from "@/auth/AuthProvider"

export function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Welcome, {user.name}</h1>
      <p className="text-slate-600 mb-6">
        Role: <span className="font-mono text-sm">{user.role}</span>
      </p>

      <p className="text-sm text-slate-400">
        Brand worklist + dashboards land in Phase 1 Week 2 / Phase 3.
      </p>
    </div>
  )
}
