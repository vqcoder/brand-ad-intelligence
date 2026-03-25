import { NextResponse } from 'next/server'
import { normaliseMetaAd } from '@/lib/normalisers'

async function sc(url: string, apiKey: string) {
  console.error('[search/meta] fetching:', url)
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } })
  const body = await res.json()
  console.error('[search/meta] status:', res.status, 'keys:', Object.keys(body))
  console.error('[search/meta] credits_remaining:', body.credits_remaining)
  return { res, body }
}

function extractAds(data: Record<string, unknown>, label: string) {
  console.error(`[search/meta] ${label} keys:`, Object.keys(data))
  console.error(`[search/meta] ${label} ads count:`, Array.isArray(data?.ads) ? data.ads.length : 'key missing')
  // Prefer body.ads (SC's canonical key); only fall back if the key is absent
  const ads = ('ads' in data ? data.ads : null) ?? data?.data ?? data?.results ?? data?.searchResults ?? (Array.isArray(data) ? data : [])
  return Array.isArray(ads) ? ads : []
}

export async function POST(request: Request) {
  const reqBody = await request.json()
  const { query } = reqBody

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const apiKey = process.env.SCRAPECREATORS_API_KEY
  if (!apiKey) {
    console.error('[search/meta] SCRAPECREATORS_API_KEY not set')
    return NextResponse.json({ error: 'API key not configured', results: [], credits_used: 0 }, { status: 500 })
  }

  let lookup: 'found' | 'not_found' | 'error' = 'not_found'
  let fallback = false
  let cr: number | null = null

  try {
    const { res: sRes, body: sData } = await sc(`https://api.scrapecreators.com/v1/facebook/adLibrary/search/companies?query=${encodeURIComponent(query)}`, apiKey)
    cr = sData.credits_remaining ?? null
    if (!sRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${sRes.status}: ${JSON.stringify(sData).slice(0, 200)}` }, { status: 502 })

    const first = sData?.searchResults?.[0] || sData?.data?.[0] || sData?.[0]
    const pageId = first?.page_id || first?.pageId || first?.id || null
    let rawAds: Record<string, unknown>[] = []

    if (pageId) {
      lookup = 'found'
      const { res: aRes, body: aData } = await sc(`https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads?pageId=${pageId}&country=US`, apiKey)
      cr = aData.credits_remaining ?? cr
      if (!aRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${aRes.status}: ${JSON.stringify(aData).slice(0, 200)}` }, { status: 502 })
      rawAds = extractAds(aData, 'company ads')
    }

    if (rawAds.length === 0) {
      fallback = !pageId ? true : (fallback = true)
      const { res: fRes, body: fData } = await sc(`https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads?query=${encodeURIComponent(query)}&status=ALL&ad_type=all&country=US`, apiKey)
      cr = fData.credits_remaining ?? cr
      if (!fRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${fRes.status}: ${JSON.stringify(fData).slice(0, 200)}` }, { status: 502 })
      rawAds = extractAds(fData, 'keyword fallback')
    }

    const results = rawAds.map((ad) => {
      const r = normaliseMetaAd(ad as Record<string, unknown>)
      if (pageId && !r.advertiser_id) r.advertiser_id = String(pageId)
      if (!r.page_name) r.page_name = query
      return r
    })

    return NextResponse.json({ results, credits_used: 2, debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, raw_count: rawAds.length, sc_credits_remaining: cr } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[search/meta] ERROR: ${msg}`)
    return NextResponse.json({ results: [], credits_used: 0, error: msg, debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, raw_count: 0, sc_credits_remaining: cr } }, { status: 500 })
  }
}
