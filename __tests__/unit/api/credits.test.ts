/**
 * Tests for /api/credits route handler.
 * Mocks the global fetch so no real ScrapeCreators API call is made.
 */

const originalFetch = global.fetch

beforeAll(() => {
  process.env.SCRAPECREATORS_API_KEY = 'test_key'
})

afterEach(() => {
  global.fetch = originalFetch
})

function mockRequest(headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/credits', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('GET /api/credits', () => {
  it('returns credits_remaining from a successful API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ credits_remaining: 42 }),
    })

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.credits_remaining).toBe(42)
  })

  it('falls back to data.credits field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ credits: 100 }),
    })

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(data.credits_remaining).toBe(100)
  })

  it('falls back to data.balance field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ balance: 55 }),
    })

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(data.credits_remaining).toBe(55)
  })

  it('returns 502 with error when SC API response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(res.status).toBe(502)
    expect(data.credits_remaining).toBe(0)
    expect(data.error).toBeDefined()
  })

  it('returns 500 with error when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'))

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.credits_remaining).toBe(0)
    expect(data.error).toBe('Network failure')
  })

  it('returns a number type for credits_remaining', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ credits_remaining: 0 }),
    })

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(typeof data.credits_remaining).toBe('number')
    expect(data.credits_remaining).toBe(0)
  })

  it('returns 400 when no API key is provided', async () => {
    // Clear the env var so there's no fallback
    const saved = process.env.SCRAPECREATORS_API_KEY
    delete process.env.SCRAPECREATORS_API_KEY

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest()) // no x-api-key header either
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.credits_remaining).toBe(0)
    expect(data.error).toContain('No API key')

    process.env.SCRAPECREATORS_API_KEY = saved
  })

  it('never returns credits_remaining as -1', async () => {
    // Simulate a failed SC call (non-ok response)
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    })

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(data.credits_remaining).not.toBe(-1)
    expect(data.credits_remaining).toBeGreaterThanOrEqual(0)
  })

  it('returns credits_remaining as a non-negative number on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ credits_remaining: 100 }),
    })

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.credits_remaining).toBe(100)
    expect(data.credits_remaining).toBeGreaterThanOrEqual(0)
  })

  it('returns 502 when credits field is missing from SC response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], some_other_field: true }),
    })

    const { GET } = await import('@/app/api/credits/route')
    const res = await GET(mockRequest({ 'x-api-key': 'sk-test' }))
    const data = await res.json()

    expect(res.status).toBe(502)
    expect(data.credits_remaining).toBe(0)
    expect(data.error).toContain('credits field not found')
  })
})
