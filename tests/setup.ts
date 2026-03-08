// Vitest global setup — runs before all test suites.

import { vi } from 'vitest'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock'
process.env.CLERK_SECRET_KEY = 'sk_test_mock'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock'
process.env.ANTHROPIC_API_KEY = 'sk-ant-test'

// Silence console.error in tests unless explicitly needed
vi.spyOn(console, 'error').mockImplementation(() => {})
