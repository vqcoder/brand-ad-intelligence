import { NextRequest, NextResponse } from 'next/server'
import { SC_BASE_URL } from '@/lib/constants'

// Safety: only works in non-production or with a debug header
export async function GET(req: NextRequest) {
  const isAllowed =
    process.env.NODE_ENV !== 'production' ||
    req.headers.get('x-debug-token') === process.env.DEBUG_TOKEN

  if (!isAllowed) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const query = req.nextUrl.searchParams.get('q') || 'apple'
  const key = process.env.SCRAPECREATORS_API_KEY

  const result: Record<string, unknown> = {
    query,
    key_present: !!key,
    key_prefix: key ? key.slice(0, 8) + '...' : null,
    node_env: process.env.NODE_ENV,
  }

  if (!key) {
    return NextResponse.json({ ...result, error: 'No API key in env' }, { status: 500 })
  }

  // Test Meta company search directly
  try {
    const url = `${SC_BASE_URL}/v1/facebook/adLibrary/search/companies?query=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { 'x-api-key': key } })
    const body = await res.json()
    result.meta_company_search = {
      status: res.status,
      ok: res.ok,
      credits_remaining: body.credits_remaining,
      result_count: body.searchResults?.length ?? body.data?.length ?? 0,
      first_result: body.searchResults?.[0] ?? body.data?.[0] ?? null,
      raw_keys: Object.keys(body),
      raw_preview: JSON.stringify(body).slice(0, 500),
    }
  } catch (e: unknown) {
    result.meta_company_search = { error: String(e) }
  }

  // Test Google advertiser search directly
  try {
    const url = `${SC_BASE_URL}/v1/google/adLibrary/advertisers/search?query=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { 'x-api-key': key } })
    const body = await res.json()
    result.google_advertiser_search = {
      status: res.status,
      ok: res.ok,
      credits_remaining: body.credits_remaining,
      result_count: body.advertisers?.length ?? body.data?.length ?? body.results?.length ?? 0,
      first_result: body.advertisers?.[0] ?? body.data?.[0] ?? body.results?.[0] ?? null,
      raw_keys: Object.keys(body),
      raw_preview: JSON.stringify(body).slice(0, 500),
    }
  } catch (e: unknown) {
    result.google_advertiser_search = { error: String(e) }
  }

  // Test TikTok profile directly
  try {
    const url = `${SC_BASE_URL}/v1/tiktok/profile?handle=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { 'x-api-key': key } })
    const body = await res.json()
    result.tiktok_profile = {
      status: res.status,
      ok: res.ok,
      credits_remaining: body.credits_remaining,
      found: !!body.userInfo,
      username: body.userInfo?.user?.uniqueId ?? null,
      raw_keys: Object.keys(body),
      raw_preview: JSON.stringify(body).slice(0, 500),
    }
  } catch (e: unknown) {
    result.tiktok_profile = { error: String(e) }
  }

  return NextResponse.json(result, { status: 200 })
}
