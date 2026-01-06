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
  per_sdr: {
    id: number
    name: string
    mtd_completed: number
    drafts: number
    ready: number
    approved_or_pushed: number
    engagement: EngagementStats
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
    mtd_completed: number
    engagement: EngagementStats
  }[]
  weekly_volume: Record<string, number>
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
