# Savings Decision Framework — Design

**Status:** approved (brainstorming)
**Date:** 2026-05-15
**Replaces:** the per-instrument savings UI introduced in `2026-05-14-family-calc-design.md` (§ Investments)

## 1. Goal

Replace the free-form "investments" rows (instrument name + amount + % + compound toggle) with an **educational decision framework** that maps the user's free cash to **classes** of conservative instruments based on **time horizon** and the **current monetary regime** (CBR key rate). The framework does not name specific banks, brokers, or tickers.

## 2. Design principles (do not violate)

1. **Match, don't predict.** Map user situation (horizon, amount, currency) to characteristics of instrument classes. No rate/FX forecasts. No specific issuers.
2. **One regime variable.** A single user-maintained input — `cbrKeyRatePct` — switches regime presets. Show "updated on" date.
3. **Cash flow and advisory are separated.** The simulation engine drains cash only. Expected yield is an independent overlay that is only added to the headline balance when the user opts in.
4. **Catalog is data, not code.** Class definitions live in a single typed array; UI logic reads from it.

## 3. What is removed

- The `investments: Investment[]` field on `Inputs`.
- The `Investment` and `InstrumentKind` types.
- `InvestmentsSection.svelte` (component file deleted).
- All `investments.*` i18n keys.
- Per-investment daily compounding inside `simulate()`.
- The chart's "investment value over time" line (engine no longer tracks it).

## 4. What is added

### 4.1 New `Inputs` fields

```ts
// added to Inputs (src/lib/calc/types.ts)
freeCashRub: number;             // pool to be allocated across A/B/C
horizonDate: ISODate;            // planning horizon, independent of voyageDate
cbrKeyRatePct: number;           // e.g. 16.0 — single regime input
cbrRateUpdatedAt: ISODate;       // shown as "обновлено: DD.MM.YYYY"
layerOverride: LayerOverride;    // user overrides for auto-suggested amounts
includeExpectedYield: boolean;   // toggle, default false
```

`LayerOverride = { A?: number; B?: number; C?: number }`. An unset key means "use auto-suggested".

### 4.2 New types

```ts
export type Regime = 'high' | 'moderate' | 'low';
export type LayerKey = 'A' | 'B' | 'C';
export type Liquidity = 'daily' | 'fixed-term' | 'secondary-market';
export type ClassCurrency = 'RUB' | 'USD-settled' | 'CNY' | 'Gold';

export type InstrumentClass = {
  id: string;                    // stable ASCII slug; used as i18n key suffix
  liquidity: Liquidity;
  cbrOffset: { low: number; high: number }; // percentage-point offsets from CBR
  currency: ClassCurrency;
  isDeposit: boolean;            // drives АСВ 1.4M warning
  applicableLayers: LayerKey[];
  applicableRegimes: Regime[];
};

export type LayerOverride = { A?: number; B?: number; C?: number };
```

### 4.3 Catalog (`src/lib/calc/instrumentClasses.ts`)

A single TS `const` array of `InstrumentClass[]`. String fields (`name`, `taxNote`, `riskNote`) are **not** in the catalog — they live in `src/lib/i18n/{ru,en}.json` under `savings.classes.<id>.{name|taxNote|riskNote}`. This keeps the catalog one file and i18n one file per locale (acceptance criterion #10).

Initial 10 classes (slugs in code; Russian originals in i18n RU):

| id | RU name | liquidity | currency | cbrOffset | isDeposit | layers | regimes |
|---|---|---|---|---|---|---|---|
| `savings_account` | Накопительный счёт с % на остатке | daily | RUB | `{low: -3, high: -1}` | true | A | high, moderate, low |
| `term_deposit` | Срочный вклад (3/6/12 мес) | fixed-term | RUB | `{low: -0.5, high: 1.5}` | true | A, B | high, moderate |
| `mm_fund` | Фонд денежного рынка (RUB) | daily | RUB | `{low: -1, high: -0.5}` | false | A, B | high, moderate, low |
| `ofz_pd` | ОФЗ-ПД | secondary-market | RUB | `{low: -1, high: 0.5}` | false | B, C | high |
| `ofz_pk` | ОФЗ-ПК (флоутер RUONIA) | secondary-market | RUB | `{low: -0.5, high: 0.5}` | false | B, C | moderate, low |
| `ofz_in` | ОФЗ-ИН (инфляционные) | secondary-market | RUB | `{low: -7, high: -4}` | false | C | high, moderate, low |
| `corp_bond` | Корпоративные облигации первого эшелона (RUB) | secondary-market | RUB | `{low: 0.5, high: 2}` | false | B, C | high, moderate |
| `replacement_bond` | Замещающие облигации (USD-номинированные) | secondary-market | USD-settled | `{low: -10, high: -7}` | false | C | moderate, low |
| `cny_bond` | Юаневые облигации | secondary-market | CNY | `{low: -10, high: -7}` | false | C | moderate, low |
| `gold` | Золото (биржевое / ОМС / золотые облигации Селигдара) | secondary-market | Gold | `{low: -16, high: -2}` | false | C | high, moderate, low |

`cbrOffset` values are conservative central estimates; the table is editable in one place without touching component logic.

### 4.4 Regime selection

```ts
function regimeFor(cbrPct: number): Regime {
  if (cbrPct >= 15) return 'high';
  if (cbrPct >= 10) return 'moderate';
  return 'low';
}
```

Crossing 10 and 15 switches the visible class set (acceptance criterion #3).

### 4.5 Time-layer engine — `allocate(inputs, today)`

A **pure function** in `src/lib/calc/allocate.ts`. No DOM, no Svelte imports. Returns:

```ts
type LayerInfo = {
  amountRub: number;
  timeDays: number;
  candidates: InstrumentClass[];
  incomeRangeRub: { low: number; high: number };
  incomeMidRub: number;
};

type AllocationResult = {
  regime: Regime;
  horizonDays: number;
  layers: { A: LayerInfo; B: LayerInfo; C: LayerInfo };
  taxThresholdRub: number;       // cbrPct/100 × 1_000_000
  asvWarningLayers: LayerKey[];  // layers triggering >1.4M deposit-class warning
};
```

#### Auto-allocation

```
horizonDays  = max(0, daysBetween(today, horizonDate))

A_auto = monthlyFamilyRub + sum(enabled goals with date ∈ [today, today+30d])
B_auto = sum(enabled goals with date ∈ (today+30d, today+180d])
C_auto = max(0, freeCashRub − A_auto − B_auto)

// cap: A and B cannot together exceed freeCashRub
if (A_auto + B_auto > freeCashRub) {
  let total = A_auto + B_auto
  A_auto = A_auto × freeCashRub / total
  B_auto = B_auto × freeCashRub / total
  C_auto = 0
}
```

Effective per-layer amount = `layerOverride[k] ?? auto[k]`.

#### Time-in-layer (capped by horizon)

```
tA = min(30,  horizonDays)
tB = max(0, min(horizonDays, 180) − 30)
tC = max(0, horizonDays − 180)
```

#### Candidates and yield range per layer

```
candidates(layer)  = catalog filtered by
                       applicableLayers.includes(layer) AND
                       applicableRegimes.includes(regime)

allRateLow(layer)  = min over candidates of (cbrPct + cbrOffset.low)   // % p.a.
allRateHigh(layer) = max over candidates of (cbrPct + cbrOffset.high)

layerIncomeLow  = layerAmount × allRateLow  / 100 × tLayer / 365
layerIncomeHigh = layerAmount × allRateHigh / 100 × tLayer / 365
layerIncomeMid  = (layerIncomeLow + layerIncomeHigh) / 2
```

A layer with no candidates returns `incomeRangeRub: {low: 0, high: 0}` and renders an empty-state message.

#### Tax-threshold value

```
taxThresholdRub = cbrPct / 100 × 1_000_000
```

(Spec wording mentions `max(CBR rate in year)`. With a single user-maintained CBR snapshot we use that snapshot directly. The banner copy makes this assumption explicit: "при текущей ставке".)

#### АСВ warning

For each layer L: if `candidates(L)` contains any `isDeposit === true` class AND the effective `layerAmount > 1_400_000`, push L into `asvWarningLayers`. The warning banner advises splitting across banks; it does not block anything.

### 4.6 Engine integration

`simulate(inputs, today)` no longer reads `inputs.investments` (gone). Its math is unchanged for cash drain. The result type loses `totalInvestmentYieldRub` and `DayPoint.investmentValueRub` in the same change; tests are updated together to remove references to those fields.

`currentResult()` in `src/lib/state/derived.ts` becomes:

```ts
export function currentResult(): CombinedResult {
  const inputs = activeInputs();
  const today  = new Date();
  const sim    = simulate(inputs, today);
  const alloc  = allocate(inputs, today);
  const expectedYieldMid =
    alloc.layers.A.incomeMidRub +
    alloc.layers.B.incomeMidRub +
    alloc.layers.C.incomeMidRub;
  const balanceAtVoyage = inputs.includeExpectedYield
    ? sim.balanceAtVoyage + expectedYieldMid
    : sim.balanceAtVoyage;
  return { sim, alloc, balanceAtVoyage, expectedYieldMid };
}
```

The balance chart's daily series stays bound to `sim.days` (no yield mixed into the daily curve). Only the headline KPI and the breakdown reflect the overlay.

## 5. UI

### 5.1 Page layout (App.svelte)

```
HEADER + CONTROLS
RESULTS HEADER (KPI tiles) ──────────────────────
BALANCE CHART (full width) ──────────────────────
                  ornament
+-------------------------+--------------------+
| LAYER A — OPERATIONAL   | CONTEXT          v |
|   0–30 ДНЕЙ             | ASSETS           v |
|   <amount> RESET TO AUTO| EXPENSES         v |
|   [ClassCard][ClassCard]| GOALS            v |
|   ЖИДАЕМЫЙ ДОХОД: …     | SAVINGS INPUTS   v |
|                         |   FREE CASH        |
| LAYER B — PLANNED       |   CBR KEY RATE     |
|   1–6 МЕС               |   UPDATED ON       |
|   <amount> RESET TO AUTO|   HORIZON DATE     |
|   [ClassCard][ClassCard]|   INCLUDE YIELD ☐  |
|   ЖИДАЕМЫЙ ДОХОД: …     |                    |
|                         |                    |
| LAYER C — RESERVE       |                    |
|   6+ МЕС                |                    |
|   <amount> RESET TO AUTO|                    |
|   [ClassCard][ClassCard]|                    |
|   ЖИДАЕМЫЙ ДОХОД: …     |                    |
|                         |                    |
| TAX BANNER              |                    |
| АСВ WARNING (if any)    |                    |
| DISCLAIMER              |                    |
+-------------------------+--------------------+
BREAKDOWN (full-width below)
ornament
```

CSS grid: `grid-template-columns: 1fr 360px` on desktop. Below 900px viewport width the grid collapses to a single column; the sidebar drops below the layer column in source order.

### 5.2 New components (`src/components/sections/savings/`)

- **`SavingsInputsCard.svelte`** — fields: `freeCashRub` (CurrencyInput RUB), `cbrKeyRatePct` (number 0–30, step 0.1), `cbrRateUpdatedAt` (DateInput, "обновлено: DD.MM.YYYY"), `horizonDate` (DateInput, defaults to `voyageDate` on first migration), `includeExpectedYield` toggle. Tooltip on CBR: "Ставка ЦБ РФ. Меняется на заседаниях ЦБ (раз в 6 недель максимум). Проверьте на cbr.ru."
- **`LayerCard.svelte`** — props `{ layer: LayerKey }`. Reads `currentResult()`. Renders header (name + window), amount input (CurrencyInput), `RESET TO AUTO` button (visible when `layerOverride[layer]` is set), aggregate yield range, grid of `<ClassCard>` filtered by `layer × regime`.
- **`ClassCard.svelte`** — name, yield range (`15.5–16.5% p.a.`; collapses to single value when low == high), liquidity badge, currency badge, 1-line risk note. No actions.
- **`TaxBanner.svelte`** — `Необлагаемый порог процентов по вкладам: ≈ X ₽/год. С превышения — НДФЛ 13%.`
- **`AsvWarning.svelte`** — `Превышен лимит АСВ 1,4 млн ₽ на банк. Рассмотрите разделение.` Renders once per triggered layer.
- **`SavingsDisclaimer.svelte`** — persistent footer: `Информационный обзор классов инструментов, не индивидуальная инвестиционная рекомендация. Конкретные банки, эмитенты и условия проверяйте самостоятельно.`

All components use existing CSS primitives (`.card`, `.field`, `.input`, `.btn`, `.label`, `.ornament`) from `global.css`. No new CSS framework.

### 5.3 Files deleted

- `src/components/sections/InvestmentsSection.svelte`

## 6. i18n

- All UI chrome under new namespaces in `ru.json` / `en.json`:
  - `savings.title`, `savings.layer.{A|B|C}.{name|window}`, `savings.regime.{high|moderate|low}`
  - `savings.inputs.{freeCash|cbrRate|cbrUpdated|horizon|includeYield|cbrTooltip}`
  - `savings.layerCard.{resetToAuto|expectedIncome|noCandidates}`
  - `savings.classCard.{liquidity|currency|risk}` and `savings.liquidity.{daily|fixed-term|secondary-market}` and `savings.currency.{RUB|USD-settled|CNY|Gold}`
  - `savings.taxBanner` (ICU template with `{amount}`)
  - `savings.asvWarning`
  - `savings.disclaimer`
  - `savings.classes.<id>.{name|taxNote|riskNote}` for each of the 10 catalog IDs
- All catalog IDs are stable ASCII slugs (above).
- English class names use neutral instrument terminology (e.g. `OFZ-PD (fixed-rate gov bond)`, `Term deposit (3/6/12 mo)`, `Replacement bond (USD-settled)`).
- Russian originals match the spec verbatim.
- The `diff <(jq -r 'keys[]' ru.json | sort) <(jq -r 'keys[]' en.json | sort)` check stays empty (CLAUDE.md rule).

## 7. Persistence migration (v1 → v2)

Bump `STORAGE_KEY` stays `familycalc.state.v1` (file name is decoupled from schema version) but `schemaVersion: 1 → 2`. Migration function:

```ts
function migrateV1ToV2(raw: AppStateV1): AppStateV2 {
  const today = todayISO();
  const next: AppStateV2 = { ...raw, schemaVersion: 2 };
  for (const sid of Object.keys(next.scenarios)) {
    const old = raw.scenarios[sid].inputs;
    const seededFreeCash = (old.investments ?? []).reduce(
      (s, i) => s + (i.amountRub ?? 0), 0,
    );
    next.scenarios[sid].inputs = {
      returnDate:        old.returnDate,
      voyageDate:        old.voyageDate,
      salaryLumpSumUsd:  old.salaryLumpSumUsd,
      assets:            old.assets,
      rubPerUsd:         old.rubPerUsd,
      monthlyFamilyRub:  old.monthlyFamilyRub,
      goals:             old.goals,
      freeCashRub:        seededFreeCash,
      horizonDate:        old.voyageDate,             // sensible default
      cbrKeyRatePct:      16.0,                       // typical Russian rate
      cbrRateUpdatedAt:   today,
      layerOverride:      {},
      includeExpectedYield: false,
    };
    // investments field absent from v2
  }
  return next;
}
```

`migrate()` chains v1→v2 when input is v1, validates v2 directly otherwise. Imported JSON backups from v1 stay loadable. Migration throws on unknown schemaVersion.

## 8. PrintView

`PrintView.svelte` gets a new block titled "РАСПРЕДЕЛЕНИЕ СБЕРЕЖЕНИЙ":
- Current regime + CBR rate.
- For each layer: name, window, amount, expected income range (low–high).
- Disclaimer at the bottom.

No interactive controls in print. Existing `print.css` palette is reused without modification.

## 9. Testing plan

### 9.1 `tests/calc/allocate.test.ts` (new)

- regime threshold crossings: 9.99 → low, 10.0 → moderate, 14.99 → moderate, 15.0 → high.
- auto-allocation: A from monthly + 30-day goals; B from 30–180d goals; C = remainder.
- auto-allocation cap: A+B > freeCash → proportional shrink, C = 0.
- `layerOverride` overrides per-layer; unset keys fall back to auto.
- per-layer candidates filtered by `applicableLayers ∩ applicableRegimes`.
- per-layer income range math: single-class single-rate; multi-class multi-range; zero-time horizon.
- horizon < 30d: only Layer A has nonzero time; B and C income = 0.
- horizon < 180d: Layer C income = 0.
- АСВ trigger: layer amount > 1.4M ₽ AND layer has deposit-eligible candidates → flag true; one without deposits stays false.
- tax-threshold value = `cbrKeyRatePct / 100 × 1_000_000`.

### 9.2 `tests/calc/engine.test.ts` (adjust)

- Drop all `investments: [...]` from input fixtures (type-illegal in v2).
- Drop "investments reinvest" and "investments payout" tests.
- Keep the "voyage in the past" test, reframed: `balanceAtVoyage` for a past horizon equals total liquid assets in RUB.
- Add: `simulate` ignores new fields — they do not affect the daily drain.

### 9.3 `tests/state/persistence.test.ts` (extend)

- `migrate()` accepts a v1 blob with `investments[]`, returns a v2 blob where `freeCashRub == sum(investment.amountRub)` and `investments` is absent.
- `migrate()` accepts a v2 blob unchanged.
- `migrate()` rejects unknown schemaVersion.

### 9.4 `tests/state/derived.test.ts` (new — lightweight)

- With `includeExpectedYield: false`, `combinedResult.balanceAtVoyage === sim.balanceAtVoyage`.
- With `includeExpectedYield: true`, `combinedResult.balanceAtVoyage === sim.balanceAtVoyage + sum(layerIncomeMid)`.

### 9.5 Manual UI verification (per CLAUDE.md)

After implementation:
1. Edit `cbrKeyRatePct` 16 → 12 → 9 → confirm regime switches at 15.0 and 10.0; class candidates visibly change in each layer.
2. Edit `horizonDate` to one 2 months out → Layer C income range collapses to 0; layer card shows empty-state.
3. Set Layer A override to 2 000 000 → АСВ warning appears under Layer A.
4. Toggle "include expected yield" → headline balance number jumps by midpoint sum; toggle off → returns.
5. Print preview → savings block renders cleanly on paper-terminal palette.
6. RU ↔ EN toggle → all 10 class names + all chrome translate without missing keys.
7. Export JSON → clear localStorage → re-import → state restores including new fields.
8. Refresh page on a v1 blob (crafted in DevTools) → migrates to v2 with freeCash seeded; UI shows the migrated amount.

## 10. Acceptance criteria traceability

| Spec criterion | Coverage |
|---|---|
| 1. Old per-instrument UI removed; no specific issuer field anywhere | `InvestmentsSection.svelte` deleted; `Investment` type removed; no name/ticker/issuer fields anywhere |
| 2. Editing `cbr_key_rate` updates yield ranges across all layers immediately | reactive `$derived(currentResult())`; `allocate()` reads `cbrKeyRatePct` |
| 3. Crossing 10% or 15% thresholds switches regime preset and updates visible classes | `regimeFor()`; tested in `allocate.test.ts` |
| 4. Editing "next contract start date" rebalances layer allocations | `allocate()` reads `horizonDate`; `horizonDate` defaults to `voyageDate` at migration; UI exposes both |
| 5. Tax-threshold banner reflects current CBR rate | `TaxBanner` reads `taxThresholdRub` from `AllocationResult` |
| 6. АСВ warning fires when a single deposit-class allocation exceeds 1.4M ₽ | `AsvWarning` per layer in `asvWarningLayers` |
| 7. Profit-to-balance toggle correctly adjusts projected end-of-horizon balance | `currentResult()` combines `simulate` + overlay; tested in `derived.test.ts` |
| 8. Disclaimer visible at all times | `SavingsDisclaimer` mounted in main column, not collapsible |
| 9. All existing calculator features intact | Engine cash-drain math unchanged; scenarios, export/import, PDF, RU/EN, dark/light all untouched |
| 10. Class catalog lives in a single config file | `src/lib/calc/instrumentClasses.ts` |

## 11. Out of scope (do not add)

- Specific banks, brokers, tickers, product names.
- FX rate predictions / USD-RUB allocation (handled by separate dashboard).
- Multi-year retirement planning.
- API calls or real-time data fetching.
- Auto-fetching CBR rate.

## 12. Open questions

None. All design decisions resolved during brainstorming on 2026-05-15.

## 13. Implementation entry point

After this spec is approved, invoke `superpowers:writing-plans` to produce the phased implementation plan. The plan should cover, in order:

1. Types + catalog + i18n keys (foundation).
2. `allocate()` pure function + tests.
3. Persistence migration + tests.
4. Engine adjustments + test fixture cleanup.
5. `derived.ts` combined result + tests.
6. UI components (SavingsInputsCard, LayerCard, ClassCard, banners, disclaimer).
7. App.svelte layout restructure + sidebar collapse.
8. PrintView block.
9. Manual verification pass.
