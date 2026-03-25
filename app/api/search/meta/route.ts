import { normaliseMetaAd } from '@/lib/normalisers'

export async function POST(request: Request) {
  const body = await request.json()
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const apiKey = request.headers.get('x-api-key') || process.env.SCRAPECREATORS_API_KEY || ''

  try {
    // Step 1: Search for company
    const searchRes = await fetch(
      `https://api.scrapecreators.com/v1/facebook/adLibrary/search/companies?query=${encodeURIComponent(query)}`,
      { headers: { 'x-api-key': apiKey } }
    )
    const searchData = await searchRes.json()

    let adsData: Record<string, unknown>
    const pageId = searchData?.data?.[0]?.page_id || searchData?.[0]?.page_id

    if (pageId) {
      const adsRes = await fetch(
        `https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads?pageId=${pageId}`,
        { headers: { 'x-api-key': apiKey } }
      )
      adsData = await adsRes.json()
    } else {
      const adsRes = await fetch(
        `https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads?query=${encodeURIComponent(query)}`,
        { headers: { 'x-api-key': apiKey } }
      )
      adsData = await adsRes.json()
    }

    const ads = Array.isArray((adsData as Record<string, unknown>)?.data)
      ? (adsData as Record<string, unknown[]>).data
      : Array.isArray(adsData)
        ? adsData
        : []

    const results = (ads as Record<string, unknown>[]).map((ad) => {
      const result = normaliseMetaAd(ad)
      if (pageId && !result.advertiser_id) {
        result.advertiser_id = pageId
      }
      if (!result.page_name) {
        result.page_name = query
      }
      return result
    })

    return Response.json({ results, credits_used: 2 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message, results: [], credits_used: 0 }, { status: 500 })
  }
}
