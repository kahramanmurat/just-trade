import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '@/lib/api/rateLimit'

describe('checkRateLimit', () => {
  it('allows requests when Redis is not configured', async () => {
    // By default in test env, UPSTASH_REDIS_REST_URL is not set to a real Redis
    // so the rate limiter should gracefully allow the request
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const result = await checkRateLimit('test-user', true)
    expect(result.limited).toBe(false)
  })

  it('returns correct type shape when not limited', async () => {
    const result = await checkRateLimit('test-user', false)
    expect(result).toEqual({ limited: false })
  })
})
