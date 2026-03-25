/**
 * Smoke test — exercises all 3 search API routes against the real ScrapeCreators API.
 *
 * Run with:  npm run smoke
 * Requires:  SCRAPECREATORS_API_KEY in environment
 *            Next.js dev server running on localhost:3000 (or set NEXT_PUBLIC_APP_URL)
 */

/* eslint-disable no-console */

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const QUERY = 'Nike'

interface RouteResult {
  platform: string
  status: number
  count: number
  firstTitle: string
  credits: number
  error: string | null
}

function truncate(s: string | null | undefined, max: number): string {
  if (!s) return '—'
  return s.length > max ? s.slice(0, max) + '…' : s
}

async function testRoute(platform: string, path: string): Promise<RouteResult> {
  const result: RouteResult = {
    platform,
    status: 0,
    count: 0,
    firstTitle: '—',
    credits: 0,
    error: null,
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
    })

    result.status = res.status

    const data = await res.json()

    if (data.error) {
      result.error = data.error
    }

    if (Array.isArray(data.results)) {
      result.count = data.results.length
      const first = data.results[0]
      if (first) {
        result.firstTitle = truncate(
          first.body_text || first.title || first.headline || first.page_name,
          60
        )
      }
    }

    result.credits = data.credits_used ?? 0
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
  }

  return result
}

async function main() {
  console.log(`\n🔍 Smoke test — query: "${QUERY}" against ${BASE}\n`)

  const routes: Array<{ platform: string; path: string }> = [
    { platform: 'Meta', path: '/api/search/meta' },
    { platform: 'Google', path: '/api/search/google' },
    { platform: 'TikTok', path: '/api/search/tiktok' },
  ]

  const results: RouteResult[] = []

  for (const route of routes) {
    console.log(`  ↻ ${route.platform}...`)
    const r = await testRoute(route.platform, route.path)
    results.push(r)

    const statusIcon = r.status === 200 && r.count > 0 ? '✓' : '✗'
    console.log(`  ${statusIcon} ${route.platform}: ${r.status} — ${r.count} results`)
    if (r.error) {
      console.log(`    ⚠ Error: ${r.error}`)
    }
  }

  // Summary table
  console.log('\n┌──────────┬────────┬─────────┬────────┬──────────────────────────────────────────────────────────────────┐')
  console.log('│ Platform │ Status │ Results │ Credits│ First Result                                                     │')
  console.log('├──────────┼────────┼─────────┼────────┼──────────────────────────────────────────────────────────────────┤')

  for (const r of results) {
    const plat = r.platform.padEnd(8)
    const stat = String(r.status).padEnd(6)
    const cnt = String(r.count).padEnd(7)
    const cred = String(r.credits).padEnd(6)
    const title = truncate(r.firstTitle, 60).padEnd(64)
    console.log(`│ ${plat} │ ${stat} │ ${cnt} │ ${cred} │ ${title} │`)
  }

  console.log('└──────────┴────────┴─────────┴────────┴──────────────────────────────────────────────────────────────────┘')

  // Exit status
  const failures = results.filter((r) => r.status !== 200 || r.count === 0)
  if (failures.length > 0) {
    console.log(`\n✗ ${failures.length} route(s) failed or returned 0 results.\n`)
    process.exit(1)
  } else {
    console.log(`\n✓ All routes returned results successfully.\n`)
    process.exit(0)
  }
}

main()
