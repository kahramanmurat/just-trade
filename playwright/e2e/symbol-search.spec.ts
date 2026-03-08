import { test, expect } from '../fixtures/mock-data'

test.describe('Symbol Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Wait for dashboard to render
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })
  })

  test('searching and selecting a symbol updates the chart', async ({ page }) => {
    // Check initial symbol (AAPL by default)
    await expect(page.getByLabel(/Active symbol: AAPL/)).toBeVisible()

    // Open symbol search via keyboard
    await page.keyboard.press('/')
    await expect(page.getByRole('dialog', { name: 'Symbol search' })).toBeVisible()

    // Type to search for TSLA
    await page.getByLabel('Search symbols').fill('TSLA')

    // Select TSLA from results
    const tslaOption = page.getByRole('option', { name: /TSLA/ })
    await expect(tslaOption).toBeVisible()
    // Register response wait BEFORE clicking
    const ohlcvPromise = page.waitForResponse(
      (res) => res.url().includes('/api/ohlcv') && res.url().includes('TSLA') && res.status() === 200
    )

    await tslaOption.click()

    // Modal should close
    await expect(page.getByRole('dialog', { name: 'Symbol search' })).not.toBeVisible()

    // Header should now show TSLA
    await expect(page.getByLabel(/Active symbol: TSLA/)).toBeVisible()

    // Wait for new OHLCV data to load for TSLA
    await ohlcvPromise
  })

  test('symbol search filters results', async ({ page }) => {
    // Click the symbol chip to open search (more reliable than keyboard /)
    await page.getByLabel(/Active symbol/).click()
    await expect(page.getByRole('dialog', { name: 'Symbol search' })).toBeVisible()

    // Type partial match
    await page.getByLabel('Search symbols').fill('BTC')

    // Wait for results to update — at least one result should show
    const options = page.getByRole('option')
    await expect(options.first()).toBeVisible({ timeout: 5000 })

    // All visible results should contain BTC
    const count = await options.count()
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent()
      expect(text?.toUpperCase()).toContain('BTC')
    }
  })

  test('timeframe change triggers new data fetch', async ({ page }) => {
    // Click 1h timeframe
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ohlcv') && res.url().includes('timeframe=1h')
    )

    await page.getByLabel('Set timeframe to 1h').click()

    // Verify the 1h button is now pressed
    await expect(page.getByLabel('Set timeframe to 1h')).toHaveAttribute('aria-pressed', 'true')

    // Verify OHLCV request was made with the new timeframe
    await responsePromise
  })

  test('keyboard navigation in symbol search', async ({ page }) => {
    await page.keyboard.press('/')

    // Navigate down with arrow keys
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')

    // Press Enter to select
    await page.keyboard.press('Enter')

    // Modal should close (symbol was selected)
    await expect(page.getByRole('dialog', { name: 'Symbol search' })).not.toBeVisible()
  })
})
