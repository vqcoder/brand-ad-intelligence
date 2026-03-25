import { normaliseGoogleAd } from '@/lib/normalisers'

export async function POST(request: Request) {
  const body = await request.json()
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const apiKey = request.headers.get('x-api-key') || process.env.SCRAPECREATORS_API_KEY || ''

  try {
    // Step 1: Search for advertiser
    const searchRes = await fetch(
      `https://api.scrapecreators.com/v1/google/adLibrary/advertisers/search?query=${encodeURIComponent(query)}`,
      { headers: { 'x-api-key': apiKey } }
    )
    const searchData = await searchRes.json()

    const advertiserId = searchData?.data?.[0]?.advertiser_id || searchData?.[0]?.advertiser_id || searchData?.data?.[0]?.id

    if (!advertiserId) {
      return Response.json({ results: [], credits_used: 1 })
    }

    // Step 2: Get ads
    const adsRes = await fetch(
      `https://api.scrapecreators.com/v1/google/company/ads?advertiser_id=${advertiserId}&region=US`,
      { headers: { 'x-api-key': apiKey } }
    )
    const adsData = await adsRes.json()

    const ads = Array.isArray(adsData?.data) ? adsData.data : Array.isArray(adsData) ? adsData : []

    const results = (ads as Record<string, unknown>[]).map((ad) => {
      const result = normaliseGoogleAd(ad)
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
