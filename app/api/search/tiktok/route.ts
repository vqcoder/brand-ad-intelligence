import { normaliseTikTokVideo } from '@/lib/normalisers'

export async function POST(request: Request) {
  const body = await request.json()
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const apiKey = request.headers.get('x-api-key') || process.env.SCRAPECREATORS_API_KEY || ''

  try {
    // Step 1: Get profile
    const profileRes = await fetch(
      `https://api.scrapecreators.com/v1/tiktok/profile?handle=${encodeURIComponent(query)}`,
      { headers: { 'x-api-key': apiKey } }
    )
    const profileData = await profileRes.json()

    // Step 2: Get videos
    const videosRes = await fetch(
      `https://api.scrapecreators.com/v3/tiktok/profile/videos?handle=${encodeURIComponent(query)}`,
      { headers: { 'x-api-key': apiKey } }
    )
    const videosData = await videosRes.json()

    const videos = Array.isArray(videosData?.data) ? videosData.data : Array.isArray(videosData) ? videosData : []

    const results = (videos as Record<string, unknown>[]).map((v) => {
      const result = normaliseTikTokVideo(v)
      if (!result.page_name) {
        result.page_name = profileData?.data?.nickname || query
      }
      if (!result.author_handle) {
        result.author_handle = query
      }
      return result
    })

    return Response.json({ results, credits_used: 2 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message, results: [], credits_used: 0 }, { status: 500 })
  }
}
