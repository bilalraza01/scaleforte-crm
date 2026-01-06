import { useMutation, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { AuditScreenshot } from "@/types"

const detailKey = (id: number) => ["brands", id] as const

export function useUploadAuditScreenshot(brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append("file", file)
      const { data } = await http.post<AuditScreenshot>(
        `/api/v1/brands/${brandId}/audit_screenshots`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(brandId) }),
  })
}

export function useDeleteAuditScreenshot(brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (screenshotId: number) => {
      await http.delete(`/api/v1/brands/${brandId}/audit_screenshots/${screenshotId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(brandId) }),
  })
}
