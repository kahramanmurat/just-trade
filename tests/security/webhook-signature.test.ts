import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Stripe webhook tests ---

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { create: vi.fn(), update: vi.fn() },
  },
}))

describe('Stripe webhook signature verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  it('returns 400 without stripe-signature header', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const req = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body: unknown = await res.json()
    expect((body as { error: string }).error).toContain('stripe-signature')
  })

  it('returns 400 with invalid signature', async () => {
    const { stripe } = await import('@/lib/stripe')
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const req = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: '{"type":"test"}',
      headers: { 'stripe-signature': 'invalid_sig' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body: unknown = await res.json()
    expect((body as { error: string }).error).toContain('Invalid signature')
  })

  it('returns 200 with valid event', async () => {
    const { stripe } = await import('@/lib/stripe')
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'checkout.session.completed', // unhandled type, but valid
      data: { object: {} },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const req = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: '{"type":"checkout.session.completed"}',
      headers: { 'stripe-signature': 'valid_sig' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})

// --- Clerk webhook tests ---

vi.mock('svix', () => {
  const MockWebhook = vi.fn().mockImplementation(function (this: { verify: ReturnType<typeof vi.fn> }) {
    this.verify = vi.fn()
  })
  return { Webhook: MockWebhook }
})

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

describe('Clerk webhook signature verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_clerk_test'
  })

  it('returns 400 without svix headers', async () => {
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    const { POST } = await import('@/app/api/webhooks/clerk/route')
    const req = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body: unknown = await res.json()
    expect((body as { error: string }).error).toContain('svix')
  })

  it('returns 400 with invalid signature', async () => {
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn((key: string) => {
        const map: Record<string, string> = {
          'svix-id': 'msg_123',
          'svix-timestamp': '1234567890',
          'svix-signature': 'invalid',
        }
        return map[key] ?? null
      }),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    const { Webhook } = await import('svix')
    vi.mocked(Webhook).mockImplementation(function (this: { verify: () => void }) {
      this.verify = () => { throw new Error('Invalid signature') }
    } as unknown as typeof Webhook)

    const { POST } = await import('@/app/api/webhooks/clerk/route')
    const req = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
