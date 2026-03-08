import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'clerk_user_A' }),
}))
vi.mock('@/lib/db/resolveUser', () => ({
  resolveUser: vi.fn().mockResolvedValue({ id: 'user-A-uuid' }),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    alert: { findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
    savedLayout: { findFirst: vi.fn(), delete: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/prisma'

function mockRequest(method = 'GET', url = 'http://localhost:3000/api/test', body?: unknown): Request {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) init.body = JSON.stringify(body)
  return new Request(url, init)
}

function mockParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('IDOR — accessing another user resources returns 404 (not 403)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('DELETE /api/alerts/[id] returns 404 for other user alert', async () => {
    // findFirst with userId scoping returns null → 404
    vi.mocked(prisma.alert.findFirst).mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/alerts/[id]/route')
    const req = mockRequest('DELETE')
    const res = await DELETE(req, mockParams('alert-belonging-to-user-B'))
    expect(res.status).toBe(404)
    const body: unknown = await res.json()
    expect((body as { code: string }).code).toBe('NOT_FOUND')
  })

  it('PATCH /api/alerts/[id] returns 404 for other user alert', async () => {
    vi.mocked(prisma.alert.findFirst).mockResolvedValue(null)

    const { PATCH } = await import('@/app/api/alerts/[id]/route')
    const req = mockRequest('PATCH')
    const res = await PATCH(req, mockParams('alert-belonging-to-user-B'))
    expect(res.status).toBe(404)
  })

  it('DELETE /api/layouts/[id] returns 404 for other user layout', async () => {
    vi.mocked(prisma.savedLayout.findFirst).mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/layouts/[id]/route')
    const req = mockRequest('DELETE')
    const res = await DELETE(req, mockParams('layout-belonging-to-user-B'))
    expect(res.status).toBe(404)
  })

  it('PATCH /api/layouts/[id] returns 404 for other user layout', async () => {
    vi.mocked(prisma.savedLayout.findFirst).mockResolvedValue(null)

    const { PATCH } = await import('@/app/api/layouts/[id]/route')
    const req = mockRequest('PATCH', 'http://localhost:3000/api/layouts/test', { isDefault: true })
    const res = await PATCH(req, mockParams('layout-belonging-to-user-B'))
    expect(res.status).toBe(404)
  })
})
