import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"

export type PushStatus = "queued" | "running" | "succeeded" | "failed"

export interface PushReceipt {
  id: number
  smartlead_campaign_id: number
  status: PushStatus
  total_count: number
  success_count: number
  failure_count: number
  started_at: string | null
  finished_at: string | null
  created_at: string
  user_id: number
  user_name: string | null
  details: {
    brand_ids?: number[]
    successes?: { brand_id: number; smartlead_lead_id: number | null }[]
    failures?: { brand_id: number; error: string }[]
    fatal_error?: string
  }
}

const listKey = ["pushes"] as const
const detailKey = (id: number) => ["pushes", id] as const

export function usePushes() {
  return useQuery({
    queryKey: listKey,
    queryFn: async () => (await http.get<PushReceipt[]>("/api/v1/pushes")).data,
  })
}

export function usePush(id: number | null) {
  return useQuery({
    queryKey: id ? detailKey(id) : ["pushes", "null"],
    queryFn: async () => (await http.get<PushReceipt>(`/api/v1/pushes/${id}`)).data,
    enabled: id !== null,
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status === "succeeded" || status === "failed" ? false : 2000
    },
  })
}

export function useCreatePush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { brand_ids: number[]; smartlead_campaign_id: number }) => {
      const { data } = await http.post<PushReceipt>("/api/v1/pushes", input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
  })
}
