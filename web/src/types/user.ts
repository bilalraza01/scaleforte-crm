export type Role = "admin" | "manager" | "sdr" | "onboarder" | "accountant"

export type WorkspaceKey =
  | "acquisition"
  | "onboarding"
  | "retention"
  | "invoicing"
  | "settings"

export interface User {
  id: number
  email: string
  name: string
  role: Role
  active: boolean
  manager_id: number | null
  manager_name: string | null
  assigned_category_ids: number[]
  workspace_access: WorkspaceKey[]
}
