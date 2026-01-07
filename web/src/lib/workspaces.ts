import {
  Compass, UserPlus, RotateCw, Receipt, Settings as Cog,
  LayoutDashboard, Briefcase, ClipboardCheck, MessageSquare, Send,
  Users, FolderTree, Calendar, ScrollText, Sliders,
} from "lucide-react"
import type { Role, User, WorkspaceKey } from "@/types"
import type { ComponentType } from "react"

type IconType = ComponentType<{ size?: number; className?: string }>

export interface SubNavItem {
  to: string
  label: string
  icon: IconType
  roles?: Role[]   // fine-grained gating within a workspace (e.g. admin-only)
}

export interface Workspace {
  key: WorkspaceKey
  label: string
  icon: IconType
  items: SubNavItem[]
}

// Single source of truth for the sidebar. Tier-1 workspaces, tier-2 sub-nav.
// Sub-nav items use absolute paths so individual links can ignore where
// they're rendered from.
export const WORKSPACES: Workspace[] = [
  {
    key: "acquisition", label: "Acquisition", icon: Compass,
    items: [
      { to: "/acquisition/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/acquisition/worklist",  label: "Worklist",  icon: Briefcase },
      { to: "/acquisition/review",    label: "Review",    icon: ClipboardCheck, roles: ["admin", "manager"] },
      { to: "/acquisition/replies",   label: "Replies",   icon: MessageSquare,  roles: ["admin", "manager"] },
      { to: "/acquisition/push",      label: "Push",      icon: Send,           roles: ["admin"] },
    ],
  },
  {
    key: "onboarding", label: "Onboarding", icon: UserPlus,
    items: [{ to: "/onboarding", label: "Overview", icon: LayoutDashboard }],
  },
  {
    key: "retention", label: "Retention", icon: RotateCw,
    items: [{ to: "/retention", label: "Overview", icon: LayoutDashboard }],
  },
  {
    key: "invoicing", label: "Invoicing", icon: Receipt,
    items: [{ to: "/invoicing", label: "Overview", icon: LayoutDashboard }],
  },
  {
    key: "settings", label: "Settings", icon: Cog,
    items: [
      { to: "/settings/users",      label: "Users",         icon: Users },
      { to: "/settings/categories", label: "Categories",    icon: FolderTree, roles: ["admin"] },
      { to: "/settings/campaigns",  label: "Campaigns",     icon: Calendar,   roles: ["admin"] },
      { to: "/settings/audit-log",  label: "Audit log",     icon: ScrollText, roles: ["admin"] },
      { to: "/settings/system",     label: "System config", icon: Sliders,    roles: ["admin"] },
    ],
  },
]

// Admin always sees every workspace regardless of the column — matches the
// BE WorkspacePolicy short-circuit.
export function visibleWorkspaces(user: Pick<User, "role" | "workspace_access">): Workspace[] {
  if (user.role === "admin") return WORKSPACES
  const allowed = new Set(user.workspace_access)
  return WORKSPACES.filter((w) => allowed.has(w.key))
}

export function visibleSubNav(workspace: Workspace, role: Role): SubNavItem[] {
  return workspace.items.filter((i) => !i.roles || i.roles.includes(role))
}

export function workspaceFromPath(pathname: string): WorkspaceKey | null {
  const seg = pathname.split("/")[1] as WorkspaceKey | undefined
  if (!seg) return null
  return WORKSPACES.some((w) => w.key === seg) ? seg : null
}

// Where to send a user landing on `/` — the first item of their first
// allowed workspace.
export function homePathFor(user: Pick<User, "role" | "workspace_access">): string {
  const ws = visibleWorkspaces(user)[0]
  if (!ws) return "/login"
  const item = visibleSubNav(ws, user.role)[0]
  return item?.to ?? `/${ws.key}`
}
