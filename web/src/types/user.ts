export type Role = "admin" | "manager" | "sdr"

export interface User {
  id: number
  email: string
  name: string
  role: Role
  active: boolean
  manager_id: number | null
  manager_name: string | null
  invitation_pending: boolean
}
