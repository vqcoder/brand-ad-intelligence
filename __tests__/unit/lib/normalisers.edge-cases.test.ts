/**
 * Edge-case tests for normaliser functions.
 * These verify graceful handling of bad/missing data — the cases
 * most likely to cause runtime crashes in production.
 */

import {
  normaliseMetaAd,
  normaliseGoogleAd,
  normaliseTikTokVideo,
} from '@/lib/normalisers'

describe('normaliseMetaAd — edge cases', () => {
  it('handles completely empty object without throwing', () => {
    const result = normaliseMetaAd({})
    expect(result.platform).toBe('meta')
    expect(result.platform_ad_id).toBeNull()
    expect(result.body_text).toBeNull()
    expect(result.raw_data).toEqual({})
  })

  it('handles null ad_archive_id — platform_ad_id should be null', () => {
    const result = normaliseMetaAd({ ad_archive_id: null })
    expect(result.platform_ad_id).toBeNull()
  })

  it('handles undefined values in nested fields', () => {
    const result = normaliseMetaAd({ body: undefined })
    expect(result.body_text).toBeNull()
  })

  it('handles non-string body.text', () => {
    const result = normaliseMetaAd({ body: { text: 12345 } })
    // Should coerce or return the value, not crash
    expect(result.body_text).toBe(12345)
  })

  it('auto_synced is always false', () => {
    expect(normaliseMetaAd({}).auto_synced).toBe(false)
  })

  it('regions defaults to empty array', () => {
    expect(normaliseMetaAd({}).regions).toEqual([])
  })
})

describe('normaliseGoogleAd — edge cases', () => {
  it('handles completely empty object without throwing', () => {
    const result = normaliseGoogleAd({})
    expect(result.platform).toBe('google')
    expect(result.platform_ad_id).toBeNull()
    expect(result.days_running).toBeNull()
  })

  it('returns null days_running for invalid date string', () => {
    const result = normaliseGoogleAd({
      firstShown: 'not-a-date',
      lastShown: '2025-03-01',
    })
    expect(result.days_running).toBeNull()
  })

  it('returns null days_running when only firstShown is set', () => {
    const result = normaliseGoogleAd({
      firstShown: '2025-01-01',
    })
    expect(result.days_running).toBeNull()
  })

  it('returns null days_running for both invalid dates', () => {
    const result = normaliseGoogleAd({
      firstShown: 'banana',
      lastShown: 'apple',
    })
    expect(result.days_running).toBeNull()
  })

  it('regions defaults to [US] for google', () => {
    expect(normaliseGoogleAd({}).regions).toEqual(['US'])
  })

  it('auto_synced is always false', () => {
    expect(normaliseGoogleAd({}).auto_synced).toBe(false)
  })
})

describe('normaliseTikTokVideo — edge cases', () => {
  it('handles completely empty object without throwing', () => {
    const result = normaliseTikTokVideo({})
    expect(result.platform).toBe('tiktok')
    expect(result.video_url).toBeNull()
    expect(result.hashtags).toEqual([])
  })

  it('handles null desc — hashtags should be empty array', () => {
    const result = normaliseTikTokVideo({ desc: null })
    expect(result.hashtags).toEqual([])
    expect(result.body_text).toBeNull()
  })

  it('handles desc with no hashtags', () => {
    const result = normaliseTikTokVideo({ desc: 'No tags here' })
    expect(result.hashtags).toEqual([])
  })

  it('handles desc with only a hash and no word', () => {
    const result = normaliseTikTokVideo({ desc: 'text # more text' })
    expect(result.hashtags).toEqual([])
  })

  it('handles missing video object', () => {
    const result = normaliseTikTokVideo({ id: '123' })
    expect(result.video_url).toBeNull()
    expect(result.thumbnail_url).toBeNull()
    expect(result.duration_seconds).toBeNull()
  })

  it('handles missing author object', () => {
    const result = normaliseTikTokVideo({})
    expect(result.author_handle).toBeNull()
    expect(result.page_name).toBeNull()
    expect(result.advertiser_id).toBeNull()
  })

  it('handles missing stats object', () => {
    const result = normaliseTikTokVideo({})
    expect(result.view_count).toBeNull()
    expect(result.like_count).toBeNull()
    expect(result.comment_count).toBeNull()
    expect(result.share_count).toBeNull()
  })

  it('auto_synced is always false', () => {
    expect(normaliseTikTokVideo({}).auto_synced).toBe(false)
  })

  it('handles non-numeric createTime gracefully', () => {
    const result = normaliseTikTokVideo({ createTime: 'not-a-number' })
    // Non-numeric createTime should fall through to null, not throw
    expect(result.first_shown).toBeNull()
  })
})

describe('all normalisers — null input', () => {
  it('normaliseMetaAd throws a clear error on null', () => {
    expect(() => normaliseMetaAd(null as unknown as Record<string, unknown>)).toThrow()
  })

  it('normaliseGoogleAd throws a clear error on null', () => {
    expect(() => normaliseGoogleAd(null as unknown as Record<string, unknown>)).toThrow()
  })

  it('normaliseTikTokVideo throws a clear error on null', () => {
    expect(() => normaliseTikTokVideo(null as unknown as Record<string, unknown>)).toThrow()
  })
})
