// prisma.config.ts
// Prisma 7 configuration file — connection URLs live here, not in schema.prisma.
// DIRECT_URL: used by Prisma CLI (migrate, db push, studio) — bypasses pooler.
// DATABASE_URL: used by PrismaClient at runtime — pooled connection (Neon PgBouncer).

import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // DIRECT_URL: Neon direct (non-pooled) connection — used by Prisma CLI.
    // DATABASE_URL: Neon pooled connection — used by PrismaClient at runtime.
    // Both must be set in .env.local before running migrate or generate.
    url: process.env.DIRECT_URL ?? '',
  },
})
