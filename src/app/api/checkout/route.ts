// POST /api/checkout — creates a Stripe Checkout session for upgrading to Pro or Premium

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import { checkRateLimit } from '@/lib/api/rateLimit'
import type { ApiError } from '@/lib/api/types'

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'premium']),
})

// Map plan names to Stripe Price IDs — set via env vars
const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID,
}

export async function POST(request: Request) {
  try {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit — 100 req/min per authenticated user
  const rl = await checkRateLimit(clerkId, true)
  if (rl.limited) return rl.response

  const user = await resolveUser(clerkId)
  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = checkoutSchema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json<ApiError>(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { plan } = parsed.data
  const priceId = PRICE_IDS[plan]

  if (!priceId) {
    return NextResponse.json<ApiError>(
      { error: `Price not configured for plan: ${plan}`, code: 'CONFIG_ERROR' },
      { status: 500 }
    )
  }
    // Get or create Stripe customer
    const sub = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { stripeCustomerId: true },
    })

    let stripeCustomerId = sub?.stripeCustomerId ?? ''

    // Create a real Stripe customer if no subscription exists, customer ID is
    // empty, or it is still a pending placeholder from the Clerk webhook.
    if (!sub || !stripeCustomerId || stripeCustomerId.startsWith('pending:')) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, name: true },
      })

      const customer = await stripe.customers.create({
        email: dbUser?.email ?? undefined,
        name: dbUser?.name ?? undefined,
        metadata: { clerkId, userId: user.id },
      })

      stripeCustomerId = customer.id

      // Upsert subscription row to handle the case where no row exists yet
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { stripeCustomerId: customer.id },
        create: {
          userId: user.id,
          stripeCustomerId: customer.id,
          plan: 'free',
          status: 'active',
        },
      })
    }

    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancel`,
      metadata: { userId: user.id, plan },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json<ApiError>(
      { error: message, code: 'CHECKOUT_ERROR' },
      { status: 500 }
    )
  }
}
