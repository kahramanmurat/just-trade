'use client'

import { useState } from 'react'
import { useSubscriptionStore } from '@/lib/store/subscriptionStore'

export function UpgradeBadge() {
  const plan = useSubscriptionStore((s) => s.plan)
  const [loading, setLoading] = useState(false)

  if (plan !== 'free') {
    return (
      <ManageBillingButton />
    )
  }

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      if (!res.ok) return
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[var(--color-accent)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
      aria-label="Upgrade to Pro"
    >
      {loading ? '...' : 'Upgrade'}
    </button>
  )
}

function ManageBillingButton() {
  const plan = useSubscriptionStore((s) => s.plan)
  const [loading, setLoading] = useState(false)

  const handleManage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
      })
      if (!res.ok) return
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
      aria-label="Manage billing"
    >
      <span className="text-[var(--color-up)] font-mono uppercase">{plan}</span>
    </button>
  )
}

export function UpgradePrompt({ feature, limit }: { feature: string; limit: number }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      if (!res.ok) return
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-3 py-2 bg-[var(--color-accent)]/5 border-b border-[var(--color-border)]">
      <p className="text-[var(--color-text-secondary)] text-[10px] leading-relaxed">
        {limit === 0
          ? `${feature} require a Pro plan.`
          : `${feature} limit reached (${limit}).`}
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="mt-1 text-[var(--color-accent)] text-[10px] font-medium hover:underline disabled:opacity-50"
      >
        {loading ? '...' : 'Upgrade to Pro'}
      </button>
    </div>
  )
}
