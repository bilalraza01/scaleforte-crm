import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { Brand, Contact } from "@/types"

const listKey = ["brands"] as const
const detailKey = (id: number) => ["brands", id] as const

export function useBrands(filters: { campaign_id?: number; status?: string } = {}) {
  return useQuery({
    queryKey: [...listKey, filters],
    queryFn: async () => {
      const { data } = await http.get<Brand[]>("/api/v1/brands", { params: filters })
      return data
    },
  })
}

export function useBrand(id: number | null) {
  return useQuery({
    queryKey: id ? detailKey(id) : ["brands", "null"],
    queryFn: async () => (await http.get<Brand>(`/api/v1/brands/${id}`)).data,
    enabled: id !== null,
  })
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Brand> & { campaign_id: number; amazon_seller_id: string }) => {
      const { data } = await http.post<Brand>("/api/v1/brands", { brand: input })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
  })
}

export function useUpdateBrand(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Brand>) => {
      const { data } = await http.patch<Brand>(`/api/v1/brands/${id}`, { brand: input })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: detailKey(id) })
      void qc.invalidateQueries({ queryKey: listKey })
    },
  })
}

export function useMarkBrandReady(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await http.post<Brand>(`/api/v1/brands/${id}/mark_ready`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: detailKey(id) })
      void qc.invalidateQueries({ queryKey: listKey })
    },
  })
}

export function useApproveBrand(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await http.post<Brand>(`/api/v1/brands/${id}/approve`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: detailKey(id) })
      void qc.invalidateQueries({ queryKey: listKey })
    },
  })
}

export function useSendBackBrand(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (comment?: string) => (await http.post<Brand>(`/api/v1/brands/${id}/send_back`, { comment })).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: detailKey(id) })
      void qc.invalidateQueries({ queryKey: listKey })
    },
  })
}

export function useSkipBrand(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (reason: string) => (await http.post<Brand>(`/api/v1/brands/${id}/skip`, { reason })).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: detailKey(id) })
      void qc.invalidateQueries({ queryKey: listKey })
    },
  })
}

// Nested contacts.
export function useCreateContact(brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Contact>) => {
      const { data } = await http.post<Contact>(`/api/v1/brands/${brandId}/contacts`, { contact: input })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(brandId) }),
  })
}

export function useUpdateContact(brandId: number, contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Contact>) => {
      const { data } = await http.patch<Contact>(`/api/v1/brands/${brandId}/contacts/${contactId}`, { contact: input })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(brandId) }),
  })
}

export function useDeleteContact(brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contactId: number) => {
      await http.delete(`/api/v1/brands/${brandId}/contacts/${contactId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(brandId) }),
  })
}
