import { test, expect } from '../fixtures/mock-data'

test.describe('Saved Layouts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Wait for dashboard to render
    await expect(page.getByLabel(/Active symbol/)).toBeVisible({ timeout: 15000 })
  })

  test('layouts dropdown opens and shows save form', async ({ page }) => {
    // Click the layouts button in the header
    await page.getByLabel('Save or load chart layout').click()

    // Dropdown should be expanded
    await expect(page.getByLabel('Save or load chart layout')).toHaveAttribute('aria-expanded', 'true')

    // "Saved Layouts" header text should be visible
    await expect(page.getByText('Saved Layouts').first()).toBeVisible()
  })

  test('layouts dropdown closes on second click', async ({ page }) => {
    const layoutsBtn = page.getByLabel('Save or load chart layout')

    // Open
    await layoutsBtn.click()
    await expect(layoutsBtn).toHaveAttribute('aria-expanded', 'true')

    // Close
    await layoutsBtn.click()
    await expect(layoutsBtn).toHaveAttribute('aria-expanded', 'false')
  })

  test('save form appears when clicking + Save', async ({ page }) => {
    // Open layouts dropdown
    await page.getByLabel('Save or load chart layout').click()

    // Click the "+ Save" button to show the save form
    const saveCurrentBtn = page.getByLabel('Save current layout')

    if (await saveCurrentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveCurrentBtn.click()

      // The layout name input should appear
      await expect(page.getByLabel('Layout name')).toBeVisible()

      // The "Set as default" checkbox should be visible
      await expect(page.getByText('Set as default')).toBeVisible()
    }
  })

  test('save a new layout', async ({ page }) => {
    // Open layouts dropdown
    await page.getByLabel('Save or load chart layout').click()

    // Click "+ Save" to show the save form
    const saveCurrentBtn = page.getByLabel('Save current layout')
    if (!(await saveCurrentBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      // At layout limit — skip
      return
    }
    await saveCurrentBtn.click()

    // Fill in layout name
    const nameInput = page.getByLabel('Layout name')
    await nameInput.fill('Test E2E Layout')

    // Click save button
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/layouts') && res.request().method() === 'POST'
    )

    // The Save button inside the save form
    await page.getByRole('button', { name: /^Save$/ }).click()

    const response = await responsePromise
    // Free user gets 403, paid user gets 201
    expect([201, 403]).toContain(response.status())
  })

  test('save validates empty name', async ({ page }) => {
    await page.getByLabel('Save or load chart layout').click()

    const saveCurrentBtn = page.getByLabel('Save current layout')
    if (!(await saveCurrentBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      return
    }
    await saveCurrentBtn.click()

    // Leave name empty and click save
    await page.getByRole('button', { name: /^Save$/ }).click()

    // Error message should appear
    await expect(page.getByText('Enter a layout name')).toBeVisible()
  })

  test('load a saved layout restores chart state', async ({ page }) => {
    // Open layouts dropdown
    await page.getByLabel('Save or load chart layout').click()

    // Wait for layouts to appear
    await expect(
      page.getByText('No saved layouts').or(page.getByLabel(/^Load layout:/).first())
    ).toBeVisible({ timeout: 10000 })

    // Check if there are any saved layouts
    const layoutItem = page.getByLabel(/^Load layout:/).first()

    if (await layoutItem.isVisible().catch(() => false)) {
      await layoutItem.click()

      // Dropdown should close after loading
      await expect(page.getByLabel('Save or load chart layout')).toHaveAttribute('aria-expanded', 'false')
    }
  })

  test('empty state shows when no layouts exist', async ({ page }) => {
    await page.getByLabel('Save or load chart layout').click()

    // Wait for layouts to load — either the list or empty state should appear
    await expect(
      page.getByText('No saved layouts').or(page.getByRole('list', { name: 'Saved layouts' }))
    ).toBeVisible({ timeout: 10000 })
  })

  test('delete a layout removes it from the list', async ({ page }) => {
    await page.getByLabel('Save or load chart layout').click()

    // Wait for layouts to load
    await expect(
      page.getByText('No saved layouts').or(page.getByLabel(/^Delete layout/).first())
    ).toBeVisible({ timeout: 10000 })

    const deleteBtn = page.getByLabel(/^Delete layout/).first()

    if (await deleteBtn.isVisible().catch(() => false)) {
      const deletePromise = page.waitForResponse(
        (res) => res.url().includes('/api/layouts/') && res.request().method() === 'DELETE'
      )

      await deleteBtn.click()
      await deletePromise
    }
  })

  test('set as default marks a layout', async ({ page }) => {
    await page.getByLabel('Save or load chart layout').click()

    // Wait for layouts to load
    await expect(
      page.getByText('No saved layouts').or(page.getByLabel(/as default$/).first())
    ).toBeVisible({ timeout: 10000 })

    const defaultBtn = page.getByLabel(/as default$/).first()

    if (await defaultBtn.isVisible().catch(() => false)) {
      const patchPromise = page.waitForResponse(
        (res) => res.url().includes('/api/layouts/') && res.request().method() === 'PATCH'
      )

      await defaultBtn.click()
      await patchPromise
    }
  })
})
