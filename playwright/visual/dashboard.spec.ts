import { test, expect } from '@playwright/test'

test.describe('Visual Regression — Dashboard', () => {
  test('dashboard at 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Wait for chart to render
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })
    // Small extra wait for animations to settle
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('dashboard-1440x900.png', {
      maxDiffPixelRatio: 0.001,
      fullPage: false,
    })
  })

  test('dashboard at 1024x768', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('dashboard-1024x768.png', {
      maxDiffPixelRatio: 0.001,
      fullPage: false,
    })
  })

  test('symbol search modal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard')
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })

    // Open symbol search
    await page.keyboard.press('/')
    await expect(page.getByRole('dialog', { name: 'Symbol search' })).toBeVisible()
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('symbol-search-modal.png', {
      maxDiffPixelRatio: 0.001,
      fullPage: false,
    })
  })

  test('watchlist panel populated', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard')
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })

    // Ensure watchlist tab is selected
    await page.getByRole('tab', { name: /watchlist/i }).click()
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('watchlist-panel.png', {
      maxDiffPixelRatio: 0.001,
      fullPage: false,
    })
  })
})
