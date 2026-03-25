import { SCORING_CONFIG, DEFAULT_SCORING } from '@/lib/constants'

export type CreativeRecord = {
  platform: 'meta' | 'google' | 'tiktok' | 'youtube'
  platform_ad_id: string | null
  title: string | null
  body_text: string | null
  cta: string | null
  format: string | null
  media_type: 'image' | 'video' | 'text' | 'carousel' | null
  media_url: string | null
  thumbnail_url: string | null
  video_url: string | null
  destination_url: string | null
  page_name: string | null
  first_shown: string | null
  last_shown: string | null
  is_active: boolean
  days_running: number | null
  regions: string[]
  advertiser_id: string | null
  creative_id: string | null
  headline: string | null
  description: string | null
  view_count: number | null
  like_count: number | null
  comment_count: number | null
  share_count: number | null
  hashtags: string[]
  duration_seconds: number | null
  author_handle: string | null
  ad_library_url: string | null
  raw_data: Record<string, unknown>
  // added when saving to library:
  brand_name?: string
  auto_synced?: boolean
}

export type PlatformStatus = {
  status: 'idle' | 'loading' | 'success' | 'error'
  results: CreativeRecord[]
  count: number
  error?: string
}

export type QualityScores = {
  hook: number
  brand_fit: number
  audience: number
  message: number
  format_fit: number
  production: number
}

export const SCORE_WEIGHTS: Record<keyof QualityScores, number> = {
  hook: 1,
  brand_fit: 1,
  audience: 1,
  message: 1,
  format_fit: 1,
  production: 1,
}

export function computeOverall(
  scores: QualityScores,
  platform: string = 'meta',
): number {
  const config = SCORING_CONFIG[platform] ?? DEFAULT_SCORING
  const weighted = config.dimensions.reduce((sum: number, d) =>
    sum + (((scores as Record<string, number>)[d.key] || 0) * d.weight), 0,
  )
  return parseFloat(weighted.toFixed(1))
}
