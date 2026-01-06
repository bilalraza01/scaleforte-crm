import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"

export type ReplyClassification =
  | "positive" | "negative" | "ooo" | "info_request" | "unsubscribe_request"

export interface ReplyEvent {
  id: number
  event_type: "replied"
  occurred_at: string | null
  received_at: string
  reply_subject: string | null
  reply_body: string | null
  unmatched: boolean
  contact_id: number | null
  brand_id: number | null
  brand_name: string | null
  sdr_name: string | null
  category_name: string | null
}

const key = ["replies"] as const

export function useReplies(filters: { sdr_id?: number; category_id?: number } = {}) {
  return useQuery({
    queryKey: [...key, filters],
    queryFn: async () => {
      const { data } = await http.get<ReplyEvent[]>("/api/v1/replies", { params: filters })
      return data
    },
  })
}

export function useClassifyReply(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (classification: ReplyClassification) => {
      const { data } = await http.patch(`/api/v1/replies/${id}/classify`, { classification })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}
