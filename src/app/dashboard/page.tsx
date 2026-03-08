// src/app/dashboard/page.tsx
// Protected by clerkMiddleware — unauthenticated users are redirected to /sign-in.
// Sprint 1 placeholder: full dashboard shell implemented in Epic 2 (DASH).

import { auth } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const { userId } = await auth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F1117]">
      <p className="font-mono text-[#E0E3EB]">
        Dashboard — authenticated as {userId}
      </p>
    </main>
  )
}
