import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { User, Role } from "@/types/user"

export interface InviteInput {
  email: string
  name: string
  role: Role
  manager_id: number | null
}

export interface UpdateUserInput {
  name?: string
  active?: boolean
  role?: Role
  manager_id?: number | null
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

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: InviteInput) => {
      const { data } = await http.post<User>("/api/v1/auth/invitation", { user: input })
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
