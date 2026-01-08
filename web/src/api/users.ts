import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { User, Role, WorkspaceKey } from "@/types/user"

export interface CreateUserInput {
  email: string
  name: string
  password: string
  role?: Role
  manager_id?: number | null
  workspace_access?: WorkspaceKey[]
}

export interface UpdateUserInput {
  name?: string
  active?: boolean
  role?: Role
  manager_id?: number | null
  workspace_access?: WorkspaceKey[]
}

const usersKey = ["users"] as const
const userKey = (id: number) => ["users", id] as const

export function useUsers() {
  return useQuery({
    queryKey: usersKey,
    queryFn: async () => (await http.get<User[]>("/api/v1/users")).data,
  })
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: id ? userKey(id) : ["users", "null"],
    queryFn: async () => (await http.get<User>(`/api/v1/users/${id}`)).data,
    enabled: id !== null,
  })
}

// Admin/Manager creates a user with an admin-set initial password.
// Replaces the previous email-invite-link flow.
export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data } = await http.post<User>("/api/v1/users", { user: input })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKey })
    },
  })
}

export function useUpdateUser(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateUserInput) => {
      const { data } = await http.patch<User>(`/api/v1/users/${id}`, { user: input })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKey })
      void qc.invalidateQueries({ queryKey: userKey(id) })
    },
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await http.patch<User>(`/api/v1/users/${id}/deactivate`)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKey })
    },
  })
}

// Admin / managing-manager force-sets a user's password.
export function useResetUserPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await http.post(`/api/v1/users/${id}/reset_password`, { password })
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: userKey(vars.id) })
    },
  })
}

// Self-service: current user changes their own password.
export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: async (input: { current_password: string; new_password: string }) => {
      await http.post("/api/v1/users/change_password", input)
    },
  })
}
