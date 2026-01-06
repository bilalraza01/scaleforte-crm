import { useMutation, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { PainPoint, PainPointCategory } from "@/types"

const detailKey = (id: number) => ["brands", id] as const

export interface PainPointInput {
  category: PainPointCategory
  description?: string | null
  display_order?: number
}

export function useCreatePainPoint(brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PainPointInput) => {
      const { data } = await http.post<PainPoint>(`/api/v1/brands/${brandId}/pain_points`, {
        pain_point: input,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(brandId) }),
  })
}

export function useUpdatePainPoint(brandId: number, painPointId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PainPointInput) => {
      const { data } = await http.patch<PainPoint>(
        `/api/v1/brands/${brandId}/pain_points/${painPointId}`,
        { pain_point: input }
      )
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(brandId) }),
  })
}

export function useDeletePainPoint(brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (painPointId: number) => {
      await http.delete(`/api/v1/brands/${brandId}/pain_points/${painPointId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(brandId) }),
  })
}
