import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http } from "@/lib/http"

export interface SystemConfig {
  daily_brand_target: number
  updated_at: string
}

const key = ["system_config"] as const

export function useSystemConfig() {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await http.get<SystemConfig>("/api/v1/system_config")).data,
  })
}

export function useUpdateSystemConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<SystemConfig>) => {
      const { data } = await http.patch<SystemConfig>("/api/v1/system_config", { system_config: input })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key })
      // Daily target change ripples into the SDR banner.
      void qc.invalidateQueries({ queryKey: ["me", "today"] })
    },
  })
}

export interface TodayProgress {
  marked_ready_today: number
  daily_brand_target: number
  remaining: number
}

export const todayKey = ["me", "today"] as const

export function useTodayProgress() {
  return useQuery({
    queryKey: todayKey,
    queryFn: async () => (await http.get<TodayProgress>("/api/v1/me/today")).data,
    // Refresh every 60s so the banner stays fresh during a working session.
    refetchInterval: 60_000,
  })
}
