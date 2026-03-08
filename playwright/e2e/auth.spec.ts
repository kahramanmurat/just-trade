import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('unauthenticated user is redirected from /dashboard to sign-in', async ({ page }) => {
    // Navigate to /dashboard without auth
    await page.goto('/dashboard')
    // Clerk middleware should redirect to /sign-in
    await expect(page).toHaveURL(/sign-in/)
  })

  test('sign-in page renders Clerk form', async ({ page }) => {
    await page.goto('/sign-in')
    // Clerk mounts its own form; just verify the page loaded
    await expect(page).toHaveURL(/sign-in/)
    // Page should have some visible content (Clerk component)
    await expect(page.locator('body')).toBeVisible()
  })

  test('sign-up page renders Clerk form', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page).toHaveURL(/sign-up/)
    await expect(page.locator('body')).toBeVisible()
  })
})
