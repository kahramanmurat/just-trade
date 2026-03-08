import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth to return null userId (unauthenticated)
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
}))

// Mock all DB/service dependencies to prevent real calls
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/db/resolveUser', () => ({ resolveUser: vi.fn() }))
vi.mock('@/lib/db/getUserPlan', () => ({ getUserPlan: vi.fn() }))
vi.mock('@/lib/api/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ limited: false }) }))
vi.mock('@/lib/stripe', () => ({ stripe: {} }))
vi.mock('@/lib/api/ohlcv', () => ({ fetchOhlcv: vi.fn() }))

function mockRequest(method = 'GET', url = 'http://localhost:3000/api/test', body?: unknown): Request {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) init.body = JSON.stringify(body)
  return new Request(url, init)
}

describe('Auth Bypass — all protected routes return 401 without auth', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('GET /api/ohlcv returns 401', async () => {
    const { GET } = await import('@/app/api/ohlcv/route')
    const res = await GET(mockRequest('GET', 'http://localhost:3000/api/ohlcv?symbol=AAPL&timeframe=1D'))
    expect(res.status).toBe(401)
  })

  it('GET /api/alerts returns 401', async () => {
    const { GET } = await import('@/app/api/alerts/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('POST /api/alerts returns 401', async () => {
    const { POST } = await import('@/app/api/alerts/route')
    const req = mockRequest('POST', 'http://localhost:3000/api/alerts', { symbol: 'AAPL', condition: 'gt', threshold: 100 })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/watchlists returns 401', async () => {
    const { GET } = await import('@/app/api/watchlists/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('POST /api/watchlists/items returns 401', async () => {
    const { POST } = await import('@/app/api/watchlists/items/route')
    const req = mockRequest('POST', 'http://localhost:3000/api/watchlists/items', { symbol: 'AAPL' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('DELETE /api/watchlists/items returns 401', async () => {
    const { DELETE } = await import('@/app/api/watchlists/items/route')
    const req = mockRequest('DELETE', 'http://localhost:3000/api/watchlists/items', { symbol: 'AAPL' })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/layouts returns 401', async () => {
    const { GET } = await import('@/app/api/layouts/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('POST /api/layouts returns 401', async () => {
    const { POST } = await import('@/app/api/layouts/route')
    const req = mockRequest('POST', 'http://localhost:3000/api/layouts', { name: 'test', symbol: 'AAPL', timeframe: '1D', config: {} })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/subscription returns 401', async () => {
    const { GET } = await import('@/app/api/subscription/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('POST /api/checkout returns 401', async () => {
    const { POST } = await import('@/app/api/checkout/route')
    const req = mockRequest('POST', 'http://localhost:3000/api/checkout', { plan: 'pro' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/billing-portal returns 401', async () => {
    const { POST } = await import('@/app/api/billing-portal/route')
    const req = mockRequest('POST', 'http://localhost:3000/api/billing-portal')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/ai/chat returns 401', async () => {
    const { POST } = await import('@/app/api/ai/chat/route')
    const req = mockRequest('POST', 'http://localhost:3000/api/ai/chat', { message: 'test', context: {} })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
