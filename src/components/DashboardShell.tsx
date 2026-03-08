'use client'

import DashboardHeader from '@/components/DashboardHeader'
import LeftToolbar from '@/components/LeftToolbar'
import RightPanel from '@/components/RightPanel'
import ChartContainer from '@/components/chart/ChartContainer'

// Mobile notice — shown below 768px
function MobileBanner() {
  return (
    <div
      className="md:hidden flex items-center justify-center gap-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-2"
      role="status"
      aria-label="Mobile notice"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        aria-hidden="true"
        className="text-[var(--color-text-secondary)] shrink-0"
      >
        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M6.5 5.5V9M6.5 4V4.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-[var(--color-text-secondary)] text-xs">
        Chart viewing only on mobile — switch to desktop for full trading tools
      </p>
    </div>
  )
}

export default function DashboardShell() {
  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)] overflow-hidden">
      <DashboardHeader />
      <MobileBanner />
      <div className="flex flex-1 min-h-0">
        <LeftToolbar />
        <ChartContainer />
        <RightPanel />
      </div>
    </div>
  )
}
