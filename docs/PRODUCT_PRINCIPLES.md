# Product Principles — JustTrade

These are non-negotiable constraints that shape every implementation decision. When in doubt, return to these principles.

---

## 1. Performance First

**The chart is a real-time financial instrument, not a webpage.**

- Chart must render in **< 100ms** from data available to pixels on screen
- Live price updates must reflect within **< 50ms** of the WebSocket tick arriving
- API responses for OHLCV data must complete in **< 300ms** (cache miss) and **< 50ms** (cache hit)
- Never block the UI thread with data processing — use Web Workers for heavy computation
- Prefer streaming over polling; prefer caching over refetching

**Implications:**
- Lightweight Charts (canvas-based) is chosen over SVG charting libraries for this reason
- Redis caches OHLCV responses — do not call market data APIs on every chart load
- React Server Components used where possible to reduce client JS bundle
- No animations on chart data updates

---

## 2. Dark-First Design

**Every component is designed for dark mode. Light mode is a future option, not a current constraint.**

- All colors reference CSS custom properties (design tokens), never hardcoded hex values in components
- Background colors layered: `--color-bg` → `--color-surface` → `--color-surface-2`
- Never use white (`#FFF`) as a background, never use black (`#000`) as text on dark backgrounds
- Contrast ratios must meet WCAG AA (4.5:1 for body text, 3:1 for large text)
- Test all UI states (empty, loading, error, filled) in the dark theme before shipping

**Implications:**
- Tailwind configured with `darkMode: 'class'` but root class defaults to dark
- Color tokens defined at CSS `:root` level, not inlined in JSX
- Images, icons, and third-party embeds evaluated for dark-theme compatibility

---

## 3. Minimal Chrome

**The user's capital is on the line. The interface must not distract.**

- The chart fills the maximum available viewport — never shrink it for UI elements
- Toolbars, panels, and modals are secondary to the chart
- No marketing copy, banners, or promotional content inside the dashboard
- Upgrade prompts are contextual (appear when a limit is hit), not ambient
- Notifications are silent unless the user has explicitly opted into alert notifications
- Empty states are minimal: one icon, one line of text, one CTA

**Implications:**
- Header is 48px max; left toolbar is 40px wide; these do not grow
- Right panel is collapsible; default visible only on ≥ 1024px
- No tooltips appear without user hover; no auto-playing tutorials
- Modal z-index managed carefully — only one modal layer at a time

---

## 4. Data Integrity

**Financial data must be accurate or explicitly marked as uncertain.**

- Never display a price without knowing its freshness
- If WebSocket disconnects, price cells show a staleness indicator (e.g., grayed out with clock icon) after **5 seconds** of no update
- OHLCV data gaps (holidays, weekends, data provider outages) are displayed as gaps in the chart, not filled with estimated values
- Alert trigger timestamps must be accurate to the second — use server-side evaluation, not client-side
- Free tier 15-minute delay must be visually indicated (e.g., "(Delayed 15min)" badge near price)

**Implications:**
- WebSocket connection state managed in Zustand; UI reacts to `connected | disconnected | reconnecting` states
- Prisma queries for financial data never use client-side timestamps for writes — always use `now()` in DB
- OHLCV API responses include a `dataProvider` and `asOf` timestamp; UI stores and can display these

---

## 5. Progressive Disclosure

**Show only what the user needs right now. Reveal complexity as they engage.**

- Default chart loads with no indicators, no drawings — clean price action
- Drawing toolbar icons are visible but inactive until a tool is selected
- Indicator panel shows a count badge ("2 indicators") until expanded
- Advanced settings (indicator source, drawing style overrides) are behind a gear icon, not shown by default
- Subscription limits are surfaced contextually, not in the main UI at all times

**Implications:**
- Component state for tool selection defaults to `null` (no active tool)
- Indicator settings open in a secondary panel/popover on demand
- Feature flags can disable epics entirely for Free users (hide the UI, don't just gray it out for drawing tools)

---

## 6. Keyboard-First Power Users

**Professional traders use keyboards. Mouse is secondary for power workflows.**

| Action | Shortcut |
|---|---|
| Open symbol search | `/` or `Ctrl+K` |
| Change to 1m timeframe | `Alt+1` |
| Change to 5m timeframe | `Alt+2` |
| Change to 15m timeframe | `Alt+3` |
| Change to 1h timeframe | `Alt+4` |
| Change to 4h timeframe | `Alt+5` |
| Change to 1D timeframe | `Alt+6` |
| Change to 1W timeframe | `Alt+7` |
| Select trend line tool | `Alt+T` |
| Select horizontal line | `Alt+H` |
| Select Fibonacci tool | `Alt+F` |
| Select rectangle tool | `Alt+R` |
| Add text label | `Alt+L` |
| Delete selected drawing | `Delete` |
| Deselect / Escape tool | `Esc` |
| Save current layout | `Ctrl+S` |
| Toggle right panel | `Ctrl+\` |

**Implications:**
- `useHotkeys` library (or custom hook) registered at app root level
- Hotkeys do not fire when focus is inside a text input or modal
- All keyboard shortcuts documented in a `/shortcuts` help page

---

## 7. Fail Gracefully

**Users trust us with their trading workflow. Unexpected errors cannot leave them stranded.**

- All API errors return a human-readable message to display in the UI
- WebSocket disconnection triggers automatic reconnect with exponential backoff (max 30s interval)
- Chart data fetch failure shows an inline error state with a retry button, not a full page error
- If Stripe webhook delivery fails, subscription status is not downgraded immediately — use a 24-hour grace period
- Clerk auth failures redirect to sign-in, never to a blank or broken page

**Implications:**
- React Query configured with `retry: 2` for all queries
- Error boundaries wrap the chart area independently from the right panel
- All `fetch` calls in API routes wrapped in try/catch with structured error responses: `{ error: string, code: string }`
