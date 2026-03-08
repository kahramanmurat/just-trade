// GET /api/layouts — returns the authenticated user's saved layouts
// POST /api/layouts — creates a new saved layout

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import { getUserPlan } from '@/lib/db/getUserPlan'
import { getLimitsForPlan } from '@/lib/api/tierLimits'
import type {
  LayoutsListResponse,
  LayoutResponse,
  LayoutConfigJson,
  ApiError,
} from '@/lib/api/types'

function toLayoutResponse(row: {
  id: string
  name: string
  symbol: string
  timeframe: string
  isDefault: boolean
  configJson: unknown
  createdAt: Date
  updatedAt: Date
}): LayoutResponse {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    timeframe: row.timeframe,
    isDefault: row.isDefault,
    config: row.configJson as LayoutConfigJson,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

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

  const layouts = await prisma.savedLayout.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      symbol: true,
      timeframe: true,
      isDefault: true,
      configJson: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const response: LayoutsListResponse = {
    layouts: layouts.map(toLayoutResponse),
  }

  return NextResponse.json<LayoutsListResponse>(response)
}

const indicatorSchema = z.object({
  type: z.string().min(1),
  period: z.number().int().positive(),
  visible: z.boolean(),
  color: z.string().min(1),
})

const drawingSchema = z.object({
  type: z.literal('hline'),
  price: z.number(),
})

const configSchema = z.object({
  indicators: z.array(indicatorSchema),
  drawings: z.array(drawingSchema),
  rightPanelTab: z.string().min(1),
  rightPanelOpen: z.boolean(),
})

const createLayoutSchema = z.object({
  name: z
    .string()
    .min(1, 'name is required')
    .max(100, 'name too long'),
  symbol: z
    .string()
    .min(1, 'symbol is required')
    .max(30, 'symbol too long')
    .transform((s) => s.toUpperCase()),
  timeframe: z
    .string()
    .min(1, 'timeframe is required')
    .max(10, 'timeframe too long'),
  isDefault: z.boolean().optional().default(false),
  config: configSchema,
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
  const parsed = createLayoutSchema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json<ApiError>(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { name, symbol, timeframe, isDefault, config } = parsed.data

  // Tier enforcement
  const plan = await getUserPlan(user.id)
  const limits = getLimitsForPlan(plan)
  const currentCount = await prisma.savedLayout.count({ where: { userId: user.id } })

  if (currentCount >= limits.maxLayouts) {
    return NextResponse.json<ApiError>(
      {
        error: `Layout limit reached (${limits.maxLayouts}). Upgrade your plan for more layouts.`,
        code: 'LIMIT_REACHED',
      },
      { status: 403 }
    )
  }

  // If this layout is set as default, unset any existing defaults for this user
  if (isDefault) {
    await prisma.savedLayout.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    })
  }

  const layout = await prisma.savedLayout.create({
    data: {
      userId: user.id,
      name,
      symbol,
      timeframe,
      isDefault,
      configJson: config,
    },
    select: {
      id: true,
      name: true,
      symbol: true,
      timeframe: true,
      isDefault: true,
      configJson: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json<LayoutResponse>(toLayoutResponse(layout), { status: 201 })
}
