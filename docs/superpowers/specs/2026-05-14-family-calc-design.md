# FamilyCalc — Design Spec

**Date:** 2026-05-14
**Status:** Approved (pending final user review)
**Author:** User + Claude (brainstorming session)

## 1. Summary

A single-page web application that helps an offshore/maritime worker plan a leave budget between voyages. The user enters current assets (USD bank, USD cash, RUB bank), monthly family expenses, custom one-time goals (car, repairs, trip), and Russian investment instruments (bank deposit, OFZ, corporate bonds, stocks, long-term bonds). The calculator continuously shows two key results: **(a) money remaining on the next voyage date** and **(b) the date money runs out** (if before voyage). A live balance-over-time chart, named scenarios, RU/EN interface, JSON backup/import, and mobile-readable PDF export are core MVP features.

## 2. Goals & non-goals

### Goals (MVP)
- Dynamic, instant recalculation as the user adjusts any input
- Two output modes always visible simultaneously: "left on voyage date" and "runs out on"
- Multi-currency assets (USD, RUB) with single user-set exchange rate
- Custom goal categories with two modes: lump-sum on date OR spread over date range
- Russian investment instruments with annual yield, monthly compounding, and reinvest toggle
- Balance-over-time chart from today to next voyage date
- Named scenarios with switch / save-as / rename / delete
- localStorage auto-save + manual JSON export/import
- Russian + English UI with toggle
- Printable PDF (via browser print) optimized for mobile reading
- Dark theme by default + light theme toggle; PDF always uses light theme
- Static-deployable (GitHub Pages or any static host)
- Architecture ready to be wrapped in Tauri 2 later without rewriting

### Non-goals (deferred to future versions)
- Live exchange rate fetching (rate is manual)
- Multi-user / cloud sync
- Tax modeling
- USD-denominated investment instruments
- Automatic income from a salary stream during leave (lump-sum-only for MVP)
- Native mobile apps (web works on phone; Tauri wrap is a separate decision later)
- Authentication
- Server backend

## 3. Tech stack

- **Svelte 5** (runes) + **TypeScript** + **Vite**
- **svelte-i18n** for RU/EN locales
- **Chart.js** + **svelte-chartjs** for the balance chart
- **vitest** for unit tests (local only — no GitHub Actions)
- **gh-pages** npm package for one-command deploy to GitHub Pages (no Actions consumption)
- No CSS framework — handwritten CSS with CSS custom properties for theming
- Node.js 20+ for dev

Reference architecture: [Wealthfolio](https://github.com/afadil/wealthfolio) (Tauri + React + Vite). We use Svelte instead of React for smaller runtime and simpler component model; the rest of the architecture mirrors Wealthfolio.

## 4. Project structure

```
FamilyCalc/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
├── src/
│   ├── main.ts
│   ├── App.svelte
│   ├── lib/
│   │   ├── calc/
│   │   │   ├── engine.ts        # pure simulate() function
│   │   │   ├── instruments.ts   # investment yield helpers
│   │   │   └── types.ts
│   │   ├── state/
│   │   │   ├── scenarios.ts     # active scenario + reactive state
│   │   │   ├── persistence.ts   # localStorage + JSON import/export
│   │   │   └── derived.ts       # memoized simulation result
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   ├── ru.json
│   │   │   └── en.json
│   │   └── pdf/
│   │       └── print.css
│   ├── components/
│   │   ├── ResultsHeader.svelte
│   │   ├── BalanceChart.svelte
│   │   ├── sections/
│   │   │   ├── ContextSection.svelte
│   │   │   ├── AssetsSection.svelte
│   │   │   ├── ExpensesSection.svelte
│   │   │   ├── GoalsSection.svelte
│   │   │   ├── InvestmentsSection.svelte
│   │   │   └── BreakdownSection.svelte
│   │   ├── controls/
│   │   │   ├── CurrencyInput.svelte
│   │   │   ├── DateInput.svelte
│   │   │   ├── CollapsibleCard.svelte
│   │   │   ├── LangToggle.svelte
│   │   │   └── ThemeToggle.svelte
│   │   ├── ScenarioPicker.svelte
│   │   └── PrintView.svelte
│   └── styles/
│       ├── global.css           # tokens, base styles
│       ├── theme-dark.css       # dark theme (default)
│       ├── theme-light.css      # light theme
│       └── print.css            # @media print rules
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-14-family-calc-design.md   # this file
```

## 5. Data model

```ts
type ID = string;          // crypto.randomUUID()
type ISODate = string;     // "2026-05-14"
type Currency = "RUB" | "USD";

type AssetMix = {
  usdBank: number;
  usdCash: number;
  rubBank: number;
};

type Goal = {
  id: ID;
  name: string;
  amountRub: number;
  mode: "lump" | "spread";
  date: ISODate;            // lump: purchase day; spread: range start
  endDate?: ISODate;        // spread only
  enabled: boolean;
};

type InstrumentKind =
  | "vkladRub"
  | "ofz"
  | "corpBond"
  | "stock"
  | "longBond"
  | "custom";

type Investment = {
  id: ID;
  kind: InstrumentKind;
  name: string;
  amountRub: number;        // principal allocated to this instrument
  annualRatePct: number;
  reinvest: boolean;
};

type Inputs = {
  returnDate: ISODate;
  voyageDate: ISODate;
  salaryLumpSumUsd: number;     // informational only
  assets: AssetMix;
  rubPerUsd: number;
  monthlyFamilyRub: number;
  goals: Goal[];
  investments: Investment[];
};

type Scenario = {
  id: ID;
  name: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  inputs: Inputs;
};

type AppState = {
  schemaVersion: 1;
  activeScenarioId: ID;
  scenarios: Record<ID, Scenario>;
  ui: {
    language: "ru" | "en";
    theme: "dark" | "light";
    openSections: Record<string, boolean>;
  };
};

type DayPoint = {
  date: ISODate;
  totalRub: number;
  assetsRub: AssetMix;
  events: GoalEvent[];
  investmentValueRub: number;
};

type GoalEvent = { goalId: ID; name: string; amountRub: number };

type SimulationResult = {
  days: DayPoint[];
  balanceAtVoyage: number;
  runsOutOn: ISODate | null;
  daysOfRunway: number;
  totalSpentRub: number;
  totalInvestmentYieldRub: number;
};
```

**Key model decisions:**

- **Salary lump sum is informational only**: the math runs on current assets (assets already reflect the salary). The lump sum value is shown for context (e.g., on the PDF: "earned this voyage: $30,000").
- **Today is dynamic**: simulation starts on `new Date()`. The `returnDate` is informational.
- **All goals are RUB**: matches the user's expense currency.
- **Investments are RUB-only for MVP**: all listed Russian instruments are typically RUB.
- **Investments are locked until voyage**: not drained to pay expenses. To "use" an investment for spending, the user moves the principal back to `rubBank`. This matches reality (selling bonds/stocks is a deliberate act).
- **`reinvest: false`** means daily interest flows to `rubBank` (becomes available for spending).
- **`schemaVersion: 1`** enables forward-compatible migrations when adding fields later.

## 6. Calculation engine

Pure function `simulate(inputs: Inputs, today: Date): SimulationResult`. No DOM, no Svelte. Daily granularity.

### Algorithm

```
For each day from today to voyageDate (inclusive):
  1. Apply monthly expense pro-rata:
       dailyExpense = monthlyFamilyRub / 30.4375
       outflow += dailyExpense
  2. Apply goal events:
       - lump goals where goal.date === currentDay && goal.enabled:
           outflow += goal.amountRub
           record event
       - spread goals where currentDay in [goal.date, goal.endDate] && goal.enabled:
           outflow += goal.amountRub / numDaysInRange
  3. Compute investment changes:
       For each investment:
         dailyRate = (1 + annualRatePct/100)^(1/365) − 1
         if reinvest:
             investment.amountRub *= (1 + dailyRate)
         else:
             dailyYield = investment.amountRub * dailyRate
             assets.rubBank += dailyYield
  4. Drain assets to cover outflow:
       - subtract from rubBank first
       - if rubBank would go negative:
           deficitRub = -rubBank
           rubBank = 0
           deficitUsd = deficitRub / rubPerUsd
           usdBank -= deficitUsd
       - if usdBank < 0:
           deficitUsd = -usdBank
           usdBank = 0
           usdCash -= deficitUsd
       - if usdCash < 0:
           (total goes negative; mark "runs out")
  5. Compute totalRub:
       totalRub = rubBank
                + usdBank * rubPerUsd
                + usdCash * rubPerUsd
                + sum(investment.amountRub for all investments)
  6. Record DayPoint
End

balanceAtVoyage = days[last].totalRub
runsOutOn = first day where totalRub <= 0 (else null)
daysOfRunway = (runsOutOn ?? voyageDate) - today, in days
```

### Edge cases

- **Voyage date <= today**: return empty `days[]`, `balanceAtVoyage = currentTotal`, `runsOutOn = null`, UI shows banner "voyage date is in the past".
- **Goal outside leave window**: ignored, UI shows warning badge on the goal row.
- **Spread goal with endDate <= date**: treated as lump on `date`.
- **Negative input values**: clamped to 0 at the input parser level; engine assumes non-negative.

### Test coverage (vitest)

1. No-spend case → balanceAtVoyage equals currentTotal
2. Single lump goal subtracts on exact date
3. Spread goal totals match input within 1 RUB rounding tolerance
4. Drain order: RUB → USD bank → USD cash
5. Reinvest compounding matches `principal * (1 + r)^t` within tolerance
6. Non-reinvest interest flows to rubBank
7. Runs-out detection on engineered scenarios
8. Exchange rate sensitivity (two rates produce expected delta)
9. Empty leave window returns sensible empty result
10. Goal with `enabled: false` is ignored

## 7. UI layout

Single column on mobile, max-width ~720px centered on desktop. Mobile-first sticky-results layout (confirmed: layout B).

### Header

```
FamilyCalc   [Scenario ▾]  [+]  [⤓]  [⤒]  RU/EN  ☀/🌙  🖨
```

- Scenario dropdown — switch active scenario
- `+` save current as new
- `⤓` export JSON backup
- `⤒` import JSON backup
- RU/EN toggle
- Theme toggle (sun/moon)
- 🖨 print → PDF

### Sticky results bar (pinned, always visible)

- Big number: "Left on voyage date" (RUB, with USD-equivalent below in muted text)
- "Money runs out": green checkmark if never, red date if before voyage
- Runway: N days · until [voyage date]
- Inline mini chart (~120px tall)

### Collapsible cards (in order, all open by default on first visit)

1. **Context & rate** — return date, voyage date, salary lump sum (informational), exchange rate with ±0.5 stepper buttons
2. **Current assets** — USD bank, USD cash, RUB bank (subtitle shows total in RUB-equivalent)
3. **Family expenses** — monthly RUB (subtitle shows total over leave period)
4. **Goals** — inline list, `+ Add goal` button. Each row: name, amount, mode dropdown, date(s), enabled toggle, delete
5. **Investments** — inline list, `+ Add investment` button. Each row: name, kind dropdown, amount, annual %, reinvest toggle, delete. Help icon on `kind` explains each instrument. Note: investment amounts and `assets.rubBank` are independent — the user sets each manually. To simulate "moving 500k from rubBank to OFZ" the user decreases rubBank by 500k and adds an investment for 500k. This keeps the model unambiguous and the UI simple.
6. **Monthly breakdown** — collapsed by default; opens to show table of month / opening / spent / goals / closing

### Visual style: Slate & mint (dark default)

- Background `#0f1419`
- Card surface `#141a23`
- Border `#1d2530`
- Text primary `#e5e9f0`
- Text muted `#7a8597`
- Accent (positive/surplus) mint `#7dd3a0`
- Accent (negative/deficit) red `#e88a8a`
- Tabular numerals on all money values
- Generous padding (touch-friendly)
- 1px subtle borders, square-ish rounded corners (6px)
- Font: system-ui for UI, monospace for numbers

### Light theme

- Background `#ffffff`
- Card surface `#f8f9fb`
- Border `#e1e4e8`
- Text primary `#1a1f2e`
- Text muted `#5b6373`
- Accents identical to dark for brand consistency

CSS custom properties on `:root[data-theme="dark"|"light"]` make theme switching one attribute flip.

### Interactions

- All inputs auto-save on change (300ms debounce to localStorage)
- Adding a goal/investment appears immediately in the list (no modal)
- Removing requires confirmation
- Scenario switch is instant
- Exchange rate ±0.5 buttons let user see immediate impact without typing

## 8. PDF / print output

Mechanism: `window.print()` triggers a `@media print` stylesheet that hides the live app and shows a `PrintView.svelte` component rendered as a clean single-column document. Phone browsers' "Save as PDF" produces a mobile-readable file.

### Layout (A4 portrait, large body type for phone reading)

1. Title + today's date + scenario name
2. Key numbers (left on voyage, runway, runs-out)
3. Context (return date, voyage date, salary, rate)
4. Starting assets (with RUB-equivalent of USD)
5. Recurring expenses
6. Goals list
7. Investments list (with calculated yield-by-voyage per instrument)
8. Balance-over-time chart (~200px tall, full width)
9. Monthly breakdown table

### Print stylesheet rules

- Force light theme regardless of UI toggle: `--bg: white; --fg: black`
- Hide `.app-shell`, show `.print-view`
- `@page { size: A4; margin: 12mm 14mm }`
- Body font: 12pt serif (Georgia) for paper readability
- Tabular monospace for money columns
- `page-break-inside: avoid` on each section block
- Chart uses Chart.js canvas with `devicePixelRatio: 2`

### i18n in PDF

PDF uses the current UI language at print time. Toggle RU before printing for a Russian PDF.

## 9. i18n

`svelte-i18n` with bundled `ru.json` and `en.json`. Both languages are part of the main bundle (small dictionaries, simpler than lazy-load).

- ICU MessageFormat handles Russian plural forms (one/few/other)
- `Intl.NumberFormat` for currency display (locale-aware separators)
- `Intl.DateTimeFormat` for dates
- Fallback locale: Russian
- Active locale saved to localStorage
- Language toggle in header re-renders all visible text reactively

## 10. Scenarios & persistence

### Storage

- **localStorage** key `familycalc.state.v1` — auto-save on change with 300ms debounce
- **JSON export**: downloads `familycalc-YYYY-MM-DD.json` (full AppState, all scenarios)
- **JSON import**: file picker → parse → migrate → confirmation modal → overwrite

### Scenario actions

- Switch (dropdown)
- Save as new (prompt for name)
- Rename inline
- Delete (with confirmation; if active scenario was deleted, fall back to first remaining; if list becomes empty, recreate `default`)

### Migration

`schemaVersion: 1` in MVP. `migrate(raw)` is a pure pipeline:

```ts
function migrate(raw: any): AppState {
  let s = raw;
  if (s.schemaVersion === undefined || s.schemaVersion < 1) s = migrate_v0_to_v1(s);
  // future: if (s.schemaVersion < 2) s = migrate_v1_to_v2(s);
  return s;
}
```

Old backup files always upgrade cleanly.

### Edge cases

- localStorage quota exceeded → toast "Cannot save — clear some scenarios"
- Multi-tab → on `storage` event, reload state; last writer wins
- Import file from newer schema version → block with message "Backup is from a newer version of FamilyCalc"
- Corrupted localStorage on load → fall back to default state, don't crash

### Tauri-portable seam

`persistence.ts` is the only file that touches `localStorage`. When wrapping in Tauri later, a `persistence.tauri.ts` variant uses `@tauri-apps/api/fs` instead. Everything upstream calls `loadState()` / `saveState()` and doesn't change.

## 11. Build, dev, deploy

### Dev workflow

```bash
nvm install 20
npm install
npm run dev          # vite at http://localhost:5173
npm run build        # produces dist/
npm run preview      # serve dist/ locally
npm test             # vitest unit tests
npm run typecheck    # svelte-check + tsc
```

### vite.config.ts

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: { target: 'es2020', sourcemap: true },
});
```

### Deployment: GitHub Pages without Actions

Use the `gh-pages` npm package to publish `dist/` from the local machine. No GitHub Actions minutes consumed.

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

```bash
npm run deploy   # one command from laptop
```

Site is served from the `gh-pages` branch at `https://<user>.github.io/FamilyCalc/`.

**Alternative considered:** Cloudflare Pages (more generous free tier, no Actions usage). Can switch later — same `dist/` output.

### CI

None. Vitest runs locally only. User runs `npm test` before `npm run deploy`.

### Tauri-portable path (deferred)

```bash
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api
npx tauri init
npx tauri dev      # native desktop
npx tauri android init / ios init  # mobile
```

Swap `persistence.ts` for `persistence.tauri.ts` (filesystem instead of localStorage). Estimated effort when ready: 1–2 days.

## 12. Initial project bootstrap

```bash
cd /Users/aleksandr/PythonProjects/FamilyCalc
npm create vite@latest . -- --template svelte-ts
npm install
npm install svelte-i18n chart.js svelte-chartjs
npm install -D vitest @testing-library/svelte jsdom gh-pages
git init && git add . && git commit -m "Initial Vite + Svelte + TS scaffold"
```

Then scaffold the folder structure described in §4 and implement calc engine first using TDD.

## 13. Future / out-of-scope ideas (parking lot)

These were mentioned or implied but deferred:

- USD-denominated investment instruments
- Live exchange rate feed (CBR API)
- Multiple income streams during leave (monthly retainer in addition to lump sum)
- Cloud sync (Firebase, Supabase) — only if multi-device becomes important
- Tax modeling on investment income
- Native mobile apps via Tauri 2 mobile
- Sharing a scenario via URL (encode state in URL hash)
- "Optimize for me" — given goals + constraints, suggest investment allocation
- Comparison view — two scenarios side by side
- Currency display preferences (force all USD, force all RUB)
- More instrument types: ETFs, REITs, crypto

Each of these gets a separate spec when prioritized.
