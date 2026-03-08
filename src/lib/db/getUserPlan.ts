// Fetch the user's subscription plan from the database.
// Returns 'free' if no subscription row exists (should not happen per invariants).

import type { Plan } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  })
  return sub?.plan ?? 'free'
}
