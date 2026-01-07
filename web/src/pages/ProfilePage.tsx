import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"

// Phase 1 stub. The change-password form ships in Phase 2 alongside the
// admin-sets-password endpoints.
export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <PageHeader title="My profile" subtitle="Your account details." />
      <Card>
        <CardHeader title="Your details" />
        <CardBody>
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="text-slate-500">Name</dt>
            <dd className="col-span-2">{user.name}</dd>
            <dt className="text-slate-500">Email</dt>
            <dd className="col-span-2 font-mono text-xs">{user.email}</dd>
            <dt className="text-slate-500">Role</dt>
            <dd className="col-span-2 capitalize">{user.role}</dd>
            <dt className="text-slate-500">Workspaces</dt>
            <dd className="col-span-2">
              {user.workspace_access.length === 0
                ? <span className="text-slate-400">none</span>
                : user.workspace_access.map((w) => (
                  <span key={w} className="inline-block mr-1.5 mb-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs capitalize">{w}</span>
                ))}
            </dd>
          </dl>
        </CardBody>
      </Card>
    </div>
  )
}
