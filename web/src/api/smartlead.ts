import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"

export interface SmartleadConfigStatus {
  id: number
  masked_api_key: string | null
  configured: boolean
  webhook_secret_set: boolean
  last_test_at: string | null
  last_test_success: boolean | null
}

const configKey = ["smartlead_config"] as const
const healthKey = ["integration_health", "smartlead"] as const

export function useSmartleadConfig() {
  return useQuery({
    queryKey: configKey,
    queryFn: async () => (await http.get<SmartleadConfigStatus>("/api/v1/smartlead_config")).data,
  })
}

export function useUpdateSmartleadConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { api_key?: string; webhook_secret?: string }) => {
      const { data } = await http.patch<SmartleadConfigStatus>("/api/v1/smartlead_config", {
        smartlead_config: input,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: configKey }),
  })
}

export function useTestSmartleadConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await http.post<SmartleadConfigStatus & { message?: string }>("/api/v1/smartlead_config/test")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: configKey }),
  })
}

export interface SmartleadHealth {
  events_received_24h: number
  events_processed_24h: number
  events_unmatched_total: number
  last_event_at: string | null
  last_processed_at: string | null
  smartlead_config: {
    configured: boolean
    webhook_secret_set: boolean
    last_test_at: string | null
    last_test_success: boolean | null
  }
}

export function useSmartleadHealth() {
  return useQuery({
    queryKey: healthKey,
    queryFn: async () => (await http.get<SmartleadHealth>("/api/v1/integration_health/smartlead")).data,
    refetchInterval: 30_000,
  })
}
