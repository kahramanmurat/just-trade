import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest, getResponseJson, MOCK_CLERK_ID, MOCK_USER_ID } from '../../helpers/apiTestUtils'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/resolveUser', () => ({ resolveUser: vi.fn() }))
vi.mock('@/lib/db/getUserPlan', () => ({ getUserPlan: vi.fn() }))
vi.mock('@/lib/api/tierLimits', () => ({
  getLimitsForPlan: vi.fn((plan: string) => {
    if (plan === 'free') return { maxWatchlists: 1, maxWatchlistItems: 10, maxIndicators: 2, maxAlerts: 0, maxLayouts: 0 }
    if (plan === 'pro') return { maxWatchlists: 3, maxWatchlistItems: 50, maxIndicators: 10, maxAlerts: 5, maxLayouts: 5 }
    return { maxWatchlists: 999, maxWatchlistItems: 999, maxIndicators: 999, maxAlerts: 999, maxLayouts: 999 }
  }),
}))
vi.mock('@/lib/api/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ limited: false }) }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    alert: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/alerts/route'
import { auth } from '@clerk/nextjs/server'
import { resolveUser } from '@/lib/db/resolveUser'
import { getUserPlan } from '@/lib/db/getUserPlan'
import { prisma } from '@/lib/db/prisma'

const mockAuth = vi.mocked(auth)
const mockResolveUser = vi.mocked(resolveUser)
const mockGetUserPlan = vi.mocked(getUserPlan)

describe('GET /api/alerts', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns user alerts', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    vi.mocked(prisma.alert.findMany).mockResolvedValue([
      {
        id: 'alert-1', symbol: 'AAPL', condition: 'gt',
        threshold: { toNumber: () => 150 } as never,
        isActive: true, triggered: false, triggeredAt: null,
        createdAt: new Date('2026-01-01'), userId: MOCK_USER_ID,
      },
    ] as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await getResponseJson(res) as { alerts: { symbol: string }[] }
    expect(body.alerts).toHaveLength(1)
    expect(body.alerts[0].symbol).toBe('AAPL')
  })
})

describe('POST /api/alerts', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)
    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/alerts',
      body: { symbol: 'AAPL', condition: 'gt', threshold: 150 },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 with invalid body', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/alerts',
      body: { symbol: '', condition: 'invalid' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await getResponseJson(res) as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 403 when free user tries to create alert', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    mockGetUserPlan.mockResolvedValue('free')
    vi.mocked(prisma.alert.count).mockResolvedValue(0)

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/alerts',
      body: { symbol: 'AAPL', condition: 'gt', threshold: 150 },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    const body = await getResponseJson(res) as { code: string }
    expect(body.code).toBe('LIMIT_REACHED')
  })

  it('creates alert for pro user within limits', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    mockGetUserPlan.mockResolvedValue('pro')
    vi.mocked(prisma.alert.count).mockResolvedValue(2)
    vi.mocked(prisma.alert.create).mockResolvedValue({
      id: 'alert-new', symbol: 'AAPL', condition: 'gt',
      threshold: { toNumber: () => 150 } as never,
      isActive: true, triggered: false, triggeredAt: null,
      createdAt: new Date(), userId: MOCK_USER_ID,
    } as never)

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/alerts',
      body: { symbol: 'AAPL', condition: 'gt', threshold: 150 },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await getResponseJson(res) as { symbol: string; condition: string }
    expect(body.symbol).toBe('AAPL')
    expect(body.condition).toBe('gt')
  })

  it('returns 403 when pro user at alert limit', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    mockGetUserPlan.mockResolvedValue('pro')
    vi.mocked(prisma.alert.count).mockResolvedValue(5) // at limit

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/alerts',
      body: { symbol: 'AAPL', condition: 'gt', threshold: 150 },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('accepts string threshold for decimal precision', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    mockGetUserPlan.mockResolvedValue('premium')
    vi.mocked(prisma.alert.count).mockResolvedValue(0)
    vi.mocked(prisma.alert.create).mockResolvedValue({
      id: 'alert-new', symbol: 'BTCUSD', condition: 'gt',
      threshold: { toNumber: () => 99999.12345678 } as never,
      isActive: true, triggered: false, triggeredAt: null,
      createdAt: new Date(), userId: MOCK_USER_ID,
    } as never)

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/alerts',
      body: { symbol: 'BTCUSD', condition: 'gt', threshold: '99999.12345678' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    // Verify the threshold was passed as string to prisma
    expect(vi.mocked(prisma.alert.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ threshold: '99999.12345678' }),
      })
    )
  })
})
