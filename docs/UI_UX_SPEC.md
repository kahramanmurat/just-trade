# UI/UX Specification — JustTrade

## 1. Design Philosophy

- **Dark terminal aesthetic** — every pixel of chrome serves data, never decorates it
- **Minimal UI, maximal data** — the chart is the hero; toolbars and panels are secondary
- **Progressive disclosure** — advanced tools appear when needed, not on first load
- **Keyboard-first** — power users never touch the mouse for common actions

---

## 2. Color Palette

All values are design tokens. Reference in `tailwind.config.ts` as CSS variables.

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#0F1117` | Main application background |
| `--color-surface` | `#1A1D29` | Cards, panels, modals |
| `--color-surface-2` | `#222538` | Hover states, nested surfaces |
| `--color-border` | `#2A2D3E` | Dividers, input borders |
| `--color-accent` | `#2962FF` | Primary CTAs, active states, links |
| `--color-accent-hover` | `#1E4FD8` | Hover state for accent |
| `--color-up` | `#26A69A` | Bullish candles, positive values |
| `--color-down` | `#EF5350` | Bearish candles, negative values |
| `--color-text-primary` | `#E0E3EB` | Primary text |
| `--color-text-secondary` | `#787B86` | Labels, metadata, placeholders |
| `--color-text-disabled` | `#4A4D5A` | Disabled states |

---

## 3. Typography

| Use Case | Font | Weight | Size |
|---|---|---|---|
| UI labels, buttons, nav | Inter | 400 / 500 | 12–16px |
| Section headings | Inter | 600 | 14–18px |
| Prices, OHLCV values | JetBrains Mono (or system monospace) | 400 / 500 | 12–14px |
| Chart legend text | Monospace | 400 | 11px |

**Base font size:** 14px
**Line height:** 1.4 for UI text, 1.2 for numeric displays

---

## 4. Spacing System

Base unit: **4px**

| Scale | Value |
|---|---|
| 1 | 4px |
| 2 | 8px |
| 3 | 12px |
| 4 | 16px |
| 5 | 20px |
| 6 | 24px |
| 8 | 32px |
| 10 | 40px |
| 12 | 48px |

---

## 5. Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ HEADER (48px fixed)                                  │
│ [Logo] [Symbol Search] [Timeframe] ... [Account]    │
├──────┬──────────────────────────────────┬────────────┤
│ LEFT │                                  │  RIGHT     │
│ TOOL │    CHART AREA (fills viewport)   │  PANEL     │
│ BAR  │                                  │  (280px)   │
│(40px)│                                  │            │
│      │                                  │ [Watchlist]│
│ [D]  │                                  │ [Alerts]   │
│ [/]  │                                  │ [Indicators│
│ [□]  │                                  │            │
│ [T]  │                                  │            │
│ [∞]  │                                  │            │
└──────┴──────────────────────────────────┴────────────┘
```

### Dimensions
- **Header:** 48px height, full width, `z-index: 100`
- **Left Toolbar:** 40px width, `calc(100vh - 48px)` height
- **Right Panel:** 280px width, collapsible (hidden on tablet < 1024px)
- **Chart Area:** fills remaining space, `min-width: 600px`

---

## 6. Header Component

**Left section:**
- Logo (JustTrade wordmark, 24px height)
- Symbol display chip (active symbol + exchange badge, e.g., `AAPL · NASDAQ`)

**Center section:**
- Symbol search input (global hotkey: `/` or `Ctrl+K`)
- Timeframe selector: `1m | 5m | 15m | 1h | 4h | 1D | 1W | 1M`

**Right section:**
- Indicator picker button
- Layout save/load button
- Account avatar dropdown (profile, subscription, logout)

---

## 7. Left Toolbar

Icon-only column. Tooltip on hover (delayed 400ms).

| Icon | Tool | Shortcut |
|---|---|---|
| Cursor | Select / Default | `Esc` |
| Trend Line | Draw trendline | `Alt+T` |
| Horizontal Line | Horizontal ray | `Alt+H` |
| Fibonacci | Fib retracement | `Alt+F` |
| Rectangle | Rectangle | `Alt+R` |
| Text | Text label | `Alt+L` |
| Magnet | Snap to OHLC | `Alt+M` |
| Eraser | Delete drawing | `Delete` |

Active tool has `--color-accent` background.

---

## 8. Chart Area

- Full-bleed within its container
- **Crosshair:** thin `1px` cross, `--color-text-secondary` color
- **Price scale (right):** right-aligned prices, `--color-text-secondary`, 8px padding
- **Time scale (bottom):** time/date labels, `--color-text-secondary`
- **OHLCV legend (top-left overlay):** `O H L C Vol` values in monospace, updates on crosshair move
- **Watermark:** symbol name, 30% opacity, centered
- No scrollbars visible; use native chart scroll/pinch

---

## 9. Right Panel

Tabbed container with 3 tabs:

### Watchlist Tab
- Tab list with "+" button to create new watchlist
- Each watchlist item: `[symbol] [name] [last price] [change%]`
- Live price updates animate price cell (flash green/red)
- Right-click context menu: remove from watchlist, set alert, go to chart

### Alerts Tab
- List of active and triggered alerts
- Each row: `[symbol] [condition] [threshold] [status badge]`
- "New Alert" button → opens Alert Modal
- Toggle active/inactive per alert

### Indicators Tab
- List of applied indicators with settings gear
- "Add Indicator" button → opens Indicator picker modal
- Each indicator shows: `[name] [parameters summary] [visibility toggle] [remove]`

---

## 10. Modals

### Symbol Search Modal
- Triggered by: header search click, `/` or `Ctrl+K` hotkey
- Full-screen overlay with centered search box
- Real-time search results below, grouped by: Equities, Crypto, Forex, Indices
- Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)

### Alert Creation Modal
- Form: Symbol (pre-filled), Condition (price above/below, % change, indicator cross)
- Threshold value input
- Notification method: Email | Browser Push | Both
- Save → adds to Alerts tab

### Layout Save Modal
- Input: layout name
- Checkbox: set as default for symbol
- Shows existing saved layouts (rename/delete)

### Indicator Picker Modal
- Search input + category grid (Trend, Momentum, Volatility, Volume)
- Click indicator → configure params in side panel → Add to Chart

---

## 11. Animations & Motion

| Interaction | Animation |
|---|---|
| Panel tab switch | Fade 150ms ease |
| Modal open | Scale 0.97→1 + fade 150ms ease |
| Modal close | Fade out 100ms ease |
| Price cell update | Background flash 300ms ease-out |
| Tooltip appear | Fade 150ms ease |
| Chart data updates | Native chart lib (no additional animation) |

**No** heavy animations on chart candlestick data rendering. Performance > aesthetics for chart.

---

## 12. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| < 768px (Mobile) | Show read-only chart only. No drawing tools. Banner to switch to desktop. |
| 768–1023px (Tablet) | Right panel hidden by default, accessible via toggle button. Left toolbar visible. |
| ≥ 1024px (Desktop) | Full layout. Both panels visible. |

**Desktop-first** design. Chart editing (drawings, indicators) is desktop-only.

---

## 13. Accessibility

- All interactive elements have `:focus-visible` ring (`--color-accent`, 2px offset)
- Color is never the _only_ conveyor of information (use icons + text alongside up/down colors)
- All modals trap focus and restore on close
- ARIA labels on icon-only buttons
- Minimum contrast ratio: 4.5:1 for text on background
