import { NextResponse } from 'next/server'
import { normaliseTikTokVideo } from '@/lib/normalisers'
import { SC_BASE_URL } from '@/lib/constants'

async function sc(url: string, apiKey: string) {
  console.error('[search/tiktok] fetching:', url)
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } })
  const body = await res.json()
  console.error('[search/tiktok] status:', res.status, 'keys:', Object.keys(body))
  console.error('[search/tiktok] credits_remaining:', body.credits_remaining)
  return { res, body }
}

export async function POST(request: Request) {
  const reqBody = await request.json()
  const { query } = reqBody

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const apiKey = process.env.SCRAPECREATORS_API_KEY
  if (!apiKey) {
    console.error('[search/tiktok] SCRAPECREATORS_API_KEY not set')
    return NextResponse.json({ error: 'API key not configured', results: [], credits_used: 0 }, { status: 500 })
  }

  let lookup: 'found' | 'not_found' | 'error' = 'not_found'
  let fallback = false
  let cr: number | null = null
  let rawAds: Record<string, unknown>[] = []
  let source = ''

  try {
    // STEP 1 — TikTok Ad Library search by advertiser name
    const { res: adRes, body: adData } = await sc(
      `${SC_BASE_URL}/v1/tiktok/ads/search?query=${encodeURIComponent(query)}&region=US`,
      apiKey,
    )
    cr = adData.credits_remaining ?? cr

    if (adRes.ok) {
      console.error('[tiktok] ad library keys:', JSON.stringify(Object.keys(adData)))
      const adItems = adData?.ads ?? adData?.data ?? adData?.results ?? adData?.itemList ?? adData?.items ?? (Array.isArray(adData) ? adData : [])
      rawAds = Array.isArray(adItems) ? adItems : []
      console.error('[tiktok] ad library count:', rawAds.length)
      if (rawAds.length > 0) console.error('[tiktok] ad library first item keys:', Object.keys(rawAds[0]))
    } else {
      console.error('[tiktok] ad library endpoint status:', adRes.status)
    }

    if (rawAds.length > 0) {
      lookup = 'found'
      source = 'ad_library'
    }

    // STEP 2 — Keyword search fallback
    if (rawAds.length === 0) {
      fallback = true
      console.error('[tiktok] falling back to keyword search')
      const { res: kwRes, body: kwData } = await sc(
        `${SC_BASE_URL}/v1/tiktok/search/keyword?keyword=${encodeURIComponent(query)}`,
        apiKey,
      )
      cr = kwData.credits_remaining ?? cr

      if (kwRes.ok) {
        console.error('[tiktok] keyword search keys:', JSON.stringify(Object.keys(kwData)))
        const kwItems = kwData?.ads ?? kwData?.data ?? kwData?.results ?? kwData?.itemList ?? kwData?.items ?? (Array.isArray(kwData) ? kwData : [])
        rawAds = Array.isArray(kwItems) ? kwItems : []
        console.error('[tiktok] keyword search count:', rawAds.length)
        if (rawAds.length > 0) console.error('[tiktok] keyword search first item keys:', Object.keys(rawAds[0]))
      } else {
        console.error('[tiktok] keyword search endpoint status:', kwRes.status)
      }

      if (rawAds.length > 0) {
        lookup = 'found'
        source = 'keyword_search'
      }
    }

    // STEP 3 — Profile + videos as last resort
    if (rawAds.length === 0) {
      console.error('[tiktok] falling back to profile/videos')
      const handle = query.trim().toLowerCase().replace(/\s+/g, '')
      const { res: pRes, body: pData } = await sc(
        `${SC_BASE_URL}/v1/tiktok/profile?handle=${encodeURIComponent(handle)}`,
        apiKey,
      )
      cr = pData.credits_remaining ?? cr

      if (pRes.ok) {
        const user = pData?.user || pData?.userInfo?.user
        console.error('[tiktok] profile user:', user?.uniqueId)

        if (user) {
          lookup = 'found'
          const resolvedHandle = user.uniqueId || handle
          const profileItems = Array.isArray(pData?.itemList) ? pData.itemList : (Array.isArray(pData?.items) ? pData.items : [])

          if (profileItems.length > 0) {
            rawAds = profileItems
            source = 'profile_items'
          } else {
            const { res: vRes, body: vData } = await sc(
              `${SC_BASE_URL}/v3/tiktok/profile/videos?handle=${encodeURIComponent(resolvedHandle)}`,
              apiKey,
            )
            cr = vData.credits_remaining ?? cr
            if (vRes.ok) {
              console.error('[tiktok] profile videos keys:', JSON.stringify(Object.keys(vData)))
              const vItems = vData?.itemList ?? vData?.items ?? vData?.videos ?? vData?.data ?? vData?.results ?? (Array.isArray(vData) ? vData : [])
              rawAds = Array.isArray(vItems) ? vItems : []
              console.error('[tiktok] profile videos count:', rawAds.length)
              source = 'profile_videos'
            }
          }
        }
      }
    }

    // Normalise results
    const results = rawAds.map((v) => {
      const r = normaliseTikTokVideo(v as Record<string, unknown>)
      if (!r.page_name) r.page_name = query
      return r
    })
    console.error('[tiktok] normalised count:', results.length, 'source:', source)

    const creditsUsed = rawAds.length > 0 ? 2 : 1
    return NextResponse.json({
      results,
      credits_used: creditsUsed,
      debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, source, raw_count: rawAds.length, sc_credits_remaining: cr },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[search/tiktok] ERROR: ${msg}`)
    return NextResponse.json({
      results: [],
      credits_used: 0,
      error: msg,
      debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, source, raw_count: 0, sc_credits_remaining: cr },
    }, { status: 500 })
  }
}
