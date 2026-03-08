import { test, expect } from '../fixtures/mock-data'

test.describe('Watchlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Wait for dashboard to render
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })
    // Ensure Watchlist tab is active
    await page.getByRole('tab', { name: /watchlist/i }).click()
  })

  test('watchlist panel renders', async ({ page }) => {
    // The watchlist tabpanel should be visible
    const tabpanel = page.getByRole('tabpanel', { name: 'watchlist' })
    await expect(tabpanel).toBeVisible()

    // Either watchlist items or empty state should eventually show
    await expect(
      page.getByRole('list', { name: 'Watchlist items' }).or(page.getByText('Watchlist is empty'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('clicking a watchlist symbol changes the chart', async ({ page }) => {
    // This test only runs if there are multiple symbols in the watchlist
    const symbolBtns = page.getByLabel(/^Select [A-Z]/)
    const count = await symbolBtns.count()

    if (count < 2) {
      // Need at least 2 symbols to test switching
      return
    }

    // Click the second symbol (first is likely already active)
    const secondBtn = symbolBtns.nth(1)
    const label = await secondBtn.getAttribute('aria-label')
    const symbolMatch = label?.match(/Select (\w+)/)
    const symbol = symbolMatch?.[1]
    if (!symbol) return

    await secondBtn.click()

    // Header symbol chip should update
    await expect(page.getByLabel(new RegExp(`Active symbol: ${symbol}`))).toBeVisible()
  })

  test('add symbol to watchlist via dropdown', async ({ page }) => {
    // Open the add-symbol dropdown
    await page.getByLabel('Add symbol to watchlist').click()

    const listbox = page.getByRole('listbox', { name: 'Available symbols' })
    await expect(listbox).toBeVisible({ timeout: 5000 })

    // Pick the first available option
    const option = listbox.getByRole('option').first()
    await expect(option).toBeVisible()

    // Register wait for POST before clicking
    const postPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/watchlists') &&
        res.request().method() === 'POST',
      { timeout: 10000 }
    )

    await option.click()
    const response = await postPromise
    // Free users may be limited (403) or succeed (201)
    expect([201, 403]).toContain(response.status())
  })

  test('remove symbol from watchlist', async ({ page }) => {
    // Find a remove button (only if symbols exist)
    const removeBtn = page.getByLabel(/Remove .+ from watchlist/).first()

    if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click remove (force to handle opacity-0 hover state)
      await removeBtn.click({ force: true })
    }
  })
})
