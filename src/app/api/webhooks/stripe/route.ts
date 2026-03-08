// POST /api/webhooks/stripe — handles Stripe subscription lifecycle events.
// This route is PUBLIC (no Clerk auth) — verified using Stripe webhook signature.

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import type { Plan, SubscriptionStatus } from '@prisma/client'

function mapStripePlan(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return 'premium'
  return 'free'
}

function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'trialing':
      return 'trialing'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled'
    default:
      return 'active'
  }
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const sub = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })

  if (!sub) return // Customer not in our DB

  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id ?? ''
  const plan = mapStripePlan(priceId)
  const status = mapStripeStatus(subscription.status)

  // In Stripe API v2026, current_period_end is on the subscription item, not the subscription
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : null

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      plan,
      status,
      currentPeriodEnd: periodEnd,
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: 'free',
      status: 'canceled',
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    },
  })
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
    default:
      break
  }

  return NextResponse.json({ received: true })
}
