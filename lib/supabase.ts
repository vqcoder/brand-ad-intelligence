import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Brand = {
  id: string
  created_at: string
  name: string
  website: string
  logo_url: string | null
  meta_page_id: string | null
  notes: string | null
  color: string
}

export type Creative = {
  id: string
  created_at: string
  brand_id: string
  platform: 'meta' | 'google' | 'tiktok' | 'tv' | 'ooh' | 'print' | 'podcast' | 'email'
  platform_ad_id: string | null
  title: string | null
  body_text: string | null
  cta: string | null
  format: string | null
  media_type: 'image' | 'video' | 'text' | 'carousel' | null
  media_url: string | null
  thumbnail_url: string | null
  destination_url: string | null
  page_name: string | null
  currency: string | null
  spend_lower: number | null
  spend_upper: number | null
  impressions_lower: number | null
  impressions_upper: number | null
  first_shown: string | null
  last_shown: string | null
  is_active: boolean
  auto_synced: boolean
  raw_data: Record<string, unknown> | null
  // scores
  score_hook: number
  score_brand: number
  score_audience: number
  score_message: number
  score_format: number
  score_production: number
  score_overall: number
  notes: string | null
}

export type SyncLog = {
  id: string
  created_at: string
  brand_id: string
  platform: string
  status: 'running' | 'success' | 'error'
  ads_found: number
  ads_new: number
  error_message: string | null
}
