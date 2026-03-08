// POST /api/billing-portal — creates a Stripe Customer Portal session

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import type { ApiError } from '@/lib/api/types'

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await resolveUser(clerkId)
  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 }
    )
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  })

  if (!sub || sub.stripeCustomerId.startsWith('pending:')) {
    return NextResponse.json<ApiError>(
      { error: 'No billing account found. Please subscribe first.', code: 'NO_CUSTOMER' },
      { status: 400 }
    )
  }

  try {
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal session failed'
    return NextResponse.json<ApiError>(
      { error: message, code: 'PORTAL_ERROR' },
      { status: 500 }
    )
  }
}
