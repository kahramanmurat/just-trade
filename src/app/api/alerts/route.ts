// GET /api/alerts — returns the authenticated user's alerts
// POST /api/alerts — creates a new price alert

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import { getUserPlan } from '@/lib/db/getUserPlan'
import { getLimitsForPlan } from '@/lib/api/tierLimits'
import type { AlertsListResponse, AlertResponse, ApiError } from '@/lib/api/types'

export async function GET() {
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

  const alerts = await prisma.alert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      symbol: true,
      condition: true,
      threshold: true,
      isActive: true,
      triggered: true,
      triggeredAt: true,
      createdAt: true,
    },
  })

  const response: AlertsListResponse = {
    alerts: alerts.map((a): AlertResponse => ({
      id: a.id,
      symbol: a.symbol,
      condition: a.condition as AlertResponse['condition'],
      threshold: Number(a.threshold),
      isActive: a.isActive,
      triggered: a.triggered,
      triggeredAt: a.triggeredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  }

  return NextResponse.json<AlertsListResponse>(response)
}

const createAlertSchema = z.object({
  symbol: z
    .string()
    .min(1, 'symbol is required')
    .max(30, 'symbol too long')
    .transform((s) => s.toUpperCase()),
  condition: z.enum(['gt', 'lt'], {
    error: 'condition must be "gt" or "lt"',
  }),
  threshold: z
    .number({ error: 'threshold must be a number' })
    .positive({ error: 'threshold must be positive' }),
})

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

  const body = await request.json().catch(() => null)
  const parsed = createAlertSchema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json<ApiError>(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { symbol, condition, threshold } = parsed.data

  // Tier enforcement
  const plan = await getUserPlan(user.id)
  const limits = getLimitsForPlan(plan)
  const currentCount = await prisma.alert.count({ where: { userId: user.id } })

  if (currentCount >= limits.maxAlerts) {
    return NextResponse.json<ApiError>(
      {
        error: `Alert limit reached (${limits.maxAlerts}). Upgrade your plan for more alerts.`,
        code: 'LIMIT_REACHED',
      },
      { status: 403 }
    )
  }

  const alert = await prisma.alert.create({
    data: {
      userId: user.id,
      symbol,
      condition,
      threshold,
    },
    select: {
      id: true,
      symbol: true,
      condition: true,
      threshold: true,
      isActive: true,
      triggered: true,
      triggeredAt: true,
      createdAt: true,
    },
  })

  const response: AlertResponse = {
    id: alert.id,
    symbol: alert.symbol,
    condition: alert.condition as AlertResponse['condition'],
    threshold: Number(alert.threshold),
    isActive: alert.isActive,
    triggered: alert.triggered,
    triggeredAt: alert.triggeredAt?.toISOString() ?? null,
    createdAt: alert.createdAt.toISOString(),
  }

  return NextResponse.json<AlertResponse>(response, { status: 201 })
}
