// Redis-based rate limiter using Upstash.
// Fixed-window counter: resets every 60 seconds.
// Authenticated: 100 req/min. Unauthenticated: 20 req/min.

import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import type { ApiError } from '@/lib/api/types'

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  redis = new Redis({ url, token })
  return redis
}

type RateLimitResult =
  | { limited: false }
  | { limited: true; response: NextResponse<ApiError> }

const WINDOW_SECONDS = 60
const AUTH_LIMIT = 100
const UNAUTH_LIMIT = 20

/**
 * Check rate limit for a request.
 * @param identifier — userId (authenticated) or IP address (unauthenticated)
 * @param authenticated — whether the request has a valid auth token
 * @returns { limited: false } if allowed, or { limited: true, response } with a 429 response
 */
export async function checkRateLimit(
  identifier: string,
  authenticated: boolean
): Promise<RateLimitResult> {
  const r = getRedis()

  // If Redis is not configured, allow the request (graceful degradation)
  if (!r) return { limited: false }

  const limit = authenticated ? AUTH_LIMIT : UNAUTH_LIMIT
  const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000))
  const key = `rl:${identifier}:${window}`

  try {
    const count = await r.incr(key)

    // Set expiry on first increment so keys auto-cleanup
    if (count === 1) {
      await r.expire(key, WINDOW_SECONDS + 1)
    }

    if (count > limit) {
      const retryAfter = WINDOW_SECONDS - Math.floor((Date.now() / 1000) % WINDOW_SECONDS)

      return {
        limited: true,
        response: NextResponse.json<ApiError>(
          {
            error: `Rate limit exceeded. Try again in ${retryAfter}s.`,
            code: 'RATE_LIMITED',
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
            },
          }
        ),
      }
    }

    return { limited: false }
  } catch {
    // Redis failure should not block the request
    return { limited: false }
  }
}
