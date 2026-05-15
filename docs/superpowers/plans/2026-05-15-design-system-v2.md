# Design System v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Terminal/Brutalist visual surface with a deterministic, mobile-friendly, professional dashboard aesthetic per `docs/superpowers/specs/2026-05-15-design-system-v2-design.md`, without touching engine, allocate, state, persistence, schema, or i18n keys (only new keys are added).

**Architecture:** Pure restyle — tokens.css + global.css are replaced wholesale; every `.svelte` component is restyled to use the new primitives. Math/state/persistence files are untouched. Three explicit card kinds (form / list / report) replace the implicit "everything is a `.card`" pattern that drove the mistakes-log saga. Atmosphere overlay is removed from the default surface (file kept for future toggle).

**Tech Stack:** Svelte 5 (runes), Vite, TypeScript, Chart.js, svelte-i18n, Google Fonts (Fira Code + Fira Sans).

**Reference mockup:** `.superpowers/brainstorm/77254-1778867415/content/full-redesign-v2-responsive.html` — open in `http://localhost:55297` while the visual companion server is alive. This is the source of truth for any visual decision the spec doesn't explicitly cover.

---

## Working tree state on start

`git status --short` shows uncommitted modifications to:

```
 M src/components/ScenarioPicker.svelte
 M src/components/sections/GoalsSection.svelte
 M src/lib/i18n/en.json
 M src/lib/i18n/ru.json
 M src/styles/global.css
```

These are mid-saga changes from the alignment thread. Task 1 commits them as a recovery checkpoint so we never silently overwrite work; the redesign tasks then proceed on top of that commit.

---

## Verification commands (used throughout)

```bash
npm test                   # vitest, single run — pure math + state suites
npm run typecheck          # svelte-check + tsc --noEmit
npm run build              # full Vite build — Svelte compiler catches rune_outside_svelte
npm run dev                # http://localhost:5173 — manual responsive sweep
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
                           # i18n parity — empty output = ok
```

Responsive sweep widths: **1440 / 1024 / 720 / 480 / 375** px. Use Chrome DevTools device toolbar.

---

## Task 1: Checkpoint the in-progress savings work

**Files:**
- Stage: `src/components/ScenarioPicker.svelte`, `src/components/sections/GoalsSection.svelte`, `src/lib/i18n/en.json`, `src/lib/i18n/ru.json`, `src/styles/global.css`

- [ ] **Step 1: Inspect what is uncommitted**

Run: `git status --short && git diff --stat HEAD`
Expected: 5 modified files, no untracked.

- [ ] **Step 2: Stage and commit as a checkpoint**

```bash
git add src/components/ScenarioPicker.svelte src/components/sections/GoalsSection.svelte src/lib/i18n/en.json src/lib/i18n/ru.json src/styles/global.css
git commit -m "$(cat <<'EOF'
chore: checkpoint pre-redesign state of alignment-saga work

Captures in-progress modifications from the alignment thread before the
design-system-v2 redesign rewrites these files. Provides a recovery
point should we need to compare the new redesign against the last
non-redesign state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify clean tree**

Run: `git status --short`
Expected: no output (clean working tree).

---

## Task 2: Replace `tokens.css` with v2 tokens

**Files:**
- Modify: `src/styles/tokens.css` (complete rewrite)

- [ ] **Step 1: Write the new tokens file**

Replace the entire contents of `src/styles/tokens.css` with:

```css
:root {
  --mono: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: 'Fira Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* Type scale */
  --t-micro: 10px;
  --t-mini:  11px;
  --t-small: 12px;
  --t-base:  13px;
  --t-med:   14px;
  --t-lg:    16px;
  --t-xl:    18px;
  --t-2xl:   22px;
  --t-3xl:   28px;
  --t-4xl:   36px;

  /* Spacing scale (4px base) */
  --gap-1:  4px;
  --gap-2:  8px;
  --gap-3:  12px;
  --gap-4:  16px;
  --gap-5:  20px;
  --gap-6:  24px;
  --gap-8:  32px;
  --gap-10: 40px;
  --gap-12: 48px;

  /* Radii */
  --radius-sm: 6px;
  --radius:    10px;
  --radius-lg: 14px;
}

:root[data-theme='dark'] {
  --bg:           #0F172A;
  --bg-elevated:  #131D33;
  --surface-1:    #1A2540;
  --surface-2:    #1F2D4D;
  --border:       rgba(255, 255, 255, 0.08);
  --border-strong:rgba(255, 255, 255, 0.14);
  --fg:           #F8FAFC;
  --fg-2:         #CBD5E1;
  --fg-3:         #94A3B8;
  --fg-4:         #64748B;
  --muted:        #64748B;
  --label:        #64748B;
  --primary:      #3B82F6;
  --primary-2:    #1E40AF;
  --accent:       #10B981;
  --accent-2:     #059669;
  --warn:         #F59E0B;
  --danger:       #DC2626;
  --info:         #38BDF8;
  --ok:           #10B981;

  /* Legacy aliases (kept while components migrate; remove after Task 23) */
  --amber:        #F59E0B;
  --amber-soft:   rgba(245, 158, 11, 0.12);
  --amber-deep:   #D97706;
  --border-2:     rgba(255, 255, 255, 0.10);
  --border-3:     rgba(255, 255, 255, 0.18);
  --fg-dim:       #CBD5E1;
}

:root[data-theme='light'] {
  --bg:           #FFFFFF;
  --bg-elevated:  #F8FAFC;
  --surface-1:    #F1F5F9;
  --surface-2:    #E2E8F0;
  --border:       rgba(15, 23, 42, 0.08);
  --border-strong:rgba(15, 23, 42, 0.16);
  --fg:           #0F172A;
  --fg-2:         #334155;
  --fg-3:         #64748B;
  --fg-4:         #94A3B8;
  --muted:        #64748B;
  --label:        #94A3B8;
  --primary:      #2563EB;
  --primary-2:    #1E40AF;
  --accent:       #059669;
  --accent-2:     #047857;
  --warn:         #D97706;
  --danger:       #B91C1C;
  --info:         #0284C7;
  --ok:           #059669;

  --amber:        #D97706;
  --amber-soft:   rgba(217, 119, 6, 0.10);
  --amber-deep:   #B45309;
  --border-2:     rgba(15, 23, 42, 0.12);
  --border-3:     rgba(15, 23, 42, 0.24);
  --fg-dim:       #334155;
}
```

- [ ] **Step 2: Verify the file compiles into the build**

Run: `npm run build`
Expected: build succeeds; no CSS parse errors. (Visual will still be broken — global.css still references old tokens.)

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "$(cat <<'EOF'
style(tokens): introduce v2 dark/light palettes

Replaces the phosphor-amber/paper-terminal tokens with the dark-OLED
trust-blue + profit-green palette from design-system/familycalc/MASTER.md.
Light mode swapped from paper-beige to a true white/slate palette.
Legacy --amber / --border-2 / --border-3 / --fg-dim aliases kept
temporarily so components migrate one file at a time; aliases removed
in the final cleanup task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add Google Fonts (Fira Code + Fira Sans)

**Files:**
- Modify: `index.html`
- Modify: `src/app.css`

- [ ] **Step 1: Add preconnect + stylesheet to `index.html`**

In `index.html`, inside `<head>` before any other `<link>`, add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Verify dev-server fetches the fonts**

Run: `npm run dev` and load `http://localhost:5173`. In DevTools → Network, filter on "font". Confirm `firacode-...woff2` and `firasans-...woff2` load with 200 status. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
style(fonts): preload Fira Code + Fira Sans from Google Fonts

Eager <link> in index.html (not async @import) so first paint already
has the typography. Bundle is ~6 of 14 weights — both fonts ship gzipped
under 60KB combined for the loaded subsets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Replace `global.css` with v2 primitives

**Files:**
- Modify: `src/styles/global.css` (complete rewrite)

- [ ] **Step 1: Write the new primitives**

Replace the entire contents of `src/styles/global.css` with the following. This is the *primitive vocabulary* — every component reads from these classes; no component invents its own width or alignment override.

```css
@import './tokens.css';

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--sans);
  font-size: var(--t-med);
  line-height: 1.5;
  font-feature-settings: 'tnum';
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Hide scrollbar visuals (scrolling itself remains active) */
html, body, .breakdown-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar,
.breakdown-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

body {
  background:
    radial-gradient(900px 600px at 80% -10%, rgba(59,130,246,0.07), transparent 70%),
    radial-gradient(700px 500px at 0% 0%,   rgba(16,185,129,0.04), transparent 70%),
    var(--bg);
  min-height: 100dvh;
  overflow-x: hidden;
}

:root[data-theme='light'] body {
  background:
    radial-gradient(900px 600px at 80% -10%, rgba(37,99,235,0.04), transparent 70%),
    radial-gradient(700px 500px at 0% 0%,   rgba(5,150,105,0.025), transparent 70%),
    var(--bg);
}

::selection { background: var(--primary); color: #fff; }

button, input, select, textarea {
  font: inherit;
  color: inherit;
}

a { color: var(--primary); }

/* ────────── App shell ────────── */
.app-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--gap-6) var(--gap-12);
  position: relative;
  z-index: 1;
}
@media (max-width: 640px) {
  .app-shell { padding: 0 var(--gap-3) var(--gap-8); }
}

/* ────────── Topbar ────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap-5) 0 var(--gap-4);
  border-bottom: 1px solid var(--border);
  gap: var(--gap-3);
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--gap-2);
  font-family: var(--mono);
  font-weight: 600;
  font-size: var(--t-lg);
  letter-spacing: -0.01em;
  white-space: nowrap;
  min-width: 0;
}
.brand-mark {
  width: 28px; height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #fff;
  font-family: var(--mono);
  font-weight: 700;
  font-size: var(--t-med);
}
.brand-sep { color: var(--fg-4); font-weight: 400; }
.brand-sub { color: var(--fg-3); font-weight: 400; font-size: var(--t-base); }
.topbar-tools {
  display: flex;
  align-items: center;
  gap: var(--gap-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}
.clock {
  font-family: var(--mono);
  font-size: var(--t-small);
  color: var(--fg-4);
  padding-right: var(--gap-3);
  border-right: 1px solid var(--border);
  letter-spacing: 0.06em;
}
.divider-v { width: 1px; height: 24px; background: var(--border); }

@media (max-width: 900px) {
  .clock, .divider-v { display: none; }
}
@media (max-width: 720px) {
  .topbar { padding: var(--gap-3) 0; }
  .topbar-tools { gap: 6px; }
  .btn .btn-label { display: none; }
  .btn { padding: 8px; }
}
@media (max-width: 480px) {
  .topbar {
    padding: 10px 0;
    gap: var(--gap-2);
    align-items: center;
  }
  .brand { font-size: var(--t-base); gap: var(--gap-2); letter-spacing: 0; }
  .brand-mark { width: 22px; height: 22px; border-radius: 5px; font-size: var(--t-small); }
  .brand-sep, .brand-sub { display: none; }
  .topbar-tools {
    gap: var(--gap-1);
    flex: 1;
    min-width: 0;
    flex-wrap: nowrap;
  }
  .topbar-tools .btn[data-secondary] { display: none; }
  .btn {
    padding: 8px;
    min-height: 36px;
    min-width: 36px;
    border-radius: var(--radius-sm);
  }
  .btn.icon { padding: 8px; min-width: 36px; }
  .btn svg { width: 14px; height: 14px; }
}
@media (max-width: 380px) {
  .brand-mark { display: none; }
  .brand { font-size: var(--t-small); }
}

/* ────────── Subbar (status pills row) ────────── */
.subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap-4) 0;
  gap: var(--gap-4);
  flex-wrap: wrap;
}
.subbar-group {
  display: flex;
  align-items: center;
  gap: var(--gap-3);
  flex-wrap: wrap;
  min-width: 0;
}
.subbar-meta { color: var(--fg-3); font-size: var(--t-base); }
.subbar-meta strong { color: var(--fg); font-weight: 600; }
@media (max-width: 640px) {
  .subbar { padding: var(--gap-3) 0; gap: var(--gap-2); }
  .subbar-meta { font-size: var(--t-small); }
}

/* ────────── Status pills ────────── */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16,185,129,0.10);
  color: var(--accent);
  border: 1px solid rgba(16,185,129,0.30);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: var(--t-mini);
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.status-pill .dot {
  width: 6px; height: 6px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(16,185,129,0.6);
}
.status-pill.warn  { color: var(--warn);   border-color: rgba(245,158,11,0.30); background: rgba(245,158,11,0.10); }
.status-pill.warn  .dot { background: var(--warn);   box-shadow: 0 0 8px rgba(245,158,11,0.6); }
.status-pill.info  { color: var(--info);   border-color: rgba(56,189,248,0.30); background: rgba(56,189,248,0.10); }
.status-pill.info  .dot { background: var(--info);   box-shadow: 0 0 8px rgba(56,189,248,0.6); }
.status-pill.danger{ color: var(--danger); border-color: rgba(220,38,38,0.30);  background: rgba(220,38,38,0.10); }
.status-pill.danger .dot { background: var(--danger); box-shadow: 0 0 8px rgba(220,38,38,0.6); }

/* ────────── Buttons ────────── */
.btn {
  background: var(--bg-elevated);
  color: var(--fg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-family: var(--sans);
  font-size: var(--t-small);
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
}
.btn:hover { background: var(--surface-1); border-color: var(--border-strong); color: var(--fg); }
.btn:focus-visible {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.20);
}
.btn.primary { background: var(--primary); color: #fff; border-color: transparent; }
.btn.primary:hover { background: var(--primary-2); }
.btn.icon { padding: 8px; min-width: 36px; justify-content: center; }
.btn.danger { color: var(--danger); }
.btn.danger:hover { border-color: var(--danger); background: rgba(220,38,38,0.08); color: var(--danger); }
.btn-block {
  width: 100%;
  background: transparent;
  border-style: dashed;
  border-color: var(--border-strong);
  color: var(--primary);
  justify-content: center;
}
.btn-block:hover { background: rgba(59,130,246,0.06); border-color: var(--primary); color: var(--primary); }
.btn svg {
  width: 14px; height: 14px;
  stroke: currentColor; fill: none;
  stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
}

/* ────────── Cards (FORM kind — Context/Assets/Expenses/Summary) ────────── */
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap-4) var(--gap-5);
  border-bottom: 1px solid var(--border);
  gap: var(--gap-3);
}
.card-title {
  font-family: var(--mono);
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--fg);
  letter-spacing: -0.005em;
}
.card-meta {
  color: var(--fg-4);
  font-size: var(--t-mini);
  font-family: var(--mono);
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.card-body { padding: var(--gap-3) var(--gap-5) var(--gap-4); }
@media (max-width: 480px) {
  .card-head { padding: var(--gap-3) var(--gap-4); }
  .card-body { padding: var(--gap-2) var(--gap-4) var(--gap-3); }
}

/* ────────── Field row (form-section pattern) ────────── */
.field {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--gap-3);
  padding: var(--gap-2) 0;
  min-height: 44px;
}
.field + .field { border-top: 1px solid var(--border); }
.field-key {
  color: var(--fg-2);
  font-size: var(--t-base);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.field-hint, .field-key .hint {
  color: var(--fg-4);
  font-size: var(--t-mini);
}

/* ────────── Inputs / selects ────────── */
.input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--fg);
  font-family: var(--mono);
  font-size: var(--t-lg);            /* 16px — prevents iOS auto-zoom */
  padding: 8px 10px;
  width: 180px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  min-height: 40px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input.text { text-align: left; font-family: var(--sans); font-size: var(--t-med); }
.input.date { text-align: left; font-family: var(--mono); font-size: var(--t-med); }
.input::placeholder { color: var(--fg-4); }
.input:focus, .select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.20);
}
.input[readonly] { color: var(--fg-3); cursor: default; }

.input-wrap {
  position: relative;
  display: inline-block;
}
.input-wrap .suffix {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--fg-4);
  font-family: var(--mono);
  font-size: var(--t-base);
  pointer-events: none;
}
.input.with-suffix { padding-right: 30px; }

.select {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--fg);
  font-family: var(--sans);
  font-size: var(--t-med);
  padding: 8px 30px 8px 10px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
  min-height: 40px;
}

@media (max-width: 480px) {
  .field {
    grid-template-columns: 1fr;
    gap: var(--gap-1);
  }
  .field-key { font-size: var(--t-small); color: var(--fg-3); }
  .input, .select {
    width: 100%;
    text-align: left;
    font-size: var(--t-lg);
  }
  .input-wrap { display: block; width: 100%; }
}

/* ────────── Stepper widget (rate inputs, etc.) ────────── */
.stepper {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg);
  min-height: 40px;
}
.stepper button {
  background: transparent;
  border: 0;
  color: var(--fg-3);
  cursor: pointer;
  padding: 0 14px;
  font-family: var(--mono);
  font-size: var(--t-lg);
  min-width: 44px;
}
.stepper button:hover { background: var(--surface-1); color: var(--fg); }
.stepper .stepper-val {
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  padding: 8px 14px;
  font-family: var(--mono);
  font-size: var(--t-med);
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  min-width: 90px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}
@media (max-width: 480px) {
  .stepper { width: 100%; }
  .stepper .stepper-val { flex: 1; }
}

/* ────────── KPI tiles ────────── */
.kpis {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: var(--gap-3);
  margin-bottom: var(--gap-4);
}
.kpi {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--gap-5);
  position: relative;
  overflow: hidden;
}
.kpi.hero {
  background: linear-gradient(135deg, rgba(59,130,246,0.10), rgba(16,185,129,0.06) 100%), var(--bg-elevated);
  border-color: rgba(59,130,246,0.25);
}
.kpi-label {
  display: flex; align-items: center; gap: 6px;
  color: var(--fg-3);
  font-size: var(--t-small); font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.kpi-val {
  font-family: var(--mono);
  font-size: var(--t-4xl);
  font-weight: 600;
  margin: var(--gap-2) 0 var(--gap-1);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--fg);
}
.kpi.hero .kpi-val {
  background: linear-gradient(180deg, var(--fg), color-mix(in srgb, var(--primary) 70%, var(--fg)) 200%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.kpi-sub {
  display: flex; align-items: baseline; gap: 8px;
  color: var(--fg-3); font-size: var(--t-small);
  font-family: var(--mono); font-variant-numeric: tabular-nums;
  flex-wrap: wrap;
}
.kpi-sub .delta { color: var(--accent); font-weight: 600; }
.kpi-sub .delta.down { color: var(--danger); }

@media (max-width: 900px) {
  .kpis { grid-template-columns: 1fr 1fr; }
  .kpi.hero { grid-column: 1 / -1; }
}
@media (max-width: 480px) {
  .kpis { grid-template-columns: 1fr; gap: var(--gap-2); }
  .kpi.hero { grid-column: auto; }
  .kpi { padding: var(--gap-4); }
  .kpi-val { font-size: var(--t-3xl); }
}

/* ────────── Two-column section grid ────────── */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap-4);
}
.span-2 { grid-column: 1 / -1; }
@media (max-width: 900px) {
  .grid-2 { grid-template-columns: 1fr; }
}

/* ────────── List of items (Goals) ────────── */
.goals-list { margin: 0 calc(-1 * var(--gap-5)); }
.goals-row {
  display: grid;
  grid-template-columns: var(--goals-cols, minmax(140px, 1.6fr) 110px 100px 130px 130px 36px 36px);
  gap: var(--gap-2);
  align-items: center;
  padding: var(--gap-2) var(--gap-5);
  border-top: 1px solid var(--border);
}
.goals-row.header {
  color: var(--fg-4);
  font-size: var(--t-micro);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding-top: var(--gap-3);
  padding-bottom: var(--gap-3);
  background: rgba(255,255,255,0.015);
}
.goals-row:hover:not(.header) { background: rgba(255,255,255,0.02); }
.goals-row .input,
.goals-row .select {
  width: 100%; min-width: 0;
  text-align: left;
  padding: 6px 8px;
  font-size: var(--t-base);
  min-height: 36px;
}
.goals-row .input.amount { text-align: right; }
.goals-row.disabled { opacity: 0.55; }

/* List collapses to per-item card under 720px */
@media (max-width: 720px) {
  .goals-list { margin: 0; }
  .goals-row.header { display: none; }
  .goals-row {
    grid-template-columns: 1fr auto auto;
    grid-template-areas:
      'name   toggle delete'
      'amount mode   mode'
      'date   end    end';
    gap: var(--gap-2);
    padding: var(--gap-3) 0;
  }
  .goals-row > .cell-name   { grid-area: name; font-weight: 600; }
  .goals-row > .cell-amount { grid-area: amount; }
  .goals-row > .cell-mode   { grid-area: mode; }
  .goals-row > .cell-date   { grid-area: date; }
  .goals-row > .cell-end    { grid-area: end; }
  .goals-row > .cell-toggle { grid-area: toggle; justify-self: end; }
  .goals-row > .cell-delete { grid-area: delete; justify-self: end; }
}

/* ────────── Icon button ────────── */
.icon-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--fg-4);
  width: 36px; height: 36px;
  display: grid; place-items: center;
  cursor: pointer; padding: 0;
  transition: all 100ms ease;
}
.icon-btn:hover { background: var(--surface-1); color: var(--fg); border-color: var(--border-strong); }
.icon-btn.danger:hover { color: var(--danger); border-color: var(--danger); }
.icon-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* ────────── Toggle (sliding switch) ────────── */
.toggle-cb {
  width: 36px; height: 22px;
  border-radius: 12px;
  background: var(--surface-2);
  position: relative;
  cursor: pointer;
  transition: background 150ms ease;
  flex-shrink: 0;
  display: inline-block;
}
.toggle-cb::after {
  content: '';
  position: absolute;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--fg-3);
  top: 3px;
  left: 3px;
  transition: left 150ms ease, background 150ms ease;
}
.toggle-cb.on { background: var(--primary); }
.toggle-cb.on::after { left: 17px; background: #fff; }

/* ────────── Report card (Savings — DISTINCT chrome) ────────── */
.report-card {
  background: linear-gradient(135deg, rgba(59,130,246,0.05), rgba(16,185,129,0.03) 100%), var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
}
.report-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap-4) var(--gap-5);
  border-bottom: 1px solid var(--border-strong);
  background: rgba(255,255,255,0.01);
  gap: var(--gap-3);
  flex-wrap: wrap;
}
.report-title {
  font-family: var(--mono);
  font-size: var(--t-med);
  font-weight: 600;
  display: inline-flex; align-items: center; gap: var(--gap-2);
  color: var(--fg);
}
.report-title .badge {
  background: rgba(59,130,246,0.15);
  color: color-mix(in srgb, var(--primary) 70%, var(--fg));
  font-size: var(--t-micro);
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.report-meta {
  display: inline-flex; align-items: center; gap: var(--gap-3);
  color: var(--fg-3);
  font-family: var(--mono);
  font-size: var(--t-small);
  flex-wrap: wrap;
}
.report-meta .regime {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--warn);
  font-weight: 600;
  letter-spacing: 0.06em;
}
.report-meta .regime::before {
  content: ''; width: 6px; height: 6px;
  border-radius: 50%; background: var(--warn);
  box-shadow: 0 0 8px var(--warn);
}
.report-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--border);
}
.report-input {
  padding: var(--gap-4) var(--gap-5);
  border-right: 1px solid var(--border);
}
.report-input:last-child { border-right: 0; }
.report-input .lbl {
  color: var(--fg-3);
  font-size: var(--t-mini);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.report-input .input,
.report-input .stepper,
.report-input .input-wrap { width: 100%; }
.report-input .input { text-align: left; }

.report-layers {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  background: var(--border);
}
.layer {
  background: var(--bg-elevated);
  padding: var(--gap-5);
  display: flex; flex-direction: column; gap: var(--gap-3);
}
.layer-head { display: flex; justify-content: space-between; align-items: baseline; }
.layer-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono);
  font-size: var(--t-mini);
  letter-spacing: 0.12em;
  color: var(--fg-3);
  font-weight: 500;
  text-transform: uppercase;
}
.layer-tag .swatch { width: 8px; height: 8px; border-radius: 2px; background: var(--accent); }
.layer.b .layer-tag .swatch { background: var(--primary); }
.layer.c .layer-tag .swatch { background: var(--warn); }
.layer-amt {
  font-family: var(--mono);
  font-size: var(--t-2xl);
  font-weight: 600;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.layer-share { color: var(--fg-4); font-size: var(--t-mini); font-family: var(--mono); }
.layer-bar {
  height: 4px;
  background: var(--surface-2);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: var(--gap-2);
}
.layer-bar > div { height: 100%; background: var(--accent); border-radius: 2px; }
.layer.b .layer-bar > div { background: var(--primary); }
.layer.c .layer-bar > div { background: var(--warn); }
.layer-classes { display: flex; flex-direction: column; gap: 6px; }
.layer-class {
  display: grid; grid-template-columns: 1fr auto;
  gap: var(--gap-2);
  padding: 6px 0;
  border-top: 1px dashed var(--border);
  font-size: var(--t-small);
}
.layer-class .name { color: var(--fg-2); }
.layer-class .yld {
  color: var(--accent);
  font-family: var(--mono);
  font-size: var(--t-mini);
  font-variant-numeric: tabular-nums;
}
.layer.b .layer-class .yld { color: var(--primary); }
.layer.c .layer-class .yld { color: var(--warn); }
.layer-empty {
  color: var(--fg-4);
  font-size: var(--t-small);
  text-align: center;
  padding: var(--gap-4) 0;
}

.report-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap-3) var(--gap-5);
  border-top: 1px solid var(--border);
  color: var(--fg-3);
  font-size: var(--t-small);
  gap: var(--gap-3);
  flex-wrap: wrap;
}
.report-foot .toggle-label {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-2);
  cursor: pointer;
  user-select: none;
}
.report-notice {
  padding: var(--gap-2) var(--gap-5);
  border-top: 1px dashed var(--border);
  color: var(--fg-3);
  font-size: var(--t-small);
  background: rgba(255,255,255,0.01);
}
.report-notice.warn { color: var(--warn); }
.report-notice.danger { color: var(--danger); }

@media (max-width: 900px) {
  .report-inputs { grid-template-columns: 1fr 1fr; }
  .report-input:nth-child(2) { border-right: 0; }
  .report-input:nth-child(3) { grid-column: 1 / -1; border-top: 1px solid var(--border); }
}
@media (max-width: 640px) {
  .report-inputs { grid-template-columns: 1fr; }
  .report-input {
    border-right: 0;
    border-bottom: 1px solid var(--border);
    padding: var(--gap-3) var(--gap-4);
  }
  .report-input:last-child { border-bottom: 0; }
  .report-layers { grid-template-columns: 1fr; gap: 1px; }
  .layer { padding: var(--gap-4); }
  .report-head { padding: var(--gap-3) var(--gap-4); }
  .report-foot { padding: var(--gap-3) var(--gap-4); }
}

/* ────────── Breakdown table ────────── */
.breakdown table { width: 100%; border-collapse: collapse; }
.breakdown th, .breakdown td {
  text-align: left;
  padding: 10px var(--gap-4);
  font-size: var(--t-base);
  border-bottom: 1px solid var(--border);
}
.breakdown th {
  color: var(--fg-4);
  font-size: var(--t-micro);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(255,255,255,0.01);
}
.breakdown td {
  font-family: var(--mono);
  color: var(--fg-2);
  font-variant-numeric: tabular-nums;
}
.breakdown td.label { font-family: var(--sans); color: var(--fg); }
.breakdown td.amount { text-align: right; }
.breakdown td .tag {
  background: var(--surface-1);
  color: var(--fg-3);
  font-size: var(--t-micro);
  padding: 2px 7px;
  border-radius: 4px;
  font-family: var(--sans);
  letter-spacing: 0.04em;
}
.breakdown tr:hover td { background: rgba(255,255,255,0.015); }
@media (max-width: 720px) {
  .breakdown-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .breakdown table { min-width: 560px; }
}

/* ────────── Footer ────────── */
.app-footer {
  margin-top: var(--gap-12);
  padding-top: var(--gap-6);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  color: var(--fg-4);
  font-size: var(--t-mini);
  font-family: var(--mono);
  letter-spacing: 0.04em;
  gap: var(--gap-3);
  flex-wrap: wrap;
}

/* ────────── Number / color helpers ────────── */
.number { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
.amber  { color: var(--warn); }
.ok     { color: var(--accent); }
.danger { color: var(--danger); }
.muted  { color: var(--fg-3); }

/* ────────── Reduced motion ────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ────────── Print: PrintView remains paper-terminal ────────── */
.print-only { display: none; }
.print-view { display: none; }
```

- [ ] **Step 2: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed. (Visual will be partially broken because components still use old class names; that's fixed task by task.)

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "$(cat <<'EOF'
style(global): replace primitives with design system v2

Introduces .topbar / .subbar / .status-pill / .kpi(.hero) /
.report-card / .layer / .goals-list+.goals-row / .stepper / .toggle-cb
and a true 1280-wide app-shell. Three explicit card kinds (form / list /
report) replace the previous all-purpose .card. Mobile-first responsive
rules at 1024/900/720/640/480/380 px. Scrollbar visuals globally hidden;
scroll itself remains active.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Rewrite `App.svelte` shell

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Replace App.svelte with the new shell**

Replace `src/App.svelte` entirely with:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

  import ScenarioPicker from './components/ScenarioPicker.svelte';
  import LangToggle from './components/controls/LangToggle.svelte';
  import ThemeToggle from './components/controls/ThemeToggle.svelte';
  import ResultsHeader from './components/ResultsHeader.svelte';
  import BalanceChart from './components/BalanceChart.svelte';
  import ContextSection from './components/sections/ContextSection.svelte';
  import AssetsSection from './components/sections/AssetsSection.svelte';
  import ExpensesSection from './components/sections/ExpensesSection.svelte';
  import GoalsSection from './components/sections/GoalsSection.svelte';
  import BreakdownSection from './components/sections/BreakdownSection.svelte';
  import SavingsSection from './components/sections/savings/SavingsSection.svelte';
  import SummarySection from './components/sections/SummarySection.svelte';
  import PrintView from './components/PrintView.svelte';

  let clock = $state('');
  function updateClock() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    clock = `${dd}.${mm}.${yyyy} · ${hh}:${mi}`;
  }

  onMount(() => {
    updateClock();
    const id = setInterval(updateClock, 30_000);
    return () => clearInterval(id);
  });

  function onPrint() { window.print(); }
</script>

<div class="app-shell">

  <header class="topbar">
    <div class="brand">
      <span class="brand-mark">$</span>
      <span>FamilyCalc</span>
      <span class="brand-sep">/</span>
      <span class="brand-sub">{$_('app.title')}</span>
    </div>
    <div class="topbar-tools">
      <span class="clock">{clock}</span>
      <span class="divider-v"></span>
      <ScenarioPicker />
      <LangToggle />
      <ThemeToggle />
      <button class="btn" type="button" onclick={onPrint} title={$_('header.print')}>
        <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span class="btn-label">{$_('header.print')}</span>
      </button>
    </div>
  </header>

  <ResultsHeader />

  <BalanceChart />

  <div class="grid-2">
    <ContextSection />
    <AssetsSection />
    <ExpensesSection />
    <SummarySection />
    <div class="span-2"><GoalsSection /></div>
    <div class="span-2"><SavingsSection /></div>
    <div class="span-2"><BreakdownSection /></div>
  </div>

  <div class="app-footer">
    <span>FAMILYCALC · LOCAL-FIRST</span>
    <span>{clock}</span>
  </div>

</div>

<PrintView />
```

Note: this references `SummarySection.svelte` which doesn't exist yet — it's added in Task 15.

- [ ] **Step 2: Stub `SummarySection` so the build doesn't break before Task 15**

Create `src/components/sections/SummarySection.svelte`:

```svelte
<script lang="ts"></script>
<!-- Stub — implemented in Task 15 -->
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck && npm run build`
Expected: both succeed. (Page will render with broken section visuals; that's expected until each section is migrated.)

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte src/components/sections/SummarySection.svelte
git commit -m "$(cat <<'EOF'
feat(app): rewrite App.svelte shell for design system v2

Sticky topbar with brand mark, scenario picker, lang/theme toggles, and
print button. Single .grid-2 wraps all sections — Context/Assets/Expenses
share the form-card slot, then Summary, then Goals (list), Savings
(report), Breakdown (table) each span full width.

SummarySection stub added; real impl lands in a later task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Remove Atmosphere from default surface

**Files:**
- Modify: `src/App.svelte` (already updated in Task 5 — Atmosphere import was dropped)
- Verify: `src/components/Atmosphere.svelte` is no longer used anywhere in `src/`

- [ ] **Step 1: Confirm Atmosphere is unused**

Run: `grep -r "Atmosphere" src/`
Expected: only the file itself `src/components/Atmosphere.svelte` matches — no imports.

- [ ] **Step 2: Verify print stylesheet does not depend on `.atmos`**

Open `src/styles/print.css`. If a rule references `.atmos`, leave it (it harmlessly matches nothing). Do NOT delete `Atmosphere.svelte` — kept for a possible future toggle.

- [ ] **Step 3: Commit (only if anything changed in step 2)**

If step 2 made no changes, skip the commit. Otherwise:

```bash
git add src/styles/print.css
git commit -m "style(print): drop atmosphere reference no longer rendered by App"
```

---

## Task 7: Rebuild `ScenarioPicker.svelte` as a topbar widget

**Files:**
- Modify: `src/components/ScenarioPicker.svelte` (complete rewrite)

- [ ] **Step 1: Read the current scenario-picker logic to preserve behaviour**

Run: `cat src/components/ScenarioPicker.svelte | head -80`
Note the existing functions: `switchScenario`, `saveAsNew`, `renameScenario`, `deleteScenario`.

- [ ] **Step 2: Replace the file with the widget-shaped picker**

Replace `src/components/ScenarioPicker.svelte` with:

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { get } from 'svelte/store';
  import { app, switchScenario, saveAsNew, renameScenario, deleteScenario } from '../lib/state/scenarios.svelte';

  function onChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    switchScenario(id);
  }

  function onRename() {
    const cur = app.scenarios[app.activeScenarioId];
    if (!cur) return;
    const next = prompt(get(_)('scenario.renamePrompt'), cur.name);
    if (next && next.trim()) renameScenario(app.activeScenarioId, next.trim());
  }

  function onDuplicate() {
    const cur = app.scenarios[app.activeScenarioId];
    if (!cur) return;
    const next = prompt(get(_)('scenario.duplicatePrompt'), `${cur.name} (copy)`);
    if (next && next.trim()) saveAsNew(next.trim());
  }

  function onDelete() {
    const cur = app.scenarios[app.activeScenarioId];
    if (!cur) return;
    if (Object.keys(app.scenarios).length <= 1) {
      alert(get(_)('scenario.cannotDeleteLast'));
      return;
    }
    if (confirm(get(_)('scenario.deleteConfirm', { values: { name: cur.name } }))) {
      deleteScenario(app.activeScenarioId);
    }
  }
</script>

<select class="select scenario-select" value={app.activeScenarioId} onchange={onChange} aria-label={$_('scenario.label')}>
  {#each Object.values(app.scenarios) as s (s.id)}
    <option value={s.id}>{s.name}</option>
  {/each}
</select>

<button class="btn icon" data-secondary type="button" onclick={onRename} title={$_('scenario.rename')} aria-label={$_('scenario.rename')}>
  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
</button>
<button class="btn icon" data-secondary type="button" onclick={onDuplicate} title={$_('scenario.duplicate')} aria-label={$_('scenario.duplicate')}>
  <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
</button>
<button class="btn icon danger" data-secondary type="button" onclick={onDelete} title={$_('scenario.delete')} aria-label={$_('scenario.delete')}>
  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
</button>

<style>
  .scenario-select {
    max-width: 200px;
    min-height: 36px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 720px) {
    .scenario-select { max-width: 140px; font-size: var(--t-small); }
  }
  @media (max-width: 480px) {
    .scenario-select { flex: 1; max-width: none; }
  }
</style>
```

- [ ] **Step 3: Add the missing i18n keys**

Add to `src/lib/i18n/en.json`:

```json
"scenario.label": "Scenario",
"scenario.rename": "Rename",
"scenario.renamePrompt": "Rename scenario:",
"scenario.duplicate": "Duplicate",
"scenario.duplicatePrompt": "New scenario name:",
"scenario.delete": "Delete",
"scenario.deleteConfirm": "Delete scenario \"{name}\"?",
"scenario.cannotDeleteLast": "Cannot delete the only scenario."
```

Add the matching keys to `src/lib/i18n/ru.json`:

```json
"scenario.label": "Сценарий",
"scenario.rename": "Переименовать",
"scenario.renamePrompt": "Переименовать сценарий:",
"scenario.duplicate": "Дублировать",
"scenario.duplicatePrompt": "Имя нового сценария:",
"scenario.delete": "Удалить",
"scenario.deleteConfirm": "Удалить сценарий «{name}»?",
"scenario.cannotDeleteLast": "Нельзя удалить единственный сценарий."
```

(These may already exist — preserve existing values, only add the missing ones. The key list must end up identical in both files.)

- [ ] **Step 4: Verify i18n parity**

Run: `diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)`
Expected: empty output.

- [ ] **Step 5: Build and dev-server smoke test**

Run: `npm run typecheck && npm run build`
Expected: both pass.

Run: `npm run dev`. Load `http://localhost:5173`. Confirm: the scenario picker renders in the topbar (compact select + 3 icon buttons); switching scenarios persists; rename and duplicate prompts appear in the active language. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScenarioPicker.svelte src/lib/i18n/en.json src/lib/i18n/ru.json
git commit -m "$(cat <<'EOF'
feat(scenario-picker): rebuild as topbar widget

Compact .select + 3 icon buttons (rename / duplicate / delete) marked
data-secondary so they collapse out of the bar on phones. Rename and
duplicate prompts now use i18n strings. The widget is no longer wrapped
in a .card — its sizing is intentional and not subject to the .field
right-edge rule.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Restyle `LangToggle.svelte` and `ThemeToggle.svelte`

**Files:**
- Modify: `src/components/controls/LangToggle.svelte`
- Modify: `src/components/controls/ThemeToggle.svelte`

- [ ] **Step 1: Replace `LangToggle.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, persistSoon } from '../../lib/state/scenarios.svelte';
  import { initI18n } from '../../lib/i18n';

  function toggle() {
    app.ui.language = app.ui.language === 'ru' ? 'en' : 'ru';
    initI18n(app.ui.language);
    document.documentElement.setAttribute('lang', app.ui.language);
    persistSoon();
  }
</script>

<button class="btn" type="button" onclick={toggle} title={$_('header.language')} aria-label={$_('header.language')}>
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  <span class="btn-label">{app.ui.language.toUpperCase()}</span>
</button>
```

- [ ] **Step 2: Replace `ThemeToggle.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, persistSoon } from '../../lib/state/scenarios.svelte';

  function toggle() {
    app.ui.theme = app.ui.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', app.ui.theme);
    persistSoon();
  }
</script>

<button class="btn icon" type="button" onclick={toggle} title={$_('header.theme')} aria-label={$_('header.theme')}>
  {#if app.ui.theme === 'dark'}
    <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  {:else}
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
  {/if}
</button>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build`
Expected: both pass.

Run: `npm run dev`. Confirm: lang toggle shows "EN" / "RU" and switches both UI strings and `<html lang>`. Theme toggle swaps moon/sun icon and the page palette. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/controls/LangToggle.svelte src/components/controls/ThemeToggle.svelte
git commit -m "$(cat <<'EOF'
feat(controls): restyle lang and theme toggles as topbar buttons

Both render as .btn primitives so they share the topbar rhythm. Lang
toggle shows a globe icon plus the current locale code (hidden under
.btn-label so it collapses on narrow screens). Theme toggle swaps a
moon and sun SVG.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Rewrite `ResultsHeader.svelte` as the KPI strip + subbar

**Files:**
- Modify: `src/components/ResultsHeader.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../lib/state/scenarios.svelte';
  import { currentResult } from '../lib/state/derived';
  import { formatRub, formatDate } from '../lib/format';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  const regime = $derived(result.alloc.regime); // 'high' | 'moderate' | 'low'
  const onTrack = $derived(result.sim.runsOutOn === null);
  const daysToVoyage = $derived(result.sim.days.length - 1);
  const monthlyExpenses = $derived(inputs.monthlyFamilyRub);
</script>

<!-- Status sub-bar -->
<div class="subbar">
  <div class="subbar-group">
    {#if onTrack}
      <span class="status-pill"><span class="dot"></span>{$_('status.onTrack')}</span>
    {:else}
      <span class="status-pill danger"><span class="dot"></span>{$_('status.offTrack')}</span>
    {/if}
    <span class="subbar-meta">
      <strong>{formatDate(inputs.voyageDate, app.ui.language)}</strong>
      · {$_('status.daysFromNow', { values: { n: daysToVoyage } })}
    </span>
  </div>
  <div class="subbar-group">
    {#if regime === 'high'}
      <span class="status-pill warn"><span class="dot"></span>{$_('status.highRateRegime')}</span>
    {:else if regime === 'moderate'}
      <span class="status-pill info"><span class="dot"></span>{$_('status.moderateRegime')}</span>
    {:else}
      <span class="status-pill"><span class="dot"></span>{$_('status.lowRateRegime')}</span>
    {/if}
    <span class="subbar-meta">{$_('status.cbrLabel')} <strong>{inputs.cbrKeyRatePct.toFixed(2)}%</strong></span>
  </div>
</div>

<!-- KPI strip -->
<div class="kpis">
  <div class="kpi hero">
    <div class="kpi-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      {$_('kpis.balanceAtVoyage')}
    </div>
    <div class="kpi-val">{formatRub(result.balanceAtVoyage, app.ui.language)}</div>
    <div class="kpi-sub">
      <span>{$_('kpis.onDate')} {formatDate(inputs.voyageDate, app.ui.language)}</span>
    </div>
  </div>
  <div class="kpi">
    <div class="kpi-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      {$_('kpis.runway')}
    </div>
    <div class="kpi-val">{$_('results.daysUnit', { values: { n: result.sim.daysOfRunway } })}</div>
    <div class="kpi-sub">
      {#if result.sim.runsOutOn}
        <span>{$_('kpis.drainsOn')} {formatDate(result.sim.runsOutOn, app.ui.language)}</span>
      {:else}
        <span class="delta">{$_('kpis.notDraining')}</span>
      {/if}
    </div>
  </div>
  <div class="kpi">
    <div class="kpi-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      {$_('kpis.monthlyExpenses')}
    </div>
    <div class="kpi-val">{formatRub(monthlyExpenses, app.ui.language)}</div>
    <div class="kpi-sub"><span>{$_('kpis.perMonth')}</span></div>
  </div>
</div>
```

- [ ] **Step 2: Add i18n keys (both files)**

Add to `src/lib/i18n/en.json`:

```json
"status.onTrack": "On track",
"status.offTrack": "Drains before voyage",
"status.daysFromNow": "{n} days from now",
"status.highRateRegime": "High-rate regime",
"status.moderateRegime": "Moderate regime",
"status.lowRateRegime": "Low-rate regime",
"status.cbrLabel": "CBR",
"kpis.balanceAtVoyage": "Balance at voyage",
"kpis.onDate": "on",
"kpis.runway": "Runway",
"kpis.drainsOn": "drains",
"kpis.notDraining": "covered through voyage",
"kpis.monthlyExpenses": "Monthly expenses",
"kpis.perMonth": "family budget"
```

Matching keys for `src/lib/i18n/ru.json`:

```json
"status.onTrack": "По плану",
"status.offTrack": "Не хватает",
"status.daysFromNow": "{n} дн. до рейса",
"status.highRateRegime": "Высокие ставки",
"status.moderateRegime": "Умеренные ставки",
"status.lowRateRegime": "Низкие ставки",
"status.cbrLabel": "КС",
"kpis.balanceAtVoyage": "Остаток на дату",
"kpis.onDate": "на",
"kpis.runway": "Запас",
"kpis.drainsOn": "исчерпан",
"kpis.notDraining": "хватит до рейса",
"kpis.monthlyExpenses": "Расходы",
"kpis.perMonth": "семья / мес"
```

- [ ] **Step 3: Verify i18n parity**

Run: `diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)`
Expected: empty output.

- [ ] **Step 4: Build and dev-server check**

Run: `npm run typecheck && npm run build`
Expected: both pass.

Run: `npm run dev`. Check at desktop and at 480px:
- Subbar shows two pill rows (ON TRACK + regime).
- KPI strip shows hero balance, runway, monthly expenses.
- Hero number is rendered with the gradient text.
- At 480px the KPI grid collapses to 1 column; the hero stays prominent.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsHeader.svelte src/lib/i18n/en.json src/lib/i18n/ru.json
git commit -m "$(cat <<'EOF'
feat(results): rebuild header as subbar + KPI strip

Subbar shows two status pills (on-track + regime) with metadata.
KPI strip: hero Balance-at-voyage with gradient text, then Runway and
Monthly expenses. All numbers tabular-mono, all labels Fira Sans. Sub
text lives below the value for hierarchy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Restyle `BalanceChart.svelte` (Chart.js color tokens)

**Files:**
- Modify: `src/components/BalanceChart.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { Chart, registerables } from 'chart.js';
  import { currentResult } from '../lib/state/derived';
  import { app } from '../lib/state/scenarios.svelte';

  Chart.register(...registerables);

  let canvas: HTMLCanvasElement;
  let chart: Chart | undefined;

  function colors() {
    const dark = app.ui.theme === 'dark';
    return {
      line:  dark ? '#3B82F6' : '#2563EB',
      fill:  dark ? 'rgba(59,130,246,0.18)' : 'rgba(37,99,235,0.10)',
      grid:  dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)',
      label: dark ? '#94A3B8' : '#64748B',
      voyage: dark ? '#F59E0B' : '#D97706',
    };
  }

  function buildOrUpdate() {
    const r = currentResult();
    const c = colors();
    const data = {
      labels: r.sim.days.map(d => d.date),
      datasets: [{
        data: r.sim.days.map(d => d.totalRub),
        borderColor: c.line,
        backgroundColor: c.fill,
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        tension: 0.15,
      }],
    };
    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutCubic' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: app.ui.theme === 'dark' ? 'rgba(19,29,51,0.95)' : 'rgba(248,250,252,0.95)',
          borderColor: c.line,
          borderWidth: 1,
          titleColor: c.line,
          bodyColor: app.ui.theme === 'dark' ? '#F8FAFC' : '#0F172A',
          titleFont: { family: 'Fira Code' },
          bodyFont: { family: 'Fira Code' },
        },
      },
      scales: {
        x: {
          ticks: { color: c.label, font: { family: 'Fira Code', size: 10 }, maxTicksLimit: 8 },
          grid:  { color: c.grid },
        },
        y: {
          ticks: { color: c.label, font: { family: 'Fira Code', size: 10 } },
          grid:  { color: c.grid },
        },
      },
    };
    if (chart) {
      chart.data = data as any;
      chart.options = options;
      chart.update();
    } else {
      chart = new Chart(canvas, { type: 'line', data, options });
    }
  }

  onMount(() => {
    buildOrUpdate();
    return () => chart?.destroy();
  });

  $effect(() => {
    void currentResult();
    void app.ui.theme;
    if (chart) buildOrUpdate();
  });
</script>

<section class="card chart-card">
  <div class="card-head">
    <div class="card-title">{$_('chart.title')}</div>
    <div class="chart-legend">
      <span class="ld">{$_('chart.legend.projected')}</span>
    </div>
  </div>
  <div class="chart-body">
    <canvas bind:this={canvas}></canvas>
  </div>
</section>

<style>
  .chart-card { margin-bottom: var(--gap-4); }
  .chart-body { height: 240px; padding: var(--gap-3) var(--gap-5) var(--gap-4); }
  .chart-legend {
    display: flex; gap: var(--gap-3);
    font-size: var(--t-mini); color: var(--fg-3);
  }
  .chart-legend .ld { display: inline-flex; align-items: center; gap: 6px; }
  .chart-legend .ld::before {
    content: ''; width: 10px; height: 2px;
    border-radius: 2px; background: var(--primary);
  }
  @media (max-width: 640px) {
    .chart-body { height: 180px; padding: var(--gap-2) var(--gap-3) var(--gap-3); }
  }
</style>
```

- [ ] **Step 2: Add chart i18n keys**

Add to `src/lib/i18n/en.json`: `"chart.title": "Balance over time"`, `"chart.legend.projected": "Projected balance"`.

Add to `src/lib/i18n/ru.json`: `"chart.title": "Баланс во времени"`, `"chart.legend.projected": "Прогноз баланса"`.

- [ ] **Step 3: Verify i18n parity + build**

```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
npm run typecheck && npm run build
```

Expected: diff empty; both commands succeed.

- [ ] **Step 4: Dev-server visual check**

Run: `npm run dev`. Confirm: chart fills the card body, line is primary blue with translucent area fill, axis labels are Fira Code, theme toggle still re-renders colors correctly. Resize to 640px and confirm chart shrinks to 180px height. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/BalanceChart.svelte src/lib/i18n/en.json src/lib/i18n/ru.json
git commit -m "$(cat <<'EOF'
feat(chart): restyle Chart.js line to v2 tokens

Primary blue line, translucent fill, Fira Code axis labels. Wrapped in
the standard .card primitive instead of the bespoke amber-corner frame.
Chart height drops to 180px under 640px viewport.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Simplify `CollapsibleCard.svelte` (always open)

**Files:**
- Modify: `src/components/controls/CollapsibleCard.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  type Props = {
    title: string;
    subtitle?: string;
    meta?: string;
    children?: import('svelte').Snippet;
  };
  let { title, subtitle, meta, children }: Props = $props();
</script>

<section class="card">
  <div class="card-head">
    <div class="card-title">{title}{#if subtitle} · <span style="color:var(--fg-3);font-weight:400">{subtitle}</span>{/if}</div>
    {#if meta}<div class="card-meta">{meta}</div>{/if}
  </div>
  <div class="card-body">
    {@render children?.()}
  </div>
</section>
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run build`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/controls/CollapsibleCard.svelte
git commit -m "$(cat <<'EOF'
refactor(controls): simplify CollapsibleCard to always-open shell

Drops the click-to-collapse behaviour (it hid data on a single-page
calculator and the alignment saga noted the heads felt heavy). The
component is now a typed wrapper around .card / .card-head / .card-body
with optional subtitle and meta props. Existing call sites compile
without changes because the public surface is a strict subset.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Restyle `ContextSection.svelte` (drop rate-stepper width override)

**Files:**
- Modify: `src/components/sections/ContextSection.svelte`

- [ ] **Step 1: Read the current file to preserve every input**

Run: `cat src/components/sections/ContextSection.svelte`
Inventory the fields (today/return/voyage dates, RUB/USD rate stepper).

- [ ] **Step 2: Replace the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import DateInput from '../controls/DateInput.svelte';

  const inputs = $derived(activeInputs());

  function bumpRate(d: number) {
    const next = +(inputs.rubPerUsd + d).toFixed(2);
    if (next >= 1 && next <= 500) {
      inputs.rubPerUsd = next;
      persistSoon();
    }
  }

  function setRate(v: string) {
    const n = Number(v);
    if (!Number.isNaN(n) && n >= 1 && n <= 500) {
      inputs.rubPerUsd = +n.toFixed(2);
      persistSoon();
    }
  }

  function setVoyage(v: string) { inputs.voyageDate = v; persistSoon(); }
  function setReturn(v: string) { inputs.returnDate = v; persistSoon(); }
</script>

<CollapsibleCard title={$_('context.title')}>
  <DateInput label={$_('context.return')} value={inputs.returnDate} onChange={setReturn} />
  <DateInput label={$_('context.voyage')} value={inputs.voyageDate} onChange={setVoyage} />
  <div class="field">
    <span class="field-key">{$_('context.rate')}</span>
    <div class="stepper" role="group" aria-label={$_('context.rate')}>
      <button type="button" onclick={() => bumpRate(-0.5)} aria-label="-0.5">−</button>
      <input class="stepper-val" type="number" inputmode="decimal" step="0.01" min="1" max="500"
             value={inputs.rubPerUsd}
             oninput={(e) => setRate((e.target as HTMLInputElement).value)} />
      <button type="button" onclick={() => bumpRate(0.5)} aria-label="+0.5">+</button>
    </div>
  </div>
</CollapsibleCard>

<style>
  .stepper-val { all: unset; }
  /* Re-apply the visual stepper-val styles since `all: unset` strips them */
  .stepper > .stepper-val {
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    padding: 8px 14px;
    font-family: var(--mono);
    font-size: var(--t-med);
    color: var(--fg);
    font-variant-numeric: tabular-nums;
    min-width: 90px;
    max-width: 110px;
    text-align: center;
    background: transparent;
  }
</style>
```

- [ ] **Step 3: Build and dev-server check**

Run: `npm run typecheck && npm run build && npm run dev`. Confirm: Context card shows return date, voyage date, and a rate stepper widget (−/value/+). Stepper input is 90–110px wide and intentionally compact — **do not** widen it to the standard `.input` 180px. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/ContextSection.svelte
git commit -m "$(cat <<'EOF'
feat(context): restyle to v2 with .stepper widget for rate

The currency-rate stepper is a widget, not a form-section input: its
size is intentional. The previous .rate-stepper .input override is
replaced by the .stepper primitive in global.css, so no per-component
width hack is needed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Restyle `CurrencyInput.svelte` and `DateInput.svelte`

**Files:**
- Modify: `src/components/controls/CurrencyInput.svelte`
- Modify: `src/components/controls/DateInput.svelte`

- [ ] **Step 1: Replace `CurrencyInput.svelte`**

```svelte
<script lang="ts">
  type Props = {
    label: string;
    value: number;
    onChange: (v: number) => void;
    suffix?: string;
    hint?: string;
    placeholder?: string;
  };
  let { label, value, onChange, suffix, hint, placeholder = '0' }: Props = $props();

  function onInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) onChange(n);
  }
</script>

<label class="field">
  <span class="field-key">
    {label}
    {#if hint}<span class="hint">{hint}</span>{/if}
  </span>
  <span class="input-wrap">
    <input class="input{suffix ? ' with-suffix' : ''}"
           type="number" inputmode="decimal" min="0" step="any"
           value={value === 0 ? '' : value}
           {placeholder}
           oninput={onInput} />
    {#if suffix}<span class="suffix">{suffix}</span>{/if}
  </span>
</label>
```

- [ ] **Step 2: Replace `DateInput.svelte`**

```svelte
<script lang="ts">
  type Props = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
  };
  let { label, value, onChange, hint }: Props = $props();
</script>

<label class="field">
  <span class="field-key">
    {label}
    {#if hint}<span class="hint">{hint}</span>{/if}
  </span>
  <input class="input date" type="date" value={value}
         oninput={(e) => onChange((e.target as HTMLInputElement).value)} />
</label>
```

- [ ] **Step 3: Build + dev-server check**

Run: `npm run typecheck && npm run build && npm run dev`. Confirm: every currency input is right-aligned, monospace, 180px on desktop, full-width below 480px. Date inputs are left-aligned, monospace. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/controls/CurrencyInput.svelte src/components/controls/DateInput.svelte
git commit -m "$(cat <<'EOF'
feat(controls): retype CurrencyInput and DateInput to v2 primitives

Use .field row + .input(.with-suffix) + .suffix span. CurrencyInput no
longer manages its own width; it inherits the .input token width and
collapses to full-width on mobile via global.css media queries.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Restyle `AssetsSection.svelte` and `ExpensesSection.svelte`

**Files:**
- Modify: `src/components/sections/AssetsSection.svelte`
- Modify: `src/components/sections/ExpensesSection.svelte`

- [ ] **Step 1: Replace `AssetsSection.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../controls/CurrencyInput.svelte';

  const inputs = $derived(activeInputs());

  function setRubBank(v: number) { inputs.assets.rubBank = v; persistSoon(); }
  function setUsdBank(v: number) { inputs.assets.usdBank = v; persistSoon(); }
  function setUsdCash(v: number) { inputs.assets.usdCash = v; persistSoon(); }
  function setSalaryLump(v: number) { inputs.salaryLumpSumUsd = v; persistSoon(); }
</script>

<CollapsibleCard title={$_('assets.title')}>
  <CurrencyInput label={$_('assets.rubBank')} value={inputs.assets.rubBank} onChange={setRubBank} suffix="₽" />
  <CurrencyInput label={$_('assets.usdBank')} value={inputs.assets.usdBank} onChange={setUsdBank} suffix="$" />
  <CurrencyInput label={$_('assets.usdCash')} value={inputs.assets.usdCash} onChange={setUsdCash} suffix="$" />
  <CurrencyInput label={$_('assets.salaryLumpSum')} value={inputs.salaryLumpSumUsd} onChange={setSalaryLump} suffix="$" hint={$_('assets.salaryLumpSumHint')} />
</CollapsibleCard>
```

- [ ] **Step 2: Replace `ExpensesSection.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../controls/CurrencyInput.svelte';

  const inputs = $derived(activeInputs());
  const dailyRate = $derived(inputs.monthlyFamilyRub / 30.4375);

  function setMonthly(v: number) { inputs.monthlyFamilyRub = v; persistSoon(); }
</script>

<CollapsibleCard title={$_('expenses.title')}>
  <CurrencyInput label={$_('expenses.monthly')} value={inputs.monthlyFamilyRub} onChange={setMonthly} suffix="₽/mo" />
  <div class="field">
    <span class="field-key">
      {$_('expenses.daily')}
      <span class="hint">{$_('expenses.dailyHint')}</span>
    </span>
    <span class="input-wrap">
      <input class="input with-suffix" type="text" readonly value={Math.round(dailyRate).toLocaleString()} />
      <span class="suffix">₽/d</span>
    </span>
  </div>
</CollapsibleCard>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build`. Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/AssetsSection.svelte src/components/sections/ExpensesSection.svelte
git commit -m "$(cat <<'EOF'
feat(sections): restyle Assets and Expenses to v2 form-card pattern

Both use the standard CollapsibleCard wrapper, CurrencyInput rows, and
the new .input.with-suffix + .suffix span pattern. Daily-rate row is a
plain .field with readonly input.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Add `SummarySection.svelte` (read-only mirror)

**Files:**
- Modify: `src/components/sections/SummarySection.svelte` (replaces the stub from Task 5)

- [ ] **Step 1: Replace the stub**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../../lib/state/scenarios.svelte';
  import { currentResult } from '../../lib/state/derived';
  import { formatRub } from '../../lib/format';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  const daysToVoyage = $derived(result.sim.days.length - 1);
  const totalRubEquiv = $derived(
    inputs.assets.rubBank +
    inputs.assets.usdBank * inputs.rubPerUsd +
    inputs.assets.usdCash * inputs.rubPerUsd
  );
  const totalSpent = $derived(result.sim.totalSpentRub);
  const netAtVoyage = $derived(result.balanceAtVoyage);
</script>

<section class="card">
  <div class="card-head">
    <div class="card-title">{$_('summary.title')}</div>
    <div class="card-meta">{$_('summary.meta')}</div>
  </div>
  <div class="card-body">
    <div class="field">
      <span class="field-key">{$_('summary.daysToVoyage')}</span>
      <span class="number">{$_('results.daysUnit', { values: { n: daysToVoyage } })}</span>
    </div>
    <div class="field">
      <span class="field-key">{$_('summary.totalAssetsRub')}</span>
      <span class="number">{formatRub(totalRubEquiv, app.ui.language)}</span>
    </div>
    <div class="field">
      <span class="field-key">{$_('summary.outflowWindow')}</span>
      <span class="number">{formatRub(totalSpent, app.ui.language)}</span>
    </div>
    <div class="field">
      <span class="field-key">{$_('summary.netAtVoyage')}</span>
      <span class="number" style="color: var(--accent); font-weight: 600;">{formatRub(netAtVoyage, app.ui.language)}</span>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add i18n keys**

`en.json`:
```json
"summary.title": "Scenario summary",
"summary.meta": "read-only",
"summary.daysToVoyage": "Days to voyage",
"summary.totalAssetsRub": "Total RUB-equiv assets",
"summary.outflowWindow": "Outflow window",
"summary.netAtVoyage": "Net at voyage"
```

`ru.json`:
```json
"summary.title": "Сводка",
"summary.meta": "только чтение",
"summary.daysToVoyage": "Дней до рейса",
"summary.totalAssetsRub": "Активы в ₽-экв.",
"summary.outflowWindow": "Отток в окне",
"summary.netAtVoyage": "Чисто на дату"
```

- [ ] **Step 3: Verify**

```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
npm run typecheck && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/SummarySection.svelte src/lib/i18n/en.json src/lib/i18n/ru.json
git commit -m "$(cat <<'EOF'
feat(summary): add read-only scenario-summary card

Sits next to Context/Assets/Expenses in the form-card grid. Mirrors the
engine's totals (days to voyage, total RUB-equivalent assets, voyage
window outflow, net balance) so the user sees the calc output without
scrolling to the breakdown. Pure derived data — no new state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Rewrite `GoalsSection.svelte` as a list-of-items

**Files:**
- Modify: `src/components/sections/GoalsSection.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { get } from 'svelte/store';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import type { Goal, GoalMode } from '../../lib/calc/types';

  const inputs = $derived(activeInputs());

  function newId(): string { return crypto.randomUUID(); }
  function todayISO(): string { return new Date().toISOString().slice(0, 10); }

  function addGoal() {
    inputs.goals = [...inputs.goals, {
      id: newId(),
      name: '',
      amountRub: 0,
      mode: 'lump',
      date: todayISO(),
      enabled: true,
    }];
    persistSoon();
  }

  function removeGoal(id: string) {
    if (!confirm(get(_)('goals.deleteConfirm'))) return;
    inputs.goals = inputs.goals.filter(g => g.id !== id);
    persistSoon();
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    inputs.goals = inputs.goals.map(g => g.id === id ? { ...g, ...patch } : g);
    persistSoon();
  }

  const enabledCount = $derived(inputs.goals.filter(g => g.enabled).length);
</script>

<CollapsibleCard
  title={$_('goals.title')}
  meta={$_('goals.meta', { values: { total: inputs.goals.length, enabled: enabledCount } })}
>
  <div class="goals-list">
    <div class="goals-row header">
      <span>{$_('goals.name')}</span>
      <span>{$_('goals.amount')}</span>
      <span>{$_('goals.mode')}</span>
      <span>{$_('goals.date')}</span>
      <span>{$_('goals.endDate')}</span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </div>

    {#each inputs.goals as g (g.id)}
      <div class="goals-row" class:disabled={!g.enabled}>
        <input class="input text cell-name" type="text"
               placeholder={$_('goals.name')}
               value={g.name}
               oninput={(e) => updateGoal(g.id, { name: (e.target as HTMLInputElement).value })} />
        <input class="input amount cell-amount" type="number" inputmode="decimal" min="0" step="any"
               placeholder="0"
               value={g.amountRub === 0 ? '' : g.amountRub}
               oninput={(e) => updateGoal(g.id, { amountRub: Number((e.target as HTMLInputElement).value) || 0 })} />
        <select class="select cell-mode" value={g.mode}
                onchange={(e) => updateGoal(g.id, { mode: (e.target as HTMLSelectElement).value as GoalMode })}>
          <option value="lump">{$_('goals.modeLump')}</option>
          <option value="spread">{$_('goals.modeSpread')}</option>
        </select>
        <input class="input date cell-date" type="date" value={g.date}
               oninput={(e) => updateGoal(g.id, { date: (e.target as HTMLInputElement).value })} />
        {#if g.mode === 'spread'}
          <input class="input date cell-end" type="date" value={g.endDate ?? g.date}
                 oninput={(e) => updateGoal(g.id, { endDate: (e.target as HTMLInputElement).value })} />
        {:else}
          <span class="cell-end cell-empty" aria-hidden="true">—</span>
        {/if}
        <div class="cell-toggle">
          <div
            class="toggle-cb"
            class:on={g.enabled}
            role="switch"
            aria-checked={g.enabled}
            tabindex="0"
            onclick={() => updateGoal(g.id, { enabled: !g.enabled })}
            onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); updateGoal(g.id, { enabled: !g.enabled }); } }}
            aria-label={$_('goals.enabled')}
            title={$_('goals.enabled')}
          ></div>
        </div>
        <button class="icon-btn danger cell-delete" type="button"
                onclick={() => removeGoal(g.id)}
                aria-label={$_('goals.delete')}
                title={$_('goals.delete')}>
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    {/each}
  </div>
  <button class="btn btn-block" type="button" onclick={addGoal}>{$_('goals.add')}</button>
</CollapsibleCard>

<style>
  .cell-empty {
    color: var(--fg-4);
    text-align: center;
    font-size: var(--t-small);
    align-self: center;
  }
</style>
```

- [ ] **Step 2: Ensure i18n keys exist**

Add to `en.json` if missing:

```json
"goals.meta": "{total} items · {enabled} enabled",
"goals.modeLump": "lump",
"goals.modeSpread": "spread",
"goals.deleteConfirm": "Delete this goal?"
```

Add to `ru.json`:

```json
"goals.meta": "{total} целей · {enabled} активно",
"goals.modeLump": "разовый",
"goals.modeSpread": "распределённый",
"goals.deleteConfirm": "Удалить эту цель?"
```

Verify pre-existing keys `goals.title`, `goals.name`, `goals.amount`, `goals.mode`, `goals.date`, `goals.endDate`, `goals.enabled`, `goals.delete`, `goals.add` are still defined; only adjust their text if they were in the old `goals.mode.lump`/`goals.mode.spread` format and rename here (replace, don't dual-publish).

- [ ] **Step 3: Verify i18n + build**

```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
npm run typecheck && npm run build
```

Expected: diff empty; both succeed.

- [ ] **Step 4: Dev-server check at 1280, 720, 375**

Run: `npm run dev`. Confirm:
- Desktop (1280): goals render as a 7-column table; right edges of every input align column-by-column across rows.
- 720px: goals collapse to per-item cards (name on top, amount/mode/date below, toggle + delete on the right). No horizontal scroll.
- 375px: same collapsed layout, comfortable touch targets.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/GoalsSection.svelte src/lib/i18n/en.json src/lib/i18n/ru.json
git commit -m "$(cat <<'EOF'
feat(goals): rewrite as list-of-items per v2 design system

Header row + N goal rows on a 7-column grid (name / amount / mode /
date / end-date / toggle / delete). Inputs fill their cell (width:100%
inside .goals-row only — the one place the .input width override is
sanctioned by global.css). Below 720px each row collapses to a stacked
per-item card with grid-template-areas, never a vertical stack of
.field rows — the saga-confirmed wrong pattern for repeated records.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Refactor `SavingsSection.svelte` into a `report-card`

**Files:**
- Modify: `src/components/sections/savings/SavingsSection.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatDate, formatRub } from '../../../lib/format';
  import LayerCard from './LayerCard.svelte';
  import TaxBanner from './TaxBanner.svelte';
  import AsvWarning from './AsvWarning.svelte';
  import SavingsDisclaimer from './SavingsDisclaimer.svelte';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const hasCash = $derived(inputs.freeCashRub > 0);

  function setFreeCash(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.freeCashRub = n;
      persistSoon();
    }
  }
  function setCbr(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    if (!Number.isNaN(n) && n >= 0 && n <= 30) {
      inputs.cbrKeyRatePct = +n.toFixed(2);
      inputs.cbrRateUpdatedAt = new Date().toISOString().slice(0, 10);
      persistSoon();
    }
  }
  function bumpCbr(d: number) {
    const next = +(inputs.cbrKeyRatePct + d).toFixed(2);
    if (next >= 0 && next <= 30) {
      inputs.cbrKeyRatePct = next;
      inputs.cbrRateUpdatedAt = new Date().toISOString().slice(0, 10);
      persistSoon();
    }
  }
  function setHorizon(e: Event) { inputs.horizonDate = (e.target as HTMLInputElement).value; persistSoon(); }
  function onYieldToggle() {
    inputs.includeExpectedYield = !inputs.includeExpectedYield;
    persistSoon();
  }
</script>

<section class="report-card">
  <header class="report-head">
    <div class="report-title">
      {$_('savings.title')}
      <span class="badge">{$_('savings.badge')}</span>
    </div>
    <div class="report-meta">
      <span>{$_('savings.freeCashShort')} <strong style="color:var(--fg);font-family:var(--mono)">{formatRub(inputs.freeCashRub, app.ui.language)}</strong></span>
      <span class="regime">{$_(`savings.regime.${result.alloc.regime}`)}</span>
    </div>
  </header>

  <div class="report-inputs">
    <div class="report-input">
      <div class="lbl">{$_('savings.inputs.freeCash')}</div>
      <span class="input-wrap">
        <input class="input with-suffix" type="number" inputmode="decimal" min="0" step="any"
               value={inputs.freeCashRub === 0 ? '' : inputs.freeCashRub}
               placeholder="0"
               oninput={setFreeCash} />
        <span class="suffix">₽</span>
      </span>
    </div>
    <div class="report-input">
      <div class="lbl">
        {$_('savings.inputs.cbrRate')}
        <span class="hint" title={$_('savings.inputs.cbrTooltip')}>
          ⓘ {$_('savings.inputs.cbrUpdated')} {formatDate(inputs.cbrRateUpdatedAt, app.ui.language)}
        </span>
      </div>
      <div class="stepper" role="group" aria-label={$_('savings.inputs.cbrRate')}>
        <button type="button" onclick={() => bumpCbr(-0.25)} aria-label="-0.25">−</button>
        <input class="stepper-val" type="number" inputmode="decimal" min="0" max="30" step="0.25"
               value={inputs.cbrKeyRatePct}
               oninput={setCbr} />
        <button type="button" onclick={() => bumpCbr(0.25)} aria-label="+0.25">+</button>
      </div>
    </div>
    <div class="report-input">
      <div class="lbl">{$_('savings.inputs.horizon')}</div>
      <input class="input date" type="date" value={inputs.horizonDate} oninput={setHorizon} />
    </div>
  </div>

  {#if !hasCash}
    <div class="layer-empty">{$_('savings.emptyState')}</div>
  {:else}
    <div class="report-layers">
      <LayerCard layer="A" />
      <LayerCard layer="B" />
      <LayerCard layer="C" />
    </div>
  {/if}

  <TaxBanner />
  <AsvWarning />

  <footer class="report-foot">
    <label class="toggle-label">
      <div
        class="toggle-cb"
        class:on={inputs.includeExpectedYield}
        role="switch"
        aria-checked={inputs.includeExpectedYield}
        tabindex="0"
        onclick={onYieldToggle}
        onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onYieldToggle(); } }}
      ></div>
      <span>{$_('savings.inputs.includeYield')}</span>
    </label>
    <span class="number" style="font-family:var(--mono);color:var(--fg-3)">
      {$_('savings.midYield')} · <strong style="color:var(--accent);font-weight:600">+ {formatRub(result.expectedYieldMid, app.ui.language)}</strong>
    </span>
  </footer>

  <SavingsDisclaimer />
</section>

<style>
  .stepper > .stepper-val {
    all: unset;
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    padding: 8px 14px;
    font-family: var(--mono);
    font-size: var(--t-med);
    color: var(--fg);
    font-variant-numeric: tabular-nums;
    flex: 1;
    text-align: center;
  }
</style>
```

- [ ] **Step 2: Add i18n keys**

`en.json`:
```json
"savings.badge": "Decision framework",
"savings.freeCashShort": "Free cash:",
"savings.midYield": "Expected yield (mid)"
```

`ru.json`:
```json
"savings.badge": "Алгоритм",
"savings.freeCashShort": "Свободно:",
"savings.midYield": "Ожидаемый доход (средн.)"
```

- [ ] **Step 3: Verify i18n parity + build**

```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
npm run typecheck && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/savings/SavingsSection.svelte src/lib/i18n/en.json src/lib/i18n/ru.json
git commit -m "$(cat <<'EOF'
feat(savings): wrap as report-card per v2 design system

Resolves the structural mismatch documented in
.claude/lessons/mistakes-log.md (entry 5): savings was a multi-zone
report jammed into a form-card wrapper. New chrome:
- distinct gradient background + border-strong + .badge in header
- .report-inputs row (3-up → 2-up → 1-up by breakpoint)
- .report-layers 3-column grid → 1-column on phones
- .report-foot with the include-yield toggle + computed mid-yield

Math, state, and field bindings unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Restyle `LayerCard.svelte` with share bar

**Files:**
- Modify: `src/components/sections/savings/LayerCard.svelte`

- [ ] **Step 1: Read the current file**

Run: `cat src/components/sections/savings/LayerCard.svelte | head -60` to confirm the props (`layer: 'A' | 'B' | 'C'`) and how it reads the allocation.

- [ ] **Step 2: Replace the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';
  import ClassCard from './ClassCard.svelte';
  import type { LayerKey } from '../../../lib/calc/types';

  let { layer }: { layer: LayerKey } = $props();

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const info = $derived(result.alloc.layers[layer]);
  const share = $derived(inputs.freeCashRub > 0 ? info.amountRub / inputs.freeCashRub : 0);
  const sharePct = $derived(Math.round(share * 100));
</script>

<div class="layer {layer.toLowerCase()}">
  <div class="layer-head">
    <div class="layer-tag">
      <span class="swatch"></span>{$_(`savings.layers.${layer}.title`)}
    </div>
    <div class="layer-share">{sharePct}%</div>
  </div>
  <div class="layer-amt">{formatRub(info.amountRub, app.ui.language)}</div>
  <div class="layer-bar"><div style="width: {sharePct}%"></div></div>
  {#if info.candidates.length === 0}
    <div class="layer-empty">{$_('savings.noCandidates')}</div>
  {:else}
    <div class="layer-classes">
      {#each info.candidates as cls (cls.id)}
        <ClassCard {layer} cls={cls} />
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build`. Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/savings/LayerCard.svelte
git commit -m "$(cat <<'EOF'
feat(savings/layer): restyle as .layer column with share bar

Each LayerCard now renders inside the .report-layers 3-column grid as
a self-contained .layer block: colored swatch in the tag, large
tabular-mono amount, share percent, share bar (color-coded A green /
B blue / C amber), and the candidate ClassCards below.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Restyle `ClassCard.svelte` as a layer-class row

**Files:**
- Modify: `src/components/sections/savings/ClassCard.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import type { InstrumentClass, LayerKey } from '../../../lib/calc/types';

  let { layer, cls }: { layer: LayerKey; cls: InstrumentClass } = $props();

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const info = $derived(result.alloc.layers[layer]);

  // Yield range as percent: cbrOffset is signed offsets to CBR key rate.
  const lowPct = $derived(inputs.cbrKeyRatePct + cls.cbrOffset.low);
  const highPct = $derived(inputs.cbrKeyRatePct + cls.cbrOffset.high);
</script>

<div class="layer-class">
  <span class="name">{$_(`savings.classes.${cls.id}.name`)}</span>
  <span class="yld">{lowPct.toFixed(1)} – {highPct.toFixed(1)} %</span>
</div>
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run build`. Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/savings/ClassCard.svelte
git commit -m "$(cat <<'EOF'
feat(savings/class): restyle as .layer-class row inside a layer

Drops the standalone card chrome — class rows now belong to the parent
LayerCard's stack and render as a 2-column row (class name on the left,
yield range on the right in mono tabular nums, color matching the
layer).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: Restyle `TaxBanner.svelte`, `AsvWarning.svelte`, `SavingsDisclaimer.svelte`

**Files:**
- Modify: `src/components/sections/savings/TaxBanner.svelte`
- Modify: `src/components/sections/savings/AsvWarning.svelte`
- Modify: `src/components/sections/savings/SavingsDisclaimer.svelte`

- [ ] **Step 1: Replace `TaxBanner.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const threshold = $derived(result.alloc.taxThresholdRub);
  const projected = $derived(result.expectedYieldMid);
  const visible = $derived(projected > 0 && projected >= threshold * 0.8);
</script>

{#if visible}
  <div class="report-notice warn">
    {$_('savings.taxBanner', { values: { threshold: formatRub(threshold, app.ui.language), projected: formatRub(projected, app.ui.language) } })}
  </div>
{/if}
```

- [ ] **Step 2: Replace `AsvWarning.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { currentResult } from '../../../lib/state/derived';

  const result = $derived(currentResult());
  const layers = $derived(result.alloc.asvWarningLayers);
  const visible = $derived(layers.length > 0);
</script>

{#if visible}
  <div class="report-notice danger">
    {$_('savings.asvWarning', { values: { layers: layers.join(', ') } })}
  </div>
{/if}
```

- [ ] **Step 3: Replace `SavingsDisclaimer.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
</script>

<div class="report-notice">{$_('savings.disclaimer')}</div>
```

- [ ] **Step 4: Verify build + i18n parity**

```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
npm run typecheck && npm run build
```

Expected: diff empty; both pass. (i18n keys `savings.taxBanner`, `savings.asvWarning`, `savings.disclaimer` should already exist from the original savings-decision-framework spec.)

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/savings/TaxBanner.svelte src/components/sections/savings/AsvWarning.svelte src/components/sections/savings/SavingsDisclaimer.svelte
git commit -m "$(cat <<'EOF'
feat(savings/notices): restyle Tax/Asv/Disclaimer as .report-notice rows

Three subtle inline notices stacked between the layers and the
report-foot. Visual variants: .warn (tax threshold approached),
.danger (ASV insurance limit exceeded), default (disclaimer).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21: Rewrite `BreakdownSection.svelte` as a horizontal-scroll table

**Files:**
- Modify: `src/components/sections/BreakdownSection.svelte`

- [ ] **Step 1: Read the current file to inventory the events / rendering**

Run: `cat src/components/sections/BreakdownSection.svelte`

- [ ] **Step 2: Replace the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../../lib/state/scenarios.svelte';
  import { currentResult } from '../../lib/state/derived';
  import { formatRub, formatDate } from '../../lib/format';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  type Row = {
    date: string;
    label: string;
    type: string;
    typeClass: string;
    amount: number | null;
    running: number;
    runningClass: string;
  };

  const rows = $derived.by<Row[]>(() => {
    const rs: Row[] = [];
    const days = result.sim.days;
    if (days.length === 0) return rs;

    // Start
    rs.push({
      date: days[0].date,
      label: $_('breakdown.start'),
      type: 'START',
      typeClass: '',
      amount: null,
      running: days[0].totalRub,
      runningClass: '',
    });

    // Goal events
    for (const d of days) {
      for (const ev of d.events) {
        rs.push({
          date: d.date,
          label: ev.name || $_('breakdown.unnamedGoal'),
          type: $_('breakdown.goalLump'),
          typeClass: 'warn',
          amount: -ev.amountRub,
          running: d.totalRub,
          runningClass: d.totalRub < 0 ? 'danger' : '',
        });
      }
    }

    // Voyage
    rs.push({
      date: inputs.voyageDate,
      label: $_('breakdown.voyage'),
      type: 'VOYAGE',
      typeClass: 'primary',
      amount: null,
      running: result.balanceAtVoyage,
      runningClass: result.balanceAtVoyage > 0 ? 'ok' : 'danger',
    });

    return rs;
  });
</script>

<section class="card breakdown">
  <div class="card-head">
    <div class="card-title">{$_('breakdown.title')}</div>
    <div class="card-meta">{$_('breakdown.subtitle')}</div>
  </div>
  <div class="breakdown-scroll">
    <table>
      <thead>
        <tr>
          <th>{$_('breakdown.header.date')}</th>
          <th>{$_('breakdown.header.event')}</th>
          <th>{$_('breakdown.header.type')}</th>
          <th style="text-align:right">{$_('breakdown.header.amount')}</th>
          <th style="text-align:right">{$_('breakdown.header.running')}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r}
          <tr>
            <td>{formatDate(r.date, app.ui.language)}</td>
            <td class="label">{r.label}</td>
            <td><span class="tag" style={r.typeClass === 'warn' ? 'color:var(--warn)' : r.typeClass === 'primary' ? 'color:var(--primary)' : ''}>{r.type}</span></td>
            <td class="amount">{r.amount === null ? '—' : formatRub(r.amount, app.ui.language)}</td>
            <td class="amount" style={r.runningClass === 'ok' ? 'color:var(--accent);font-weight:600' : r.runningClass === 'danger' ? 'color:var(--danger)' : ''}>{formatRub(r.running, app.ui.language)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
```

- [ ] **Step 3: Add i18n keys**

`en.json`:
```json
"breakdown.title": "Cash-flow breakdown",
"breakdown.subtitle": "All events within the voyage window",
"breakdown.start": "Starting balance",
"breakdown.voyage": "Voyage — projected balance",
"breakdown.goalLump": "GOAL · LUMP",
"breakdown.unnamedGoal": "Unnamed goal",
"breakdown.header.date": "Date",
"breakdown.header.event": "Event",
"breakdown.header.type": "Type",
"breakdown.header.amount": "Amount",
"breakdown.header.running": "Running"
```

`ru.json`:
```json
"breakdown.title": "Денежный поток",
"breakdown.subtitle": "Все события в окне рейса",
"breakdown.start": "Начальный баланс",
"breakdown.voyage": "Рейс — прогнозный баланс",
"breakdown.goalLump": "ЦЕЛЬ · РАЗОВАЯ",
"breakdown.unnamedGoal": "Без названия",
"breakdown.header.date": "Дата",
"breakdown.header.event": "Событие",
"breakdown.header.type": "Тип",
"breakdown.header.amount": "Сумма",
"breakdown.header.running": "Остаток"
```

- [ ] **Step 4: Verify i18n + build**

```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
npm run typecheck && npm run build
```

- [ ] **Step 5: Dev-server check**

Run: `npm run dev`. Confirm at desktop and at 480px:
- Desktop: 5-column table fills the card.
- 720px and below: table preserves its 5 columns and scrolls horizontally inside `.breakdown-scroll`; no rows wrap.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/BreakdownSection.svelte src/lib/i18n/en.json src/lib/i18n/ru.json
git commit -m "$(cat <<'EOF'
feat(breakdown): restyle as v2 table with horizontal-scroll on mobile

Date / Event / Type / Amount / Running columns with status tags
(START / GOAL · LUMP / VOYAGE). Below 720px the table stays 560px wide
and scrolls horizontally inside .breakdown-scroll — preserves
readability vs. compressing columns or stacking rows.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 22: Clean up legacy token aliases

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Find remaining uses of legacy tokens**

Run:
```bash
grep -rn -E "var\(--(amber|amber-soft|amber-deep|border-2|border-3|fg-dim)\b" src/
```

- [ ] **Step 2: For each match, replace with the v2 token**

Replacement table:

| Legacy | v2 replacement |
|---|---|
| `--amber` | `--warn` |
| `--amber-soft` | use `rgba(245,158,11,0.12)` inline or define `--warn-soft` |
| `--amber-deep` | use `--primary-2` (similar role) or `rgba(245,158,11,0.18)` |
| `--border-2` | `--border` |
| `--border-3` | `--border-strong` |
| `--fg-dim` | `--fg-2` |

For every match: open the file, replace the variable. Commit each file's changes as part of this task (not separately) to keep the alias-removal atomic.

- [ ] **Step 3: Remove the alias block from `tokens.css`**

In both `:root[data-theme='dark']` and `:root[data-theme='light']` blocks of `src/styles/tokens.css`, delete the lines under the "Legacy aliases" comment.

- [ ] **Step 4: Re-grep to confirm no aliases survive**

Run:
```bash
grep -rn -E "var\(--(amber|amber-soft|amber-deep|border-2|border-3|fg-dim)\b" src/
```

Expected: no matches.

- [ ] **Step 5: Verify build + tests + i18n parity**

```bash
npm run typecheck
npm run build
npm test
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
```

Expected: typecheck and build pass; all tests pass; diff empty.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "$(cat <<'EOF'
refactor(tokens): remove legacy --amber / --border-2 / --fg-dim aliases

All consumers now read v2 tokens (--warn, --border, --border-strong,
--fg-2). The temporary alias block in tokens.css is deleted. Single
source of truth restored.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 23: Full verification pass + responsive sweep

**Files:** none modified — verification only

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all `tests/calc/**` and `tests/state/**` pass. No skipped tests. Any failure must block — do not proceed.

- [ ] **Step 2: Run typecheck and production build**

```bash
npm run typecheck
npm run build
```

Expected: zero errors, zero warnings.

- [ ] **Step 3: i18n parity**

```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
```

Expected: empty.

- [ ] **Step 4: Audit existing alignment-rule violations**

Run:
```bash
grep -RnE "\.input|\.field|\.select|\.btn|\.card" src/components/ | grep -E "width:|max-width:|min-width:|text-align:"
```

Expected: allowed matches only:
- Anything inside `src/styles/global.css` (the primitive itself)
- The `.goals-row .input { width: 100% }` exception explicitly sanctioned in global.css
- The `.stepper-val` override (intentional, sanctioned because the stepper is a widget)

Any other ad-hoc width or text-align override on a primitive inside a component `<style>` block is a regression — fix before continuing.

- [ ] **Step 5: Manual responsive sweep**

Run: `npm run dev` and open `http://localhost:5173`. Walk through the page top-to-bottom at each width using DevTools device toolbar:

| Width | Check |
|---|---|
| 1440 | Two-column grid is balanced; KPI strip is 3-up; chart full width; report layers are 3 across. |
| 1024 | Same as 1440 minus clock + divider in topbar. |
| 900 | Input grid is single column; KPI is hero + 2; report layers still 3 across. |
| 720 | Topbar button labels hidden; Goals collapses to per-item card layout; Breakdown table horizontally scrolls. |
| 480 | Hero KPI alone, then 2-up KPIs; report inputs single column; report layers single column; field rows stack label-above-input. |
| 375 | Topbar tight: brand 13px, scenario picker stretches; 36px buttons; no horizontal scroll anywhere. |

For each width: zero horizontal scrollbars; tabbing through with the keyboard shows visible focus rings on every interactive element; theme toggle still works; language toggle still works; print preview still produces a paper-terminal-style page.

Stop the dev server.

- [ ] **Step 6: Print check**

Run: `npm run dev`. In the browser, press `Cmd-P` (mac) or `Ctrl-P` (linux/windows). The print preview must render `PrintView` in the paper-terminal palette (light beige background, dark text), not the new dark surface. Cancel.

Stop the dev server.

- [ ] **Step 7: Final commit (only if step 4 forced any fixes)**

If step 4 found regressions, commit the fixes:

```bash
git add src/
git commit -m "fix(style): repair primitive-override regressions found in final audit"
```

If step 4 was clean, skip this commit.

- [ ] **Step 8: Tag the redesign**

Optional but recommended — tag the redesign HEAD for easy rollback comparison:

```bash
git tag -a v2-design-system-complete -m "Design system v2 complete (mobile-first, dark-OLED)"
```

---

## Spec coverage map

| Spec section | Implemented in |
|---|---|
| §3 Design system tokens | Task 2, Task 3 |
| §3.6 Effects (background gradients, transitions) | Task 4 |
| §4 Three card kinds | Task 4 (`.card`, `.goals-list`, `.report-card`) + Tasks 14, 16, 17 |
| §5 Layout (1280max, two-column grid, span-2) | Task 4 + Task 5 |
| §5.1 Breakpoints | Task 4 (all media queries) |
| §6.1 Style file replacements | Task 2, Task 3, Task 4 |
| §6.2 App.svelte shell | Task 5 |
| §6.2 Atmosphere removal | Task 6 |
| §6.2 ScenarioPicker rebuild | Task 7 |
| §6.2 LangToggle + ThemeToggle | Task 8 |
| §6.2 ResultsHeader → KPI strip + subbar | Task 9 |
| §6.2 BalanceChart restyle | Task 10 |
| §6.2 CollapsibleCard simplification | Task 11 |
| §6.2 ContextSection (rate stepper) | Task 12 |
| §6.2 CurrencyInput + DateInput | Task 13 |
| §6.2 AssetsSection + ExpensesSection | Task 14 |
| Summary card (new, per spec §5) | Task 15 |
| §6.2 GoalsSection list-of-items | Task 16 |
| §6.2 SavingsSection → report-card | Task 17 |
| §6.2 LayerCard restyle | Task 18 |
| §6.2 ClassCard restyle | Task 19 |
| §6.2 TaxBanner / AsvWarning / SavingsDisclaimer | Task 20 |
| §6.2 BreakdownSection | Task 21 |
| §6.3 i18n additions | Tasks 7, 9, 10, 15, 16, 17, 21 (each adds its own keys, parity verified per task) |
| §7 Accessibility & motion | Tasks 4 (`prefers-reduced-motion`, focus rings, 44px touch, 16px input font), 16 (toggle role/aria) |
| §8 Untouched preservation (engine/state/print) | Verified in Task 6 + Task 23 step 1 |
| §9 Out of scope (PDF restyle, Atmosphere toggle, settings panel) | N/A — deliberately not built |
| §10 Testing | Tasks throughout call `npm test / typecheck / build`; Task 23 is the consolidated pass |
| §11 Risks → primitive blast radius | Task 22 (legacy alias removal) + Task 23 step 4 (audit) |
