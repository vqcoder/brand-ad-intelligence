import { NextResponse } from 'next/server'
import { normaliseYouTubeVideo } from '@/lib/normalisers'
import { SC_BASE_URL } from '@/lib/constants'

async function sc(url: string, apiKey: string) {
  console.error('[search/youtube] fetching:', url)
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } })
  const body = await res.json()
  console.error('[search/youtube] status:', res.status, 'keys:', Object.keys(body))
  console.error('[search/youtube] credits_remaining:', body.credits_remaining)
  return { res, body }
}

export async function POST(request: Request) {
  const reqBody = await request.json()
  const { query } = reqBody

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return Response.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
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
    // STEP 1 — Search for channel
    const { res: sRes, body: sData } = await sc(
      `${SC_BASE_URL}/v1/youtube/search?query=${encodeURIComponent(query + ' official')}`,
      apiKey,
    )
    cr = sData.credits_remaining ?? cr
    console.error('[youtube] channel search keys:', Object.keys(sData))

    if (!sRes.ok) {
      return NextResponse.json({ results: [], credits_used: 0, error: `SC returned ${sRes.status}: ${JSON.stringify(sData).slice(0, 200)}` }, { status: 502 })
    }

    const results = sData?.results ?? sData?.data ?? sData?.items ?? (Array.isArray(sData) ? sData : [])
    const first = Array.isArray(results) ? results[0] : null
    console.error('[youtube] first result:', JSON.stringify(first)?.slice(0, 300))

    const channelId = first?.channelId || first?.channel_id || first?.id?.channelId || null
    const handle = first?.channelHandle || first?.handle || first?.customUrl || null

    if (!channelId && !handle) {
      return NextResponse.json({
        results: [],
        credits_used: 1,
        debug: { query, key_present: true, company_lookup: 'not_found', raw_count: 0, sc_credits_remaining: cr },
      })
    }

    lookup = 'found'

    // STEP 2 — Get channel videos
    const param = channelId ? `channelId=${encodeURIComponent(channelId)}` : `handle=${encodeURIComponent(handle)}`
    const { res: vRes, body: vData } = await sc(
      `${SC_BASE_URL}/v1/youtube/channel-videos?${param}`,
      apiKey,
    )
    cr = vData.credits_remaining ?? cr
    console.error('[youtube] channel videos keys:', Object.keys(vData))

    if (vRes.ok) {
      const videos = vData?.videos ?? vData?.data ?? vData?.results ?? vData?.items ?? (Array.isArray(vData) ? vData : [])
      rawVideos = Array.isArray(videos) ? videos : []
      console.error('[youtube] videos count:', rawVideos.length)
      if (rawVideos.length > 0) console.error('[youtube] first video keys:', Object.keys(rawVideos[0]))
    }

    const normalised = rawVideos.map((v) => {
      const r = normaliseYouTubeVideo(v as Record<string, unknown>)
      if (!r.page_name) r.page_name = query
      return r
    })

    return NextResponse.json({
      results: normalised,
      credits_used: 2,
      debug: { query, key_present: true, company_lookup: lookup, channelId, raw_count: rawVideos.length, sc_credits_remaining: cr },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[search/youtube] ERROR: ${msg}`)
    return NextResponse.json({
      results: [],
      credits_used: 0,
      error: msg,
      debug: { query, key_present: true, company_lookup: lookup, raw_count: 0, sc_credits_remaining: cr },
    }, { status: 500 })
  }
}
