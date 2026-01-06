import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { Subcategory } from "@/types"

const listKey = (categoryId: number) => ["categories", categoryId, "subcategories"] as const

export function useSubcategories(categoryId: number | null) {
  return useQuery({
    queryKey: categoryId ? listKey(categoryId) : ["subcategories", "none"],
    queryFn: async () => {
      const { data } = await http.get<Subcategory[]>(`/api/v1/categories/${categoryId}/subcategories`)
      return data
    },
    enabled: categoryId !== null,
  })
}

export function useCreateSubcategory(categoryId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await http.post<Subcategory>(
        `/api/v1/categories/${categoryId}/subcategories`,
        { subcategory: { name } }
      )
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey(categoryId) }),
  })
}
