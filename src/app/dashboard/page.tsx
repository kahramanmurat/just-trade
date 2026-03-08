// Dashboard — protected by clerkMiddleware.
// Renders the full application shell (header, left toolbar, chart area, right panel).

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'

export const metadata = {
  title: 'Dashboard — JustTrade',
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <DashboardShell />
}
