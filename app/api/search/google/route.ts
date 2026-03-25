import { NextResponse } from 'next/server'
import { normaliseGoogleAd } from '@/lib/normalisers'

async function sc(url: string, apiKey: string) {
  console.error('[search/google] fetching:', url)
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } })
  const body = await res.json()
  console.error('[search/google] status:', res.status, 'keys:', Object.keys(body))
  console.error('[search/google] credits_remaining:', body.credits_remaining)
  return { res, body }
}

function extractAds(data: Record<string, unknown>) {
  const ads = data?.ads || data?.data || data?.results || (Array.isArray(data) ? data : [])
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
    console.error('[search/google] SCRAPECREATORS_API_KEY not set')
    return NextResponse.json({ error: 'API key not configured', results: [], credits_used: 0 }, { status: 500 })
  }

  let lookup: 'found' | 'not_found' | 'error' = 'not_found'
  let fallback = false
  let cr: number | null = null

  try {
    const { res: sRes, body: sData } = await sc(`https://api.scrapecreators.com/v1/google/adLibrary/advertisers/search?query=${encodeURIComponent(query)}`, apiKey)
    cr = sData.credits_remaining ?? null
    if (!sRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${sRes.status}: ${JSON.stringify(sData).slice(0, 200)}` }, { status: 502 })

    const first = sData?.advertisers?.[0] || sData?.data?.[0] || sData?.results?.[0] || sData?.[0]
    const advId = first?.advertiser_id || first?.advertiserId || first?.id || null
    let rawAds: Record<string, unknown>[] = []

    if (advId) {
      lookup = 'found'
      const { res: aRes, body: aData } = await sc(`https://api.scrapecreators.com/v1/google/company/ads?advertiser_id=${advId}&region=US`, apiKey)
      cr = aData.credits_remaining ?? cr
      if (!aRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${aRes.status}: ${JSON.stringify(aData).slice(0, 200)}` }, { status: 502 })
      rawAds = extractAds(aData)
    } else {
      fallback = true
      const domain = query.toLowerCase().replace(/\s+/g, '') + '.com'
      const { res: fRes, body: fData } = await sc(`https://api.scrapecreators.com/v1/google/company/ads?domain=${encodeURIComponent(domain)}&region=US`, apiKey)
      cr = fData.credits_remaining ?? cr
      if (!fRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${fRes.status}: ${JSON.stringify(fData).slice(0, 200)}` }, { status: 502 })
      rawAds = extractAds(fData)
    }

    const results = rawAds.map((ad) => {
      const r = normaliseGoogleAd(ad as Record<string, unknown>)
      if (!r.page_name) r.page_name = query
      return r
    })

    return NextResponse.json({ results, credits_used: 2, debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, raw_count: rawAds.length, sc_credits_remaining: cr } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[search/google] ERROR: ${msg}`)
    return NextResponse.json({ results: [], credits_used: 0, error: msg, debug: { query, key_present: true, company_lookup: lookup, fallback_used: fallback, raw_count: 0, sc_credits_remaining: cr } }, { status: 500 })
  }
}
