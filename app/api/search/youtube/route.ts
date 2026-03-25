import { NextResponse } from 'next/server'
import { normaliseYouTubeVideo } from '@/lib/normalisers'
import { SC_BASE_URL } from '@/lib/constants'

async function sc(url: string, apiKey: string) {
  console.error('[search/youtube] fetching:', url)
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } })
  const text = await res.text()
  console.error('[search/youtube] status:', res.status, 'raw (first 500):', text.slice(0, 500))

  /* eslint-disable @typescript-eslint/no-explicit-any */
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    console.error('[search/youtube] SC returned non-JSON response')
    return { res, body: {} as any, parseError: true, preview: text.slice(0, 200) }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  console.error('[search/youtube] keys:', Object.keys(body))
  console.error('[search/youtube] credits_remaining:', body.credits_remaining)
  return { res, body, parseError: false, preview: '' }
}

export async function POST(request: Request) {
  const reqBody = await request.json()
  const { query, youtube_url } = reqBody

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  // Extract handle from YouTube URL if provided
  let urlHandle: string | null = null
  if (youtube_url && typeof youtube_url === 'string') {
    try {
      urlHandle = new URL(youtube_url).pathname.replace(/^\/@?/, '').replace(/\//g, '').trim() || null
      console.error('[youtube] extracted handle from URL:', urlHandle)
    } catch { /* invalid URL, ignore */ }
  }

  const apiKey = process.env.SCRAPECREATORS_API_KEY
  if (!apiKey) {
    console.error('[search/youtube] SCRAPECREATORS_API_KEY not set')
    return NextResponse.json({ error: 'API key not configured', results: [], credits_used: 0 }, { status: 500 })
  }

  let lookup: 'found' | 'not_found' | 'error' = 'not_found'
  let cr: number | null = null
  let rawVideos: Record<string, unknown>[] = []

  try {
    let channelId: string | null = null
    const searchVideos: Record<string, unknown>[] = []

    // If URL handle provided, skip search and go straight to channel-videos
    if (urlHandle) {
      console.error('[youtube] URL handle provided, skipping search — fetching videos for:', urlHandle)
      lookup = 'found'

      const vResult = await sc(
        `${SC_BASE_URL}/v1/youtube/channel-videos?handle=${encodeURIComponent(urlHandle)}`,
        apiKey,
      )

      if (!vResult.parseError) {
        const { res: vRes, body: vData } = vResult
        cr = vData.credits_remaining ?? cr

        console.error('[youtube] direct handle videos status:', vRes.status)
        console.error('[youtube] direct handle videos keys:', Object.keys(vData))
        console.error('[youtube] direct handle videos count:', vData.videos?.length ?? vData.items?.length ?? 0)

        if (vRes.ok) {
          const videos = vData?.videos ?? vData?.data ?? vData?.results ?? vData?.items ?? (Array.isArray(vData) ? vData : [])
          rawVideos = Array.isArray(videos) ? videos : []
          if (rawVideos.length > 0) {
            console.error('[youtube] direct handle got', rawVideos.length, 'videos')
            console.error('[youtube] first video keys:', JSON.stringify(Object.keys(rawVideos[0])))
          }
        }
      }
    }

    // STEP 1 — Search for channel (only when no URL handle or direct handle returned 0)
    if (!urlHandle && rawVideos.length === 0) {
      const sResult = await sc(
        `${SC_BASE_URL}/v1/youtube/search?query=${encodeURIComponent(query + ' official')}`,
        apiKey,
      )
      if (sResult.parseError) {
        return NextResponse.json({ results: [], credits_used: 0, error: 'SC returned non-JSON', debug: { stage: 'channel_search', status: sResult.res.status, preview: sResult.preview } }, { status: 200 })
      }
      const { res: sRes, body: sData } = sResult
      cr = sData.credits_remaining ?? cr

      console.error('[youtube] channel search status:', sRes.status)
      console.error('[youtube] channel search keys:', Object.keys(sData))
      console.error('[youtube] channel search full response:', JSON.stringify(sData).slice(0, 800))

      if (!sRes.ok) {
        return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${sRes.status}: ${JSON.stringify(sData).slice(0, 200)}` }, { status: 200 })
      }

      // STEP 2 — Extract results from all possible keys
      const results = sData?.results ?? sData?.videos ?? sData?.items ?? sData?.data ?? (Array.isArray(sData) ? sData : [])
      const allResults = Array.isArray(results) ? results : []
      console.error('[youtube] search results count:', allResults.length)
      const firstResult = allResults[0] ?? null
      console.error('[youtube] first result:', JSON.stringify(firstResult)?.slice(0, 500))

      // STEP 3 — Extract channelId from various response shapes
      let handle: string | null = null

      for (const item of allResults) {
        const r = item as Record<string, unknown>

        if (!channelId) {
          channelId = (
            r.channelId
            || r.channel_id
            || (r.id as Record<string, unknown>)?.channelId
            || (r.channel as Record<string, unknown>)?.id
            || (r.snippet as Record<string, unknown>)?.channelId
            || r.authorChannelId
            || null
          ) as string | null
        }
        if (!handle) {
          handle = (
            r.channelHandle
            || r.handle
            || r.customUrl
            || (r.snippet as Record<string, unknown>)?.channelHandle
            || (r.snippet as Record<string, unknown>)?.customUrl
            || null
          ) as string | null
        }

        if (r.videoId || r.video_id || (r.id as Record<string, unknown>)?.videoId || r.title) {
          searchVideos.push(r)
        }

        if (channelId) break
      }

      console.error('[youtube] extracted channelId:', channelId, 'handle:', handle, 'searchVideos:', searchVideos.length)

      // STEP 4 — Fetch channel videos
      if (channelId || handle) {
        lookup = 'found'

        const param = channelId ? `channelId=${encodeURIComponent(channelId)}` : `handle=${encodeURIComponent(handle!)}`
        const vResult = await sc(
          `${SC_BASE_URL}/v1/youtube/channel-videos?${param}`,
          apiKey,
        )

        if (!vResult.parseError) {
          const { res: vRes, body: vData } = vResult
          cr = vData.credits_remaining ?? cr

          console.error('[youtube] videos status:', vRes.status)
          console.error('[youtube] videos keys:', Object.keys(vData))
          console.error('[youtube] videos count:', vData.videos?.length ?? vData.items?.length ?? 0)
          console.error('[youtube] first video keys:', JSON.stringify(Object.keys(vData.videos?.[0] ?? vData.items?.[0] ?? {})))

          if (vRes.ok) {
            const videos = vData?.videos ?? vData?.data ?? vData?.results ?? vData?.items ?? (Array.isArray(vData) ? vData : [])
            rawVideos = Array.isArray(videos) ? videos : []
            console.error('[youtube] channel videos count:', rawVideos.length)
            if (rawVideos.length > 0) console.error('[youtube] first video keys:', Object.keys(rawVideos[0]))
          }
        }
      }

      // Try query directly as a handle
      if (rawVideos.length === 0) {
        const queryHandle = query.toLowerCase().replace(/\s+/g, '')
        console.error('[youtube] trying query as handle:', queryHandle)
        const hResult = await sc(
          `${SC_BASE_URL}/v1/youtube/channel-videos?handle=${encodeURIComponent(queryHandle)}`,
          apiKey,
        )

        if (!hResult.parseError) {
          const { res: hRes, body: hData } = hResult
          cr = hData.credits_remaining ?? cr

          console.error('[youtube] handle-fallback status:', hRes.status)
          console.error('[youtube] handle-fallback keys:', Object.keys(hData))
          console.error('[youtube] handle-fallback videos count:', hData.videos?.length ?? hData.items?.length ?? 0)

          if (hRes.ok) {
            const videos = hData?.videos ?? hData?.data ?? hData?.results ?? hData?.items ?? (Array.isArray(hData) ? hData : [])
            rawVideos = Array.isArray(videos) ? videos : []
            if (rawVideos.length > 0) {
              lookup = 'found'
              console.error('[youtube] handle-fallback got', rawVideos.length, 'videos')
              console.error('[youtube] first video keys:', JSON.stringify(Object.keys(rawVideos[0])))
            }
          }
        }
      }

      // Last resort: use search video results directly
      if (rawVideos.length === 0 && searchVideos.length > 0) {
        console.error('[youtube] using search results as fallback videos:', searchVideos.length)
        rawVideos = searchVideos
        lookup = 'found'
      }
    }

    const normalised = rawVideos.map((v) => {
      const r = normaliseYouTubeVideo(v as Record<string, unknown>)
      if (!r.page_name) r.page_name = query
      return r
    })

    return NextResponse.json({
      results: normalised,
      credits_used: rawVideos.length > 0 ? 2 : 1,
      debug: { query, key_present: true, company_lookup: lookup, channelId, raw_count: rawVideos.length, sc_credits_remaining: cr },
    })
  } catch (error: unknown) {
    console.error('[youtube] unhandled exception:', String(error))
    return NextResponse.json({
      results: [],
      credits_used: 0,
      error: String(error),
      debug: { stage: 'unhandled_exception', query, key_present: true, company_lookup: lookup, raw_count: 0, sc_credits_remaining: cr },
    }, { status: 200 })
  }
}
