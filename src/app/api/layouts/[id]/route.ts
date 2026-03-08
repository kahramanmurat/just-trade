// DELETE /api/layouts/[id] — deletes a saved layout owned by the authenticated user
// PATCH /api/layouts/[id] — updates a layout (set as default)

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/db/prisma'
import { resolveUser } from '@/lib/db/resolveUser'
import type { ApiError } from '@/lib/api/types'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(clerkId, true)
  if (rl.limited) return rl.response

  const user = await resolveUser(clerkId)
  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 }
    )
  }

  const { id } = await params

  const layout = await prisma.savedLayout.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })

  if (!layout) {
    return NextResponse.json<ApiError>(
      { error: 'Layout not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  await prisma.savedLayout.delete({ where: { id: layout.id } })

  return NextResponse.json({ success: true })
}

const patchSchema = z.object({
  isDefault: z.boolean(),
})

export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(clerkId, true)
  if (rl.limited) return rl.response

  const user = await resolveUser(clerkId)
  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 }
    )
  }

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json<ApiError>(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const layout = await prisma.savedLayout.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })

  if (!layout) {
    return NextResponse.json<ApiError>(
      { error: 'Layout not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  const { isDefault } = parsed.data

  // If setting as default, unset any existing defaults for this user
  if (isDefault) {
    await prisma.savedLayout.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    })
  }

  await prisma.savedLayout.update({
    where: { id: layout.id },
    data: { isDefault },
  })

  return NextResponse.json({ success: true })
}
