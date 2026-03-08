# Database Schema — JustTrade

**ORM:** Prisma
**Database:** PostgreSQL (Neon managed)
**Convention:** snake_case for table and column names, UUIDs as primary keys

---

## Entity Relationship Overview

```
users
  └── subscriptions (1:1)
  └── watchlists (1:many)
        └── watchlist_items (1:many)
  └── alerts (1:many)
        └── alert_rules (1:many)
  └── saved_layouts (1:many)
        └── chart_drawings (1:many)
        └── indicators (1:many)
```

---

## Tables

### `users`

Synced from Clerk on first login via webhook.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Internal user ID |
| `clerk_id` | `VARCHAR(255)` | UNIQUE, NOT NULL | Clerk's user ID (`user_2abc...`) |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | From Clerk |
| `name` | `VARCHAR(255)` | NULLABLE | Display name |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_users_clerk_id` on `clerk_id` (used on every authenticated request)

---

### `subscriptions`

One row per user. **Created by the Clerk `user.created` webhook handler on first login** (with `plan = 'free'`, `status = 'active'`, and a Stripe customer object created via the Stripe API at the same time). Updated by Stripe webhooks when the user subscribes, upgrades, downgrades, or cancels. A subscription row always exists for every user — never assume absence means Free; always query this table directly.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `user_id` | `UUID` | FK → `users.id`, ON DELETE CASCADE | |
| `stripe_customer_id` | `VARCHAR(255)` | UNIQUE, NOT NULL | Stripe customer identifier |
| `stripe_subscription_id` | `VARCHAR(255)` | UNIQUE, NULLABLE | Null until subscribed |
| `plan` | `ENUM('free', 'pro', 'premium')` | NOT NULL, default `'free'` | Current plan |
| `status` | `ENUM('active', 'canceled', 'past_due', 'trialing')` | NOT NULL, default `'active'` | |
| `current_period_end` | `TIMESTAMPTZ` | NULLABLE | When current billing period ends |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Updated by Stripe webhooks |

**Indexes:**
- `idx_subscriptions_user_id` on `user_id`
- `idx_subscriptions_stripe_customer_id` on `stripe_customer_id`

---

### `watchlists`

A user can have multiple named watchlists.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `user_id` | `UUID` | FK → `users.id`, ON DELETE CASCADE | |
| `name` | `VARCHAR(100)` | NOT NULL | e.g., "My Stocks", "Crypto" |
| `is_default` | `BOOLEAN` | NOT NULL, default `false` | Only one can be true per user |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_watchlists_user_id` on `user_id`

**Constraints:**
- Partial unique index: `UNIQUE (user_id, is_default) WHERE is_default = true`

---

### `watchlist_items`

Individual symbols within a watchlist. Order is user-defined.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `watchlist_id` | `UUID` | FK → `watchlists.id`, ON DELETE CASCADE | |
| `symbol` | `VARCHAR(30)` | NOT NULL | e.g., `AAPL`, `BTC/USD`, `EUR/USD` |
| `display_order` | `INTEGER` | NOT NULL, default `0` | Sort order within watchlist |

**Indexes:**
- `idx_watchlist_items_watchlist_id` on `watchlist_id`
- `idx_watchlist_items_symbol` on `symbol`

**Constraints:**
- `UNIQUE (watchlist_id, symbol)` — no duplicate symbols per watchlist

---

### `alerts`

Price or indicator alert definitions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `user_id` | `UUID` | FK → `users.id`, ON DELETE CASCADE | |
| `symbol` | `VARCHAR(30)` | NOT NULL | Monitored symbol |
| `condition_type` | `ENUM('price_above', 'price_below', 'percent_change', 'indicator_cross')` | NOT NULL | Alert trigger type |
| `threshold` | `DECIMAL(18, 8)` | NOT NULL | Trigger value |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | User can disable |
| `triggered_at` | `TIMESTAMPTZ` | NULLABLE | Set when first triggered |
| `notification_email` | `BOOLEAN` | NOT NULL, default `true` | Send email notification |
| `notification_push` | `BOOLEAN` | NOT NULL, default `false` | Send browser push |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_alerts_user_id` on `user_id`
- `idx_alerts_symbol` on `symbol`
- `idx_alerts_is_active` on `is_active` (for alert evaluation queries)

---

### `alert_rules`

Detailed conditions for complex multi-field alerts (extensible).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `alert_id` | `UUID` | FK → `alerts.id`, ON DELETE CASCADE | |
| `field` | `VARCHAR(50)` | NOT NULL | e.g., `close`, `volume`, `rsi_14` |
| `operator` | `VARCHAR(20)` | NOT NULL | One of: `'gt'`, `'lt'`, `'gte'`, `'lte'`, `'eq'`, `'crosses_above'`, `'crosses_below'`. Stored as VARCHAR (not DB enum) to allow adding operators without a migration. Validated at API layer via Zod. |
| `value` | `DECIMAL(18, 8)` | NOT NULL | Comparison value |

**Indexes:**
- `idx_alert_rules_alert_id` on `alert_id`

---

### `saved_layouts`

A named chart configuration (symbol + timeframe + associated drawings/indicators).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `user_id` | `UUID` | FK → `users.id`, ON DELETE CASCADE | |
| `name` | `VARCHAR(100)` | NOT NULL | User-provided name |
| `symbol` | `VARCHAR(30)` | NOT NULL | Symbol this layout is for |
| `timeframe` | `VARCHAR(10)` | NOT NULL | e.g., `1D`, `4h`, `15m` |
| `is_default` | `BOOLEAN` | NOT NULL, default `false` | Auto-loads for this symbol |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Updated on save |

**Indexes:**
- `idx_saved_layouts_user_id` on `user_id`
- `idx_saved_layouts_symbol` on `symbol`
- `idx_saved_layouts_user_id_symbol` composite on `(user_id, symbol)` (for "load default" queries)

---

### `chart_drawings`

Individual drawing annotations associated with a saved layout.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `layout_id` | `UUID` | FK → `saved_layouts.id`, ON DELETE CASCADE | |
| `drawing_type` | `ENUM('trend_line', 'horizontal_line', 'fibonacci', 'rectangle', 'text_label')` | NOT NULL | |
| `points_json` | `JSONB` | NOT NULL | Array of `{time, price}` objects |
| `style_json` | `JSONB` | NOT NULL, default `'{}'` | Color, width, opacity overrides |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_chart_drawings_layout_id` on `layout_id`

**Example `points_json`:**
```json
[
  { "time": 1700000000, "price": 182.50 },
  { "time": 1700432000, "price": 190.25 }
]
```

**Example `style_json`:**
```json
{ "color": "#2962FF", "lineWidth": 2, "lineStyle": "dashed" }
```

---

### `indicators`

Technical indicators applied to a saved layout.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `layout_id` | `UUID` | FK → `saved_layouts.id`, ON DELETE CASCADE | |
| `indicator_type` | `ENUM('sma', 'ema', 'macd', 'rsi', 'bollinger_bands')` | NOT NULL | |
| `params_json` | `JSONB` | NOT NULL | Indicator-specific params |
| `panel` | `ENUM('main', 'sub')` | NOT NULL, default `'main'` | Overlay or panel indicator |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_indicators_layout_id` on `layout_id`

**Example `params_json` for SMA:**
```json
{ "period": 20, "source": "close", "color": "#FF9800" }
```

**Example `params_json` for MACD:**
```json
{ "fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9 }
```

---

## Prisma Schema (Reference)

### `push_subscriptions`

Browser push endpoint subscriptions for alert notifications. One row per browser/device per user.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `user_id` | `UUID` | FK → `users.id`, ON DELETE CASCADE | |
| `endpoint` | `TEXT` | NOT NULL | Browser push endpoint URL |
| `p256dh` | `TEXT` | NOT NULL | ECDH public key for payload encryption |
| `auth` | `TEXT` | NOT NULL | Auth secret for push encryption |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_push_subscriptions_user_id` on `user_id`

**Notes:**
- Push endpoints expire; handle 410 Gone responses from push service by deleting the row
- User may have multiple active subscriptions (different browsers/devices)

---

### `trialing` subscription status

The `subscriptions.status = 'trialing'` enum value is reserved for future use when Stripe trial periods are offered. **Current behavior:** trials are not offered in MVP. The status is defined in the schema now to avoid a migration when trials are introduced. Any application code that checks subscription status must include `trialing` as equivalent to `active` for feature access purposes.

---

## Missing-Row Invariants

These invariants must hold at all times and are enforced by the Clerk webhook handler:

| Invariant | Enforcement |
|---|---|
| Every `users` row has exactly one `subscriptions` row | `user.created` webhook creates both atomically |
| `subscriptions.plan` defaults to `'free'` for new users | Set in webhook handler; never rely on DB default alone |
| `subscriptions.stripe_customer_id` is always set | Stripe customer created synchronously in webhook handler |
| No `subscriptions` row is ever deleted | On Stripe cancellation, set `status = 'canceled'`; row is preserved |

---

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Plan {
  free
  pro
  premium
}

enum SubscriptionStatus {
  active
  canceled
  past_due
  trialing
}

enum ConditionType {
  price_above
  price_below
  percent_change
  indicator_cross
}

enum DrawingType {
  trend_line
  horizontal_line
  fibonacci
  rectangle
  text_label
}

enum IndicatorType {
  sma
  ema
  macd
  rsi
  bollinger_bands
}

enum Panel {
  main
  sub
}

model User {
  id           String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clerkId      String        @unique @map("clerk_id") @db.VarChar(255)
  email        String        @unique @db.VarChar(255)
  name         String?       @db.VarChar(255)
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz

  subscription Subscription?
  watchlists   Watchlist[]
  alerts       Alert[]
  savedLayouts SavedLayout[]

  @@index([clerkId], name: "idx_users_clerk_id")
  @@map("users")
}

model Subscription {
  id                     String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                 String             @unique @map("user_id") @db.Uuid
  stripeCustomerId       String             @unique @map("stripe_customer_id") @db.VarChar(255)
  stripeSubscriptionId   String?            @unique @map("stripe_subscription_id") @db.VarChar(255)
  plan                   Plan               @default(free)
  status                 SubscriptionStatus @default(active)
  currentPeriodEnd       DateTime?          @map("current_period_end") @db.Timestamptz
  createdAt              DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt              DateTime           @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], name: "idx_subscriptions_user_id")
  @@index([stripeCustomerId], name: "idx_subscriptions_stripe_customer_id")
  @@map("subscriptions")
}

model Watchlist {
  id        String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String          @map("user_id") @db.Uuid
  name      String          @db.VarChar(100)
  isDefault Boolean         @default(false) @map("is_default")
  createdAt DateTime        @default(now()) @map("created_at") @db.Timestamptz

  user  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  items WatchlistItem[]

  @@index([userId], name: "idx_watchlists_user_id")
  @@map("watchlists")
}

model WatchlistItem {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  watchlistId  String    @map("watchlist_id") @db.Uuid
  symbol       String    @db.VarChar(30)
  displayOrder Int       @default(0) @map("display_order")

  watchlist Watchlist @relation(fields: [watchlistId], references: [id], onDelete: Cascade)

  @@unique([watchlistId, symbol])
  @@index([watchlistId], name: "idx_watchlist_items_watchlist_id")
  @@index([symbol], name: "idx_watchlist_items_symbol")
  @@map("watchlist_items")
}

model Alert {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId            String        @map("user_id") @db.Uuid
  symbol            String        @db.VarChar(30)
  conditionType     ConditionType @map("condition_type")
  threshold         Decimal       @db.Decimal(18, 8)
  isActive          Boolean       @default(true) @map("is_active")
  triggeredAt       DateTime?     @map("triggered_at") @db.Timestamptz
  notificationEmail Boolean       @default(true) @map("notification_email")
  notificationPush  Boolean       @default(false) @map("notification_push")
  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz

  user  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  rules AlertRule[]

  @@index([userId], name: "idx_alerts_user_id")
  @@index([symbol], name: "idx_alerts_symbol")
  @@index([isActive], name: "idx_alerts_is_active")
  @@map("alerts")
}

model AlertRule {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  alertId  String @map("alert_id") @db.Uuid
  field    String @db.VarChar(50)
  operator String @db.VarChar(20)
  value    Decimal @db.Decimal(18, 8)

  alert Alert @relation(fields: [alertId], references: [id], onDelete: Cascade)

  @@index([alertId], name: "idx_alert_rules_alert_id")
  @@map("alert_rules")
}

model SavedLayout {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  name      String   @db.VarChar(100)
  symbol    String   @db.VarChar(30)
  timeframe String   @db.VarChar(10)
  isDefault Boolean  @default(false) @map("is_default")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  drawings  ChartDrawing[]
  indicators Indicator[]

  @@index([userId], name: "idx_saved_layouts_user_id")
  @@index([symbol], name: "idx_saved_layouts_symbol")
  @@index([userId, symbol], name: "idx_saved_layouts_user_id_symbol")
  @@map("saved_layouts")
}

model ChartDrawing {
  id          String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  layoutId    String      @map("layout_id") @db.Uuid
  drawingType DrawingType @map("drawing_type")
  pointsJson  Json        @map("points_json")
  styleJson   Json        @default("{}") @map("style_json")
  createdAt   DateTime    @default(now()) @map("created_at") @db.Timestamptz

  layout SavedLayout @relation(fields: [layoutId], references: [id], onDelete: Cascade)

  @@index([layoutId], name: "idx_chart_drawings_layout_id")
  @@map("chart_drawings")
}

model Indicator {
  id            String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  layoutId      String        @map("layout_id") @db.Uuid
  indicatorType IndicatorType @map("indicator_type")
  paramsJson    Json          @map("params_json")
  panel         Panel         @default(main)
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz

  layout SavedLayout @relation(fields: [layoutId], references: [id], onDelete: Cascade)

  @@index([layoutId], name: "idx_indicators_layout_id")
  @@map("indicators")
}
```
