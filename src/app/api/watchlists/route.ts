// GET /api/watchlists — returns the user's default watchlist (creates one if absent)
// Watchlist items include mock symbol metadata from the symbol directory.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import { findSymbol } from '@/lib/api/symbols'
import type { WatchlistResponse, ApiError } from '@/lib/api/types'

const DEFAULT_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT']

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve internal user ID — auto-creates from Clerk session if webhook hasn't fired
  const user = await resolveUser(clerkId)

  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 }
    )
  }

  // Get-or-create the default watchlist
  let watchlist = await prisma.watchlist.findFirst({
    where: { userId: user.id, isDefault: true },
    include: { items: { orderBy: { displayOrder: 'asc' } } },
  })

  if (!watchlist) {
    try {
      watchlist = await prisma.watchlist.create({
        data: {
          userId: user.id,
          name: 'Watchlist',
          isDefault: true,
          items: {
            create: DEFAULT_SYMBOLS.map((symbol, i) => ({
              symbol,
              displayOrder: i,
            })),
          },
        },
        include: { items: { orderBy: { displayOrder: 'asc' } } },
      })
    } catch (e) {
      // Race condition: another request created the default watchlist between findFirst and create
      if (
        e instanceof PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        watchlist = await prisma.watchlist.findFirst({
          where: { userId: user.id, isDefault: true },
          include: { items: { orderBy: { displayOrder: 'asc' } } },
        })
      } else {
        throw e
      }
    }
  }

  if (!watchlist) {
    return NextResponse.json<ApiError>(
      { error: 'Could not create watchlist', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }

  const response: WatchlistResponse = {
    id: watchlist.id,
    name: watchlist.name,
    isDefault: watchlist.isDefault,
    items: watchlist.items.map((item) => ({
      id: item.id,
      symbol: item.symbol,
      name: findSymbol(item.symbol)?.name ?? item.symbol,
      displayOrder: item.displayOrder,
    })),
  }

  return NextResponse.json<WatchlistResponse>(response)
}
