import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { Brand, Contact } from "@/types"

const listKey = ["brands"] as const
const detailKey = (id: number) => ["brands", id] as const

export interface BrandFilters {
  campaign_id?: number
  category_id?: number
  subcategory_id?: number
  sdr_id?: number
  status?: string
  search?: string
  created_from?: string  // YYYY-MM-DD
  created_to?: string    // YYYY-MM-DD
  page?: number
  per_page?: number
}

export interface BulkReassignResult {
  reassigned_count: number
  skipped_unauthorized: number
  target_sdr_id: number
  target_sdr_name: string
}

export interface BrandPagination {
  page: number
  per_page: number
  total_count: number
  total_pages: number
}

export interface BrandsResponse {
  data: Brand[]
  pagination: BrandPagination
}

export function useBrands(filters: BrandFilters = {}) {
  return useQuery({
    queryKey: [...listKey, filters],
    queryFn: async () => {
      const { data } = await http.get<BrandsResponse>("/api/v1/brands", { params: filters })
      return data
    },
    placeholderData: (prev) => prev, // keep previous page visible while next page is fetching
  })
}

export function useBrand(id: number | null) {
  return useQuery({
    queryKey: id ? detailKey(id) : ["brands", "null"],
    queryFn: async () => (await http.get<Brand>(`/api/v1/brands/${id}`)).data,
    enabled: id !== null,
  })
}

export interface BrandLookup {
  exists: boolean
  editable_by_me?: boolean
  brand_id?: number | null
}

// Probes whether an amazon_seller_id is already taken. Used by the New Brand
// modal to inline-warn the user before submit. Returns `{ exists: false }`
// for blank/short input or unknown IDs.
export function useBrandLookup(amazonSellerId: string) {
  const sid = amazonSellerId.trim()
  return useQuery({
    queryKey: ["brands", "lookup", sid] as const,
    queryFn: async () => {
      const { data } = await http.get<BrandLookup>("/api/v1/brands/lookup", {
        params: { amazon_seller_id: sid },
      })
      return data
    },
    enabled: sid.length >= 3,
    staleTime: 5_000,
  })
}

// Admin-only: download a Smartlead-shaped CSV of contacts. Filters mirror
// the Worklist's current filter state — server re-applies them and returns
// EVERY matching contact (no pagination). Empty filters = export all.
export async function exportContactsCsv(filters: Omit<BrandFilters, "page" | "per_page"> = {}) {
  const res = await http.get<Blob>("/api/v1/brands/export", {
    params: filters,
    responseType: "blob",
  })
  const cd = res.headers["content-disposition"] as string | undefined
  const match = cd?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? `scaleforte-contacts-${new Date().toISOString().slice(0, 10)}.csv`
  return { blob: res.data, filename }
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    // Either campaign_id (admin/manager flow) or category_id (SDR flow,
    // BE auto-resolves to current month's active campaign) must be sent.
    mutationFn: async (
      input: Partial<Brand> & {
        amazon_seller_id: string
        campaign_id?: number
        category_id?: number
      }
    ) => {
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
      // Bump the SDR's daily-progress banner immediately rather than
      // waiting for the 60s refetch interval.
      void qc.invalidateQueries({ queryKey: ["me", "today"] })
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

// Bulk reassign N brands to a single target SDR. Per-brand auth happens
// server-side — out-of-scope rows come back in `skipped_unauthorized`.
export function useBulkReassignBrands() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ brand_ids, sdr_id }: { brand_ids: number[]; sdr_id: number }) => {
      const { data } = await http.post<BulkReassignResult>(
        "/api/v1/brands/bulk_reassign",
        { brand_ids, sdr_id }
      )
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
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
