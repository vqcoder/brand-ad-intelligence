export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key') || process.env.SCRAPECREATORS_API_KEY || ''

  try {
    const res = await fetch(
      'https://api.scrapecreators.com/v1/credits',
      { headers: { 'x-api-key': apiKey } }
    )

    if (res.ok) {
      const data = await res.json()
      return Response.json({ credits_remaining: data.credits_remaining ?? data.credits ?? data.balance ?? 0 })
    }

    return Response.json({ credits_remaining: -1 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message, credits_remaining: -1 }, { status: 500 })
  }
}
