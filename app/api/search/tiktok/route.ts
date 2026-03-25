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
  const handles = [...new Set([query.trim(), query.trim().toLowerCase().replace(/\s+/g, '')])]

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i]
    if (i > 0) fallback = true
    try {
      const { res: pRes, body: pData } = await sc(`${SC_BASE_URL}/v1/tiktok/profile?handle=${encodeURIComponent(handle)}`, apiKey)
      cr = pData.credits_remaining ?? cr
      if (!pRes.ok) { lookup = 'error'; continue }

      // Log all keys from the profile response for debugging
      console.error('[tiktok] ALL profile keys:', JSON.stringify(Object.keys(pData)))
      console.error('[tiktok] itemList length:', pData.itemList?.length)

      // SC returns profile under body.user (not body.userInfo)
      const user = pData?.user || pData?.userInfo?.user
      console.error('[tiktok] user:', user?.uniqueId)
      if (!user) continue
      lookup = 'found'
      const resolvedHandle = user.uniqueId || handle

      // Profile endpoint may already include itemList — use it if present
      let rawAds: Record<string, unknown>[] = []
      const profileItems = Array.isArray(pData?.itemList) ? pData.itemList : (Array.isArray(pData?.items) ? pData.items : [])
      if (profileItems.length > 0) {
        rawAds = profileItems
      } else {
        // Fall back to dedicated videos endpoint
        const { res: vRes, body: vData } = await sc(`${SC_BASE_URL}/v3/tiktok/profile/videos?handle=${encodeURIComponent(resolvedHandle)}`, apiKey)
        cr = vData.credits_remaining ?? cr
        if (!vRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${vRes.status}: ${JSON.stringify(vData).slice(0, 200)}` }, { status: 502 })

        console.error('[tiktok] videos response keys:', JSON.stringify(Object.keys(vData)))
        console.error('[tiktok] videos itemList count:', Array.isArray(vData?.itemList) ? vData.itemList.length : 'key missing')
        const vids = ('itemList' in vData ? vData.itemList : null) ?? vData?.items ?? vData?.videos ?? vData?.data ?? vData?.results ?? (Array.isArray(vData) ? vData : [])
        rawAds = Array.isArray(vids) ? vids : []
      }
      if (rawAds.length === 0) continue

      console.error('[tiktok] first raw item keys:', rawAds[0] ? Object.keys(rawAds[0]) : 'no items')
      const nickname = user?.nickname || resolvedHandle
      const results = rawAds.map((v) => {
        const r = normaliseTikTokVideo(v)
        if (!r.page_name) r.page_name = nickname
        if (!r.author_handle) r.author_handle = resolvedHandle
        return r
      })
      console.error('[tiktok] normalised count:', results.filter(Boolean).length)

      return NextResponse.json({ results, credits_used: 2, debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, raw_count: rawAds.length, sc_credits_remaining: cr } })
    } catch (error: unknown) {
      console.error(`[search/tiktok] ERROR for "${handle}":`, error instanceof Error ? error.message : error)
      lookup = 'error'
    }
  }

  return NextResponse.json({ results: [], credits_used: 1, debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, raw_count: 0, sc_credits_remaining: cr } })
}
