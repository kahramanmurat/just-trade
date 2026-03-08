// POST /api/watchlists/items — add a symbol to the user's default watchlist
// DELETE /api/watchlists/items — remove a symbol from the user's default watchlist

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import { getUserPlan } from '@/lib/db/getUserPlan'
import { getLimitsForPlan } from '@/lib/api/tierLimits'
import type { ApiError } from '@/lib/api/types'

const bodySchema = z.object({
  symbol: z
    .string()
    .min(1, 'symbol is required')
    .max(30, 'symbol too long')
    .transform((s) => s.toUpperCase()),
})

async function resolveDefaultWatchlist(clerkId: string) {
  // Auto-creates DB user from Clerk session if webhook hasn't fired
  const user = await resolveUser(clerkId)

  if (!user) return null

  // Get or create the default watchlist
  let watchlist = await prisma.watchlist.findFirst({
    where: { userId: user.id, isDefault: true },
    select: { id: true },
  })

  if (!watchlist) {
    try {
      watchlist = await prisma.watchlist.create({
        data: {
          userId: user.id,
          name: 'Watchlist',
          isDefault: true,
        },
        select: { id: true },
      })
    } catch (e) {
      // Race condition: another request created the default watchlist
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        watchlist = await prisma.watchlist.findFirst({
          where: { userId: user.id, isDefault: true },
          select: { id: true },
        })
      } else {
        throw e
      }
    }
  }

  return watchlist
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json<ApiError>(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { symbol } = parsed.data

  const watchlist = await resolveDefaultWatchlist(clerkId)
  if (!watchlist) {
    return NextResponse.json<ApiError>(
      { error: 'Watchlist not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  // Tier enforcement — check watchlist item limit
  const user = await resolveUser(clerkId)
  if (user) {
    const plan = await getUserPlan(user.id)
    const limits = getLimitsForPlan(plan)
    const currentCount = await prisma.watchlistItem.count({
      where: { watchlistId: watchlist.id },
    })

    if (currentCount >= limits.maxWatchlistItems) {
      return NextResponse.json<ApiError>(
        {
          error: `Watchlist item limit reached (${limits.maxWatchlistItems}). Upgrade your plan for more symbols.`,
          code: 'LIMIT_REACHED',
        },
        { status: 403 }
      )
    }
  }

  // Check if symbol already exists in watchlist
  const existing = await prisma.watchlistItem.findUnique({
    where: {
      uq_watchlist_items_symbol: {
        watchlistId: watchlist.id,
        symbol,
      },
    },
  })

  if (existing) {
    return NextResponse.json<ApiError>(
      { error: 'Symbol already in watchlist', code: 'DUPLICATE' },
      { status: 409 }
    )
  }

  // Get max display order for new item
  const maxOrder = await prisma.watchlistItem.aggregate({
    where: { watchlistId: watchlist.id },
    _max: { displayOrder: true },
  })

  const item = await prisma.watchlistItem.create({
    data: {
      watchlistId: watchlist.id,
      symbol,
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
    },
  })

  return NextResponse.json({ id: item.id, symbol: item.symbol }, { status: 201 })
}

export async function DELETE(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json<ApiError>(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { symbol } = parsed.data

  const watchlist = await resolveDefaultWatchlist(clerkId)
  if (!watchlist) {
    return NextResponse.json<ApiError>(
      { error: 'Watchlist not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  const item = await prisma.watchlistItem.findUnique({
    where: {
      uq_watchlist_items_symbol: {
        watchlistId: watchlist.id,
        symbol,
      },
    },
  })

  if (!item) {
    return NextResponse.json<ApiError>(
      { error: 'Symbol not in watchlist', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  await prisma.watchlistItem.delete({ where: { id: item.id } })

  return NextResponse.json({ success: true })
}
