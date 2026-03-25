import type { CreativeRecord } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type RawData = Record<string, any>
/* eslint-enable @typescript-eslint/no-explicit-any */

function computeDaysRunning(firstShown: string | null, lastShown: string | null): number | null {
  if (!firstShown || !lastShown) return null
  const start = new Date(firstShown).getTime()
  const end = new Date(lastShown).getTime()
  if (isNaN(start) || isNaN(end)) return null
  return Math.floor((end - start) / 86400000)
}

/** Convert a value that may be Unix seconds (number) or an ISO string to ISO. */
function toISO(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'number' && isFinite(val)) {
    // Unix seconds → ms (values < 1e12 are definitely seconds, not ms)
    const ms = val < 1e12 ? val * 1000 : val
    return new Date(ms).toISOString()
  }
  if (typeof val === 'string') return val
  return null
}

/** Convert a value that may be Unix seconds or ISO string to epoch ms. */
function toMs(val: unknown): number | null {
  if (!val) return null
  if (typeof val === 'number' && isFinite(val)) {
    return val < 1e12 ? val * 1000 : val
  }
  if (typeof val === 'string') {
    const t = new Date(val).getTime()
    return isNaN(t) ? null : t
  }
  return null
}

function extractHashtags(text: string | null): string[] {
  if (!text) return []
  const matches = text.match(/#(\w+)/g)
  if (!matches) return []
  return matches.map((m) => m.slice(1))
}

export function normaliseMetaAd(raw: Record<string, unknown>): CreativeRecord {
  const ad = raw as RawData

  // SC returns dates as Unix seconds OR ISO strings — normalise to ISO
  const rawStart = ad.start_date || ad.first_shown || ad.created_at || null
  const rawEnd = ad.end_date || ad.last_shown || null
  const firstShown = toISO(rawStart)
  const lastShown = toISO(rawEnd)

  // Compute days_running from the resolved timestamps
  const firstMs = toMs(rawStart)
  const lastMs = rawEnd ? toMs(rawEnd) : (firstMs ? Date.now() : null)
  const daysRunning = ad.days_running ||
    (firstMs && lastMs ? Math.floor((lastMs - firstMs) / 86_400_000) : null) ||
    computeDaysRunning(firstShown, lastShown)

  // Extract media from snapshot structure (SC Meta response)
  const snap = ad.snapshot as RawData | undefined
  const snapImages: string[] = snap?.images ?? []
  const snapVideos: RawData[] = snap?.videos ?? []
  const snapHtml: string = snap?.body?.markup?.__html ?? ''
  const snapBodyText = snapHtml.replace(/<[^>]*>/g, '').trim() || null

  const thumbnailUrl = snapImages[0] ?? snapVideos[0]?.video_preview_image_url ??
    (ad.thumbnail_url || ad.image_url || null)
  const mediaUrl = snapImages[0] ?? (ad.image_url || ad.media_url || null)
  const videoUrl = snapVideos[0]?.video_hd_url ?? snapVideos[0]?.video_sd_url ??
    (ad.video_url || ad.video_sd_url || ad.video_hd_url || null)
  const mediaType = ad.media_type ||
    (snapVideos.length > 0 ? 'video' : snapImages.length > 0 ? 'image' :
    (ad.video_url ? 'video' : ad.image_url ? 'image' : null))

  return {
    platform: 'meta',
    platform_ad_id: ad.ad_id || ad.id || null,
    title: ad.title || ad.ad_title || null,
    body_text: ad.body?.text || (typeof ad.body === 'string' ? ad.body : null) || ad.ad_body || ad.description || snapBodyText,
    cta: ad.cta_text || ad.call_to_action || ad.cta || null,
    format: ad.ad_format || ad.format || null,
    media_type: mediaType,
    media_url: mediaUrl,
    thumbnail_url: thumbnailUrl,
    video_url: videoUrl,
    destination_url: ad.link_url || ad.landing_page_url || ad.destination_url || null,
    page_name: ad.page_name || ad.advertiser_name || null,
    first_shown: firstShown,
    last_shown: lastShown,
    is_active: ad.is_active ?? (ad.status === 'ACTIVE'),
    days_running: daysRunning,
    regions: ad.regions || ad.countries || [],
    advertiser_id: ad.page_id || null,
    creative_id: ad.creative_id || ad.ad_creative_id || null,
    headline: ad.headline || ad.title || null,
    description: ad.description || ad.link_description || null,
    view_count: null,
    like_count: null,
    comment_count: null,
    share_count: null,
    hashtags: [],
    duration_seconds: null,
    author_handle: null,
    ad_library_url: ad.ad_library_url || null,
    raw_data: raw,
    auto_synced: false,
  }
}

export function normaliseGoogleAd(raw: Record<string, unknown>): CreativeRecord {
  const ad = raw as RawData
  const firstShown = (ad.firstShown || ad.first_shown || ad.start_date || null) as string | null
  const lastShown = (ad.lastShown || ad.last_shown || ad.end_date || null) as string | null

  return {
    platform: 'google',
    platform_ad_id: ad.ad_id || ad.creativeId || ad.creative_id || ad.id || null,
    title: ad.title || ad.headline || null,
    body_text: ad.body || ad.description || ad.text || null,
    cta: ad.cta || ad.call_to_action || null,
    format: ad.format || ad.ad_format || ad.type || null,
    media_type: ad.media_type || ad.type || null,
    media_url: ad.imageUrl || ad.image_url || ad.media_url || null,
    thumbnail_url: ad.thumbnail_url || ad.imageUrl || ad.image_url || null,
    video_url: ad.video_url || null,
    destination_url: ad.destination_url || ad.final_url || ad.landing_page || ad.domain || null,
    page_name: ad.advertiserName || ad.advertiser_name || null,
    first_shown: firstShown,
    last_shown: lastShown,
    is_active: ad.is_active ?? false,
    days_running: ad.days_running || computeDaysRunning(firstShown, lastShown),
    regions: ad.regions || ad.countries || ['US'],
    advertiser_id: ad.advertiserId || ad.advertiser_id || null,
    creative_id: ad.creativeId || ad.creative_id || null,
    headline: ad.headline || ad.title || null,
    description: ad.description || null,
    view_count: null,
    like_count: null,
    comment_count: null,
    share_count: null,
    hashtags: [],
    duration_seconds: null,
    author_handle: null,
    ad_library_url: ad.adUrl || ad.ad_library_url || null,
    raw_data: raw,
    auto_synced: false,
  }
}

export function normaliseTikTokVideo(raw: Record<string, unknown>): CreativeRecord {
  const v = raw as RawData
  const desc = (v.desc || v.description || v.title || null) as string | null
  const createTime = v.createTime || v.create_time
  let firstShown: string | null = v.created_at || null
  if (createTime && typeof createTime === 'number' && isFinite(createTime)) {
    firstShown = new Date(createTime * 1000).toISOString()
  }

  return {
    platform: 'tiktok',
    platform_ad_id: v.id || v.video_id || null,
    title: v.title || v.desc || null,
    body_text: desc,
    cta: null,
    format: 'video',
    media_type: 'video',
    media_url: v.video?.cover || v.cover || v.thumbnail_url || null,
    thumbnail_url: v.video?.cover || v.cover || v.thumbnail_url || v.origin_cover || null,
    video_url: v.video?.playAddr || v.play || v.video_url || v.download_url || null,
    destination_url: v.share_url || null,
    page_name: v.author?.nickname || null,
    first_shown: firstShown,
    last_shown: null,
    is_active: true,
    days_running: null,
    regions: [],
    advertiser_id: v.author?.id || null,
    creative_id: v.id || v.video_id || null,
    headline: v.title || v.desc || null,
    description: v.desc || null,
    view_count: v.play_count || v.stats?.playCount || null,
    like_count: v.digg_count || v.stats?.diggCount || null,
    comment_count: v.comment_count || v.stats?.commentCount || null,
    share_count: v.share_count || v.stats?.shareCount || null,
    hashtags: extractHashtags(desc),
    duration_seconds: v.video?.duration || v.duration || null,
    author_handle: v.author?.unique_id || v.author?.uniqueId || null,
    ad_library_url: null,
    raw_data: raw,
    auto_synced: false,
  }
}
