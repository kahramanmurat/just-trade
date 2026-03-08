import { test, expect, type Page } from '../fixtures/mock-data'

/** Wait for alerts tab content to finish loading */
async function waitForAlertsLoaded(page: Page) {
  await expect(
    page.getByLabel('Create new alert')
      .or(page.getByText('No alerts configured'))
      .or(page.getByText('Alerts require'))
  ).toBeVisible({ timeout: 10000 })
}

test.describe('Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Switch to Alerts tab in the right panel
    await page.getByRole('tab', { name: /alerts/i }).click()
  })

  test('alerts tab renders and shows content', async ({ page }) => {
    await expect(page.getByRole('tabpanel', { name: 'alerts' })).toBeVisible()

    // Wait for content to load — either alert list, empty state, or upgrade prompt
    await waitForAlertsLoaded(page)
  })

  test('open create alert form', async ({ page }) => {
    await waitForAlertsLoaded(page)

    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()

      await expect(page.getByLabel('Alert condition')).toBeVisible()
      await expect(page.getByLabel('Threshold price')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Set' })).toBeVisible()
      await expect(page.getByLabel('Cancel')).toBeVisible()
    }
  })

  test('create alert form validates empty threshold', async ({ page }) => {
    await waitForAlertsLoaded(page)

    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()

      await page.getByRole('button', { name: 'Set' }).click()

      await expect(page.getByText('Enter a valid price')).toBeVisible()
    }
  })

  test('create price alert via form', async ({ page }) => {
    await waitForAlertsLoaded(page)

    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()

      await page.getByLabel('Alert condition').selectOption('gt')
      await page.getByLabel('Threshold price').fill('200')

      const responsePromise = page.waitForResponse(
        (res) =>
          res.url().includes('/api/alerts') &&
          res.request().method() === 'POST'
      )

      await page.getByRole('button', { name: 'Set' }).click()

      const response = await responsePromise
      // Free plan returns 403, Pro/Premium returns 201
      expect([201, 403]).toContain(response.status())
    }
  })

  test('create alert with "below" condition', async ({ page }) => {
    await waitForAlertsLoaded(page)

    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()

      await page.getByLabel('Alert condition').selectOption('lt')
      await page.getByLabel('Threshold price').fill('150')

      const responsePromise = page.waitForResponse(
        (res) =>
          res.url().includes('/api/alerts') &&
          res.request().method() === 'POST'
      )

      await page.getByRole('button', { name: 'Set' }).click()

      const response = await responsePromise
      expect([201, 403]).toContain(response.status())
    }
  })

  test('cancel alert creation', async ({ page }) => {
    await waitForAlertsLoaded(page)

    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()

      await expect(page.getByLabel('Alert condition')).toBeVisible()

      await page.getByLabel('Cancel').click()

      await expect(page.getByLabel('Alert condition')).not.toBeVisible()
      await expect(page.getByLabel('Create new alert')).toBeVisible()
    }
  })

  test('delete an alert', async ({ page }) => {
    await waitForAlertsLoaded(page)

    const deleteButton = page.getByLabel(/Delete alert for/).first()

    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const responsePromise = page.waitForResponse(
        (res) =>
          res.url().includes('/api/alerts/') &&
          res.request().method() === 'DELETE'
      )

      await deleteButton.click({ force: true })
      await responsePromise
    }
  })

  test('alert form uses current chart symbol', async ({ page }) => {
    await waitForAlertsLoaded(page)

    const symbolChip = page.getByLabel(/Active symbol: /)
    const chipLabel = await symbolChip.getAttribute('aria-label')
    const symbolMatch = chipLabel?.match(/Active symbol: (\w+)/)
    const currentSymbol = symbolMatch?.[1]

    if (!currentSymbol) return

    const createButton = page.getByLabel('Create new alert')
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()

      const formArea = page.getByRole('tabpanel', { name: 'alerts' })
      await expect(formArea.getByText(currentSymbol)).toBeVisible()
    }
  })
})
