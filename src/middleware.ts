// Clerk authentication middleware — protects /dashboard and /api routes.
// TODO(Backend API Agent): replace this passthrough with clerkMiddleware() after installing @clerk/nextjs.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(_request: NextRequest) {
  // Passthrough — Clerk middleware will be wired here once @clerk/nextjs is installed.
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
