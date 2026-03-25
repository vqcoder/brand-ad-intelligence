/**
 * Security tests for API route input validation.
 * These import the handler functions directly and call them with
 * mock Request objects — no real HTTP or ScrapeCreators calls.
 */

// Helper to create a mock POST request
function mockPost(body: unknown, url = 'http://localhost/api/search/meta'): Request {
  return new Request(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('API route input validation', () => {
  beforeAll(() => {
    process.env.SCRAPECREATORS_API_KEY = 'test_key_do_not_call'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder'
  })

  describe('POST /api/search/meta', () => {
    it('returns 400 when query is missing', async () => {
      const { POST } = await import('@/app/api/search/meta/route')
      const res = await POST(mockPost({}))
      expect(res.status).toBe(400)
    })

    it('returns 400 when query is empty string', async () => {
      const { POST } = await import('@/app/api/search/meta/route')
      const res = await POST(mockPost({ query: '' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when query is not a string', async () => {
      const { POST } = await import('@/app/api/search/meta/route')
      const res = await POST(mockPost({ query: 123 }))
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/search/google', () => {
    it('returns 400 when query is missing', async () => {
      const { POST } = await import('@/app/api/search/google/route')
      const res = await POST(mockPost({}))
      expect(res.status).toBe(400)
    })

    it('returns 400 when query is empty string', async () => {
      const { POST } = await import('@/app/api/search/google/route')
      const res = await POST(mockPost({ query: '' }))
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/search/tiktok', () => {
    it('returns 400 when query is missing', async () => {
      const { POST } = await import('@/app/api/search/tiktok/route')
      const res = await POST(mockPost({}))
      expect(res.status).toBe(400)
    })

    it('returns 400 when query is whitespace only', async () => {
      const { POST } = await import('@/app/api/search/tiktok/route')
      const res = await POST(mockPost({ query: '   ' }))
      expect(res.status).toBe(400)
    })
  })
})
