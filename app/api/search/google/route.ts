import { NextResponse } from 'next/server'
import { normaliseGoogleAd } from '@/lib/normalisers'
import { SC_BASE_URL } from '@/lib/constants'

async function sc(url: string, apiKey: string) {
  console.error('[search/google] fetching:', url)
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } })
  const body = await res.json()
  console.error('[search/google] status:', res.status, 'keys:', Object.keys(body))
  console.error('[search/google] credits_remaining:', body.credits_remaining)
  return { res, body }
}

function extractAds(data: Record<string, unknown>, label: string) {
  console.error(`[search/google] ${label} keys:`, Object.keys(data))
  console.error(`[search/google] ${label} ads count:`, Array.isArray(data?.ads) ? data.ads.length : 'key missing')
  const ads = ('ads' in data ? data.ads : null) ?? data?.data ?? data?.results ?? (Array.isArray(data) ? data : [])
  return Array.isArray(ads) ? ads : []
}

export async function POST(request: Request) {
  const reqBody = await request.json()
  const { query, domain, context } = reqBody

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
    // Priority 0: if domain was provided, try it directly first
    let hostname: string | null = null
    if (domain) {
      try { hostname = new URL(domain.startsWith('http') ? domain : `https://${domain}`).hostname.replace(/^www\./, '') } catch { /* invalid URL */ }
    }

    if (hostname) {
      console.error('[search/google] domain-first lookup:', hostname)
      const { res: dRes, body: dData } = await sc(`${SC_BASE_URL}/v1/google/company/ads?domain=${encodeURIComponent(hostname)}&region=US`, apiKey)
      cr = dData.credits_remaining ?? cr
      if (dRes.ok) {
        const domainAds = extractAds(dData, 'domain-first')
        if (domainAds.length > 0) {
          lookup = 'found'
          const results = domainAds.map((ad) => {
            const r = normaliseGoogleAd(ad as Record<string, unknown>)
            if (!r.page_name) r.page_name = query
            return r
          })
          return NextResponse.json({ results, credits_used: 1, debug: { query, domain: hostname, context, key_present: true, company_lookup: lookup, fallback_used: false, raw_count: domainAds.length, sc_credits_remaining: cr } })
        }
      }
      console.error('[search/google] domain-first returned 0 ads, falling through to advertiser search')
    }

    const { res: sRes, body: sData } = await sc(`${SC_BASE_URL}/v1/google/adLibrary/advertisers/search?query=${encodeURIComponent(query)}`, apiKey)
    cr = sData.credits_remaining ?? null
    if (!sRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${sRes.status}: ${JSON.stringify(sData).slice(0, 200)}` }, { status: 502 })

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const advertisers: any[] = sData?.advertisers ?? sData?.data ?? sData?.results ?? []
    const websites: any[] = sData?.websites ?? []
    const ql = query.toLowerCase()

    // Build a set of advertiser_ids whose website contains the query as a domain keyword
    const domainMatchIds = new Set(
      websites
        .filter((w: any) => w.website?.toLowerCase().includes(ql))
        .map((w: any) => w.advertiser_id)
    )

    const best =
      // 1. Advertiser whose website domain matches the query
      advertisers.find((a: any) => domainMatchIds.has(a.advertiser_id)) ??
      // 2. US region + exact name match
      advertisers.find((a: any) => a.region === 'US' && a.name?.toLowerCase() === ql) ??
      // 3. US region + name contains query
      advertisers.find((a: any) => a.region === 'US' && a.name?.toLowerCase().includes(ql)) ??
      // 4. First US result
      advertisers.find((a: any) => a.region === 'US') ??
      // 5. First result
      advertisers[0]
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const advId = best?.advertiser_id || best?.advertiserId || best?.id || null
    let rawAds: Record<string, unknown>[] = []

    if (advId) {
      lookup = 'found'
      const { res: aRes, body: aData } = await sc(`${SC_BASE_URL}/v1/google/company/ads?advertiser_id=${advId}&region=US`, apiKey)
      cr = aData.credits_remaining ?? cr
      if (!aRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${aRes.status}: ${JSON.stringify(aData).slice(0, 200)}` }, { status: 502 })
      rawAds = extractAds(aData, 'company ads')
    } else {
      fallback = true
      const domain = query.toLowerCase().replace(/\s+/g, '') + '.com'
      const { res: fRes, body: fData } = await sc(`${SC_BASE_URL}/v1/google/company/ads?domain=${encodeURIComponent(domain)}&region=US`, apiKey)
      cr = fData.credits_remaining ?? cr
      if (!fRes.ok) return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${fRes.status}: ${JSON.stringify(fData).slice(0, 200)}` }, { status: 502 })
      rawAds = extractAds(fData, 'domain fallback')
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
