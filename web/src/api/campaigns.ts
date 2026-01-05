import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"
import type { Campaign, CampaignStatus } from "@/types"

const key = ["campaigns"] as const

export function useCampaigns() {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await http.get<Campaign[]>("/api/v1/campaigns")).data,
  })
}

export interface CreateCampaignInput {
  category_id: number
  month: number
  year: number
  status?: CampaignStatus
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const { data } = await http.post<Campaign>("/api/v1/campaigns", { campaign: input })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useAssignSdrToCampaign(campaignId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { sdr_id: number; target_count: number }) => {
      const { data } = await http.post(`/api/v1/campaigns/${campaignId}/assign`, input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}
