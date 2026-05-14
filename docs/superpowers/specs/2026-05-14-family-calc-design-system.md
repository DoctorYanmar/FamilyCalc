# FamilyCalc — Design System

**Date:** 2026-05-14
**Status:** Approved
**Aesthetic direction:** Terminal / Brutalist — *monospace data terminal, amber-on-near-black, ASCII frames, scan-line motion, deterministic and precise*

This document supplements the main spec (`2026-05-14-family-calc-design.md`) with the visual design system. Implementation tasks reference it.

---

## 1. Vision

> A maritime engineer's instrument panel. Not a slick consumer app — a precise readout. Every number is monospace and tabular. Every section is wrapped in ASCII box-drawing characters. The page breathes with a subtle scanline drift. The amber primary recalls phosphor displays and aviation instruments; the green-mint indicates "course is good." It is calm, dense, and unambiguous.

Reference points: Bloomberg terminal (1990s), Berkeley Graphics, classic UNIX dashboards, the EVA-01 cockpit display, a chartplotter at the helm of a working ship.

It is *intentionally not* generic 2026 fintech. It is *intentionally not* skeuomorphic. It is *intentionally not* decorative. Every visual choice serves data legibility.

---

## 2. Typography

**One typeface family for the entire app: `JetBrains Mono`.**

Loaded from Google Fonts (preconnect + display=swap):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Weights used: `400` (body), `500` (subtle emphasis), `600` (numbers, labels), `700` (display KPI, brand).

**Type scale (px):**
- `--t-micro: 9` — ASCII art accents
- `--t-mini:  10` — section labels, all-caps tracked
- `--t-small: 11` — body labels, row keys
- `--t-base:  12` — body, default
- `--t-med:   14` — inputs
- `--t-lg:    18` — card titles
- `--t-xl:    24` — section headlines
- `--t-2xl:   34` — secondary KPIs
- `--t-3xl:   52` — primary KPI (left on voyage)

**Letter-spacing (tracking):**
- Default: `0.01em` (slight loosening on monospace improves readability)
- Labels (uppercase): `0.16em` to `0.20em`
- KPI display number: `-0.02em` (slight tightening on the big number)

**Text styles:**
- All `<label>` text and section labels: `text-transform: uppercase; letter-spacing: 0.18em; font-weight: 600; color: var(--muted);`
- All numbers carry: `font-feature-settings: 'tnum';`
- Body text: regular case, weight 400, `--t-base`.

---

## 3. Color palette

Dark theme (default):

```css
:root[data-theme='dark'] {
  /* Surfaces — deep near-black with warm undertone */
  --bg:         #060606;
  --surface-1:  #0a0a0a;
  --surface-2:  #0f0f0f;
  --surface-3:  #141414;

  /* Borders — hairline gradations */
  --border:     #1f1f1f;
  --border-2:   #2a2a2a;
  --border-3:   #404040;

  /* Text */
  --fg:         #e4e4e4;
  --fg-dim:     #b4b4b4;
  --muted:      #707070;
  --label:      #525252;

  /* Phosphor-amber primary accent */
  --amber:      #ffb454;
  --amber-soft: rgba(255, 180, 84, 0.12);
  --amber-deep: #b87f30;

  /* Status colors */
  --ok:         #7dd3a0;
  --warn:       #f5d77a;
  --danger:     #ec8989;
  --info:       #7ba8f5;
}
```

Light "paper-terminal" theme (PDF + light toggle):

```css
:root[data-theme='light'] {
  --bg:         #f5f1e8;
  --surface-1:  #f0ebde;
  --surface-2:  #ebe5d4;
  --surface-3:  #e3dcc8;
  --border:     #c8bfa8;
  --border-2:   #a89e85;
  --border-3:   #6e6655;
  --fg:         #1a1815;
  --fg-dim:     #4a4538;
  --muted:      #6e6655;
  --label:      #8a8270;
  --amber:      #b8651d;
  --amber-soft: rgba(184, 101, 29, 0.10);
  --amber-deep: #8a4810;
  --ok:         #2f7a4d;
  --warn:       #a07a1d;
  --danger:     #b53232;
  --info:       #2e5fa5;
}
```

**Usage discipline:**
- The amber (`--amber`) is reserved for: the primary KPI number, active section labels, focus-ring color, hover accent on rate stepper. Used sparingly = potent.
- `--ok` is reserved for green status states (✓ OK, surplus growth).
- `--danger` for runs-out date, deficit balance, delete-hover.
- Most of the UI is grays. Color creates hierarchy.

---

## 4. Spacing

4px base. Used names not numbers (less arbitrary):

```css
--gap-px:    1px;   /* hairlines */
--gap-2:     2px;
--gap-1:     4px;
--gap-2:     8px;
--gap-3:     12px;
--gap-4:     16px;
--gap-5:     20px;
--gap-6:     24px;
--gap-8:     32px;
--gap-10:    40px;
--gap-12:    48px;
```

Page outer max-width: `760px`. Outer padding: `24px` (mobile) → `32px` (desktop).

---

## 5. Borders, corners, shadows

- **All corners sharp.** `border-radius: 0` globally. Exception: nothing.
- **All borders 1px solid `var(--border)`** for hairlines, `var(--border-2)` for stronger, `var(--border-3)` for hover/focus.
- **No drop shadows on cards/buttons.** Terminal displays are flat. Use border or background-color change to create depth.
- **Focus ring**: `outline: 1px solid var(--amber); outline-offset: -1px;` on inputs.

---

## 6. ASCII ornamentation

Use sparingly for terminal feel, never gimmicky:

```
┌─────────────────────────────────────┐
│  CONTENT                            │
└─────────────────────────────────────┘
```

Rendered with a Svelte component `AsciiFrame` that wraps content with these characters as `<pre>` elements above and below, sized to match section width (full character row using `─`).

Used on:
- Sticky results card (top + bottom heavy frame in `--amber`)
- Section dividers (single horizontal `─` line in `--border-3`)
- Print view chapter breaks (`= = = = =` style)

Section ornaments between cards (purely typographic, replacing the earlier "· · ·"):

```
─── ─── ───
```

Centered, `--label` color, `--t-small` size, `letter-spacing: 0.4em`.

Section markers in headers:

```
> CONTEXT
> ASSETS
> GOALS [3]
> INSTRUMENTS [2]
```

The `>` is the amber accent. Like a UNIX prompt.

---

## 7. Visual atmosphere

Three layered effects, always on:

### 7.1 Scanline drift

A 2px-tall amber-tinted gradient strip moves top-to-bottom of the viewport every 8 seconds:

```css
.scanline {
  position: fixed;
  left: 0; right: 0; top: -2px;
  height: 2px;
  background: linear-gradient(180deg, transparent, rgba(255,180,84,0.10), transparent);
  pointer-events: none;
  z-index: 100;
  animation: scan 8s linear infinite;
}
@keyframes scan { to { top: 100%; } }
```

Print view: hidden.

### 7.2 Faint scanlines (static)

A 1-pixel repeating horizontal-line texture at 2% opacity over the entire body:

```css
body::after {
  content: '';
  position: fixed; inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(255,255,255,0.018) 0,
    rgba(255,255,255,0.018) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 99;
}
```

Print view: hidden.

### 7.3 Vignette

A subtle radial fade at the corners:

```css
body::before {
  content: '';
  position: fixed; inset: 0;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4));
  pointer-events: none;
  z-index: 98;
}
```

Together these three layers give the page a phosphor-display feel without being heavy-handed.

---

## 8. Motion

User selected *Rich* motion. This means:

### 8.1 Number count-ups

Every money number animates from its previous value to its new value over 400ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`. Implemented via Svelte's `tweened` store:

```ts
// src/lib/motion/animatedNumber.ts
import { tweened } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';
export function animatedRub(initial: number) {
  return tweened(initial, { duration: 400, easing: cubicOut });
}
```

Used in `ResultsHeader` for `balanceAtVoyage`, in section subtitles for totals, in row impact lines.

### 8.2 Cursor blink

The big KPI number is followed by a non-breaking-block cursor:

```css
.cursor {
  display: inline-block;
  width: 0.55em; height: 1.05em;
  background: var(--amber);
  vertical-align: -0.15em;
  margin-left: 6px;
  animation: blink 1.2s steps(2) infinite;
}
@keyframes blink { 50% { opacity: 0; } }
```

### 8.3 Scanline drift (described above)

### 8.4 Section reveal on load

Cards fade-and-shift in with staggered delays (100ms increments):

```css
@keyframes reveal {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.results, .chart, .card { animation: reveal 0.45s cubic-bezier(0.22,1,0.36,1) both; }
.card:nth-of-type(1) { animation-delay: 0.10s; }
.card:nth-of-type(2) { animation-delay: 0.16s; }
.card:nth-of-type(3) { animation-delay: 0.22s; }
.card:nth-of-type(4) { animation-delay: 0.28s; }
.card:nth-of-type(5) { animation-delay: 0.34s; }
.card:nth-of-type(6) { animation-delay: 0.40s; }
```

### 8.5 Type-on for status text

The brand title "FAMILYCALC :: LEAVE BUDGET" types in character-by-character on first load (40ms per character). This is a one-time delight; subsequent re-renders skip it. Implemented as a Svelte action.

### 8.6 Hover effects

- Buttons: border shifts from `--border-2` → `--amber` over 120ms
- Inputs: focused border `--amber` + 1px outline glow
- Delete button: border + text shift to `--danger` on hover
- Chart hover: a vertical crosshair line follows the cursor in `--amber-soft`

### 8.7 Respect for `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  .scanline { display: none; }
}
```

---

## 9. Component patterns

### 9.1 Header / brand

```
FAMILYCALC :: LEAVE BUDGET                      14.MAY.2026 / 22:14
[Default scenario ▾] [+] [⤓] [⤒] [RU|EN] [☀] [🖨]
```

Brand text: `JetBrains Mono`, weight 700, `--t-lg`, all caps, `--amber` for "FAMILYCALC", `--fg` for "::" and rest.

Timestamp in the corner: `--t-mini`, `--muted`. Format: `DD.MMM.YYYY / HH:MM`. Auto-updates every minute.

### 9.2 Sticky results "panel"

```
┌──────────────────────────────────────────────────┐
│  LEFT ON VOYAGE                                  │
│  ₽1,250,000█                                     │
│  ≈ $13,888 @ 90 ₽/$ · ✓ holding course           │
└──────────────────────────────────────────────────┘
```

- Outer: 1px solid `--amber` border (the only amber border in the app), `--surface-2` background, `--gap-6` padding.
- Top/bottom rows: `pre` elements rendering `─` characters to fill the width using a `repeat(120,'─')` pattern, colored `--amber`.
- KPI label: `--t-mini`, uppercase, `--muted`, `letter-spacing: 0.20em`, with a small `●` blinking amber dot prefix.
- KPI number: `--t-3xl` (52px), weight 700, `--amber`, followed by the blinking cursor block.
- Subtitle: `--t-small`, `--muted`, monospace, with `·` separators between fields.

Stats column (runway, runs out, burn/day, yield): each row is `KEY ........ VALUE` with dot-leader pattern in `--muted`, value in `--fg`.

### 9.3 Cards

```
> CONTEXT & RATE                              5 mo 12 d
─────────────────────────────────────────────────────
  return_dt    [ 2026-05-01      ]
  voyage_dt    [ 2026-10-01      ]
  lump_sum     [        30,000 $ ]
  rate ₽/$     [-][  90.50  ][+]
```

- Header line: `> SECTION NAME` in `--amber` for `>` and section name; right-aligned subtitle in `--muted` `--t-small`.
- Divider: 1px `--border-2` line.
- Fields: 2-column grid; left is `--muted` lowercase_snake key in mono `--t-small`; right is the input wrapped in `[ value ]` style (the brackets are rendered via `::before`/`::after` pseudo-elements in `--label` color).

### 9.4 Inputs

```css
.input {
  background: var(--surface-3);
  border: 1px solid var(--border-2);
  color: var(--amber);
  font: 500 14px/1.4 var(--mono);
  padding: 6px 10px;
  border-radius: 0;
  font-feature-settings: 'tnum';
  text-align: right;
}
.input:focus { border-color: var(--amber); outline: 1px solid var(--amber-soft); outline-offset: 0; }
```

Numeric values type in amber to match the phosphor feel; date and text inputs in `--fg`.

### 9.5 Buttons

```
[ + ADD GOAL ]
```

Borders carry the `[ ]` brackets via pseudo-elements:

```css
.btn::before { content: '[ '; color: var(--label); }
.btn::after  { content: ' ]'; color: var(--label); }
```

Hover: brackets and text shift to `--amber`.

Primary action variants are not differentiated by fill color (no blue buttons) — only by border weight. Destructive (delete) uses `--danger` on hover.

### 9.6 Lists (goals, investments)

```
> GOALS [3]
─────────────────────────────────────────────────────
  car_toyota      [ 2,000,000 ₽ ] [ lump ▾  ] [ 2026-07-15 ]   [×]
  → pulls 2,000,000 ₽ on jul 15 · drops to 480,000 ₽

  kitchen_repair  [   500,000 ₽ ] [ spread ▾] [ 06-01 → 08-31]  [×]
  → 5,555 ₽/day across 90 days

[ + ADD GOAL ]
```

The impact line under each row is `--ok` color, prefixed with `→`, `--t-mini`.

### 9.7 Chart

A line chart on a graph-paper grid (`linear-gradient` background at `--surface-3` color, 25% interval). Line is `--amber` 1.5px stroke. Fill below at 8% opacity. Goal events appear as small ringed dots; the dot is `--surface-1` filled with `--amber` 1.5px stroke ring. A tiny ascii label appears next to each marker (e.g., "CAR · JUL 15") in `--t-micro` `--muted`.

When result updates, the line redraws with a 600ms stroke-dasharray animation (length from 0 to total length).

### 9.8 Monthly breakdown table

Pure text table:

```
MONTH    OPENING    SPENT     GOALS     CLOSING
─────────────────────────────────────────────────
2026-05  733 500    30 554        0     702 946
2026-06  702 946    30 554   166 667    505 725
2026-07  505 725    30 554 2 166 667 -1 691 496
```

Tabular numerals, right-aligned, with a subtle background stripe on alternating rows (`--surface-2`).

### 9.9 Print view (paper-terminal)

The print stylesheet swaps theme tokens to "paper-terminal":
- Background: `#f5f1e8` (warm paper)
- Text: `#1a1815` (warm ink)
- Amber → `#b8651d` (brown ink)
- Borders: solid `#c8bfa8` (light parchment line)
- Scanline / vignette / static-lines: hidden
- ASCII frames remain
- Page-break-inside: avoid on every section

Mobile-readable: 12pt base font, A4 portrait, 14mm margins. Section headers `> CONTEXT` etc remain.

---

## 10. Sound (deferred)

No sound in MVP. Future option: terminal keystroke chirp on input, soft beep on "runs out" computed result. Off by default.

---

## 11. Tokens summary (CSS file)

The complete token sheet `src/styles/tokens.css`:

```css
:root {
  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  --t-micro: 9px;
  --t-mini:  10px;
  --t-small: 11px;
  --t-base:  12px;
  --t-med:   14px;
  --t-lg:    18px;
  --t-xl:    24px;
  --t-2xl:   34px;
  --t-3xl:   52px;

  --gap-px:  1px;
  --gap-1:   4px;
  --gap-2:   8px;
  --gap-3:   12px;
  --gap-4:   16px;
  --gap-5:   20px;
  --gap-6:   24px;
  --gap-8:   32px;
  --gap-10:  40px;
  --gap-12:  48px;
}

:root[data-theme='dark'] {
  --bg: #060606; --surface-1: #0a0a0a; --surface-2: #0f0f0f; --surface-3: #141414;
  --border: #1f1f1f; --border-2: #2a2a2a; --border-3: #404040;
  --fg: #e4e4e4; --fg-dim: #b4b4b4; --muted: #707070; --label: #525252;
  --amber: #ffb454; --amber-soft: rgba(255,180,84,0.12); --amber-deep: #b87f30;
  --ok: #7dd3a0; --warn: #f5d77a; --danger: #ec8989; --info: #7ba8f5;
}

:root[data-theme='light'] {
  --bg: #f5f1e8; --surface-1: #f0ebde; --surface-2: #ebe5d4; --surface-3: #e3dcc8;
  --border: #c8bfa8; --border-2: #a89e85; --border-3: #6e6655;
  --fg: #1a1815; --fg-dim: #4a4538; --muted: #6e6655; --label: #8a8270;
  --amber: #b8651d; --amber-soft: rgba(184,101,29,0.10); --amber-deep: #8a4810;
  --ok: #2f7a4d; --warn: #a07a1d; --danger: #b53232; --info: #2e5fa5;
}
```

---

## 12. Implementation impact on the plan

The MVP plan `2026-05-14-family-calc.md` is updated as follows:

- **Task 1 (scaffold)**: unchanged.
- **Task 21 (global.css)**: replaced — uses tokens.css + atmospheric overlays + component base styles described here.
- **New Task 21B (fonts.css)**: load JetBrains Mono via Google Fonts.
- **New Task 21C (motion.ts)**: animatedRub tweened-store helper.
- **New Task 21D (atmosphere component)**: `Atmosphere.svelte` mounting the scanline + scanline-static + vignette overlays. Mounted in `App.svelte`.
- **Tasks 22–34 (components)**: updated styling sections to match. Logic is unchanged.
- **Task 37 (PrintView)**: print-stylesheet uses the paper-terminal light theme.

These changes preserve the architecture and data model untouched. Only the styling and motion layers change.
