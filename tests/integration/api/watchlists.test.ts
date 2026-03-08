import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getResponseJson, MOCK_CLERK_ID, MOCK_USER_ID } from '../../helpers/apiTestUtils'

// Mock dependencies BEFORE importing the route
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db/resolveUser', () => ({
  resolveUser: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    watchlist: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/api/symbols', () => ({
  findSymbol: vi.fn((s: string) => ({ symbol: s, name: `${s} Inc`, exchange: 'NASDAQ', category: 'Equities' as const })),
}))

import { GET } from '@/app/api/watchlists/route'
import { auth } from '@clerk/nextjs/server'
import { resolveUser } from '@/lib/db/resolveUser'
import { prisma } from '@/lib/db/prisma'

const mockAuth = vi.mocked(auth)
const mockResolveUser = vi.mocked(resolveUser)
const mockWatchlist = vi.mocked(prisma.watchlist)

describe('GET /api/watchlists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)
    const response = await GET()
    expect(response.status).toBe(401)
    const body = await getResponseJson(response)
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 when user not found', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(404)
  })

  it('returns existing watchlist with items', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    mockWatchlist.findFirst.mockResolvedValue({
      id: 'wl-1',
      name: 'Watchlist',
      isDefault: true,
      userId: MOCK_USER_ID,
      createdAt: new Date(),
      items: [
        { id: 'item-1', watchlistId: 'wl-1', symbol: 'AAPL', displayOrder: 0 },
      ],
    } as never)

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await getResponseJson(response) as { id: string; items: { symbol: string }[] }
    expect(body.id).toBe('wl-1')
    expect(body.items).toHaveLength(1)
    expect(body.items[0].symbol).toBe('AAPL')
  })

  it('creates default watchlist if none exists', async () => {
    mockAuth.mockResolvedValue({ userId: MOCK_CLERK_ID } as unknown as Awaited<ReturnType<typeof auth>>)
    mockResolveUser.mockResolvedValue({ id: MOCK_USER_ID } as unknown as Awaited<ReturnType<typeof resolveUser>>)
    mockWatchlist.findFirst.mockResolvedValue(null)
    mockWatchlist.create.mockResolvedValue({
      id: 'wl-new',
      name: 'Watchlist',
      isDefault: true,
      userId: MOCK_USER_ID,
      createdAt: new Date(),
      items: [
        { id: 'item-1', watchlistId: 'wl-new', symbol: 'AAPL', displayOrder: 0 },
        { id: 'item-2', watchlistId: 'wl-new', symbol: 'TSLA', displayOrder: 1 },
        { id: 'item-3', watchlistId: 'wl-new', symbol: 'NVDA', displayOrder: 2 },
        { id: 'item-4', watchlistId: 'wl-new', symbol: 'MSFT', displayOrder: 3 },
      ],
    } as never)

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await getResponseJson(response) as { items: { symbol: string }[] }
    expect(body.items).toHaveLength(4)
    expect(mockWatchlist.create).toHaveBeenCalledOnce()
  })
})
