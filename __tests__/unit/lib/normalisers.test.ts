import {
  normaliseMetaAd,
  normaliseGoogleAd,
  normaliseTikTokVideo,
} from '@/lib/normalisers'

const META_RAW = {
  ad_archive_id: '615470338018648',
  ad_id: '615470338018648',
  start_date: '2025-01-12T00:00:00.000Z',
  page_name: 'Test Brand',
  body: { text: 'Test copy' },
  cta_text: 'Shop Now',
  link_url: 'https://example.com',
  publisher_platforms: ['facebook', 'instagram'],
  is_active: true,
}

const GOOGLE_RAW = {
  advertiserId: 'AR01614014350098432001',
  creativeId: 'CR07443539616616939521',
  format: 'image',
  imageUrl: 'https://example.com/image.jpg',
  firstShown: '2025-01-01T00:00:00.000Z',
  lastShown: '2025-03-01T00:00:00.000Z',
  advertiserName: 'Test Brand',
  domain: 'example.com',
  adUrl: 'https://adstransparency.google.com/advertiser/AR01614014350098432001/creative/CR07443539616616939521',
}

const TIKTOK_RAW = {
  id: '7234567890123456789',
  desc: 'Check this out #fitness #brand',
  createTime: 1700000000,
  video: {
    playAddr: 'https://example.com/video.mp4',
    cover: 'https://example.com/cover.jpg',
    duration: 30,
  },
  author: { uniqueId: 'testbrand', nickname: 'Test Brand' },
  stats: {
    playCount: 1200000,
    diggCount: 48000,
    commentCount: 2100,
    shareCount: 890,
  },
}

describe('normaliseMetaAd', () => {
  it('sets platform to meta', () => {
    expect(normaliseMetaAd(META_RAW).platform).toBe('meta')
  })

  it('sets platform_ad_id from ad_id', () => {
    expect(normaliseMetaAd(META_RAW).platform_ad_id).toBe('615470338018648')
  })

  it('preserves raw_data', () => {
    expect(normaliseMetaAd(META_RAW).raw_data).toEqual(META_RAW)
  })

  it('auto_synced is false', () => {
    expect(normaliseMetaAd(META_RAW).auto_synced).toBe(false)
  })

  it('extracts body text', () => {
    expect(normaliseMetaAd(META_RAW).body_text).toBe('Test copy')
  })

  it('extracts cta', () => {
    expect(normaliseMetaAd(META_RAW).cta).toBe('Shop Now')
  })

  it('converts Unix seconds start_date to ISO date (not 1970)', () => {
    const raw = { ...META_RAW, start_date: 1700000000 }
    const r = normaliseMetaAd(raw)
    expect(r.first_shown).not.toBeNull()
    // 1700000000 seconds = 2023-11-14T22:13:20.000Z
    expect(r.first_shown!.startsWith('2023')).toBe(true)
  })

  it('extracts thumbnail_url from snapshot.images', () => {
    const raw = { ...META_RAW, snapshot: { images: ['https://example.com/snap.jpg'] } }
    const r = normaliseMetaAd(raw)
    expect(r.thumbnail_url).toBe('https://example.com/snap.jpg')
  })

  it('extracts video_url from snapshot.videos', () => {
    const raw = {
      ...META_RAW,
      snapshot: { images: [], videos: [{ video_hd_url: 'https://example.com/hd.mp4' }] },
    }
    const r = normaliseMetaAd(raw)
    expect(r.video_url).toBe('https://example.com/hd.mp4')
    expect(r.media_type).toBe('video')
  })

  it('extracts body text from snapshot HTML', () => {
    const raw = {
      ad_id: '1',
      snapshot: { body: { markup: { __html: '<div>Hello <b>world</b></div>' } } },
    }
    const r = normaliseMetaAd(raw)
    expect(r.body_text).toBe('Hello world')
  })
})

describe('normaliseGoogleAd', () => {
  it('sets platform to google', () => {
    expect(normaliseGoogleAd(GOOGLE_RAW).platform).toBe('google')
  })

  it('sets advertiser_id and creative_id', () => {
    const r = normaliseGoogleAd(GOOGLE_RAW)
    expect(r.advertiser_id).toBe('AR01614014350098432001')
    expect(r.creative_id).toBe('CR07443539616616939521')
  })

  it('computes days_running as positive integer', () => {
    const days = normaliseGoogleAd(GOOGLE_RAW).days_running
    expect(days).not.toBeNull()
    expect(days!).toBeGreaterThan(0)
  })

  it('auto_synced is false', () => {
    expect(normaliseGoogleAd(GOOGLE_RAW).auto_synced).toBe(false)
  })

  it('extracts media_url from imageUrl', () => {
    expect(normaliseGoogleAd(GOOGLE_RAW).media_url).toBe('https://example.com/image.jpg')
  })

  it('extracts ad_library_url from adUrl', () => {
    expect(normaliseGoogleAd(GOOGLE_RAW).ad_library_url).toBe(
      'https://adstransparency.google.com/advertiser/AR01614014350098432001/creative/CR07443539616616939521'
    )
  })
})

describe('normaliseTikTokVideo', () => {
  it('sets platform to tiktok', () => {
    expect(normaliseTikTokVideo(TIKTOK_RAW).platform).toBe('tiktok')
  })

  it('extracts video_url from video.playAddr', () => {
    expect(normaliseTikTokVideo(TIKTOK_RAW).video_url).toBe('https://example.com/video.mp4')
  })

  it('extracts hashtags from desc', () => {
    const r = normaliseTikTokVideo(TIKTOK_RAW)
    expect(r.hashtags).toContain('fitness')
    expect(r.hashtags).toContain('brand')
  })

  it('maps view_count and like_count from stats', () => {
    const r = normaliseTikTokVideo(TIKTOK_RAW)
    expect(r.view_count).toBe(1200000)
    expect(r.like_count).toBe(48000)
  })

  it('maps comment_count and share_count', () => {
    const r = normaliseTikTokVideo(TIKTOK_RAW)
    expect(r.comment_count).toBe(2100)
    expect(r.share_count).toBe(890)
  })

  it('auto_synced is false', () => {
    expect(normaliseTikTokVideo(TIKTOK_RAW).auto_synced).toBe(false)
  })

  it('extracts duration from video.duration', () => {
    expect(normaliseTikTokVideo(TIKTOK_RAW).duration_seconds).toBe(30)
  })

  it('extracts thumbnail from video.cover', () => {
    expect(normaliseTikTokVideo(TIKTOK_RAW).thumbnail_url).toBe('https://example.com/cover.jpg')
  })
})
