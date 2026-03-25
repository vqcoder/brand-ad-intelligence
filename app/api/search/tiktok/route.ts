import { normaliseTikTokVideo } from '@/lib/normalisers'

export async function POST(request: Request) {
  const body = await request.json()
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const apiKey = request.headers.get('x-api-key') || process.env.SCRAPECREATORS_API_KEY || ''

  console.error(`[search/tiktok] called with query: "${query}"`)
  console.error(`[search/tiktok] SC key present: ${!!apiKey}, key prefix: ${apiKey ? apiKey.slice(0, 8) + '...' : 'NONE'}`)

  if (!apiKey) {
    return Response.json({ error: 'SCRAPECREATORS_API_KEY not configured', results: [] }, { status: 500 })
  }

  // Try the handle as-is, then lowercase/no-spaces variation
  const handles = [
    query.trim(),
    query.trim().toLowerCase().replace(/\s+/g, ''),
  ]
  // Deduplicate
  const uniqueHandles = [...new Set(handles)]

  for (const handle of uniqueHandles) {
    try {
      console.error(`[search/tiktok] trying handle: "${handle}"`)

      // Step 1: Get profile
      const profileUrl = `https://api.scrapecreators.com/v1/tiktok/profile?handle=${encodeURIComponent(handle)}`
      console.error(`[search/tiktok] profile URL: ${profileUrl}`)
      const profileRes = await fetch(profileUrl, { headers: { 'x-api-key': apiKey } })
      const profileData = await profileRes.json()
      console.error(`[search/tiktok] profile status: ${profileRes.status}`)
      console.error(`[search/tiktok] profile body: ${JSON.stringify(profileData).slice(0, 500)}`)

      // Step 2: Get videos
      const videosUrl = `https://api.scrapecreators.com/v3/tiktok/profile/videos?handle=${encodeURIComponent(handle)}`
      console.error(`[search/tiktok] videos URL: ${videosUrl}`)
      const videosRes = await fetch(videosUrl, { headers: { 'x-api-key': apiKey } })
      const videosData = await videosRes.json()
      console.error(`[search/tiktok] videos status: ${videosRes.status}`)
      console.error(`[search/tiktok] videos body: ${JSON.stringify(videosData).slice(0, 500)}`)

      // Try multiple paths to extract videos
      const videos = videosData?.videos || videosData?.data || videosData?.results || videosData?.itemList ||
        (Array.isArray(videosData) ? videosData : [])
      const videoList = Array.isArray(videos) ? videos : []

      console.error(`[search/tiktok] extracted ${videoList.length} videos for handle "${handle}" (tried keys: videos, data, results, itemList)`)

      if (videoList.length > 0) {
        const results = (videoList as Record<string, unknown>[]).map((v) => {
          const result = normaliseTikTokVideo(v)
          if (!result.page_name) {
            result.page_name = profileData?.userInfo?.user?.nickname || profileData?.data?.nickname || handle
          }
          if (!result.author_handle) {
            result.author_handle = handle
          }
          return result
        })

        return Response.json({ results, credits_used: 2 })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[search/tiktok] ERROR for handle "${handle}": ${message}`)
      // Continue to next handle variation
    }
  }

  console.error(`[search/tiktok] no results from any handle variation`)
  return Response.json({ results: [], credits_used: 1 })
}
