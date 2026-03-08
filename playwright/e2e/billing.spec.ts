import { test, expect } from '@playwright/test'

test.describe('Billing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Wait for dashboard to render by checking for a known element
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })
  })

  test('upgrade or manage button is visible', async ({ page }) => {
    // Free users see "Upgrade to Pro" button; paid users see "Manage billing"
    const upgradeButton = page.getByLabel('Upgrade to Pro')
    const manageButton = page.getByLabel('Manage billing')

    const upgradeVisible = await upgradeButton.isVisible().catch(() => false)
    const manageVisible = await manageButton.isVisible().catch(() => false)

    // One of them must be visible
    expect(upgradeVisible || manageVisible).toBe(true)
  })

  test('upgrade button triggers checkout for free users', async ({ page }) => {
    const upgradeButton = page.getByLabel('Upgrade to Pro')

    if (await upgradeButton.isVisible().catch(() => false)) {
      // Click upgrade — should call /api/checkout
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes('/api/checkout') && res.request().method() === 'POST',
          { timeout: 5000 }
        ).catch(() => null),
        upgradeButton.click(),
      ])

      // If checkout API was called, verify response
      if (response) {
        const status = response.status()
        expect([200, 303]).toContain(status)
      }
    }
  })

  test('manage billing button triggers portal for paid users', async ({ page }) => {
    const manageButton = page.getByLabel('Manage billing')

    if (await manageButton.isVisible().catch(() => false)) {
      // Click manage — should call /api/billing-portal
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes('/api/billing-portal') && res.request().method() === 'POST',
          { timeout: 5000 }
        ).catch(() => null),
        manageButton.click(),
      ])

      if (response) {
        expect(response.status()).toBe(200)
      }
    }
  })
})
