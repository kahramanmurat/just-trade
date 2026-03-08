import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Audits', () => {
  test('sign-in page has no critical or serious violations', async ({ browser }) => {
    // Use fresh context without auth state for sign-in page
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/sign-in')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')
    const serious = results.violations.filter(v => v.impact === 'serious')

    if (critical.length > 0 || serious.length > 0) {
      const summary = [...critical, ...serious].map(v =>
        `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n')
      console.log('A11y violations found:\n' + summary)
    }

    expect(critical, 'Critical a11y violations found').toHaveLength(0)
    expect(serious, 'Serious a11y violations found').toHaveLength(0)
    await context.close()
  })

  test('dashboard has no critical or serious violations', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Wait for chart and panels to render
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Exclude Clerk's injected elements and canvas (chart) from audit
      .exclude('#clerk-components')
      .exclude('canvas')
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')
    const serious = results.violations.filter(v => v.impact === 'serious')

    if (critical.length > 0 || serious.length > 0) {
      const summary = [...critical, ...serious].map(v =>
        `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n')
      console.log('A11y violations found:\n' + summary)
    }

    expect(critical, 'Critical a11y violations found').toHaveLength(0)
    expect(serious, 'Serious a11y violations found').toHaveLength(0)
  })

  test('symbol search modal has no critical or serious violations', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })

    // Open symbol search modal
    await page.keyboard.press('/')
    await expect(page.getByRole('dialog', { name: 'Symbol search' })).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('[role="dialog"]')
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')
    const serious = results.violations.filter(v => v.impact === 'serious')

    if (critical.length > 0 || serious.length > 0) {
      const summary = [...critical, ...serious].map(v =>
        `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n')
      console.log('A11y violations found:\n' + summary)
    }

    expect(critical, 'Critical a11y violations found').toHaveLength(0)
    expect(serious, 'Serious a11y violations found').toHaveLength(0)
  })
})
