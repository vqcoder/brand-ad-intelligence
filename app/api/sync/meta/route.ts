import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const META_API = 'https://graph.facebook.com/v19.0/ads_archive'

export async function POST(req: NextRequest) {
  const { brand_id, brand_name, meta_page_id, meta_token } = await req.json()

  if (!brand_id || !brand_name || !meta_token) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Create sync log entry
  const { data: logEntry } = await supabase.from('sync_logs').insert([{
    brand_id, platform: 'meta', status: 'running', ads_found: 0, ads_new: 0
  }]).select().single()

  const logId = logEntry?.id

  try {
    const params = new URLSearchParams({
      access_token: meta_token,
      ad_reached_countries: '["US"]',
      ad_active_status: 'ALL',
      limit: '50',
      fields: [
        'id', 'ad_creation_time', 'ad_creative_bodies', 'ad_creative_link_captions',
        'ad_creative_link_descriptions', 'ad_creative_link_titles', 'ad_delivery_start_time',
        'ad_delivery_stop_time', 'ad_snapshot_url', 'currency', 'page_id', 'page_name',
        'spend', 'impressions', 'publisher_platforms', 'languages',
      ].join(','),
    })

    // Search by page ID if available, otherwise by search terms
    if (meta_page_id) {
      params.set('search_page_ids', `[${meta_page_id}]`)
    } else {
      params.set('search_terms', brand_name)
    }

    const res = await fetch(`${META_API}?${params}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || `Meta API error ${res.status}`)
    }

    const result = await res.json()
    const ads = result.data || []

    let adsNew = 0

    for (const ad of ads) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('creatives')
        .select('id')
        .eq('brand_id', brand_id)
        .eq('platform_ad_id', ad.id)
        .single()

      if (existing) continue

      const bodies: string[] = ad.ad_creative_bodies || []
      const titles: string[] = ad.ad_creative_link_titles || []
      const spend = ad.spend || {}
      const impressions = ad.impressions || {}

      await supabase.from('creatives').insert([{
        brand_id,
        platform: 'meta',
        platform_ad_id: ad.id,
        title: titles[0] || bodies[0]?.slice(0, 120) || null,
        body_text: bodies[0] || null,
        cta: ad.ad_creative_link_captions?.[0] || null,
        destination_url: ad.ad_creative_link_descriptions?.[0] || null,
        thumbnail_url: ad.ad_snapshot_url || null,
        media_url: ad.ad_snapshot_url || null,
        page_name: ad.page_name || null,
        currency: ad.currency || 'USD',
        spend_lower: spend.lower_bound ? parseInt(spend.lower_bound) : null,
        spend_upper: spend.upper_bound ? parseInt(spend.upper_bound) : null,
        impressions_lower: impressions.lower_bound ? parseInt(impressions.lower_bound) : null,
        impressions_upper: impressions.upper_bound ? parseInt(impressions.upper_bound) : null,
        first_shown: ad.ad_delivery_start_time || ad.ad_creation_time || null,
        last_shown: ad.ad_delivery_stop_time || null,
        is_active: !ad.ad_delivery_stop_time,
        auto_synced: true,
        format: ad.publisher_platforms?.join(', ') || null,
        media_type: 'image',
        raw_data: ad,
        score_hook: 0, score_brand: 0, score_audience: 0,
        score_message: 0, score_format: 0, score_production: 0, score_overall: 0,
      }])

      adsNew++
    }

    // Update sync log
    await supabase.from('sync_logs').update({
      status: 'success', ads_found: ads.length, ads_new: adsNew
    }).eq('id', logId)

    return NextResponse.json({ success: true, ads_found: ads.length, ads_new: adsNew })

  } catch (err: any) {
    await supabase.from('sync_logs').update({
      status: 'error', error_message: err.message
    }).eq('id', logId)

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
