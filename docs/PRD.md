# Product Requirements Document — JustTrade

## 1. Product Overview

JustTrade is a SaaS web application providing a professional-grade trading dashboard experience. It delivers TradingView-style interactive charting, technical analysis tools, and market data in a clean, performant dark interface.

**Tagline:** _Professional charting. Accessible to everyone._

---

## 2. Target Users

| Persona | Description |
|---|---|
| **Retail Equity Trader** | Uses technical analysis to trade stocks and ETFs. Needs reliable charts with indicators. |
| **Crypto Trader** | Monitors multiple crypto pairs 24/7. Needs watchlists, alerts, and multi-timeframe analysis. |
| **Technical Analyst** | Heavy use of drawing tools (Fibonacci, trendlines), saves layouts across sessions. |

**Non-target:** Algorithmic/quantitative traders needing direct brokerage integration (Phase 2+).

---

## 3. Core Features

### MVP (Phase 1)
- User authentication (email/password + OAuth)
- Interactive candlestick charting (powered by Lightweight Charts)
- Symbol search (equities, crypto, forex, indices)
- Watchlist management (create lists, add/remove symbols, live prices)
- 2-tier subscription model: Free and Pro

### Phase 2
- Technical indicators (SMA, EMA, MACD, RSI, Bollinger Bands)
- Drawing tools (trendlines, Fibonacci retracement, rectangles, text labels)
- Price and indicator alerts with email/browser push notifications
- Saved chart layouts (persist drawings + indicators per symbol)

### Phase 3 (Roadmap)
- Social features (share charts, follow traders)
- Strategy backtesting engine
- Mobile app (React Native)
- Stock/crypto screener with custom filters
- Brokerage integrations (Alpaca, Interactive Brokers)

---

## 4. Subscription Tiers

| Feature | Free | Pro ($15/mo) | Premium ($39/mo) |
|---|---|---|---|
| Symbols | All | All | All |
| Timeframes | 1D, 1W | All | All |
| Watchlists | 1 (max 10 symbols) | 3 (max 50 each) | Unlimited |
| Indicators | 2 | 10 | Unlimited |
| Saved Layouts | 0 | 5 | Unlimited |
| Alerts | 0 | 5 active | Unlimited |
| Chart history | 1 year | 5 years | Full history |
| Data delay | 15 min | Real-time | Real-time |

---

## 5. Success Metrics

| Metric | Target (Month 6) |
|---|---|
| Daily Active Users (DAU) | 5,000 |
| Chart loads/sec (peak) | 500 |
| Monthly Churn Rate | < 5% |
| Monthly Recurring Revenue (MRR) | $15,000 |
| Pro conversion rate | > 8% of free users |
| P95 chart render time | < 100ms |

---

## 6. Monetization Model

- **Freemium acquisition funnel**: Free tier with meaningful limitations to drive upgrades
- **Pro plan**: $15/month — real-time data, more indicators, alerts
- **Premium plan**: $39/month — all features unlocked, full history, priority support
- **Annual billing**: 2 months free (16.7% discount)
- **Payment processor**: Stripe

---

## 7. Out of Scope (MVP)

- Direct trading / order execution
- Options/futures data
- Level 2 order book
- Social features
- Mobile-specific layouts
- Dark pool / institutional data

---

## 8. Assumptions & Dependencies

- Market data sourced from a third-party provider (e.g., Polygon.io, Alpaca Markets, or Binance WebSocket for crypto)
- Authentication handled by Clerk (no custom auth server)
- Hosting on Vercel (frontend + API) + Railway (WebSocket service) + Neon (Postgres)
- Real-time data delivered via WebSocket from a standalone Node.js streaming service
