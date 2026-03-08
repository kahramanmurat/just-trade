import { test, expect } from '../fixtures/mock-data'

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('AI panel opens when clicking AI button', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    await expect(page.getByRole('dialog', { name: 'AI Assistant' })).toBeVisible()
    await expect(page.getByLabel('Chat message')).toBeVisible()
    await expect(page.getByLabel('Send message')).toBeVisible()
    await expect(page.getByText('JustTrade AI')).toBeVisible()
    await expect(page.getByText('BETA')).toBeVisible()
  })

  test('AI panel closes with close button', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()
    await expect(page.getByRole('dialog', { name: 'AI Assistant' })).toBeVisible()

    await page.getByLabel('Close AI assistant').click()
    await expect(page.getByRole('dialog', { name: 'AI Assistant' })).not.toBeVisible()
  })

  test('quick prompts are visible when chat is empty', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    await expect(page.getByRole('button', { name: 'Summarize my current chart setup' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'What do the active indicators suggest?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Summarize my watchlist' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Explain the current timeframe choice' })).toBeVisible()
    await expect(page.getByText('Ask about your chart, indicators, or watchlist.')).toBeVisible()
  })

  test('sending a message shows user message and gets AI response', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()
    await page.getByLabel('Chat message').fill('What does my chart show?')

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ai/chat') && res.request().method() === 'POST'
    )

    await page.getByLabel('Send message').click()

    // User message appears in chat
    await expect(page.getByText('What does my chart show?')).toBeVisible()

    // Input cleared after sending
    await expect(page.getByLabel('Chat message')).toHaveValue('')

    // API responds (mocked — instant)
    const response = await responsePromise
    expect(response.status()).toBe(200)

    // AI reply appears in chat (from mock)
    await expect(page.getByText(/informational analysis only/)).toBeVisible({ timeout: 5000 })
  })

  test('sending a message via Enter key', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    const chatInput = page.getByLabel('Chat message')
    await chatInput.fill('Analyze the trend')

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ai/chat') && res.request().method() === 'POST'
    )

    await chatInput.press('Enter')

    await expect(page.getByText('Analyze the trend')).toBeVisible()

    const response = await responsePromise
    expect(response.status()).toBe(200)
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    await expect(page.getByLabel('Send message')).toBeDisabled()

    await page.getByLabel('Chat message').fill('test')
    await expect(page.getByLabel('Send message')).toBeEnabled()

    await page.getByLabel('Chat message').fill('')
    await expect(page.getByLabel('Send message')).toBeDisabled()
  })

  test('quick prompt sends a message and hides quick prompts', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ai/chat') && res.request().method() === 'POST'
    )

    await page.getByRole('button', { name: 'Summarize my current chart setup' }).click()

    // Quick prompt text appears as user message
    await expect(page.getByText('Summarize my current chart setup').first()).toBeVisible()

    // Quick prompts disappear after message sent
    await expect(page.getByRole('button', { name: 'What do the active indicators suggest?' })).not.toBeVisible()

    const response = await responsePromise
    expect(response.status()).toBe(200)
  })

  test('clear button appears after messages and clears chat', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    // Clear button not visible when empty
    await expect(page.getByLabel('Clear chat')).not.toBeVisible()

    // Send a message
    await page.getByLabel('Chat message').fill('Hello')

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ai/chat') && res.request().method() === 'POST'
    )

    await page.getByLabel('Send message').click()
    await responsePromise

    // Clear button appears after message
    await expect(page.getByLabel('Clear chat')).toBeVisible()

    // Click clear
    await page.getByLabel('Clear chat').click()

    // Messages gone, quick prompts reappear
    await expect(page.getByText('Ask about your chart, indicators, or watchlist.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Summarize my current chart setup' })).toBeVisible()
  })

  test('disclaimer text is visible', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    await expect(
      page.getByText('AI analysis is informational only — not financial advice.')
    ).toBeVisible()
  })

  test('AI panel auto-focuses chat input on open', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    await expect(page.getByRole('dialog', { name: 'AI Assistant' })).toBeVisible()
    await expect(page.getByLabel('Chat message')).toBeFocused()
  })
})
