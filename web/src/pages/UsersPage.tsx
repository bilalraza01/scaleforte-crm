import { Link } from "react-router-dom"
import { useUsers, useDeactivateUser } from "@/api/users"
import { useAuth } from "@/auth/AuthProvider"

export function UsersPage() {
  const { user } = useAuth()
  const { data: users, isLoading, error } = useUsers()
  const deactivate = useDeactivateUser()

  if (!user) return null
  const canInvite = user.role === "admin" || user.role === "manager"

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        {canInvite && (
          <Link
            to="/users/invite"
            className="px-3 py-2 bg-slate-900 text-white rounded hover:bg-slate-700"
          >
            Invite a user
          </Link>
        )}
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-rose-600">Could not load users.</p>}

      {users && (
        <table className="w-full bg-white shadow rounded">
          <thead className="text-left bg-slate-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Manager</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.name || u.email}</td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3">
                  <span className="font-mono text-xs">{u.role}</span>
                </td>
                <td className="p-3 text-slate-600">{u.manager_name ?? "—"}</td>
                <td className="p-3">
                  {u.active ? (
                    <span className="text-emerald-700 text-xs">active</span>
                  ) : (
                    <span className="text-rose-700 text-xs">deactivated</span>
                  )}
                  {u.invitation_pending && (
                    <span className="text-amber-700 text-xs ml-1">invite pending</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {u.active && u.id !== user.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deactivate ${u.name || u.email}?`)) {
                          deactivate.mutate(u.id)
                        }
                      }}
                      className="text-sm text-rose-600 hover:underline"
                      disabled={deactivate.isPending}
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
