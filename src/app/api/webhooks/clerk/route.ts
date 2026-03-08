// src/app/api/webhooks/clerk/route.ts
// Clerk webhook handler — syncs Clerk user events to the Prisma database.
//
// user.created → creates a users row + subscriptions row (plan=free, status=active).
//   stripe_customer_id is set to a placeholder `pending:{clerkId}` in Sprint 1.
//   Sprint 2 (Billing) will call Stripe to create a real customer and update this column.
//
// user.updated → syncs name and primary email changes.
//
// This route is intentionally PUBLIC (no Clerk auth middleware) — it verifies
// requests using the Svix signature in CLERK_WEBHOOK_SECRET instead.

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

function getMissingSecretResponse() {
  console.error('CLERK_WEBHOOK_SECRET is not set')
  return NextResponse.json(
    { error: 'Webhook secret not configured' },
    { status: 500 },
  )
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return getMissingSecretResponse()

  // In Next.js 15+, headers() is async.
  const headersList = await headers()
  const svixId = headersList.get('svix-id')
  const svixTimestamp = headersList.get('svix-timestamp')
  const svixSignature = headersList.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await request.text()
  const wh = new Webhook(secret)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name } = event.data

      const primaryEmail = email_addresses.find(
        (e) => e.id === event.data.primary_email_address_id,
      )?.email_address

      if (!primaryEmail) {
        return NextResponse.json(
          { error: 'No primary email on user' },
          { status: 400 },
        )
      }

      const displayName =
        [first_name, last_name].filter(Boolean).join(' ').trim() || null

      // Create User + Subscription atomically via nested write.
      // stripe_customer_id uses a placeholder until Sprint 2 (Billing) wires Stripe.
      await prisma.user.create({
        data: {
          clerkId: id,
          email: primaryEmail,
          name: displayName,
          subscription: {
            create: {
              stripeCustomerId: `pending:${id}`,
              plan: 'free',
              status: 'active',
            },
          },
        },
      })

      break
    }

    case 'user.updated': {
      const { id, email_addresses, first_name, last_name } = event.data

      const primaryEmail = email_addresses.find(
        (e) => e.id === event.data.primary_email_address_id,
      )?.email_address

      const displayName =
        [first_name, last_name].filter(Boolean).join(' ').trim() || null

      await prisma.user.update({
        where: { clerkId: id },
        data: {
          ...(primaryEmail ? { email: primaryEmail } : {}),
          name: displayName,
        },
      })

      break
    }

    default:
      // Unhandled event types are silently ignored.
      break
  }

  return NextResponse.json({ received: true })
}
