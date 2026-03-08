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
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    savedLayout: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/layouts/route'
import { auth } from '@clerk/nextjs/server'
import { resolveUser } from '@/lib/db/resolveUser'
import { getUserPlan } from '@/lib/db/getUserPlan'
import { prisma } from '@/lib/db/prisma'

const mockAuth = vi.mocked(auth)
const mockResolveUser = vi.mocked(resolveUser)

describe('GET /api/layouts', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns user layouts', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    vi.mocked(prisma.savedLayout.findMany).mockResolvedValue([{
      id: 'layout-1', name: 'My Layout', symbol: 'AAPL', timeframe: '1D',
      isDefault: false, configJson: { indicators: [], drawings: [], rightPanelTab: 'watchlist', rightPanelOpen: true },
      createdAt: new Date(), updatedAt: new Date(), userId: MOCK_USER_ID,
    }] as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await getResponseJson(res) as { layouts: { name: string }[] }
    expect(body.layouts).toHaveLength(1)
    expect(body.layouts[0].name).toBe('My Layout')
  })
})

describe('POST /api/layouts', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 403 for free user', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    vi.mocked(getUserPlan).mockResolvedValue('free')
    vi.mocked(prisma.savedLayout.count).mockResolvedValue(0)

    const req = mockRequest({
      method: 'POST', url: 'http://localhost:3000/api/layouts',
      body: {
        name: 'Test', symbol: 'AAPL', timeframe: '1D',
        config: { indicators: [], drawings: [], rightPanelTab: 'watchlist', rightPanelOpen: true },
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('creates layout for pro user', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    vi.mocked(getUserPlan).mockResolvedValue('pro')
    vi.mocked(prisma.savedLayout.count).mockResolvedValue(2)
    vi.mocked(prisma.savedLayout.create).mockResolvedValue({
      id: 'layout-new', name: 'Test', symbol: 'AAPL', timeframe: '1D',
      isDefault: false, configJson: { indicators: [], drawings: [], rightPanelTab: 'watchlist', rightPanelOpen: true },
      createdAt: new Date(), updatedAt: new Date(), userId: MOCK_USER_ID,
    } as never)

    const req = mockRequest({
      method: 'POST', url: 'http://localhost:3000/api/layouts',
      body: {
        name: 'Test', symbol: 'AAPL', timeframe: '1D',
        config: { indicators: [], drawings: [], rightPanelTab: 'watchlist', rightPanelOpen: true },
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 with invalid body', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)

    const req = mockRequest({
      method: 'POST', url: 'http://localhost:3000/api/layouts',
      body: { name: '' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
