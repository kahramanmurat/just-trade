// Resolves a Clerk session to an internal DB user.
// If the user doesn't exist in the database (webhook hasn't fired yet),
// creates the record on-the-fly using data from the Clerk session.

import { currentUser } from '@clerk/nextjs/server'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import { prisma } from '@/lib/db/prisma'

export async function resolveUser(clerkId: string) {
  // Fast path — user already synced via webhook
  const existing = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (existing) return existing

  // Slow path — webhook hasn't fired yet, create from Clerk session
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const email = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress

  if (!email) return null

  try {
    const user = await prisma.user.create({
      data: {
        clerkId,
        email,
        name:
          [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || null,
        subscription: {
          create: {
            stripeCustomerId: `pending:${clerkId}`,
            plan: 'free',
            status: 'active',
          },
        },
      },
      select: { id: true },
    })
    return user
  } catch (e) {
    // Race condition: another request created the user between our findUnique and create.
    // Just fetch the now-existing row.
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
      return prisma.user.findUnique({
        where: { clerkId },
        select: { id: true },
      })
    }
    throw e
  }
}
