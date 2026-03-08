# Release Runbook — JustTrade

This document provides the step-by-step process for releasing JustTrade to production. Follow every step in order. Do not skip steps.

---

## Release Cadence

- **Regular releases:** Weekly (Thursday)
- **Hotfixes:** As needed (P0/P1 bugs only)

---

## Pre-Release Checklist

### 1. Code Freeze

- [ ] All feature PRs for this release are merged to `main`
- [ ] No open P0 or P1 bugs against features in this release
- [ ] `main` branch is green in CI

### 2. Create Release Branch

```bash
git checkout main
git pull origin main
git checkout -b release/vX.Y.Z
git push -u origin release/vX.Y.Z
```

### 3. Run Full Test Suite Locally

```bash
pnpm install
pnpm prisma generate
pnpm lint
pnpm tsc --noEmit
pnpm test --coverage
pnpm test:e2e
pnpm test:a11y
pnpm test:visual
```

All must pass. If any fail, fix on the release branch.

### 4. Deploy to Staging

- [ ] Push release branch to staging: `git push origin release/vX.Y.Z:staging`
- [ ] Verify Vercel deploys the staging environment at `https://staging.justtrade.app`
- [ ] Run database migration on staging: `pnpm prisma migrate deploy`

### 5. Staging Smoke Tests

- [ ] Sign up new user → dashboard loads → default watchlist created
- [ ] Symbol search returns results within 500ms
- [ ] Chart loads for AAPL 1D
- [ ] Watchlist add/remove works
- [ ] WebSocket connects (connection status shows "Live")
- [ ] Stripe Checkout flow works (test mode card: `4242 4242 4242 4242`)
- [ ] Run E2E suite against staging: `pnpm test:e2e --env staging`

### 6. QA Sign-Off

- [ ] QA Agent completes sign-off template from `/docs/QA_ACCEPTANCE.md`
- [ ] Sign-off recorded in release PR description

---

## Release Process

### 7. Create Release PR

```bash
gh pr create \
  --base main \
  --head release/vX.Y.Z \
  --title "Release vX.Y.Z" \
  --body "## Release vX.Y.Z

### Changes
- [List of changes from merged PRs]

### QA Sign-Off
- [x] All automated tests pass
- [x] Staging smoke tests pass
- [x] QA Agent sign-off complete

### Rollback Plan
- Revert to previous Vercel deployment
- Database rollback SQL ready (if migrations included)
"
```

### 8. Merge to Main

- [ ] PR approved by at least one reviewer
- [ ] CI passes on the release PR
- [ ] Merge the PR (squash merge preferred)

### 9. Verify Production Deployment

- [ ] Vercel deploys from `main` automatically
- [ ] Check Vercel deployment logs for errors
- [ ] Run production smoke test:
  - Visit `https://justtrade.app`
  - Sign in with test account
  - Verify dashboard loads
  - Verify chart renders
  - Verify watchlist loads

### 10. Post-Release

- [ ] Tag the release: `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] Monitor error rates for 30 minutes
- [ ] Notify team of successful release

---

## Database Migration Release

If the release includes Prisma schema changes:

### Before Merge
1. Review migration SQL in `prisma/migrations/`
2. Verify rollback SQL is documented in migration comment
3. Test migration on staging Neon branch
4. Verify all indexes present post-migration

### During Release
1. Vercel build runs `prisma generate` automatically
2. Run `prisma migrate deploy` against production Neon:
   ```bash
   DATABASE_URL=<production_url> pnpm prisma migrate deploy
   ```
3. Verify migration applied: check Neon dashboard for migration status

### Rollback (if needed)
1. Apply rollback SQL from migration comment
2. Revert Vercel to previous deployment
3. Verify app functions with rolled-back schema

---

## Hotfix Process

For P0/P1 bugs in production:

1. Create hotfix branch from `main`:
   ```bash
   git checkout main && git pull
   git checkout -b hotfix/description
   ```
2. Fix the bug with tests
3. Run `pnpm test` and `pnpm lint`
4. Create PR → fast-track review → merge
5. Verify production deployment
6. Cherry-pick to `staging` if needed

---

## Rollback Procedure

### Application Rollback (Vercel)
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Click "..." → "Promote to Production"
4. Verify the rollback is live

### Database Rollback
1. Connect to Neon production database
2. Apply the rollback SQL from the migration file's comment block
3. Verify data integrity with spot queries
4. Redeploy the previous application version (which expects the old schema)

### Full Rollback Checklist
- [ ] Application rolled back on Vercel
- [ ] Database rolled back (if migration was part of release)
- [ ] Stripe webhooks still functional (webhook endpoint didn't change)
- [ ] Clerk webhooks still functional
- [ ] Redis cache cleared if schema changed: flush relevant key patterns
- [ ] Team notified of rollback and reason

---

## Environment Variable Updates

When adding new environment variables:

1. Add to `.env.example` with description
2. Add to Vercel project settings (production + preview)
3. Add to staging environment
4. Add mock value to `.github/workflows/ci.yml`
5. Update `docs/DEPLOYMENT.md`
6. Document in release PR description

---

## Monitoring After Release

### First 30 Minutes
- Watch Vercel function invocation logs for errors
- Check browser console on production for client-side errors
- Verify API response times are normal
- Verify Stripe webhook delivery (Stripe Dashboard → Webhooks → Recent events)

### First 24 Hours
- Monitor error rate trends
- Check Redis cache hit rates
- Verify no increase in 429 (rate limit) responses
- Check Clerk webhook delivery logs

---

## Release Version Scheme

`vMAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes (API contract changes, schema migrations with data loss)
- **MINOR:** New features, non-breaking schema migrations
- **PATCH:** Bug fixes, documentation updates, dependency bumps
