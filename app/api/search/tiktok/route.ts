import { NextResponse } from 'next/server'
import { normaliseTikTokVideo } from '@/lib/normalisers'

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
      const { res: pRes, body: pData } = await sc(`https://api.scrapecreators.com/v1/tiktok/profile?handle=${encodeURIComponent(handle)}`, apiKey)
      cr = pData.credits_remaining ?? cr
      if (!pRes.ok) { lookup = 'error'; continue }

      const user = pData?.userInfo?.user || pData?.user
      if (!user) continue
      lookup = 'found'

      const { res: vRes, body: vData } = await sc(`https://api.scrapecreators.com/v3/tiktok/profile/videos?handle=${encodeURIComponent(handle)}`, apiKey)
      cr = vData.credits_remaining ?? cr
      if (!vRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${vRes.status}: ${JSON.stringify(vData).slice(0, 200)}` }, { status: 502 })

      const vids = vData?.videos || vData?.data || vData?.results || vData?.itemList || (Array.isArray(vData) ? vData : [])
      const rawAds: Record<string, unknown>[] = Array.isArray(vids) ? vids : []
      if (rawAds.length === 0) continue

      const nickname = user?.nickname || handle
      const results = rawAds.map((v) => {
        const r = normaliseTikTokVideo(v)
        if (!r.page_name) r.page_name = nickname
        if (!r.author_handle) r.author_handle = handle
        return r
      })

      return NextResponse.json({ results, credits_used: 2, debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, raw_count: rawAds.length, sc_credits_remaining: cr } })
    } catch (error: unknown) {
      console.error(`[search/tiktok] ERROR for "${handle}":`, error instanceof Error ? error.message : error)
      lookup = 'error'
    }
  }

  return NextResponse.json({ results: [], credits_used: 1, debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, raw_count: 0, sc_credits_remaining: cr } })
}
