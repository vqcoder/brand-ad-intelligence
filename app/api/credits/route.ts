import { SC_BASE_URL } from '@/lib/constants'

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key') || process.env.SCRAPECREATORS_API_KEY || ''

  if (!apiKey) {
    return Response.json(
      { error: 'No API key provided', credits_remaining: 0 },
      { status: 400 }
    )
  }

  try {
    // SC embeds credits_remaining in every API response.
    // Use the cheapest call: a company search with a short query.
    const res = await fetch(
      `${SC_BASE_URL}/v1/facebook/adLibrary/search/companies?query=a`,
      { headers: { 'x-api-key': apiKey } }
    )

    const data = await res.json()

    if (!res.ok) {
      return Response.json(
        { error: data.message || data.error || `SC API returned ${res.status}`, credits_remaining: 0 },
        { status: 502 }
      )
    }

    const remaining = data.credits_remaining ?? data.credits ?? data.balance ?? null
    if (remaining === null || remaining === undefined) {
      // credits field not found — return the raw keys so we can debug
      return Response.json(
        { error: `credits field not found in response (keys: ${Object.keys(data).join(', ')})`, credits_remaining: 0 },
        { status: 502 }
      )
    }

    return Response.json({ credits_remaining: Number(remaining) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message, credits_remaining: 0 }, { status: 500 })
  }
}
