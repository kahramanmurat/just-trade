// DELETE /api/alerts/[id] — deletes an alert owned by the authenticated user
// PATCH /api/alerts/[id] — marks an alert as triggered (called by client-side evaluator)

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import type { ApiError } from '@/lib/api/types'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: RouteParams) {
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

  const { id } = await params

  const alert = await prisma.alert.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })

  if (!alert) {
    return NextResponse.json<ApiError>(
      { error: 'Alert not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  await prisma.alert.delete({ where: { id: alert.id } })

  return NextResponse.json({ success: true })
}

export async function PATCH(_request: Request, { params }: RouteParams) {
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

  const { id } = await params

  const alert = await prisma.alert.findFirst({
    where: { id, userId: user.id },
    select: { id: true, triggered: true },
  })

  if (!alert) {
    return NextResponse.json<ApiError>(
      { error: 'Alert not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  if (alert.triggered) {
    return NextResponse.json<ApiError>(
      { error: 'Alert already triggered', code: 'ALREADY_TRIGGERED' },
      { status: 409 }
    )
  }

  await prisma.alert.update({
    where: { id: alert.id },
    data: {
      triggered: true,
      triggeredAt: new Date(),
      isActive: false,
    },
  })

  return NextResponse.json({ success: true })
}
