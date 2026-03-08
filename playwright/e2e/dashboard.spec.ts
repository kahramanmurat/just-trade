import { test, expect } from '../fixtures/mock-data'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('dashboard renders all main regions', async ({ page }) => {
    // Header should be visible with the active symbol
    await expect(page.getByLabel(/Active symbol/)).toBeVisible()

    // Timeframe buttons should be visible (at least the 1D button)
    await expect(page.getByLabel('Set timeframe to 1D')).toBeVisible()

    // Right panel should have tabs
    await expect(page.getByRole('tab', { name: /Watchlist/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Alerts/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Indicators/i })).toBeVisible()
  })

  test('chart loads with OHLCV data', async ({ page }) => {
    // OHLCV legend should be visible (proves chart rendered with data)
    await expect(page.getByLabel('OHLCV legend')).toBeVisible({ timeout: 15000 })
  })

  test('connection status shows live indicator', async ({ page }) => {
    // Wait for tick simulator to connect
    await expect(page.getByLabel(/Connection: Live/)).toBeVisible({ timeout: 5000 })
  })

  test('symbol search opens with keyboard shortcut', async ({ page }) => {
    // Press / to open symbol search
    await page.keyboard.press('/')

    // Modal should appear
    await expect(page.getByRole('dialog', { name: 'Symbol search' })).toBeVisible()

    // Search input should be focused
    await expect(page.getByLabel('Search symbols')).toBeFocused()

    // Press Escape to close
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Symbol search' })).not.toBeVisible()
  })
})
