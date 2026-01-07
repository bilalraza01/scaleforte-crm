import { useQuery } from "@tanstack/react-query"
import { http } from "@/lib/http"

interface EngagementStats {
  sent: number
  replied: number
  bounced: number
  reply_rate: number
  bounce_rate: number
}

export interface SdrDashboard {
  today: { completed: number; ready: number }
  month_to_date: { completed: number; target: number }
  status_counts: Record<string, number>
  engagement: EngagementStats
  recent_replies: { id: number; occurred_at: string | null; subject: string | null; preview: string; brand_name: string | null }[]
}

export interface ManagerDashboard {
  team_size: number
  awaiting_review_count: number
  daily_brand_target: number
  team_marked_ready_today: number
  period_targets: { day: number; week: number; month: number }
  per_sdr: {
    id: number
    name: string
    ready: number
    marked_ready_today: number
    marked_ready_yesterday: number
    marked_ready_last_week: number
    marked_ready_last_month: number
  }[]
}

export interface AdminDashboard {
  totals: {
    brands_processed: number
    ready: number
    approved: number
    pushed: number
    replied: number
    bounced: number
  }
  today: {
    marked_ready: number
    daily_target: number
    sdr_count: number
  }
  period_targets: { day: number; week: number; month: number }
  per_category: {
    id: number
    name: string
    brands_count: number
    pushed_count: number
    engagement: EngagementStats
  }[]
  per_sdr: {
    id: number
    name: string
    marked_ready_today: number
    marked_ready_yesterday: number
    marked_ready_last_week: number
    marked_ready_last_month: number
  }[]
  weekly_volume: Record<string, number>
}

export type ChartPeriod = "7d" | "30d" | "6m"

export interface MarkedReadyTimeseries {
  period: ChartPeriod
  days: string[]              // ISO YYYY-MM-DD
  by_sdr: { id: number; name: string; counts: number[] }[]
}

export function useSdrDashboard() {
  return useQuery({
    queryKey: ["dashboards", "sdr"],
    queryFn: async () => (await http.get<SdrDashboard>("/api/v1/dashboards/sdr")).data,
  })
}

export function useManagerDashboard() {
  return useQuery({
    queryKey: ["dashboards", "manager"],
    queryFn: async () => (await http.get<ManagerDashboard>("/api/v1/dashboards/manager")).data,
  })
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["dashboards", "admin"],
    queryFn: async () => (await http.get<AdminDashboard>("/api/v1/dashboards/admin")).data,
  })
}

export function useMarkedReadyTimeseries(period: ChartPeriod, sdrIds: number[]) {
  return useQuery({
    queryKey: ["dashboards", "marked_ready_timeseries", period, [...sdrIds].sort((a, b) => a - b).join(",")],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("period", period)
      sdrIds.forEach((id) => params.append("sdr_ids[]", String(id)))
      const { data } = await http.get<MarkedReadyTimeseries>(
        `/api/v1/dashboards/marked_ready_timeseries?${params.toString()}`
      )
      return data
    },
  })
}
