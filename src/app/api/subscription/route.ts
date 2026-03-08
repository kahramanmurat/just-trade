// GET /api/subscription — returns the authenticated user's subscription, limits, and usage

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import { getLimitsForPlan } from '@/lib/api/tierLimits'
import type { SubscriptionWithLimitsResponse, ApiError } from '@/lib/api/types'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(clerkId, true)
  if (rl.limited) return rl.response

  const user = await resolveUser(clerkId)
  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 }
    )
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
    },
  })

  const plan = sub?.plan ?? 'free'
  const limits = getLimitsForPlan(plan)

  const [watchlistCount, watchlistItemCount, alertCount, layoutCount] =
    await Promise.all([
      prisma.watchlist.count({ where: { userId: user.id } }),
      prisma.watchlistItem.count({
        where: { watchlist: { userId: user.id } },
      }),
      prisma.alert.count({ where: { userId: user.id } }),
      prisma.savedLayout.count({ where: { userId: user.id } }),
    ])

  const response: SubscriptionWithLimitsResponse = {
    subscription: {
      plan,
      status: sub?.status ?? 'active',
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    },
    limits,
    usage: {
      watchlists: watchlistCount,
      watchlistItems: watchlistItemCount,
      alerts: alertCount,
      layouts: layoutCount,
    },
  }

  return NextResponse.json<SubscriptionWithLimitsResponse>(response)
}
