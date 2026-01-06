import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { CategoryAssignment } from "@/types"

const listKey = (userId: number) => ["users", userId, "category_assignments"] as const

export function useCategoryAssignments(userId: number | null) {
  return useQuery({
    queryKey: userId ? listKey(userId) : ["category_assignments", "none"],
    queryFn: async () => {
      const { data } = await http.get<CategoryAssignment[]>(`/api/v1/users/${userId}/category_assignments`)
      return data
    },
    enabled: userId !== null,
  })
}

export function useAssignCategory(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (categoryId: number) => {
      const { data } = await http.post<CategoryAssignment>(
        `/api/v1/users/${userId}/category_assignments`,
        { category_assignment: { category_id: categoryId } }
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: listKey(userId) })
      void qc.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useUnassignCategory(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId: number) => {
      await http.delete(`/api/v1/users/${userId}/category_assignments/${assignmentId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: listKey(userId) })
      void qc.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
