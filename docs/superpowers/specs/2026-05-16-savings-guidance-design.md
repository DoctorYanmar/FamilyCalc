# Savings Guidance — Design

**Status:** approved (brainstorming)
**Date:** 2026-05-16
**Builds on:** `2026-05-15-savings-decision-framework-design.md` (catalog, regime, layer math, allocate())
**Replaces:** the read-only candidate list inside `LayerCard.svelte` (the "passive list with interactive chrome" anti-pattern documented in `.claude/lessons/mistakes-log.md`)

## 1. Goal

Turn the savings section from an educational read-only panel into a **guided decision tool**. The user must, by looking at the section, be able to:

1. Understand what each instrument class actually is (definition, how to buy, yield behavior, tax, when to pick).
2. Select which classes they intend to use per layer and assign concrete RUB sub-amounts within each layer's total.
3. See one concrete expected-income number per layer (midpoint) with a defensible range underneath.
4. Land on a sensible default in two clicks (Conservative preset for short layers, Balanced for the long layer) and tweak from there.
5. Print or hand the resulting page to a financial consultant for validation without losing context.

The framework's regime / horizon / layer math is unchanged. This spec adds **selection + per-class share + education** to it.

## 2. Design principles

1. **Visual prominence implies interaction.** Every prominent control on the LayerCard must do something. (Cures the `.claude/lessons/mistakes-log.md` defect.)
2. **Concrete over abstract.** Income is reported as a midpoint ₽ number first, range second. Shares are RUB sub-amounts, not percentages.
3. **Two-click defensible default.** A first-time user lands on Conservative-A, Conservative-B, Balanced-C with all shares auto-filled equally across the chosen classes. They see real numbers immediately.
4. **No silent rebalancing.** The app never modifies a user's share when they didn't ask. Mismatches are surfaced via the unallocated pill, not auto-corrected.
5. **Consultant-defensible content.** Education blurbs follow editorial rules; the consultant validates the framework (risk methodology) once, then per-class facts.
6. **Additive change.** Catalog + types + state shape grow; nothing in the existing engine cash-drain math, KPIs, chart, or scenarios is touched.

## 3. What is removed

- `src/components/sections/savings/ClassCard.svelte` — read-only single class card. Replaced by `ClassRow.svelte`.
- The min/max-over-all-candidates math inside `allocate()`'s `incomeRangeRub` computation — replaced by sum-over-picked-classes math.
- The visual-prominence-without-interaction defect documented in `.claude/lessons/mistakes-log.md`.

## 4. What is added

### 4.1 Catalog gains `risk`

`src/lib/calc/instrumentClasses.ts` — each `InstrumentClass` adds one field:

```ts
export type Risk = 'cons' | 'std' | 'high';

export type InstrumentClass = {
  id: string;
  liquidity: Liquidity;
  cbrOffset: { low: number; high: number };
  currency: ClassCurrency;
  isDeposit: boolean;
  applicableLayers: LayerKey[];
  applicableRegimes: Regime[];
  risk: Risk;          // NEW
};
```

Risk assignments (initial, to be reviewed with consultant before deploy):

| id | risk | rationale |
|---|---|---|
| `savings_account` | cons | АСВ-protected, daily liquidity, no principal volatility |
| `term_deposit` | cons | АСВ-protected, no principal volatility, only liquidity penalty |
| `mm_fund` | std | No АСВ, broker-mediated, near-zero NAV volatility |
| `ofz_pd` | std | Fixed-rate gov bond — duration risk between rate decisions |
| `ofz_pk` | cons | Floater — coupon tracks RUONIA, low duration risk |
| `ofz_in` | cons | Inflation-linked — principal protected against CPI |
| `corp_bond` | high | Credit + duration risk, even first-tier issuers |
| `replacement_bond` | high | FX exposure + sanctions / settlement risk |
| `cny_bond` | high | FX exposure + thin secondary market |
| `gold` | high | Wide drawdown band; not income-bearing |

Preset filters derive from this field (single source of truth):

- `Conservative` = `risk === 'cons'`
- `Balanced` = `risk === 'cons' || risk === 'std'`
- `All eligible` = no filter (still scoped to layer × regime)

### 4.2 `Inputs` gains `savingsPicks`

`src/lib/calc/types.ts`:

```ts
export type Preset = 'cons' | 'bal' | 'all' | 'custom';

export type ClassPick = { share: number };  // RUB sub-amount

export type LayerPicks = {
  preset: Preset;
  classes: Record<string, ClassPick>;  // keyed by InstrumentClass.id
};

export type SavingsPicks = { A: LayerPicks; B: LayerPicks; C: LayerPicks };

// added to Inputs:
savingsPicks: SavingsPicks;
```

Semantics:

- A class missing from `classes` map = unchecked.
- A class present with `share: 0` = checked but no money assigned yet.
- `preset` is the UI hint of which preset pill is highlighted. Any manual checkbox toggle or share edit flips it to `'custom'`. Re-clicking the active preset (in `'custom'` state via the ↺ reset, or by clicking any preset pill) re-runs auto-fill from that preset.

### 4.3 Allocate math — subset, not all candidates

`src/lib/calc/allocate.ts`:

```ts
type LayerInfo = {
  amountRub: number;
  timeDays: number;
  candidates: InstrumentClass[];          // unchanged: all eligible by layer × regime
  pickedClasses: Array<{                  // NEW
    cls: InstrumentClass;
    share: number;                        // RUB
    incomeLow: number;
    incomeHigh: number;
    incomeMid: number;
  }>;
  incomeRangeRub: { low: number; high: number };  // sum over pickedClasses
  incomeMidRub: number;                            // (low + high) / 2
  unallocatedRub: number;                          // NEW: max(0, amountRub - Σ share)
  overAllocatedRub: number;                        // NEW: max(0, Σ share - amountRub)
};
```

Per-class income:

```
incomeLow_i  = share_i × (cbrPct + cls.cbrOffset.low)  / 100 × tLayer / 365
incomeHigh_i = share_i × (cbrPct + cls.cbrOffset.high) / 100 × tLayer / 365
incomeMid_i  = (incomeLow_i + incomeHigh_i) / 2
```

Per-layer income:

```
incomeRangeRub.low  = Σ incomeLow_i  over picks valid in (layer, regime)
incomeRangeRub.high = Σ incomeHigh_i over picks valid in (layer, regime)
incomeMidRub        = (low + high) / 2
```

A pick whose class is not in `candidates(layer, regime)` is silently skipped (regime/horizon-change resilience — flipping CBR back restores the math).

`unallocatedRub = max(0, amountRub - sum(share over valid picks))`. `overAllocatedRub = max(0, sum(share over valid picks) - amountRub)`. At any moment exactly one of the two is zero (or both, when shares sum to exactly the amount).

### 4.4 Auto-fill helper

`src/lib/calc/allocate.ts`:

```ts
export function autoFillFromPreset(
  layerAmountRub: number,
  candidates: InstrumentClass[],
  preset: Exclude<Preset, 'custom'>,
): Record<string, ClassPick>;
```

- Filter `candidates` by the preset's risk set.
- Empty filtered set → return `{}` (caller falls back to no-pick state; UI shows zero income).
- Otherwise: equal-split `layerAmountRub` across N filtered classes. Last class absorbs the rounding remainder so `sum === layerAmountRub`.

UI calls this on preset-pill click and on schema migration. Pure function, fully tested.

### 4.5 Engine integration

`simulate()` is untouched. The cash-drain simulation does not read `savingsPicks` at all.

`currentResult()` in `src/lib/state/derived.ts` is structurally unchanged. `expectedYieldMid` now equals `sum over layers of alloc.layers[layer].incomeMidRub` — same field name, same callers, new (subset-based) math.

## 5. UI

### 5.1 No page-layout change

The `.report-card` chrome, the `.report-head` title + regime indicator, the `.report-inputs` (free cash · CBR · horizon · update date · include-yield toggle), and the `.report-layers` 3-column hairline grid are all untouched. The sidebar / breakdown / chart / KPI tiles do not move.

### 5.2 LayerCard internal rewrite

`src/components/sections/savings/LayerCard.svelte` — rewritten internals; `.layer` chrome reused as-is.

Structure (top to bottom inside `.layer`):

1. Existing `.layer-head` with `.layer-tag` + `.layer-amt` (editable).
2. Existing `.layer-bar` share indicator.
3. **NEW** `.layer-presets` — three pill buttons (`Conservative` / `Balanced` / `All eligible`). Active state = `picks.preset !== 'custom'` with that preset matching. When `picks.preset === 'custom'`, a small `↺` button appears trailing the pills; clicking it re-applies the **layer default preset** (A → `cons`, B → `cons`, C → `bal`). The layer default is fixed in code so reload while in `custom` state still has a deterministic reset target — no in-memory "last preset" state needed.
4. **NEW** `.layer-classes` — loop over `info.candidates`, render one `<ClassRow>` per class. Unchecked rows stay visible at `opacity: 0.42`.
5. **NEW** `.layer-foot` — `Ожидаемый доход · {window}` label, big mono `≈ X ₽` (incomeMid), small mono `Y – Z ₽` (incomeRange), `.unalloc-pill`.

Reactive bindings (all through the existing `app` rune):

- `info` = `currentResult().alloc.layers[layer]`
- `picks` = `activeInputs().savingsPicks[layer]`

Mutations (all go through the proxy, then `persistSoon()`):

- Preset click → `setPreset(layer, preset)` writes `picks.preset` and replaces `picks.classes` with `autoFillFromPreset(amountRub, info.candidates, preset)`.
- Reset (↺) → re-applies the layer default preset (A=`cons`, B=`cons`, C=`bal`).
- Amount edit (`.layer-amt`) → writes `inputs.layerOverride[layer]`; shares are NOT rescaled (Section 3 rule); unallocated pill updates.
- Unalloc pill click (when `unallocatedRub > 0`) → distribute the remainder equally across currently-checked classes.

### 5.3 New `ClassRow.svelte`

`src/components/sections/savings/ClassRow.svelte` — replaces `ClassCard.svelte` (which is deleted).

Props:

```ts
{
  cls: InstrumentClass;
  pick: ClassPick | undefined;
  layerAmountRub: number;
  layer: LayerKey;
  cbrPct: number;
}
```

Layout (5-column grid, mobile collapse via `grid-template-areas`):

```
[ checkbox · name + risk-badge / meta · share-input · chevron ]
```

Sub-elements:

- `.cb` checkbox: 14×14 square; `.on` state colored with layer's accent (`--accent` / `--primary` / `--warn`).
- `.class-name`: name (Fira Sans 12px, `--fg-2`) + `.risk-badge` (`.cons` / `.std` / `.high` modifiers using `--accent` / `--primary` / `--warn` at 14% alpha background).
- `.class-meta`: yield range (mono, layer-colored) · liquidity · currency · `ДЕП` flag.
- `.share-input`: tight CurrencyInput variant, ₽ suffix. Width 84px. `font-variant-numeric: tabular-nums`. Layer-colored focus underline.
- `.chev`: `›` collapsed, `⌄` expanded. `cursor: pointer`.

Local `$state`:

- `expanded: boolean` — toggled by chevron.

Behaviors:

- Checkbox click: if `pick === undefined`, write `{share: 0}`. If defined, delete the entry. Flip `picks.preset` to `'custom'`.
- Share input change: write `pick.share = N`. Flip `picks.preset` to `'custom'`. If unchecked, checking it is implicit (write entry first, then share).
- Chevron click: toggle `expanded`. When expanded, render `.class-edu` block grid-spanning the row (column 1 / -1), reading from `savings.classes.<id>.edu.{whatItIs|howToBuy|yieldBehavior|tax|whenToPick}`.

Education panel — definition list with five `<dt>` / `<dd>` pairs, monospace small-caps labels, sans body, line-height 1.55.

### 5.4 CSS additions

`src/styles/global.css` — strictly additive. No existing selector's properties are changed.

New selectors:

- `.layer-presets` + button states (`.active`, layer-color-tinted active text)
- `.layer-class` grid columns widened: `1fr auto` → `18px 1fr auto`
- `.cb`, `.cb.on` (with per-layer color overrides under `.layer.b` / `.layer.c`)
- `.risk-badge` + `.cons` / `.std` / `.high` modifiers
- `.share-input` + per-layer focus underline
- `.class-edu` (full-width inside `.layer-class` via `grid-column: 1 / -1`)
- `.layer-foot` extended: `.val-big`, `.val-rng`, `.unalloc-pill` (+ `.ok` / `.warn`)

Mobile (≤720px): `.layer-class` collapses to the `grid-template-areas` rhythm used by `.goals-row` — name spans full width, share + chevron sit below right-aligned, education panel still expands full-width below.

All risk-badge colors come from existing `--accent` / `--primary` / `--warn` tokens. No new color tokens.

### 5.5 PrintView

`src/components/PrintView.svelte` — savings block rewritten as the consultant document. Order:

```
РАСПРЕДЕЛЕНИЕ СБЕРЕЖЕНИЙ
Режим: {regime} (CBR {pct}%, обновлено {date})
Горизонт: {horizonDate} ({horizonDays} дней)

LAYER A · OPERATIONAL · 0–30 дней · {amount} ₽ · Preset: {preset name}
  ✓ {class name}    {share} ₽    {low}–{high}% p.a.  [{risk badge text}]
  ...
  Ожидаемый доход (30 дн): ≈ {mid} ₽ (range {low} – {high} ₽)

LAYER B · ...
LAYER C · ...

ИТОГО · ожидаемый доход за горизонт ≈ {sum of mids} ₽
  (range {sum of lows} – {sum of highs} ₽)

— Необлагаемый порог процентов по вкладам: ≈ {tax threshold} ₽/год.
— АСВ: {layer} — {warning if amount > 1.4M with deposit-class picks}.
— {full disclaimer text}
— Методология классификации риска: {one paragraph}
```

`print.css` paper-terminal palette stays. No new print-only selectors needed.

## 6. i18n

New keys (added to both `ru.json` and `en.json`, parity-checked):

```
savings.preset.cons / .bal / .all / .custom
savings.preset.resetTooltip
savings.riskBadge.cons / .std / .high
savings.riskBadge.methodology     // one-paragraph rationale for cons/std/high

savings.layerCard.expectedIncomeMid
savings.layerCard.expectedIncomeRange
savings.layerCard.balanceUnallocated   // action label on the warn pill

savings.unalloc.ok                // "всё распределено ✓" / "all allocated ✓"
savings.unalloc.warn              // ICU template with {amount}

savings.classes.<id>.edu.whatItIs
savings.classes.<id>.edu.howToBuy
savings.classes.<id>.edu.yieldBehavior
savings.classes.<id>.edu.tax
savings.classes.<id>.edu.whenToPick

savings.print.title
savings.print.regimeLine
savings.print.horizonLine
savings.print.layerLine
savings.print.layerSubtotal
savings.print.grandTotal
savings.print.riskMethodologyHeading
```

Total new content surface: 10 classes × 5 edu blurbs × 2 locales = 100 short paragraphs, plus ~25 chrome strings × 2 locales.

Editorial rules (enforced during implementation):

1. No specific issuers, banks, tickers (ticker *patterns* like "LQDT, AKMM, SBMM" are descriptive and acceptable).
2. Plain definitions, no marketing copy.
3. Tax rules current as of 2026. Note ИИС-Б exemption where applicable.
4. Russian originals are the source of truth; English is the descriptive translation.
5. Risk-classification rationale lives in `savings.riskBadge.methodology` — one paragraph explaining `cons/std/high` decision (drawdown potential + liquidity + tax complexity).

i18n parity check stays mandatory: `diff <(jq -r 'keys[]' ru.json | sort) <(jq -r 'keys[]' en.json | sort)` must be empty.

## 7. Persistence migration (v2 → v3)

`src/lib/state/persistence.ts`:

A lower-level helper is exposed so migration doesn't depend on `allocate()` (which itself reads `savingsPicks` — circularity):

```ts
// in src/lib/calc/allocate.ts
export function autoAllocateLayerAmounts(
  inp: Pick<Inputs, 'freeCashRub' | 'monthlyFamilyRub' | 'goals'>,
  today: Date,
): { A: number; B: number; C: number };

export function candidatesFor(
  layer: LayerKey,
  regime: Regime,
): InstrumentClass[];
```

Both already-pure functions that `allocate()` composes. Migration uses these directly:

```ts
function migrateV2ToV3(raw: AppStateV2): AppStateV3 {
  const next: AppStateV3 = { ...raw, schemaVersion: 3 };
  const today = todayDate();
  for (const sid of Object.keys(next.scenarios)) {
    const inp = next.scenarios[sid].inputs;
    const amounts = autoAllocateLayerAmounts(inp, today);
    const regime  = regimeFor(inp.cbrKeyRatePct);
    const candA   = candidatesFor('A', regime);
    const candB   = candidatesFor('B', regime);
    const candC   = candidatesFor('C', regime);
    inp.savingsPicks = {
      A: { preset: 'cons', classes: autoFillFromPreset(amounts.A, candA, 'cons') },
      B: { preset: 'cons', classes: autoFillFromPreset(amounts.B, candB, 'cons') },
      C: { preset: 'bal',  classes: autoFillFromPreset(amounts.C, candC, 'bal')  },
    };
  }
  return next;
}
```

- `schemaVersion: 2 → 3`.
- `migrate()` chains v1 → v2 → v3 as needed.
- All `schemaVersion).toBe(2)` test assertions audited and bumped to `3` (learned-rule from `.claude/rules/learned-rules.md`).
- Imported JSON backups from v1 and v2 stay loadable.

## 8. Testing plan

### 8.1 `tests/calc/allocate.test.ts` (extended)

- Subset math: layer with 2 picked classes at different shares → income range = sum of (share × yield) per class. Exact fixture.
- `autoFillFromPreset`: 2/3/1 candidate cases. Rounding: 1 000 000 ÷ 3 = 333 333 / 333 333 / 333 334.
- Picks pointing at a class outside `candidates(layer, regime)` are silently skipped.
- `unallocatedRub` math: positive remainder, zero remainder, picks > amount (capped at zero — Section 9 open Q).
- Empty picks → income range `{0, 0}`, unallocated = layer amount.

### 8.2 `tests/calc/instrumentClasses.test.ts` (new)

- Every catalog entry has a `risk` ∈ `{cons, std, high}`.
- For every (layer, regime) pair, the Conservative preset filter returns at least one class — first-time default never produces an empty layer.

### 8.3 `tests/state/persistence.test.ts` (extended)

- `migrate()` on a v2 blob produces a v3 blob with `savingsPicks` seeded per Section 7.
- `migrate()` on a v1 blob chains to v3 with both `freeCashRub` (from investments sum) AND `savingsPicks` (from auto-fill).
- `migrate()` rejects unknown schemaVersion.
- All `schemaVersion).toBe(...)` assertions bumped to `3`.

### 8.4 `tests/calc/engine.test.ts` (one addition)

- `simulate(inputsA) === simulate(inputsB)` where A and B differ ONLY in `savingsPicks` — guards the "engine doesn't read picks" invariant.

### 8.5 `tests/state/derived.test.ts` (extended)

- `includeExpectedYield: true` produces `combinedResult.balanceAtVoyage === sim.balanceAtVoyage + sum(alloc.layers[*].incomeMidRub)` — new math, concrete fixture.

### 8.6 Manual UI verification (per `.claude/rules/verification.md`)

After implementation, exercise in `npm run dev`:

1. Open on a v2 localStorage blob → migration runs → Conservative-A, Conservative-B, Balanced-C with auto-filled equal shares. Numbers populate immediately.
2. Click "Balanced" in Layer A → new classes appear checked, shares redistribute equally, midpoint + range update reactively.
3. Edit one share → preset pills de-highlight, ↺ reset appears. Click ↺ → returns to last preset's auto-fill.
4. Uncheck a class → row dims to `opacity: 0.42`, share clears, unallocated pill goes amber with the delta.
5. Click amber unallocated pill → auto-balance distributes remainder across currently-checked classes; pill returns to green ✓.
6. Tap chevron → education panel expands inline with all 5 blurbs in current language.
7. Switch RU ↔ EN → every blurb + badge + preset label translates; no missing-key warnings in browser console.
8. Flip CBR 16 → 9 → regime switches to `low`; candidate sets shrink; picks for now-ineligible classes are silently ignored but persisted (flipping CBR back restores them).
9. `window.print()` → PrintView lists every picked class with share + yield + risk badge per layer, plus grand total, on paper-terminal palette.
10. Export → clear localStorage → import → state restores including all picks.
11. **Editorial review gate** — render RU edu blurbs to PDF, take to consultant. `npm run deploy` cannot run until the consultant approves the content. Implementation plan pins this as a non-optional manual checkpoint.

### 8.7 Required commands before claiming done

```
npm test
npm run typecheck
npm run build
npm run dev   # exercise items 1–10
# step 11 — consultant review — gates `npm run deploy`
```

i18n parity:

```
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
```

Must be empty.

## 9. Open questions

None at design time. Two notes for implementation:

- Picks exceeding layer amount: when `unallocatedRub > 0`, render the pill with `.warn` modifier ("не распределено: {amount}"). When `overAllocatedRub > 0`, render with `.danger` modifier ("превышение: {amount}") — same pill primitive, different color token. Allocate math does NOT cap `share` against `amountRub` — sums are passed through honestly; the UI is responsible for the visual warning. This way you can see the literal math of what you typed.
- "Risk methodology" copy is the consultant-validation anchor. Reserve a paragraph in `savings.riskBadge.methodology` and pin it as a deliverable in the implementation plan rather than leaving it as a placeholder.

## 10. Out of scope (do not add)

- Specific bank / broker / issuer / ticker recommendations.
- Real-time CBR rate fetch; FX rate fetch; instrument price feeds.
- Multi-issuer diversification within a class (one class = one bucket).
- Tax-optimization across instruments (ИИС-А vs ИИС-Б routing).
- Performance projection beyond a single horizon point.

## 11. Implementation entry point

After this spec is approved, invoke `superpowers:writing-plans` to produce the phased plan. Order:

1. Catalog `risk` field + `instrumentClasses.test.ts` (foundation).
2. Types (`Preset`, `ClassPick`, `LayerPicks`, `SavingsPicks`) + `savingsPicks` on `Inputs`.
3. `autoFillFromPreset` helper + tests.
4. `allocate()` subset math + extended `LayerInfo` + tests.
5. Persistence v2 → v3 migration + tests; schemaVersion assertions audit.
6. `derived.ts` minor update + extended `derived.test.ts`.
7. i18n scaffolding — keys + RU/EN placeholders. **Editorial pass for the 100 edu blurbs is a separate task.**
8. `ClassRow.svelte` — new component.
9. `LayerCard.svelte` internal rewrite — preset row, ClassRow loop, foot.
10. CSS additions in `global.css` (additive selectors only).
11. PrintView block rewrite.
12. Editorial review gate — render RU edu blurbs, take to consultant, capture sign-off.
13. Manual UI verification pass (items 1–10 in Section 8.6).
14. `npm run deploy`.
