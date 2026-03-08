import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Load .env from project root
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const root = path.resolve(__dirname, '..')
loadEnvFile(path.join(root, '.env'))
loadEnvFile(path.join(root, '.env.local'))

// Must run serially
setup.describe.configure({ mode: 'serial' })

const authFile = path.join(__dirname, '.clerk', 'user.json')

setup('configure Clerk testing', async ({}) => {
  await clerkSetup()
})

setup('authenticate and save state', async ({ page }) => {
  const emailAddress = process.env.E2E_CLERK_USER_USERNAME

  if (!emailAddress) {
    console.warn(
      '[setup] E2E_CLERK_USER_USERNAME not set. ' +
      'Creating empty auth state — authenticated tests will be redirected to sign-in.'
    )
    const dir = path.dirname(authFile)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  // Navigate to an unprotected page that loads Clerk
  await page.goto('/')

  // Use email-based sign-in: creates a sign-in token via Backend API (CLERK_SECRET_KEY),
  // then uses the "ticket" strategy to sign in on the client.
  // This bypasses password entry, device verification, and bot detection.
  await clerk.signIn({
    page,
    emailAddress,
  } as Parameters<typeof clerk.signIn>[0])

  // Navigate to dashboard to confirm auth works
  await page.goto('/dashboard')
  await page.waitForURL('**/dashboard**', { timeout: 30000 })

  // Save the authenticated state
  const dir = path.dirname(authFile)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  await page.context().storageState({ path: authFile })
})
