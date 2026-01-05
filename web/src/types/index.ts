export type { User, Role } from "./user"

export type CampaignStatus = "draft" | "active" | "closed"

export interface Category {
  id: number
  name: string
  amazon_url_pattern: string | null
  active: boolean
  default_smartlead_campaign_id: number | null
  campaigns_count: number
}

export interface Campaign {
  id: number
  category_id: number
  category_name: string
  month: number
  year: number
  status: CampaignStatus
  smartlead_campaign_id: number | null
  label: string
  assignments_count: number
  brands_count: number
}

export type BrandStatus =
  | "draft"
  | "in_progress"
  | "ready"
  | "approved"
  | "pushed"
  | "skipped"

export interface Contact {
  id: number
  brand_id: number
  name: string | null
  designation: string | null
  email: string
  phone: string | null
  personal_linkedin: string | null
  is_primary: boolean
  smartlead_lead_id: number | null
}

export interface Brand {
  id: number
  campaign_id: number
  sdr_id: number | null
  sdr_name: string | null
  amazon_seller_id: string
  brand_name: string | null
  business_name: string | null
  revenue: string | null
  country: string | null
  website: string | null
  asin: string | null
  amazon_link: string | null
  facebook_url: string | null
  instagram_url: string | null
  company_linkedin_url: string | null
  status: BrandStatus
  skip_reason: string | null
  pushed_at: string | null
  contacts: Contact[]
}
