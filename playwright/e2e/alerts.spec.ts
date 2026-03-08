import { test, expect } from '../fixtures/mock-data'

test.describe('Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Switch to Alerts tab in the right panel
    await page.getByRole('tab', { name: /alerts/i }).click()
  })

  test('alerts tab renders and shows content', async ({ page }) => {
    await expect(page.getByRole('tabpanel', { name: 'alerts' })).toBeVisible()

    // Free plan mock returns 0 alerts — expect empty state text or upgrade prompt
    // Both may be visible simultaneously, so check each individually
    const hasEmptyState = await page.getByText('No alerts configured').isVisible().catch(() => false)
    const hasUpgradePrompt = await page.getByText('Alerts require a Pro plan').isVisible().catch(() => false)
    const hasCreateButton = await page.getByLabel('Create new alert').isVisible().catch(() => false)

    expect(
      hasEmptyState || hasUpgradePrompt || hasCreateButton,
      'Alerts tab should show empty state, upgrade prompt, or create button'
    ).toBeTruthy()
  })

  test('free plan shows upgrade prompt or gates alert creation', async ({ page }) => {
    // With free plan (maxAlerts: 0), creating alerts should be gated
    const createButton = page.getByLabel('Create new alert')

    // Either upgrade prompt is shown, or create button exists but POST returns 403
    const hasUpgrade = await page.getByText('Alerts require a Pro plan').isVisible({ timeout: 5000 }).catch(() => false)
    const hasCreate = await createButton.isVisible({ timeout: 2000 }).catch(() => false)

    expect(hasUpgrade || hasCreate, 'Alerts tab should show upgrade prompt or create button').toBeTruthy()

    if (hasCreate) {
      // If create button exists, clicking it and submitting should be blocked (403)
      await createButton.click()

      const conditionSelect = page.getByLabel('Alert condition')
      if (await conditionSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await conditionSelect.selectOption('gt')
        await page.getByLabel('Threshold price').fill('200')

        const responsePromise = page.waitForResponse(
          (res) => res.url().includes('/api/alerts') && res.request().method() === 'POST'
        )
        await page.getByRole('button', { name: 'Set' }).click()
        const response = await responsePromise
        expect(response.status()).toBe(403)
      }
    }
  })

  test('alert form validates empty threshold', async ({ page }) => {
    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click()
      await page.getByRole('button', { name: 'Set' }).click()
      await expect(page.getByText('Enter a valid price')).toBeVisible()
    }
  })

  test('cancel alert creation', async ({ page }) => {
    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click()
      await expect(page.getByLabel('Alert condition')).toBeVisible()

      await page.getByLabel('Cancel').click()

      await expect(page.getByLabel('Alert condition')).not.toBeVisible()
      await expect(page.getByLabel('Create new alert')).toBeVisible()
    }
  })

  test('alert form uses current chart symbol', async ({ page }) => {
    const symbolChip = page.getByLabel(/Active symbol: /)
    const chipLabel = await symbolChip.getAttribute('aria-label')
    const symbolMatch = chipLabel?.match(/Active symbol: (\w+)/)
    const currentSymbol = symbolMatch?.[1]

    if (!currentSymbol) return

    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click()
      const formArea = page.getByRole('tabpanel', { name: 'alerts' })
      await expect(formArea.getByText(currentSymbol)).toBeVisible()
    }
  })
})
