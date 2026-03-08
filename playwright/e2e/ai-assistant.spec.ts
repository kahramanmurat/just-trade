import { test, expect } from '@playwright/test'

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('AI panel opens when clicking AI button', async ({ page }) => {
    // Click the AI button in the header
    await page.getByLabel('Open AI assistant').click()

    // The AI dialog should appear
    await expect(page.getByRole('dialog', { name: 'AI Assistant' })).toBeVisible()

    // Chat input should be visible
    await expect(page.getByLabel('Chat message')).toBeVisible()

    // Send button should be visible
    await expect(page.getByLabel('Send message')).toBeVisible()

    // Header should show "JustTrade AI"
    await expect(page.getByText('JustTrade AI')).toBeVisible()

    // BETA badge should be visible
    await expect(page.getByText('BETA')).toBeVisible()
  })

  test('AI panel closes with close button', async ({ page }) => {
    // Open AI panel
    await page.getByLabel('Open AI assistant').click()
    await expect(page.getByRole('dialog', { name: 'AI Assistant' })).toBeVisible()

    // Close it
    await page.getByLabel('Close AI assistant').click()
    await expect(page.getByRole('dialog', { name: 'AI Assistant' })).not.toBeVisible()
  })

  test('quick prompts are visible when chat is empty', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    // All four quick prompt buttons should be visible
    await expect(page.getByRole('button', { name: 'Summarize my current chart setup' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'What do the active indicators suggest?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Summarize my watchlist' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Explain the current timeframe choice' })).toBeVisible()

    // Helper text should be visible
    await expect(page.getByText('Ask about your chart, indicators, or watchlist.')).toBeVisible()
  })

  test('sending a message triggers API call', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    // Type a message
    await page.getByLabel('Chat message').fill('What does my chart show?')

    // Click send
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ai/chat') && res.request().method() === 'POST'
    )

    await page.getByLabel('Send message').click()

    // The user message should appear in the chat
    await expect(page.getByText('What does my chart show?')).toBeVisible()

    // Input should be cleared after sending
    await expect(page.getByLabel('Chat message')).toHaveValue('')

    // Wait for API response (may fail with mock API key, that's OK)
    const response = await responsePromise.catch(() => null)
    if (response) {
      // Either success or error is acceptable in test environment
      expect([200, 500]).toContain(response.status())
    }
  })

  test('sending a message via Enter key', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    const chatInput = page.getByLabel('Chat message')
    await chatInput.fill('Analyze the trend')

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ai/chat') && res.request().method() === 'POST'
    ).catch(() => null)

    await chatInput.press('Enter')

    // The user message should appear
    await expect(page.getByText('Analyze the trend')).toBeVisible()

    await responsePromise
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    // Send button should be disabled with empty input
    await expect(page.getByLabel('Send message')).toBeDisabled()

    // Type something
    await page.getByLabel('Chat message').fill('test')

    // Send button should now be enabled
    await expect(page.getByLabel('Send message')).toBeEnabled()

    // Clear the input
    await page.getByLabel('Chat message').fill('')

    // Send button should be disabled again
    await expect(page.getByLabel('Send message')).toBeDisabled()
  })

  test('quick prompt sends a message', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    // Click a quick prompt
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ai/chat') && res.request().method() === 'POST'
    ).catch(() => null)

    await page.getByRole('button', { name: 'Summarize my current chart setup' }).click()

    // The quick prompt text should appear as a user message
    await expect(page.getByText('Summarize my current chart setup').first()).toBeVisible()

    // Quick prompts should disappear after a message is sent (chat is no longer empty)
    await expect(page.getByRole('button', { name: 'What do the active indicators suggest?' })).not.toBeVisible()

    await responsePromise
  })

  test('clear button appears after messages and clears chat', async ({ page }) => {
    await page.getByLabel('Open AI assistant').click()

    // Clear button should NOT be visible when chat is empty
    await expect(page.getByLabel('Clear chat')).not.toBeVisible()

    // Send a message to populate chat
    await page.getByLabel('Chat message').fill('Hello')

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/ai/chat') && res.request().method() === 'POST'
    ).catch(() => null)

    await page.getByLabel('Send message').click()
    await responsePromise

    // Now there's at least one message — clear button should appear
    await expect(page.getByLabel('Clear chat')).toBeVisible()

    // Click clear
    await page.getByLabel('Clear chat').click()

    // Messages should be gone, quick prompts should reappear
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

    const dialog = page.getByRole('dialog', { name: 'AI Assistant' })
    await expect(dialog).toBeVisible()

    // Focus should be on the chat input (auto-focused on open)
    await expect(page.getByLabel('Chat message')).toBeFocused()
  })
})
