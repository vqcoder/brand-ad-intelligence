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
  const snap = (ad.snapshot ?? {}) as RawData
  const snapHtml: string = snap.body?.markup?.__html ?? ''
  const snapBodyText = snapHtml.replace(/<[^>]*>/g, '').trim() || null

  // Variant 1: direct images/videos arrays
  const snapImages: string[] = snap.images ?? []
  const snapVideos: RawData[] = snap.videos ?? []

  // Variant 2: cards array (carousel ads)
  const cards: RawData[] = snap.cards ?? []
  const cardImages: string[] = cards.map((c: RawData) => c.original_image_url ?? c.image_url).filter(Boolean)
  const cardVideos: string[] = cards.map((c: RawData) => c.video_hd_url ?? c.video_sd_url).filter(Boolean)

  // Variant 3: resizable_image (single image ads)
  const resizableImage: string | null = snap.resizable_image?.uri ?? null

  // Merge all sources
  const allImages: string[] = [...snapImages, ...cardImages, ...(resizableImage ? [resizableImage] : [])].filter(Boolean)
  const allVideoUrls: string[] = [
    ...snapVideos.map((v: RawData) => v.video_hd_url ?? v.video_sd_url ?? null),
    ...cardVideos,
  ].filter(Boolean) as string[]

  const thumbnailUrl = allImages[0] ?? snapVideos[0]?.video_preview_image_url ?? snap.thumbnail_url ??
    (ad.thumbnail_url || ad.image_url || null)
  const mediaUrl = allImages[0] ?? (ad.image_url || ad.media_url || null)
  const videoUrl = allVideoUrls[0] ?? (ad.video_url || ad.video_sd_url || ad.video_hd_url || null)
  const mediaType = ad.media_type ||
    (allVideoUrls.length > 0 ? 'video' : allImages.length > 0 ? 'image' :
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

export function normaliseYouTubeVideo(raw: Record<string, unknown>): CreativeRecord {
  const v = raw as RawData
  const desc = (v.description || v.desc || '') as string
  const truncatedDesc = desc.length > 500 ? desc.slice(0, 500) + '...' : desc || null

  return {
    platform: 'youtube',
    platform_ad_id: v.videoId || v.video_id || v.id || null,
    title: v.title || null,
    body_text: truncatedDesc,
    cta: null,
    format: 'video',
    media_type: 'video',
    media_url: v.thumbnail || v.thumbnailUrl || v.thumbnail_url || null,
    thumbnail_url: v.thumbnail || v.thumbnailUrl || v.thumbnail_url || null,
    video_url: v.videoUrl || v.video_url || v.url || null,
    destination_url: v.videoUrl || v.video_url || v.url || null,
    page_name: v.channelName || v.channel_name || v.channelTitle || v.author || null,
    first_shown: toISO(v.publishedAt || v.published_at || v.uploadDate || v.upload_date) || null,
    last_shown: null,
    is_active: true,
    days_running: null,
    regions: [],
    advertiser_id: v.channelId || v.channel_id || null,
    creative_id: v.videoId || v.video_id || v.id || null,
    headline: v.title || null,
    description: truncatedDesc,
    view_count: v.viewCount || v.view_count || v.views || null,
    like_count: v.likeCount || v.like_count || v.likes || null,
    comment_count: v.commentCount || v.comment_count || v.comments || null,
    share_count: null,
    hashtags: extractHashtags(desc),
    duration_seconds: v.duration || v.lengthSeconds || v.length_seconds || null,
    author_handle: v.channelHandle || v.channel_handle || v.channelId || null,
    ad_library_url: null,
    raw_data: raw,
    auto_synced: false,
  }
}

export function normaliseTikTokVideo(raw: Record<string, unknown>): CreativeRecord {
  const v = raw as RawData
  const desc = (v.desc || v.description || v.title || v.ad_text || null) as string | null
  const createTime = v.createTime || v.create_time
  let firstShown: string | null = toISO(v.first_shown || v.created_at) || null
  if (!firstShown && createTime && typeof createTime === 'number' && isFinite(createTime)) {
    firstShown = new Date(createTime * 1000).toISOString()
  }

  // Ad library fields use advertiser/advertiser_name; profile uses author.nickname
  const advertiserName = v.advertiser_name || v.advertiser || v.author?.nickname || null
  const advertiserHandle = v.advertiser_handle || v.author?.unique_id || v.author?.uniqueId || null
  const advertiserId = v.advertiser_id || v.author?.id || null

  // aweme_list video URLs are nested under play_addr/download_addr/cover url_list arrays
  const videoUrl = v.videoUrl || v.video_url
    || v.video?.play_addr?.url_list?.[0]
    || v.video?.download_addr?.url_list?.[0]
    || v.video?.playAddr || v.playAddr || v.play || v.download_url || null

  const thumbnailUrl = v.coverUrl || v.cover_url
    || v.video?.cover?.url_list?.[0]
    || v.video?.dynamic_cover?.url_list?.[0]
    || v.video?.cover || v.cover || v.thumbnail_url || v.origin_cover || null

  return {
    platform: 'tiktok',
    platform_ad_id: v.aweme_id || v.ad_id || v.id || v.video_id || null,
    title: v.title || v.desc || v.ad_title || null,
    body_text: desc,
    cta: v.cta || v.call_to_action || null,
    format: 'video',
    media_type: 'video',
    media_url: thumbnailUrl,
    thumbnail_url: thumbnailUrl,
    video_url: videoUrl,
    destination_url: v.landing_page_url || v.destination_url || v.share_url || null,
    page_name: advertiserName,
    first_shown: firstShown,
    last_shown: toISO(v.last_shown) || null,
    is_active: v.is_active ?? true,
    days_running: v.days_running || null,
    regions: v.regions || v.countries || [],
    advertiser_id: advertiserId,
    creative_id: v.creative_id || v.aweme_id || v.id || v.video_id || null,
    headline: v.title || v.desc || v.ad_title || null,
    description: v.desc || v.description || null,
    view_count: v.impressions || v.statistics?.play_count || v.play_count || v.stats?.playCount || null,
    like_count: v.likes || v.statistics?.digg_count || v.digg_count || v.stats?.diggCount || null,
    comment_count: v.comments || v.statistics?.comment_count || v.comment_count || v.stats?.commentCount || null,
    share_count: v.shares || v.statistics?.share_count || v.share_count || v.stats?.shareCount || null,
    hashtags: extractHashtags(desc),
    duration_seconds: v.video?.duration || v.duration || null,
    author_handle: advertiserHandle,
    ad_library_url: v.ad_url || v.ad_library_url || null,
    raw_data: raw,
    auto_synced: false,
  }
}
