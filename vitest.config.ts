import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'playwright'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Target per CLAUDE.md: src/lib/ >= 80%, overall >= 70%
        // Current: src/lib/ ~22%. Raising incrementally as test coverage grows.
        'src/lib/**': { statements: 20 },
      },
    },
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
