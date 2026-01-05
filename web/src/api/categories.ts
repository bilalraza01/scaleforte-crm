import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { Category } from "@/types"

const key = ["categories"] as const

export function useCategories() {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await http.get<Category[]>("/api/v1/categories")).data,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; amazon_url_pattern?: string | null }) => {
      const { data } = await http.post<Category>("/api/v1/categories", { category: input })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useArchiveCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await http.patch<Category>(`/api/v1/categories/${id}/archive`)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}
