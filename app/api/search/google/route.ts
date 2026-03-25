import { normaliseGoogleAd } from '@/lib/normalisers'

export async function POST(request: Request) {
  const body = await request.json()
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const apiKey = request.headers.get('x-api-key') || process.env.SCRAPECREATORS_API_KEY || ''

  console.error(`[search/google] called with query: "${query}"`)
  console.error(`[search/google] SC key present: ${!!apiKey}, key prefix: ${apiKey ? apiKey.slice(0, 8) + '...' : 'NONE'}`)

  if (!apiKey) {
    return Response.json({ error: 'SCRAPECREATORS_API_KEY not configured', results: [] }, { status: 500 })
  }

  try {
    // Step 1: Search for advertiser
    const searchUrl = `https://api.scrapecreators.com/v1/google/adLibrary/advertisers/search?query=${encodeURIComponent(query)}`
    console.error(`[search/google] advertiser search URL: ${searchUrl}`)
    const searchRes = await fetch(searchUrl, { headers: { 'x-api-key': apiKey } })
    const searchData = await searchRes.json()
    console.error(`[search/google] advertiser search status: ${searchRes.status}`)
    console.error(`[search/google] advertiser search body: ${JSON.stringify(searchData).slice(0, 500)}`)

    // Try multiple paths to find the advertiser_id
    const firstResult = searchData?.advertisers?.[0] || searchData?.data?.[0] || searchData?.results?.[0] || searchData?.[0]
    const advertiserId = firstResult?.advertiser_id || firstResult?.advertiserId || firstResult?.id || null

    console.error(`[search/google] resolved advertiserId: ${advertiserId}`)

    if (!advertiserId) {
      // Fallback: try domain-based lookup
      const domain = query.toLowerCase().replace(/\s+/g, '') + '.com'
      const fallbackUrl = `https://api.scrapecreators.com/v1/google/company/ads?domain=${encodeURIComponent(domain)}&region=US`
      console.error(`[search/google] no advertiserId, trying domain fallback: ${fallbackUrl}`)

      const fallbackRes = await fetch(fallbackUrl, { headers: { 'x-api-key': apiKey } })
      const fallbackData = await fallbackRes.json()
      console.error(`[search/google] domain fallback status: ${fallbackRes.status}, body preview: ${JSON.stringify(fallbackData).slice(0, 300)}`)

      const fallbackAds = fallbackData?.ads || fallbackData?.data || fallbackData?.results ||
        (Array.isArray(fallbackData) ? fallbackData : [])
      const fallbackList = Array.isArray(fallbackAds) ? fallbackAds : []

      if (fallbackList.length > 0) {
        const results = (fallbackList as Record<string, unknown>[]).map((ad) => {
          const result = normaliseGoogleAd(ad)
          if (!result.page_name) result.page_name = query
          return result
        })
        return Response.json({ results, credits_used: 2 })
      }

      console.error(`[search/google] no results from either approach`)
      return Response.json({ results: [], credits_used: 1 })
    }

    // Step 2: Get ads by advertiser ID
    const adsUrl = `https://api.scrapecreators.com/v1/google/company/ads?advertiser_id=${advertiserId}&region=US`
    console.error(`[search/google] fetching ads: ${adsUrl}`)
    const adsRes = await fetch(adsUrl, { headers: { 'x-api-key': apiKey } })
    const adsData = await adsRes.json()
    console.error(`[search/google] ads status: ${adsRes.status}, body preview: ${JSON.stringify(adsData).slice(0, 300)}`)

    const ads = adsData?.ads || adsData?.data || adsData?.results ||
      (Array.isArray(adsData) ? adsData : [])
    const adsList = Array.isArray(ads) ? ads : []

    console.error(`[search/google] extracted ${adsList.length} ads`)

    const results = (adsList as Record<string, unknown>[]).map((ad) => {
      const result = normaliseGoogleAd(ad)
      if (!result.page_name) {
        result.page_name = query
      }
      return result
    })

    return Response.json({ results, credits_used: 2 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[search/google] ERROR: ${message}`)
    return Response.json({ error: message, results: [], credits_used: 0 }, { status: 500 })
  }
}
