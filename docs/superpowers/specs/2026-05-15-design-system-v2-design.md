# FamilyCalc — Design System v2 (Mobile-first Redesign)

**Date:** 2026-05-15
**Status:** Approved (visual direction confirmed via the brainstorming Visual Companion mockup at `.superpowers/brainstorm/77254-1778867415/content/full-redesign-v2-responsive.html`).
**Supersedes the visual portion of:** `2026-05-14-family-calc-design-system.md` (Terminal/Brutalist).
**Does not affect:** `2026-05-14-family-calc-design.md` (functional spec), `2026-05-15-savings-decision-framework-design.md` (savings math).

---

## 1. Goal

Replace the current Terminal/Brutalist visual system with a deterministic, mobile-friendly, professional dashboard aesthetic, while preserving every behavioural and computational guarantee already in the codebase.

Specifically:

- Resolve the 4-round saga of "looks unaligned / unprofessional / savings broke the page" documented in `.claude/lessons/mistakes-log.md` by introducing **three explicit card kinds** (form / list / report) instead of pretending every section is the same shape.
- Make the app usable on a phone (375px wide) without horizontal scroll, with proper touch targets (≥36px) and 16px input font (no iOS auto-zoom).
- Adopt the design system recommended by the `ui-ux-pro-max` plugin and persisted to `design-system/familycalc/MASTER.md`.

## 2. Non-goals

- **Math.** `src/lib/calc/engine.ts`, `src/lib/calc/allocate.ts`, and `src/lib/calc/instrumentClasses.ts` are untouched. Every existing test in `tests/calc/**` continues to pass.
- **State and persistence.** `src/lib/state/scenarios.svelte.ts`, `src/lib/state/persistence.ts`, and the `schemaVersion: 2` schema are untouched. No data migration.
- **i18n.** `ru.json` and `en.json` keep their keys. Copy may be added (e.g. ON-TRACK pill) but no key renames.
- **Features.** No new functionality — no new sections, no new inputs, no new outputs. The redesign is purely visual + responsive.
- **Print stylesheet.** `print.css` keeps the paper-terminal palette so PDFs stay readable on paper. The redesign is screen-only. (PDF look may be revisited in a follow-up.)
- **Atmosphere overlay.** `src/components/Atmosphere.svelte` (scanline + static) is removed from the default surface — the new aesthetic does not depend on it. If a user wants it back, that's a separate "easter egg" feature, out of scope.

## 3. Design system

Source of truth: `design-system/familycalc/MASTER.md` (persisted via the plugin). Mirrored into `src/styles/tokens.css` as CSS custom properties under `:root[data-theme='dark']`.

### 3.1 Color tokens (dark, the default)

| Role | Hex | CSS var |
|---|---|---|
| Background | `#0F172A` | `--bg` |
| Elevated surface | `#131D33` | `--bg-elevated` |
| Surface 1 | `#1A2540` | `--surface-1` |
| Surface 2 | `#1F2D4D` | `--surface-2` |
| Border | `rgba(255,255,255,0.08)` | `--border` |
| Border strong | `rgba(255,255,255,0.14)` | `--border-strong` |
| Foreground | `#F8FAFC` | `--fg` |
| Foreground 2 | `#CBD5E1` | `--fg-2` |
| Foreground 3 | `#94A3B8` | `--fg-3` |
| Foreground 4 (label) | `#64748B` | `--fg-4` |
| Primary (trust blue) | `#3B82F6` | `--primary` |
| Primary 2 (deep) | `#1E40AF` | `--primary-2` |
| Accent (profit green) | `#10B981` | `--accent` |
| Warn (high-rate amber) | `#F59E0B` | `--warn` |
| Danger | `#DC2626` | `--danger` |
| Info | `#38BDF8` | `--info` |

### 3.2 Light theme

Light is a parallel palette (white → slate text), **not** the paper-terminal beige currently used for `data-theme='light'`. The light palette is derived from the same hues at WCAG-AA contrast minimums. Light mode remains a user toggle, but the redesign is dark-first.

| Role | Hex | CSS var |
|---|---|---|
| Background | `#FFFFFF` | `--bg` |
| Elevated surface | `#F8FAFC` | `--bg-elevated` |
| Surface 1 | `#F1F5F9` | `--surface-1` |
| Border | `rgba(15,23,42,0.08)` | `--border` |
| Border strong | `rgba(15,23,42,0.16)` | `--border-strong` |
| Foreground | `#0F172A` | `--fg` |
| Foreground 2 | `#334155` | `--fg-2` |
| Foreground 3 | `#64748B` | `--fg-3` |
| Foreground 4 | `#94A3B8` | `--fg-4` |
| Primary | `#2563EB` | `--primary` |
| Accent | `#059669` | `--accent` |
| Warn | `#D97706` | `--warn` |
| Danger | `#B91C1C` | `--danger` |

### 3.3 Typography

- `--mono: 'Fira Code', ui-monospace, Menlo, Consolas, monospace` — numbers, code-y identifiers (RUB/USD, dates in ISO), KPI values.
- `--sans: 'Fira Sans', system-ui, -apple-system, 'Segoe UI', sans-serif` — labels, body text, UI chrome.

Fonts loaded from Google Fonts (eager, single `<link>` in `index.html`):
```
Fira Code: 400, 500, 600, 700
Fira Sans: 300, 400, 500, 600, 700
```

Type scale: `12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 px`. Inputs use **16px** to prevent iOS auto-zoom. KPI hero number uses 36px desktop / 28px mobile.

### 3.4 Spacing scale

`--gap-1: 4px` through `--gap-12: 48px`. Pure 4px grid. No magic numbers in components.

### 3.5 Radii

`--radius-sm: 6px` (inputs, small buttons), `--radius: 10px` (cards), `--radius-lg: 14px` (modals — N/A for v1).

### 3.6 Effects

- Subtle elevation via `box-shadow: 0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 16px -4px rgba(0,0,0,0.5)` on report cards.
- Page background uses two soft radial gradients (top-right blue, top-left green) on dark backdrop — low-contrast atmosphere without the scanline noise.
- All transitions 150ms ease.
- `@media (prefers-reduced-motion: reduce)` collapses durations to 0.01ms.

## 4. The three card kinds

This is the central architectural insight harvested from the mistakes-log. **A complaint of "page looks unprofessional" is usually a structural mismatch between content and wrapper.** The redesign explicitly distinguishes:

| Kind | Used for | Visual chrome | Content rules |
|---|---|---|---|
| **Form card** (`.card`) | Context, Assets, Expenses, Summary | Standard border, neutral background, card-head with title + meta, body padded `gap-3 / gap-5` | Vertical stack of `.field` rows. Inputs right-aligned 180px on desktop. **Field row stacks (label above input, full-width input) below 480px.** |
| **List card** (`.card`) | Goals | Same chrome as form card, body uses a different inner pattern | Header row + N item rows with a 6-column grid (name / amount / mode / date / toggle / delete). Cells use fixed widths via `--list-cols`. **Items collapse to per-item cards below 720px** (two-row stacked layout, never a vertical stack of `.field`). |
| **Report card** (`.report-card`) | Savings plan | Distinct chrome: gradient background, border-strong, header with `.badge`, footer with toggle + total | Two zones inside: `.report-inputs` (3-column inputs row that collapses to 1-col on mobile) and `.report-layers` (3-column layer columns that collapse to 1-col on mobile). Footer for the include-yield toggle + computed mid-yield delta. |

This replaces the current `.card` being asked to render all three. The "report-panel-wedged-into-form-wrapper" mismatch documented for Savings is dissolved by giving it its own class.

## 5. Layout

Single column for the app at every breakpoint. The current "everything in one 760px column" stack is widened to a **1280px max** with a **2-column input grid** on desktop, collapsing to a single column on mobile.

```
shell (max-width 1280px, side padding 24/12)
├── topbar              sticky · blur background · brand + scenario picker + lang/theme/print/new
├── subbar              two status pills (track + regime) with metadata
├── kpis                3 tiles (hero 1.4fr + 2 × 1fr) — collapses 3→2→1 by breakpoint
├── chart               full-width 220px (160px mobile), grid + voyage marker + 12-month axis
├── grid-2              two-column grid for the rest
│   ├── card  Context
│   ├── card  Assets
│   ├── card  Expenses
│   ├── card  Summary  (read-only mirror of the engine output)
│   ├── card.span-2  Goals  (list-of-items)
│   ├── report-card.span-2  Savings
│   └── card.span-2  Breakdown  (cash-flow table)
└── footer              small meta line
```

### 5.1 Breakpoints

| Width | Layout change |
|---|---|
| `>1024px` | Full desktop: 2-column input grid, 3-column KPIs, savings 3-column layers, Goals 6-column rows. |
| `≤1024px` (tablet) | Topbar clock + dividers hidden. Other layouts unchanged. |
| `≤900px` | Input grid collapses to single column. KPI 3→2 with hero spanning both. Savings 3 inputs → 2+1, Savings layers still 3 columns. |
| `≤720px` | Topbar button labels hidden (icons only). Goals rows collapse to per-item cards. Breakdown table gets horizontal scroll wrapper. |
| `≤640px` | Shell padding → 12px. KPI fully collapses to 1 column. Chart → 160px height, every other month label hidden. Savings layers → 1 column. Savings inputs → 1 column. Form fields stack label-above-input full width. |
| `≤480px` | Topbar tighter: brand 13px, brand-mark 22×22, scenario picker stretches via `flex: 1`. Buttons 36×36 (Apple HIG minimum). `data-secondary` buttons hidden. |
| `≤380px` | Brand-mark hidden, just "FamilyCalc" text at 12px. |

The Visual Companion mockup is the source of truth for visual decisions at every breakpoint.

## 6. Component changes (file-by-file)

### 6.1 Styles

| File | Action |
|---|---|
| `src/styles/tokens.css` | **Replace.** New color tokens (above), new font stack vars, same spacing scale. |
| `src/styles/global.css` | **Replace.** New primitive classes (`.btn`, `.field`, `.input`, `.select`, `.card`, `.report-card`, `.kpi`, `.stepper`, `.toggle-cb`, `.goals-list/.goals-row`, `.status-pill`, `.badge`). Scrollbars hidden globally via `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`. |
| `src/styles/print.css` | **Keep.** Print palette and rules unchanged. |
| `src/app.css` | Add `@import url('https://fonts.googleapis.com/css2?...Fira+Code...Fira+Sans...&display=swap')` at top. |
| `index.html` | Add `<link rel="preconnect">` for fonts.gstatic.com / fonts.googleapis.com to speed up first paint. |

### 6.2 Components

| File | Action |
|---|---|
| `src/App.svelte` | **Rewrite layout.** Sticky topbar with `.brand`, scenario picker, lang/theme/print/new buttons. Subbar with status pills. KPI strip (3 tiles). Chart. Two-column grid wrapping the existing section components. |
| `src/components/Atmosphere.svelte` | **Remove import from App.svelte.** File can be kept for an "easter egg" toggle in a future task. Not deleted by this PR. |
| `src/components/ResultsHeader.svelte` | **Replace.** Renders the KPI strip — three tiles: hero `Balance at voyage` (with delta vs. plan if computable, otherwise just the date), `Runway` (days + drain date), `Monthly expenses` (sourced from `inputs.monthlyFamilyRub`). CBR rate lives in the subbar status pill, not in the KPI strip. |
| `src/components/BalanceChart.svelte` | Keep Chart.js, **restyle.** Use new tokens — primary blue line, accent green yield, warn dashed voyage marker. Reduce height to 160px below 640px. |
| `src/components/PrintView.svelte` | **Keep.** Print stays paper-terminal until a follow-up task. |
| `src/components/ScenarioPicker.svelte` | **Rebuild as a widget**, not a form-style card. Compact `<select>` with icon buttons for rename/duplicate/delete. Lives in the topbar. |
| `src/components/controls/LangToggle.svelte` | Restyle as `.btn` ("EN / RU"). |
| `src/components/controls/ThemeToggle.svelte` | Restyle as `.btn.icon` (sun/moon SVG). |
| `src/components/controls/CollapsibleCard.svelte` | **Replace** with a simpler `<section class="card">` wrapper. Collapse-on-click moves to a per-card opt-in via prop; default is always-open (revisit if cards feel too heavy). |
| `src/components/controls/CurrencyInput.svelte` | Restyle to use `.input.with-suffix` + `.suffix` span. |
| `src/components/controls/DateInput.svelte` | Restyle to use the new `.input` token. |
| `src/components/sections/ContextSection.svelte` | Drop the custom `.rate-stepper .input { min-width: 90px; max-width: 110px; text-align: center }` override (existing rule violation). Use the new `.stepper` widget primitive. |
| `src/components/sections/AssetsSection.svelte` | Restyle only — same fields. |
| `src/components/sections/ExpensesSection.svelte` | Restyle only. |
| `src/components/sections/GoalsSection.svelte` | **Rewrite as a list-of-items.** Header row + N goal rows using the new `.goals-list / .goals-row` primitive. Drop the existing `width: 100%` override on goal inputs (existing rule violation). Below 720px each row collapses to a per-item stacked card layout. |
| `src/components/sections/savings/SavingsSection.svelte` | **Move out of `<CollapsibleCard>`** into a `<section class="report-card">` with `.report-head`, `.report-inputs`, `.report-layers`, `.report-foot`. Keep the same fields (free cash, CBR rate stepper, horizon, include-yield toggle). |
| `src/components/sections/savings/LayerCard.svelte` | Restyle as a `.layer` column inside `.report-layers`. Color-code by layer (A: accent green, B: primary blue, C: warn amber). Add the share bar (`.layer-bar`). |
| `src/components/sections/savings/ClassCard.svelte` | Restyle as a `.layer-class` row inside the layer. |
| `src/components/sections/savings/TaxBanner.svelte` | Restyle to a small inline notice inside the report card footer (or above it). Keep wording. |
| `src/components/sections/savings/AsvWarning.svelte` | Same — small notice inside the report card. |
| `src/components/sections/savings/SavingsDisclaimer.svelte` | Same. |
| `src/components/sections/BreakdownSection.svelte` | Restyle as a wide table inside a `.card.breakdown`. Wrap in `.breakdown-scroll` for horizontal scroll below 720px. |

### 6.3 i18n additions

`src/lib/i18n/{ru,en}.json` — add new keys for status pills, button labels, KPI subtitles. Both files keep parity (run the `diff <(jq …)` check from `verification.md`).

New keys (each must land in both `ru.json` and `en.json` in the same atomic change to keep parity):

```
status.onTrack            "On track" / "По плану"
status.offTrack           "Off track" / "Перерасход"
status.highRateRegime     "High-rate regime" / "Высокие ставки"
status.moderateRegime     "Moderate regime" / "Умеренные ставки"
status.lowRateRegime      "Low-rate regime" / "Низкие ставки"
header.new                "New scenario" / "Новый сценарий"
kpis.balanceAtVoyage      "Balance at voyage" / "Остаток на дату"
kpis.runway               "Runway" / "Запас прочности"
kpis.monthlyBurn          "Monthly expenses" / "Расходы в месяц"
chart.title               "Balance over time" / "Баланс во времени"
chart.legend.projected    "Projected" / "Прогноз"
chart.legend.yield        "Yield" / "Доход"
chart.legend.voyage       "Voyage" / "Рейс"
breakdown.title           "Cash-flow breakdown" / "Денежный поток"
breakdown.header.date     "Date" / "Дата"
breakdown.header.event    "Event" / "Событие"
breakdown.header.type     "Type" / "Тип"
breakdown.header.amount   "Amount" / "Сумма"
breakdown.header.running  "Running" / "Остаток"
```

## 7. Accessibility & motion

- Color contrast: all text/background pairs in both themes meet WCAG AA (4.5:1) verified at design time. The plugin's "Dark Mode (OLED)" preset is AAA-rated; the Light palette is engineered for AA at minimum.
- Touch targets ≥36px on mobile (Apple HIG minimum is 44pt — we use 36px for icon-only buttons because the surrounding 8px gap pushes effective hit-area above 44px).
- Focus rings: 3px ring at `rgba(59,130,246,0.20)` plus `border-color: var(--primary)`. Visible on every interactive element.
- All text labels for icon-only buttons via `aria-label` / `title`.
- `prefers-reduced-motion: reduce` shortens all transitions to 0.01ms and disables the chart-area gradient animation (if any is added).
- Input fields use 16px font on mobile to prevent iOS Safari's focus auto-zoom.
- Scrollbar visuals hidden globally; scrolling itself remains keyboard- and gesture-accessible.

## 8. What we keep from the old system

- `engine.ts`, `allocate.ts`, `instrumentClasses.ts`, `types.ts` — untouched.
- `scenarios.svelte.ts`, `persistence.ts`, `derived.ts` — untouched. `schemaVersion: 2` stays.
- `BalanceChart.svelte`'s Chart.js usage — untouched. We restyle by passing new colors via tokens.
- `print.css` — untouched.
- All existing tests in `tests/calc/**` and `tests/state/**` — must continue to pass without modification.

## 9. Out of scope (deferred)

- PDF/print restyle (keeps paper-terminal palette).
- Atmosphere scanline as an opt-in easter egg.
- A real settings panel (theme/language picker) — for now they stay in the topbar.
- Animations beyond hover/focus transitions (e.g. KPI count-up, chart entry).
- Per-page overrides under `design-system/familycalc/pages/`. v1 uses MASTER only.
- Tauri wrap.

## 10. Testing

| Layer | Verification |
|---|---|
| Math | `npm test` — all `tests/calc/**` and `tests/state/**` pass without changes. |
| Types | `npm run typecheck` — all `.svelte` and `.ts` pass after the restyle. |
| Compile | `npm run build` — Svelte 5 rune compile catches `rune_outside_svelte` mistakes that the type checker misses. |
| i18n parity | `diff <(jq -r 'keys[]' ru.json \| sort) <(jq -r 'keys[]' en.json \| sort)` is empty. |
| Visual / responsive | Manual sweep of the dev server at 1440 / 1024 / 720 / 480 / 375 px. Check: no horizontal scroll, no overlapping fixed elements, touch targets visibly tappable, focus rings on every interactive element. |
| A11y smoke | Tab through every section: focus is visible and order matches visual order; toggle icon buttons announce a label. |
| Print | `Cmd/Ctrl-P` on the dev server: PrintView still renders in paper-terminal palette. |

## 11. Risks

1. **Replacing `global.css` is a primitive-level change** with project-wide blast radius. The mistakes-log explicitly warns: *"Primitive changes in global.css require project-wide use-site inspection before landing."* The implementation plan will list every component file and verify each against the new primitives.
2. **Removing Atmosphere** changes the page background, which the print stylesheet expects to hide. Verify `@media print { .atmos { display: none } }` still does nothing harmful when the element isn't there.
3. **Schema is untouched**, but components rebind to the same `Inputs` fields. Field-level regressions (e.g. forgetting to wire `oninput` on the new `<input>`) are the most likely class of bug. Each section rewrite must keep the same data binding.
4. **Atomic vs. incremental rollout.** A single huge diff is risky to review. The implementation plan will split into atomic tasks (tokens → primitives → topbar → KPIs → chart → form cards → list card → report card → breakdown → cleanup), each with its own verification step.

## 12. Reference

- Persisted plugin design system: `design-system/familycalc/MASTER.md`.
- High-fidelity mockup: `.superpowers/brainstorm/77254-1778867415/content/full-redesign-v2-responsive.html` (served at `http://localhost:55297` while the visual companion is alive).
- Existing aesthetic spec being superseded: `docs/superpowers/specs/2026-05-14-family-calc-design-system.md`.
- Mistakes log driving the structural fix: `.claude/lessons/mistakes-log.md` entries 4–5 (three card kinds; structural mismatch).
