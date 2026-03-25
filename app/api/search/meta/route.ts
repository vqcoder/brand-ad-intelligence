import { normaliseMetaAd } from '@/lib/normalisers'

export async function POST(request: Request) {
  const body = await request.json()
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const apiKey = request.headers.get('x-api-key') || process.env.SCRAPECREATORS_API_KEY || ''

  console.error(`[search/meta] called with query: "${query}"`)
  console.error(`[search/meta] SC key present: ${!!apiKey}, key prefix: ${apiKey ? apiKey.slice(0, 8) + '...' : 'NONE'}`)

  if (!apiKey) {
    return Response.json({ error: 'SCRAPECREATORS_API_KEY not configured', results: [] }, { status: 500 })
  }

  try {
    // Step 1: Search for company
    const searchUrl = `https://api.scrapecreators.com/v1/facebook/adLibrary/search/companies?query=${encodeURIComponent(query)}`
    console.error(`[search/meta] company search URL: ${searchUrl}`)
    const searchRes = await fetch(searchUrl, { headers: { 'x-api-key': apiKey } })
    const searchData = await searchRes.json()
    console.error(`[search/meta] company search status: ${searchRes.status}`)
    console.error(`[search/meta] company search body: ${JSON.stringify(searchData).slice(0, 500)}`)

    // Try multiple paths to find the page_id from SC response
    const firstResult = searchData?.searchResults?.[0] || searchData?.data?.[0] || searchData?.[0]
    const pageId = firstResult?.page_id || firstResult?.pageId || firstResult?.id || null

    console.error(`[search/meta] resolved pageId: ${pageId}`)

    let adsData: Record<string, unknown>

    if (pageId) {
      // Step 2a: Get ads by page ID
      const adsUrl = `https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads?pageId=${pageId}`
      console.error(`[search/meta] fetching ads by pageId: ${adsUrl}`)
      const adsRes = await fetch(adsUrl, { headers: { 'x-api-key': apiKey } })
      adsData = await adsRes.json()
      console.error(`[search/meta] ads by pageId status: ${adsRes.status}, body preview: ${JSON.stringify(adsData).slice(0, 300)}`)
    } else {
      // Step 2b: Fallback — search ads by keyword with expanded params
      const fallbackUrl = `https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads?query=${encodeURIComponent(query)}&status=ALL&ad_type=all&country=US`
      console.error(`[search/meta] no pageId found, falling back to keyword search: ${fallbackUrl}`)
      const adsRes = await fetch(fallbackUrl, { headers: { 'x-api-key': apiKey } })
      adsData = await adsRes.json()
      console.error(`[search/meta] keyword search status: ${adsRes.status}, body preview: ${JSON.stringify(adsData).slice(0, 300)}`)
    }

    // Try multiple paths to extract the ads array from SC response
    const ads = adsData?.ads || adsData?.data || adsData?.results || adsData?.searchResults ||
      (Array.isArray(adsData) ? adsData : [])
    const adsList = Array.isArray(ads) ? ads : []

    console.error(`[search/meta] extracted ${adsList.length} ads (tried keys: ads, data, results, searchResults)`)

    const results = (adsList as Record<string, unknown>[]).map((ad) => {
      const result = normaliseMetaAd(ad)
      if (pageId && !result.advertiser_id) {
        result.advertiser_id = String(pageId)
      }
      if (!result.page_name) {
        result.page_name = query
      }
      return result
    })

    return Response.json({ results, credits_used: 2 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[search/meta] ERROR: ${message}`)
    return Response.json({ error: message, results: [], credits_used: 0 }, { status: 500 })
  }
}
