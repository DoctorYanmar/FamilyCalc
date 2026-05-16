# Savings Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the read-only candidate list inside each savings LayerCard with a per-class checkbox + ₽ sub-amount selector, 3-state risk-filter preset per layer, inline education panel per class, and a midpoint expected-income readout with unallocated/over-allocated indicators. v2→v3 schema migration auto-fills defaults so existing users land on a populated Conservative/Balanced view.

**Architecture:** Catalog gains one `risk` field. `Inputs` gains one `savingsPicks` field (preset hint + per-class RUB share map per layer). `allocate()` math switches from "min/max over all candidates" to "weighted sum over picked classes". Two new pure helpers — `autoFillFromPreset` and `autoAllocateLayerAmounts` — are exported from `allocate.ts` so the migration can seed picks without circular dependency. UI: `LayerCard.svelte` internals rewritten, new `ClassRow.svelte`, old `ClassCard.svelte` deleted. CSS strictly additive in `global.css`. PrintView rewritten as the consultant-validation document.

**Tech Stack:** Svelte 5 runes, TypeScript, Vitest, svelte-i18n. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-16-savings-guidance-design.md`
**Branch:** `feature/savings-guidance` (already checked out; `master` is the merged baseline)

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/lib/calc/types.ts` | Add `Risk`, `Preset`, `ClassPick`, `LayerPicks`, `SavingsPicks`. Add `risk` to `InstrumentClass`. Extend `LayerInfo` with `pickedClasses`, `unallocatedRub`, `overAllocatedRub`. Bump `AppState.schemaVersion` literal to 3. Add `savingsPicks` to `Inputs`. |
| Modify | `src/lib/calc/instrumentClasses.ts` | Add `risk` to all 10 catalog entries. |
| Create | `tests/calc/instrumentClasses.test.ts` | Guarantee every class has a valid `risk`; guarantee Conservative preset is never empty across (layer, regime). |
| Modify | `src/lib/calc/allocate.ts` | Export `candidatesFor` and new `autoAllocateLayerAmounts`. Add `autoFillFromPreset`. Rewrite `layerInfo` body to use picks. |
| Modify | `tests/calc/allocate.test.ts` | Extend with subset-math, autoFillFromPreset, unallocated/overAllocated, ignore-ineligible-picks cases. |
| Modify | `tests/calc/engine.test.ts` | One assertion: `simulate` output identical when only `savingsPicks` differs. |
| Modify | `src/lib/state/persistence.ts` | Bump `STORAGE_KEY` value unchanged, bump `schemaVersion: 2 → 3`. Add `migrateV2ToV3`. Update `defaultScenario` to seed `savingsPicks`. Chain v1→v2→v3 in `migrate()`. |
| Modify | `tests/state/persistence.test.ts` | Bump all `schemaVersion).toBe(2)` to `.toBe(3)`. Add v2→v3 and v1→v3 chain tests. |
| Modify | `tests/state/derived.test.ts` | Update `includeExpectedYield: true` numerical assertion to subset-based midpoint sum. |
| Modify | `src/lib/i18n/ru.json` | Add ~25 chrome keys + 50 edu blurbs. |
| Modify | `src/lib/i18n/en.json` | Same as RU, parity-checked. |
| Modify | `src/styles/global.css` | Additive: `.layer-presets`, `.cb`, `.risk-badge`, `.share-input`, `.class-edu`, `.unalloc-pill`. Widen `.layer-class` grid. |
| Create | `src/components/sections/savings/ClassRow.svelte` | One row: checkbox · name + risk badge + meta · share input · chevron + expanded education panel. |
| Modify | `src/components/sections/savings/LayerCard.svelte` | Rewrite internals: preset row, ClassRow loop, foot with midpoint + unalloc pill. |
| Delete | `src/components/sections/savings/ClassCard.svelte` | Superseded by ClassRow. |
| Modify | `src/components/PrintView.svelte` | Rewrite savings block to list every picked class with share + yield + risk per layer + grand total. |

---

## Task 1: Add `Risk` type and `risk` field to `InstrumentClass`

**Files:**
- Modify: `src/lib/calc/types.ts`

- [ ] **Step 1: Add `Risk` type and extend `InstrumentClass`**

In `src/lib/calc/types.ts`, between the existing `ClassCurrency` line and `InstrumentClass` declaration, add:

```ts
export type Risk = 'cons' | 'std' | 'high';
```

Then add `risk: Risk;` to the `InstrumentClass` type:

```ts
export type InstrumentClass = {
  id: string;
  liquidity: Liquidity;
  cbrOffset: { low: number; high: number };
  currency: ClassCurrency;
  isDeposit: boolean;
  applicableLayers: LayerKey[];
  applicableRegimes: Regime[];
  risk: Risk;
};
```

- [ ] **Step 2: Run typecheck — expect catalog errors**

Run: `npm run typecheck`
Expected: FAIL — `instrumentClasses.ts` entries lack `risk` property (10 errors).

This proves the catalog now has a mandatory field. Next task fills it.

---

## Task 2: Fill `risk` on every catalog entry

**Files:**
- Modify: `src/lib/calc/instrumentClasses.ts`

- [ ] **Step 1: Add `risk` value to every entry**

Edit `src/lib/calc/instrumentClasses.ts`. Add `risk: '...'` as a new property to each of the 10 entries, per Section 4.1 of the spec:

| id | risk |
|---|---|
| `savings_account` | `'cons'` |
| `term_deposit` | `'cons'` |
| `mm_fund` | `'std'` |
| `ofz_pd` | `'std'` |
| `ofz_pk` | `'cons'` |
| `ofz_in` | `'cons'` |
| `corp_bond` | `'high'` |
| `replacement_bond` | `'high'` |
| `cny_bond` | `'high'` |
| `gold` | `'high'` |

Example for the first two entries:

```ts
{
  id: 'savings_account',
  liquidity: 'daily',
  cbrOffset: { low: -3, high: -1 },
  currency: 'RUB',
  isDeposit: true,
  applicableLayers: ['A'],
  applicableRegimes: ['high', 'moderate', 'low'],
  risk: 'cons',
},
{
  id: 'term_deposit',
  liquidity: 'fixed-term',
  cbrOffset: { low: -0.5, high: 1.5 },
  currency: 'RUB',
  isDeposit: true,
  applicableLayers: ['A', 'B'],
  applicableRegimes: ['high', 'moderate'],
  risk: 'cons',
},
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/calc/types.ts src/lib/calc/instrumentClasses.ts
git commit -m "feat(savings/catalog): add risk classification (cons/std/high) to instrument classes"
```

---

## Task 3: Catalog invariant tests

**Files:**
- Create: `tests/calc/instrumentClasses.test.ts`

- [ ] **Step 1: Write the test file**

Create `tests/calc/instrumentClasses.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { INSTRUMENT_CLASSES } from '../../src/lib/calc/instrumentClasses';
import { regimeFor } from '../../src/lib/calc/allocate';
import type { LayerKey, Regime, Risk } from '../../src/lib/calc/types';

describe('instrument catalog invariants', () => {
  it('every class has a valid risk value', () => {
    const valid: ReadonlySet<Risk> = new Set(['cons', 'std', 'high'] as const);
    for (const c of INSTRUMENT_CLASSES) {
      expect(valid.has(c.risk)).toBe(true);
    }
  });

  it('every class id is unique', () => {
    const ids = INSTRUMENT_CLASSES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Conservative preset is never empty for any (layer, regime) combo that has any candidates', () => {
    const layers: LayerKey[] = ['A', 'B', 'C'];
    const regimes: Regime[] = ['high', 'moderate', 'low'];
    for (const layer of layers) {
      for (const regime of regimes) {
        const candidates = INSTRUMENT_CLASSES.filter(
          c => c.applicableLayers.includes(layer) && c.applicableRegimes.includes(regime),
        );
        if (candidates.length === 0) continue;
        const conservative = candidates.filter(c => c.risk === 'cons');
        expect(
          conservative.length,
          `Layer ${layer} regime ${regime} has candidates but no Conservative — first-time default would be empty`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
```

Note: this test imports `regimeFor` (already exported) just to share the `Regime` type, but the test does not actually call `regimeFor`. The import is purely to anchor the type. If unused-import lint complains, drop the import line.

- [ ] **Step 2: Run the tests — expect PASS**

Run: `npm test -- tests/calc/instrumentClasses.test.ts`
Expected: PASS — three tests green.

If the Conservative-never-empty test FAILS for any (layer, regime), the catalog risk assignments in Task 2 are wrong. Fix the spec-level risk assignment before proceeding (this would block Section 3.4 of the spec — "first-time user lands on populated Conservative defaults").

- [ ] **Step 3: Commit**

```bash
git add tests/calc/instrumentClasses.test.ts
git commit -m "test(savings/catalog): assert risk parity and non-empty Conservative preset"
```

---

## Task 4: Add `Preset`, `ClassPick`, `LayerPicks`, `SavingsPicks` types

**Files:**
- Modify: `src/lib/calc/types.ts`

- [ ] **Step 1: Add the new types**

Append to `src/lib/calc/types.ts` (after `LayerOverride`, before `Inputs`):

```ts
export type Preset = 'cons' | 'bal' | 'all' | 'custom';

export type ClassPick = { share: number };

export type LayerPicks = {
  preset: Preset;
  classes: Record<string, ClassPick>;
};

export type SavingsPicks = { A: LayerPicks; B: LayerPicks; C: LayerPicks };
```

- [ ] **Step 2: Add `savingsPicks` to `Inputs`**

In the same file, add `savingsPicks: SavingsPicks;` to `Inputs` (after `includeExpectedYield`):

```ts
export type Inputs = {
  // ...existing fields unchanged...
  layerOverride: LayerOverride;
  includeExpectedYield: boolean;
  savingsPicks: SavingsPicks;
};
```

- [ ] **Step 3: Extend `LayerInfo`**

In the same file, extend `LayerInfo`:

```ts
export type LayerInfo = {
  amountRub: number;
  timeDays: number;
  candidates: InstrumentClass[];
  pickedClasses: Array<{
    cls: InstrumentClass;
    share: number;
    incomeLow: number;
    incomeHigh: number;
    incomeMid: number;
  }>;
  incomeRangeRub: { low: number; high: number };
  incomeMidRub: number;
  unallocatedRub: number;
  overAllocatedRub: number;
};
```

- [ ] **Step 4: Bump `AppState.schemaVersion` literal**

Change in the same file:

```ts
export type AppState = {
  schemaVersion: 3;
  // ...rest unchanged...
};
```

- [ ] **Step 5: Run typecheck — expect known errors**

Run: `npm run typecheck`
Expected: FAIL across:
- `src/lib/state/persistence.ts` — `defaultScenario` missing `savingsPicks`; `schemaVersion: 2` literal mismatch.
- `src/lib/calc/allocate.ts` — `layerInfo()` returns missing `pickedClasses`, `unallocatedRub`, `overAllocatedRub`.
- Tests with `schemaVersion).toBe(2)` are still OK at typecheck (vitest), they'll fail at runtime later.

These errors are expected and will be resolved by Tasks 5–8. Do NOT fix them yet.

- [ ] **Step 6: Commit**

```bash
git add src/lib/calc/types.ts
git commit -m "feat(savings/types): add Preset, ClassPick, LayerPicks, SavingsPicks; extend LayerInfo; bump schemaVersion to 3"
```

---

## Task 5: Implement `autoFillFromPreset`

**Files:**
- Modify: `src/lib/calc/allocate.ts`
- Modify: `tests/calc/allocate.test.ts`

- [ ] **Step 1: Write failing test in `tests/calc/allocate.test.ts`**

Append a new `describe` block at the end of `tests/calc/allocate.test.ts`:

```ts
import { autoFillFromPreset } from '../../src/lib/calc/allocate';
import type { InstrumentClass } from '../../src/lib/calc/types';

function classOf(id: string, risk: 'cons' | 'std' | 'high'): InstrumentClass {
  return {
    id, risk,
    liquidity: 'daily',
    cbrOffset: { low: 0, high: 0 },
    currency: 'RUB',
    isDeposit: false,
    applicableLayers: ['A'],
    applicableRegimes: ['high'],
  };
}

describe('autoFillFromPreset', () => {
  it('splits layer amount equally across all conservative classes when preset=cons', () => {
    const candidates = [classOf('a', 'cons'), classOf('b', 'cons'), classOf('c', 'std')];
    const result = autoFillFromPreset(600_000, candidates, 'cons');
    expect(Object.keys(result).sort()).toEqual(['a', 'b']);
    expect(result.a.share).toBe(300_000);
    expect(result.b.share).toBe(300_000);
  });

  it('includes cons+std for preset=bal', () => {
    const candidates = [classOf('a', 'cons'), classOf('b', 'std'), classOf('c', 'high')];
    const result = autoFillFromPreset(900_000, candidates, 'bal');
    expect(Object.keys(result).sort()).toEqual(['a', 'b']);
    expect(result.a.share).toBe(450_000);
    expect(result.b.share).toBe(450_000);
  });

  it('includes everything for preset=all', () => {
    const candidates = [classOf('a', 'cons'), classOf('b', 'std'), classOf('c', 'high')];
    const result = autoFillFromPreset(900_000, candidates, 'all');
    expect(Object.keys(result).sort()).toEqual(['a', 'b', 'c']);
    expect(result.a.share).toBe(300_000);
    expect(result.b.share).toBe(300_000);
    expect(result.c.share).toBe(300_000);
  });

  it('last class absorbs rounding remainder so sum equals total exactly', () => {
    const candidates = [classOf('a', 'cons'), classOf('b', 'cons'), classOf('c', 'cons')];
    const result = autoFillFromPreset(1_000_000, candidates, 'cons');
    const sum = result.a.share + result.b.share + result.c.share;
    expect(sum).toBe(1_000_000);
    // first N-1 equal; last absorbs remainder
    expect(result.a.share).toBe(333_333);
    expect(result.b.share).toBe(333_333);
    expect(result.c.share).toBe(333_334);
  });

  it('returns empty object when filtered set is empty', () => {
    const candidates = [classOf('a', 'high'), classOf('b', 'std')];
    const result = autoFillFromPreset(500_000, candidates, 'cons');
    expect(result).toEqual({});
  });

  it('returns empty object when amount is zero', () => {
    const candidates = [classOf('a', 'cons'), classOf('b', 'cons')];
    const result = autoFillFromPreset(0, candidates, 'cons');
    expect(result).toEqual({});
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- tests/calc/allocate.test.ts -t "autoFillFromPreset"`
Expected: FAIL — `autoFillFromPreset is not a function`.

- [ ] **Step 3: Implement `autoFillFromPreset` in `src/lib/calc/allocate.ts`**

Add at the bottom of `src/lib/calc/allocate.ts` (before any default export if present — file currently has no default export):

```ts
import type { ClassPick, Preset, Risk } from './types';

const PRESET_RISK_FILTER: Record<Exclude<Preset, 'custom'>, ReadonlySet<Risk>> = {
  cons: new Set(['cons']),
  bal:  new Set(['cons', 'std']),
  all:  new Set(['cons', 'std', 'high']),
};

export function autoFillFromPreset(
  layerAmountRub: number,
  candidates: InstrumentClass[],
  preset: Exclude<Preset, 'custom'>,
): Record<string, ClassPick> {
  if (layerAmountRub <= 0) return {};
  const allow = PRESET_RISK_FILTER[preset];
  const filtered = candidates.filter(c => allow.has(c.risk));
  if (filtered.length === 0) return {};
  const base = Math.floor(layerAmountRub / filtered.length);
  const remainder = layerAmountRub - base * filtered.length;
  const out: Record<string, ClassPick> = {};
  filtered.forEach((c, i) => {
    const share = i === filtered.length - 1 ? base + remainder : base;
    out[c.id] = { share };
  });
  return out;
}
```

Note: the existing `InstrumentClass` import at the top of `allocate.ts` already covers the type. Only `ClassPick`, `Preset`, `Risk` are new imports. Merge them into the existing import block instead of adding a duplicate import line.

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm test -- tests/calc/allocate.test.ts -t "autoFillFromPreset"`
Expected: PASS — all six cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calc/allocate.ts tests/calc/allocate.test.ts
git commit -m "feat(savings/allocate): add autoFillFromPreset pure helper with rounding-safe equal split"
```

---

## Task 6: Export `candidatesFor` and add `autoAllocateLayerAmounts`

**Files:**
- Modify: `src/lib/calc/allocate.ts`

- [ ] **Step 1: Export `candidatesFor`**

In `src/lib/calc/allocate.ts`, change the local `candidatesFor` declaration to be exported:

Before:
```ts
function candidatesFor(layer: LayerKey, regime: ReturnType<typeof regimeFor>): InstrumentClass[] {
```

After:
```ts
export function candidatesFor(layer: LayerKey, regime: Regime): InstrumentClass[] {
```

(Also imports `Regime` directly from `./types` rather than `ReturnType<typeof regimeFor>` — cleaner. The import line at the top already has it via `Regime`. If not, add it.)

- [ ] **Step 2: Add `autoAllocateLayerAmounts` export**

Append to `src/lib/calc/allocate.ts`:

```ts
export function autoAllocateLayerAmounts(
  inputs: Pick<Inputs, 'freeCashRub' | 'monthlyFamilyRub' | 'goals' | 'layerOverride'>,
  today: Date,
): { A: number; B: number; C: number } {
  const auto = autoSplit(inputs as Inputs, today);
  return {
    A: effectiveAmount(auto.A, inputs.layerOverride.A),
    B: effectiveAmount(auto.B, inputs.layerOverride.B),
    C: effectiveAmount(auto.C, inputs.layerOverride.C),
  };
}
```

This wraps the existing internal helpers without changing them — `autoSplit` and `effectiveAmount` already live in the module.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: FAIL only for the pre-existing `LayerInfo` errors (`pickedClasses` etc., handled in Task 7). No NEW errors from this task. If new errors appear, revisit Step 1's `Regime` import.

- [ ] **Step 4: Commit**

```bash
git add src/lib/calc/allocate.ts
git commit -m "feat(savings/allocate): export candidatesFor and autoAllocateLayerAmounts for migration use"
```

---

## Task 7: Rewrite `layerInfo` to use picks

**Files:**
- Modify: `src/lib/calc/allocate.ts`
- Modify: `tests/calc/allocate.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `tests/calc/allocate.test.ts`:

```ts
import { allocate } from '../../src/lib/calc/allocate';
import type { Inputs } from '../../src/lib/calc/types';

function baseInputsWithPicks(picks: Inputs['savingsPicks']): Inputs {
  return {
    returnDate: '2026-05-16',
    voyageDate: '2027-05-16',
    salaryLumpSumUsd: 0,
    assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
    rubPerUsd: 90,
    monthlyFamilyRub: 0,
    goals: [],
    freeCashRub: 1_000_000,
    horizonDate: '2027-05-16',
    cbrKeyRatePct: 16.0,
    cbrRateUpdatedAt: '2026-05-16',
    layerOverride: { A: 600_000, B: 400_000, C: 0 },
    includeExpectedYield: false,
    savingsPicks: picks,
  };
}

describe('allocate — picks-driven income math', () => {
  it('income range sums per-class contributions over picked classes only', () => {
    const inputs = baseInputsWithPicks({
      A: {
        preset: 'cons',
        classes: {
          savings_account: { share: 400_000 },
          term_deposit:    { share: 200_000 },
        },
      },
      B: { preset: 'cons', classes: {} },
      C: { preset: 'bal',  classes: {} },
    });
    const today = new Date(Date.UTC(2026, 4, 16));
    const result = allocate(inputs, today);

    // A is 30 days, CBR 16
    // savings_account: 400_000 × (13.0..15.0)/100 × 30/365 = 4273.97 .. 4931.50
    // term_deposit:    200_000 × (15.5..17.5)/100 × 30/365 = 2547.95 .. 2876.71
    // total low  ≈ 6821.92, total high ≈ 7808.21, mid ≈ 7315.07
    expect(result.layers.A.incomeRangeRub.low).toBeCloseTo(6821.92, 1);
    expect(result.layers.A.incomeRangeRub.high).toBeCloseTo(7808.22, 1);
    expect(result.layers.A.incomeMidRub).toBeCloseTo(7315.07, 1);
  });

  it('exposes pickedClasses with per-class income breakdown', () => {
    const inputs = baseInputsWithPicks({
      A: { preset: 'cons', classes: { savings_account: { share: 600_000 } } },
      B: { preset: 'cons', classes: {} },
      C: { preset: 'bal',  classes: {} },
    });
    const today = new Date(Date.UTC(2026, 4, 16));
    const result = allocate(inputs, today);
    expect(result.layers.A.pickedClasses).toHaveLength(1);
    const p = result.layers.A.pickedClasses[0];
    expect(p.cls.id).toBe('savings_account');
    expect(p.share).toBe(600_000);
    expect(p.incomeLow).toBeCloseTo(600_000 * 0.13 * 30 / 365, 2);
    expect(p.incomeHigh).toBeCloseTo(600_000 * 0.15 * 30 / 365, 2);
  });

  it('unallocatedRub is layer amount minus sum of shares', () => {
    const inputs = baseInputsWithPicks({
      A: {
        preset: 'custom',
        classes: { savings_account: { share: 300_000 } }, // amount=600k → 300k unalloc
      },
      B: { preset: 'cons', classes: {} },
      C: { preset: 'bal',  classes: {} },
    });
    const today = new Date(Date.UTC(2026, 4, 16));
    const result = allocate(inputs, today);
    expect(result.layers.A.unallocatedRub).toBe(300_000);
    expect(result.layers.A.overAllocatedRub).toBe(0);
  });

  it('overAllocatedRub surfaces when shares exceed layer amount', () => {
    const inputs = baseInputsWithPicks({
      A: {
        preset: 'custom',
        classes: {
          savings_account: { share: 500_000 },
          term_deposit:    { share: 200_000 }, // sum=700k > 600k
        },
      },
      B: { preset: 'cons', classes: {} },
      C: { preset: 'bal',  classes: {} },
    });
    const today = new Date(Date.UTC(2026, 4, 16));
    const result = allocate(inputs, today);
    expect(result.layers.A.unallocatedRub).toBe(0);
    expect(result.layers.A.overAllocatedRub).toBe(100_000);
  });

  it('silently ignores picks pointing at a class not in current candidates', () => {
    // ofz_pd is layer B/C and regime high. Putting it in A (regime high) → not a candidate.
    const inputs = baseInputsWithPicks({
      A: {
        preset: 'custom',
        classes: {
          savings_account: { share: 300_000 },
          ofz_pd:          { share: 300_000 }, // invalid for A
        },
      },
      B: { preset: 'cons', classes: {} },
      C: { preset: 'bal',  classes: {} },
    });
    const today = new Date(Date.UTC(2026, 4, 16));
    const result = allocate(inputs, today);
    // Only savings_account counted; ofz_pd silently dropped.
    expect(result.layers.A.pickedClasses.map(p => p.cls.id)).toEqual(['savings_account']);
    // Unallocated = 600_000 (layer amount) - 300_000 (valid pick) = 300_000.
    // The ofz_pd 300_000 share is silently ignored, NOT counted toward allocation.
    expect(result.layers.A.unallocatedRub).toBe(300_000);
  });

  it('empty picks → income 0 and unallocated = full layer amount', () => {
    const inputs = baseInputsWithPicks({
      A: { preset: 'custom', classes: {} },
      B: { preset: 'cons',   classes: {} },
      C: { preset: 'bal',    classes: {} },
    });
    const today = new Date(Date.UTC(2026, 4, 16));
    const result = allocate(inputs, today);
    expect(result.layers.A.incomeRangeRub.low).toBe(0);
    expect(result.layers.A.incomeRangeRub.high).toBe(0);
    expect(result.layers.A.unallocatedRub).toBe(600_000);
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm test -- tests/calc/allocate.test.ts -t "picks-driven"`
Expected: FAIL — current `layerInfo` returns the old shape (min/max over all candidates, no `pickedClasses`/`unallocatedRub`/`overAllocatedRub`).

- [ ] **Step 3: Rewrite `layerInfo` in `src/lib/calc/allocate.ts`**

Replace the existing `layerInfo` function body with:

```ts
function layerInfo(
  amount: number,
  timeDays: number,
  candidates: InstrumentClass[],
  cbrPct: number,
  picks: LayerPicks,
): LayerInfo {
  const factor = timeDays / 365;
  const validCandidateIds = new Set(candidates.map(c => c.id));

  type Pick = {
    cls: InstrumentClass;
    share: number;
    incomeLow: number;
    incomeHigh: number;
    incomeMid: number;
  };

  const pickedClasses: Pick[] = [];
  let sumLow = 0;
  let sumHigh = 0;
  let sumShare = 0;

  for (const c of candidates) {
    const entry = picks.classes[c.id];
    if (!entry || entry.share <= 0) continue;
    if (!validCandidateIds.has(c.id)) continue;
    const share = entry.share;
    const rateLow  = cbrPct + c.cbrOffset.low;
    const rateHigh = cbrPct + c.cbrOffset.high;
    const incomeLow  = share * (rateLow  / 100) * factor;
    const incomeHigh = share * (rateHigh / 100) * factor;
    pickedClasses.push({
      cls: c,
      share,
      incomeLow,
      incomeHigh,
      incomeMid: (incomeLow + incomeHigh) / 2,
    });
    sumLow  += incomeLow;
    sumHigh += incomeHigh;
    sumShare += share;
  }

  const unallocatedRub  = Math.max(0, amount - sumShare);
  const overAllocatedRub = Math.max(0, sumShare - amount);

  return {
    amountRub: amount,
    timeDays,
    candidates,
    pickedClasses,
    incomeRangeRub: { low: sumLow, high: sumHigh },
    incomeMidRub: (sumLow + sumHigh) / 2,
    unallocatedRub,
    overAllocatedRub,
  };
}
```

Also update the import block at the top to include `LayerPicks`:

```ts
import type {
  Inputs,
  AllocationResult,
  LayerInfo,
  LayerKey,
  InstrumentClass,
  LayerPicks,
} from './types';
```

- [ ] **Step 4: Update `allocate()` call sites to pass picks**

In the same file, find the three `layerInfo(...)` calls inside `allocate()` and add the picks argument:

```ts
const layers = {
  A: layerInfo(amounts.A, tA, candA, inputs.cbrKeyRatePct, inputs.savingsPicks.A),
  B: layerInfo(amounts.B, tB, candB, inputs.cbrKeyRatePct, inputs.savingsPicks.B),
  C: layerInfo(amounts.C, tC, candC, inputs.cbrKeyRatePct, inputs.savingsPicks.C),
};
```

- [ ] **Step 5: Update existing allocate tests that pass `Inputs` fixtures**

Open `tests/calc/allocate.test.ts`. Every existing `Inputs` literal must now include a `savingsPicks` field. Add a helper at the top of the test file (above all `describe` blocks):

```ts
import type { SavingsPicks } from '../../src/lib/calc/types';

const EMPTY_PICKS: SavingsPicks = {
  A: { preset: 'custom', classes: {} },
  B: { preset: 'custom', classes: {} },
  C: { preset: 'custom', classes: {} },
};
```

Then in each existing `Inputs` literal in the file, add `savingsPicks: EMPTY_PICKS,` as a property. The pre-existing tests check candidate sets / regime thresholds / horizon math — they don't read income, so empty picks are correct.

- [ ] **Step 6: Run full allocate.test.ts**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: PASS — all assertions. If any old test fails because it asserted income with the old min/max-over-all-candidates math, the assertion was specific to the OLD math. Rewrite to use empty picks (income 0) — DO NOT keep the old math semantics; the spec replaces them.

- [ ] **Step 7: Commit**

```bash
git add src/lib/calc/allocate.ts tests/calc/allocate.test.ts
git commit -m "feat(savings/allocate): switch layerInfo to picks-driven income math + unallocated/overAllocated"
```

---

## Task 8: Update `defaultScenario` and add v2→v3 migration

**Files:**
- Modify: `src/lib/state/persistence.ts`

- [ ] **Step 1: Update `defaultScenario` to seed `savingsPicks`**

In `src/lib/state/persistence.ts`, change `defaultScenario` so its `inputs` block includes `savingsPicks`:

```ts
function defaultScenario(id: string): Scenario {
  const today = todayISO();
  return {
    id,
    name: 'Default',
    createdAt: today,
    updatedAt: today,
    inputs: {
      returnDate: today,
      voyageDate: today,
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [],
      freeCashRub: 0,
      horizonDate: today,
      cbrKeyRatePct: 16.0,
      cbrRateUpdatedAt: today,
      layerOverride: {},
      includeExpectedYield: false,
      savingsPicks: {
        A: { preset: 'cons', classes: {} },
        B: { preset: 'cons', classes: {} },
        C: { preset: 'bal',  classes: {} },
      },
    },
  };
}
```

(Classes start empty because `freeCashRub === 0`; the auto-fill is a no-op for zero amounts. The preset hints are still set so the UI's pill state is correct.)

- [ ] **Step 2: Bump `defaultState` schemaVersion to 3**

```ts
export function defaultState(): AppState {
  // ...
  return {
    schemaVersion: 3,
    activeScenarioId: id,
    scenarios: { [id]: defaultScenario(id) },
    ui: { language: 'ru', theme: 'dark', openSections: {} },
  };
}
```

- [ ] **Step 3: Add `migrateV2ToV3`**

Append to `src/lib/state/persistence.ts`:

```ts
import { autoAllocateLayerAmounts, autoFillFromPreset, candidatesFor, regimeFor } from '../calc/allocate';

type V2Inputs = Omit<Scenario['inputs'], 'savingsPicks'>;
type V2State = {
  schemaVersion: 2;
  activeScenarioId: string;
  scenarios: Record<string, { id: string; name: string; createdAt: string; updatedAt: string; inputs: V2Inputs }>;
  ui: { language: string; theme: string; openSections: Record<string, boolean> };
};

function migrateV2ToV3(raw: V2State): AppState {
  const today = new Date();
  const scenarios: AppState['scenarios'] = {};
  for (const sid of Object.keys(raw.scenarios)) {
    const old = raw.scenarios[sid];
    const oi = old.inputs;
    const amounts = autoAllocateLayerAmounts(oi, today);
    const regime  = regimeFor(oi.cbrKeyRatePct);
    const candA = candidatesFor('A', regime);
    const candB = candidatesFor('B', regime);
    const candC = candidatesFor('C', regime);
    scenarios[sid] = {
      id: old.id,
      name: old.name,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      inputs: {
        ...oi,
        savingsPicks: {
          A: { preset: 'cons', classes: autoFillFromPreset(amounts.A, candA, 'cons') },
          B: { preset: 'cons', classes: autoFillFromPreset(amounts.B, candB, 'cons') },
          C: { preset: 'bal',  classes: autoFillFromPreset(amounts.C, candC, 'bal')  },
        },
      },
    };
  }
  return {
    schemaVersion: 3,
    activeScenarioId: raw.activeScenarioId,
    scenarios,
    ui: raw.ui as AppState['ui'],
  };
}
```

- [ ] **Step 4: Chain migrations in `migrate()`**

Replace the existing `migrate` function body:

```ts
function migrate(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid state');
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion === 1) {
    if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
      throw new Error('Invalid state shape');
    }
    const v2 = migrateV1ToV2(s as unknown as V1State);
    return migrateV2ToV3(v2 as unknown as V2State);
  }
  if (s.schemaVersion === 2) {
    if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
      throw new Error('Invalid state shape');
    }
    return migrateV2ToV3(s as unknown as V2State);
  }
  if (s.schemaVersion !== 3) throw new Error(`Unsupported schemaVersion: ${String(s.schemaVersion)}`);
  if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
    throw new Error('Invalid state shape');
  }
  return s as unknown as AppState;
}
```

Note: `migrateV1ToV2` returns `AppState` typed as `schemaVersion: 2` historically. With the literal-type change in Task 4 this return is now structurally a `V2State`-shaped object (no `savingsPicks` on inputs, `schemaVersion: 2` numeric). Either:
- Change `migrateV1ToV2`'s return type annotation to a local `V2State` alias (cleaner), OR
- Cast its result via `as unknown as V2State` at the call site.

The cast approach is fine here because `V2State` is internal to this file. Prefer that.

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS in `persistence.ts` (assuming `Scenario['inputs']` now includes `savingsPicks` from Task 4). Tests still fail because of `.toBe(2)` assertions — handled in Task 9.

- [ ] **Step 6: Commit**

```bash
git add src/lib/state/persistence.ts
git commit -m "feat(savings/persistence): v2→v3 migration auto-fills savingsPicks (Cons A,B / Bal C)"
```

---

## Task 9: Update persistence tests and add v2→v3 migration tests

**Files:**
- Modify: `tests/state/persistence.test.ts`

- [ ] **Step 1: Bump all `schemaVersion).toBe(2)` to `.toBe(3)`**

Open `tests/state/persistence.test.ts`. Find every occurrence (currently 5 — at lines 11, 26, 39, 82, 114 of the file) and replace `2` with `3`. Use:

```bash
grep -n "schemaVersion).toBe(2)" tests/state/persistence.test.ts
```

Then edit each occurrence.

- [ ] **Step 2: Update the v1→v2 migration test to v1→v3 chained**

The existing test at the `describe('migrate v1 → v2', ...)` block tests that v1 input produces a result with `schemaVersion: 2`. After the bump, that block tests v1→v3 (chained). Rename the describe block and extend assertions:

Replace the existing block (the one starting around line 59) with:

```ts
describe('migrate v1 → v3 (chained)', () => {
  it('seeds freeCashRub from investments AND auto-fills savingsPicks', () => {
    const v1 = {
      schemaVersion: 1,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'Old', createdAt: '2026-01-01', updatedAt: '2026-01-01',
          inputs: {
            returnDate: '2026-04-01', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 50_000 },
            rubPerUsd: 90, monthlyFamilyRub: 80_000, goals: [],
            investments: [
              { id: 'i1', kind: 'ofz', name: 'OFZ', amountRub: 500_000, annualRatePct: 12, reinvest: true },
              { id: 'i2', kind: 'vkladRub', name: 'Vklad', amountRub: 300_000, annualRatePct: 10, reinvest: false },
            ],
          },
        },
      },
      ui: { language: 'ru', theme: 'dark', openSections: {} },
    };
    const v3 = importJson(JSON.stringify(v1));
    expect(v3.schemaVersion).toBe(3);
    const inp = v3.scenarios.s1.inputs as any;
    expect(inp.investments).toBeUndefined();
    expect(inp.freeCashRub).toBe(800_000);
    expect(inp.savingsPicks).toBeDefined();
    expect(inp.savingsPicks.A.preset).toBe('cons');
    expect(inp.savingsPicks.B.preset).toBe('cons');
    expect(inp.savingsPicks.C.preset).toBe('bal');
  });

  it('accepts a v3 blob unchanged', () => {
    const v3 = {
      schemaVersion: 3,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'New', createdAt: '2026-05-16', updatedAt: '2026-05-16',
          inputs: {
            returnDate: '2026-05-16', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
            rubPerUsd: 90, monthlyFamilyRub: 0, goals: [],
            freeCashRub: 123, horizonDate: '2026-08-01',
            cbrKeyRatePct: 12, cbrRateUpdatedAt: '2026-05-16',
            layerOverride: { A: 50 }, includeExpectedYield: true,
            savingsPicks: {
              A: { preset: 'custom', classes: {} },
              B: { preset: 'cons',   classes: {} },
              C: { preset: 'bal',    classes: {} },
            },
          },
        },
      },
      ui: { language: 'en', theme: 'light', openSections: {} },
    };
    const out = importJson(JSON.stringify(v3));
    expect(out.schemaVersion).toBe(3);
    expect((out.scenarios.s1.inputs as any).freeCashRub).toBe(123);
    expect((out.scenarios.s1.inputs as any).savingsPicks.A.preset).toBe('custom');
  });

  it('migrates a v2 blob to v3, seeding savingsPicks via auto-fill', () => {
    const v2 = {
      schemaVersion: 2,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'V2', createdAt: '2026-05-01', updatedAt: '2026-05-01',
          inputs: {
            returnDate: '2026-05-01', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
            rubPerUsd: 90, monthlyFamilyRub: 80_000, goals: [],
            freeCashRub: 1_000_000, horizonDate: '2026-12-01',
            cbrKeyRatePct: 16, cbrRateUpdatedAt: '2026-05-01',
            layerOverride: {}, includeExpectedYield: false,
          },
        },
      },
      ui: { language: 'ru', theme: 'dark', openSections: {} },
    };
    const v3 = importJson(JSON.stringify(v2));
    expect(v3.schemaVersion).toBe(3);
    const inp = v3.scenarios.s1.inputs as any;
    expect(inp.savingsPicks).toBeDefined();
    expect(inp.savingsPicks.A.preset).toBe('cons');
    expect(Object.keys(inp.savingsPicks.A.classes).length).toBeGreaterThan(0);
  });

  it('rejects unknown schemaVersion', () => {
    const bad = JSON.stringify({ schemaVersion: 9, activeScenarioId: 's', scenarios: {}, ui: {} });
    expect(() => importJson(bad)).toThrow();
  });
});
```

- [ ] **Step 3: Run the test file**

Run: `npm test -- tests/state/persistence.test.ts`
Expected: PASS — all blocks green.

- [ ] **Step 4: Commit**

```bash
git add tests/state/persistence.test.ts
git commit -m "test(savings/persistence): bump schemaVersion expectations to 3; cover v1→v3 chain and v2→v3"
```

---

## Task 10: Engine invariant — `simulate` ignores `savingsPicks`

**Files:**
- Modify: `tests/calc/engine.test.ts`

- [ ] **Step 1: Add the invariant test**

Open `tests/calc/engine.test.ts`. Find the existing `baseInputs()` factory (or whatever the file uses to build `Inputs`). Append a new test block at the bottom of the file:

```ts
import { simulate } from '../../src/lib/calc/engine';
import type { Inputs, SavingsPicks } from '../../src/lib/calc/types';

describe('engine — savingsPicks invariance', () => {
  it('simulate() ignores savingsPicks entirely', () => {
    // baseInputs() must already be available in this file from existing tests.
    // If the file uses a different factory name, substitute it.
    const inputs = baseInputs();
    const emptyPicks: SavingsPicks = {
      A: { preset: 'custom', classes: {} },
      B: { preset: 'custom', classes: {} },
      C: { preset: 'custom', classes: {} },
    };
    const fullPicks: SavingsPicks = {
      A: { preset: 'cons', classes: { savings_account: { share: 1_000_000 } } },
      B: { preset: 'cons', classes: { term_deposit:    { share: 1_000_000 } } },
      C: { preset: 'bal',  classes: { ofz_in:          { share: 1_000_000 } } },
    };
    const today = new Date(Date.UTC(2026, 4, 16));
    const a = simulate({ ...inputs, savingsPicks: emptyPicks }, today);
    const b = simulate({ ...inputs, savingsPicks: fullPicks  }, today);
    expect(a.balanceAtVoyage).toBe(b.balanceAtVoyage);
    expect(a.runsOutOn).toBe(b.runsOutOn);
    expect(a.daysOfRunway).toBe(b.daysOfRunway);
    expect(a.totalSpentRub).toBe(b.totalSpentRub);
  });
});
```

If `baseInputs()` does not exist in the file, look at how the existing tests construct `Inputs` and adapt. The factory pattern is established in `tests/calc/engine.test.ts` per the project test conventions.

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/calc/engine.test.ts -t "savingsPicks invariance"`
Expected: PASS — `simulate` doesn't read `savingsPicks`.

Also re-run the full engine test suite to make sure adding `savingsPicks` to `Inputs` did not break existing tests:

Run: `npm test -- tests/calc/engine.test.ts`
Expected: PASS across all tests. If any fail with `savingsPicks is missing`, add it to the `baseInputs()` factory using the same `EMPTY_PICKS` constant shape.

- [ ] **Step 3: Commit**

```bash
git add tests/calc/engine.test.ts
git commit -m "test(engine): assert simulate() is invariant under savingsPicks changes"
```

---

## Task 11: Update derived.test.ts for new income math

**Files:**
- Modify: `tests/state/derived.test.ts`

- [ ] **Step 1: Inspect current shape**

Run: `cat tests/state/derived.test.ts`

The existing `includeExpectedYield: true` test asserts `combinedResult.balanceAtVoyage === sim.balanceAtVoyage + sum(layerIncomeMid)`. With the new math, `sum(layerIncomeMid)` over an `EMPTY_PICKS`-shaped scenario is **0**, so the assertion would silently degenerate to `=== sim.balanceAtVoyage`. Make the test concrete with non-empty picks.

- [ ] **Step 2: Rewrite the relevant test**

Replace the `includeExpectedYield: true` test with one that uses concrete picks. Example shape:

```ts
import { describe, it, expect } from 'vitest';
import { simulate } from '../../src/lib/calc/engine';
import { allocate } from '../../src/lib/calc/allocate';
import type { Inputs } from '../../src/lib/calc/types';

function inputsWithYield(): Inputs {
  return {
    returnDate: '2026-05-16',
    voyageDate: '2027-05-16',
    salaryLumpSumUsd: 0,
    assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
    rubPerUsd: 90,
    monthlyFamilyRub: 0,
    goals: [],
    freeCashRub: 1_000_000,
    horizonDate: '2027-05-16',
    cbrKeyRatePct: 16,
    cbrRateUpdatedAt: '2026-05-16',
    layerOverride: { A: 600_000, B: 400_000, C: 0 },
    includeExpectedYield: true,
    savingsPicks: {
      A: { preset: 'cons', classes: { savings_account: { share: 600_000 } } },
      B: { preset: 'cons', classes: { term_deposit:    { share: 400_000 } } },
      C: { preset: 'bal',  classes: {} },
    },
  };
}

describe('derived — combined result yield overlay', () => {
  it('with includeExpectedYield=true adds sum of layer incomeMid to balanceAtVoyage', () => {
    const inp = inputsWithYield();
    const today = new Date(Date.UTC(2026, 4, 16));
    const sim   = simulate(inp, today);
    const alloc = allocate(inp, today);
    const expectedOverlay = alloc.layers.A.incomeMidRub + alloc.layers.B.incomeMidRub + alloc.layers.C.incomeMidRub;
    expect(expectedOverlay).toBeGreaterThan(0);
    // currentResult() is the function under test — import from derived
    // ... rest follows existing test pattern in derived.test.ts
  });

  it('with includeExpectedYield=false uses sim.balanceAtVoyage directly', () => {
    const inp = { ...inputsWithYield(), includeExpectedYield: false };
    // ... existing pattern
  });
});
```

Note: the exact `currentResult()` import shape depends on how `tests/state/derived.test.ts` is currently structured (the file is small). Keep the existing test structure and only adjust the math expectations + the `savingsPicks` field on the input fixtures.

- [ ] **Step 3: Run the test**

Run: `npm test -- tests/state/derived.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/state/derived.test.ts
git commit -m "test(derived): assert yield overlay uses picks-based midpoint sum"
```

---

## Task 12: i18n chrome keys (preset, badge, foot, pill, methodology)

**Files:**
- Modify: `src/lib/i18n/ru.json`
- Modify: `src/lib/i18n/en.json`

- [ ] **Step 1: Add chrome keys to `ru.json`**

In `src/lib/i18n/ru.json`, in the `savings.*` section (find the existing block via `grep -n "savings\." src/lib/i18n/ru.json`), add these keys (anywhere within the savings block):

```json
"savings.preset.cons": "Консервативные",
"savings.preset.bal": "Сбалансированные",
"savings.preset.all": "Все доступные",
"savings.preset.custom": "Своё",
"savings.preset.resetTooltip": "Вернуть пресет по умолчанию",
"savings.riskBadge.cons": "CONS",
"savings.riskBadge.std": "STD",
"savings.riskBadge.high": "HIGH",
"savings.riskBadge.methodology": "Классификация риска: CONS — инструменты с защитой капитала (АСВ, инфляц. защита, флоутер); STD — небольшая волатильность тела или ликвидности; HIGH — заметная просадка, кредитный или валютный риск.",
"savings.layerCard.expectedIncomeMid": "Ожидаемый доход",
"savings.layerCard.expectedIncomeRange": "диапазон",
"savings.layerCard.balanceUnallocated": "распределить остаток",
"savings.unalloc.ok": "всё распределено ✓",
"savings.unalloc.warn": "не распределено: {amount}",
"savings.unalloc.over": "превышение: {amount}",
"savings.classRow.expandLabel": "Подробнее",
"savings.print.title": "Распределение сбережений",
"savings.print.regimeLine": "Режим: {regime} (CBR {pct}%, обновлено {date})",
"savings.print.horizonLine": "Горизонт: {date} ({days} дней)",
"savings.print.layerLine": "{layer} · {name} · {window} · {amount} ₽ · Пресет: {preset}",
"savings.print.layerSubtotal": "Ожидаемый доход ({window}): ≈ {mid} ₽ (диапазон {low} – {high} ₽)",
"savings.print.grandTotal": "Итого · ожидаемый доход за горизонт ≈ {mid} ₽ (диапазон {low} – {high} ₽)",
"savings.print.riskMethodologyHeading": "Методология классификации риска"
```

- [ ] **Step 2: Add the SAME keys (English values) to `en.json`**

In `src/lib/i18n/en.json`, add (keep insertion location consistent with ru.json):

```json
"savings.preset.cons": "Conservative",
"savings.preset.bal": "Balanced",
"savings.preset.all": "All eligible",
"savings.preset.custom": "Custom",
"savings.preset.resetTooltip": "Reset to default preset",
"savings.riskBadge.cons": "CONS",
"savings.riskBadge.std": "STD",
"savings.riskBadge.high": "HIGH",
"savings.riskBadge.methodology": "Risk classification: CONS — capital-protected instruments (deposit insurance, inflation indexation, floaters); STD — minor principal or liquidity volatility; HIGH — notable drawdown, credit or FX exposure.",
"savings.layerCard.expectedIncomeMid": "Expected income",
"savings.layerCard.expectedIncomeRange": "range",
"savings.layerCard.balanceUnallocated": "auto-balance",
"savings.unalloc.ok": "all allocated ✓",
"savings.unalloc.warn": "unallocated: {amount}",
"savings.unalloc.over": "over-allocated: {amount}",
"savings.classRow.expandLabel": "Details",
"savings.print.title": "Savings allocation",
"savings.print.regimeLine": "Regime: {regime} (CBR {pct}%, updated {date})",
"savings.print.horizonLine": "Horizon: {date} ({days} days)",
"savings.print.layerLine": "{layer} · {name} · {window} · {amount} ₽ · Preset: {preset}",
"savings.print.layerSubtotal": "Expected income ({window}): ≈ {mid} ₽ (range {low} – {high} ₽)",
"savings.print.grandTotal": "Total · expected income over horizon ≈ {mid} ₽ (range {low} – {high} ₽)",
"savings.print.riskMethodologyHeading": "Risk classification methodology"
```

- [ ] **Step 3: Verify i18n parity**

Run:
```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
```

Expected: empty output (no diff). If any keys differ, add the missing one to the other file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/ru.json src/lib/i18n/en.json
git commit -m "i18n(savings): add chrome keys for presets, risk badges, pills, print block"
```

---

## Task 13: i18n education blurbs (5 fields × 10 classes × 2 locales)

**Files:**
- Modify: `src/lib/i18n/ru.json`
- Modify: `src/lib/i18n/en.json`

**Context for the implementer:** This is the editorial-heavy task. 50 short Russian paragraphs are written first (source of truth), then descriptive English translations. All blurbs follow editorial rules from spec §6:
- No specific issuers / banks / tickers (ticker *patterns* like "LQDT, AKMM, SBMM" are OK).
- Plain definitions, no marketing copy.
- Tax rules current as of 2026 (13% НДФЛ; ИИС-Б exemption where applicable).
- Russian originals are the source of truth.

- [ ] **Step 1: Add 5 keys × 10 classes (50 keys) to `ru.json`**

In `src/lib/i18n/ru.json`, append these 50 keys inside the savings block:

```json
"savings.classes.savings_account.edu.whatItIs": "Банковский счёт с начислением процентов на остаток. Деньги доступны в любой день; ставка может меняться банком.",
"savings.classes.savings_account.edu.howToBuy": "Открывается в банке или его мобильном приложении. Часто привязан к карте.",
"savings.classes.savings_account.edu.yieldBehavior": "Ставка ≈ ключевая − (1…3) п.п. Банк может менять её в одностороннем порядке. Проценты начисляются ежемесячно.",
"savings.classes.savings_account.edu.tax": "Проценты по вкладам/счетам в банках облагаются НДФЛ 13% сверх необлагаемого порога (CBR × 1 млн ₽/год).",
"savings.classes.savings_account.edu.whenToPick": "Для текущей подушки 0–30 дней. Максимум 1,4 млн ₽ в одном банке (АСВ).",

"savings.classes.term_deposit.edu.whatItIs": "Срочный банковский вклад с фиксированной ставкой на 3, 6 или 12 месяцев. Досрочное снятие обнуляет проценты.",
"savings.classes.term_deposit.edu.howToBuy": "Открывается в банке или его мобильном приложении. Требуется выбрать срок.",
"savings.classes.term_deposit.edu.yieldBehavior": "Ставка ≈ ключевая − 0,5…+1,5 п.п. Зафиксирована на весь срок вклада.",
"savings.classes.term_deposit.edu.tax": "НДФЛ 13% с превышения необлагаемого порога (CBR × 1 млн ₽/год).",
"savings.classes.term_deposit.edu.whenToPick": "Для денег, которые точно не понадобятся до конца срока. АСВ покрывает до 1,4 млн ₽ в одном банке.",

"savings.classes.mm_fund.edu.whatItIs": "Биржевой фонд, держащий короткие гособлигации и сделки репо. Аналог накопительного счёта без АСВ.",
"savings.classes.mm_fund.edu.howToBuy": "На Московской бирже через брокера. Тикеры вида LQDT, AKMM, SBMM. Один пай ≈ 1 ₽.",
"savings.classes.mm_fund.edu.yieldBehavior": "Доходность ≈ ключевая − 0,5…1 п.п. Начисление ежедневное, продажа в любой торговый день.",
"savings.classes.mm_fund.edu.tax": "НДФЛ 13% с прибыли при продаже. ИИС типа Б освобождает от налога.",
"savings.classes.mm_fund.edu.whenToPick": "Если есть брокерский счёт и не хочется делить деньги по банкам ради АСВ.",

"savings.classes.ofz_pd.edu.whatItIs": "Облигация федерального займа с постоянным купоном. Госдолг РФ в рублях.",
"savings.classes.ofz_pd.edu.howToBuy": "На Московской бирже через брокера. Номинал 1000 ₽. Купон выплачивается раз в полгода.",
"savings.classes.ofz_pd.edu.yieldBehavior": "Доходность к погашению ≈ ключевая − 1…+0,5 п.п. Цена падает при росте ставок — продажа до погашения может дать убыток.",
"savings.classes.ofz_pd.edu.tax": "Купон облагается НДФЛ 13%. На ИИС типа А — вычет 13% с внесённой суммы; на ИИС типа Б — освобождение от налога на прибыль.",
"savings.classes.ofz_pd.edu.whenToPick": "Когда ожидаете снижение ставки и готовы держать до погашения.",

"savings.classes.ofz_pk.edu.whatItIs": "Облигация федерального займа с плавающим купоном, привязанным к ставке RUONIA.",
"savings.classes.ofz_pk.edu.howToBuy": "На Московской бирже через брокера. Номинал 1000 ₽.",
"savings.classes.ofz_pk.edu.yieldBehavior": "Купон пересчитывается каждые 3–6 месяцев по средней RUONIA. Цена меняется слабее, чем у ОФЗ-ПД.",
"savings.classes.ofz_pk.edu.tax": "Купон облагается НДФЛ 13%. ИИС типа Б — освобождение.",
"savings.classes.ofz_pk.edu.whenToPick": "Когда ставка может расти или непредсказуема. Низкая чувствительность к движениям ставки.",

"savings.classes.ofz_in.edu.whatItIs": "Облигация федерального займа с защитой от инфляции. Номинал индексируется на ИПЦ.",
"savings.classes.ofz_in.edu.howToBuy": "На Московской бирже через брокера. Тикеры серии 52000.",
"savings.classes.ofz_in.edu.yieldBehavior": "Купон 2,5% от индексированного номинала + индексация ИПЦ. Реальная доходность ≈ 2,5% + инфляция.",
"savings.classes.ofz_in.edu.tax": "Купон облагается НДФЛ 13%. Индексация номинала при погашении тоже облагается.",
"savings.classes.ofz_in.edu.whenToPick": "Для защиты длинных денег от инфляции. На горизонте 1+ год.",

"savings.classes.corp_bond.edu.whatItIs": "Облигация крупной российской компании первого эшелона (Сбербанк, Роснефть, РЖД и т.п.).",
"savings.classes.corp_bond.edu.howToBuy": "На Московской бирже через брокера. Номинал обычно 1000 ₽.",
"savings.classes.corp_bond.edu.yieldBehavior": "Доходность ≈ ключевая + 0,5…2 п.п. (премия за кредитный риск). Цена реагирует и на ставку, и на новости об эмитенте.",
"savings.classes.corp_bond.edu.tax": "Купон облагается НДФЛ 13%. ИИС типа Б — освобождение.",
"savings.classes.corp_bond.edu.whenToPick": "Когда готовы взять кредитный риск ради дополнительной доходности. Диверсифицируйте по эмитентам.",

"savings.classes.replacement_bond.edu.whatItIs": "Замещающая облигация — выпускается в рублях, но привязана к доллару США. Купон и тело номинированы в USD, выплата в рублях по курсу ЦБ.",
"savings.classes.replacement_bond.edu.howToBuy": "На Московской бирже через брокера. Без необходимости валютного счёта.",
"savings.classes.replacement_bond.edu.yieldBehavior": "Доходность ≈ 6…9% в долларах. Рублёвая доходность = долларовая + ослабление рубля.",
"savings.classes.replacement_bond.edu.tax": "НДФЛ 13% с купона и с курсовой разницы при продаже/погашении.",
"savings.classes.replacement_bond.edu.whenToPick": "Для хеджа от ослабления рубля на горизонте 1+ год. Готовность к санкционным и расчётным рискам.",

"savings.classes.cny_bond.edu.whatItIs": "Облигация, номинированная в юанях. Купон и тело в CNY, расчёт через российского брокера.",
"savings.classes.cny_bond.edu.howToBuy": "На Московской бирже через брокера, поддерживающего CNY-секцию.",
"savings.classes.cny_bond.edu.yieldBehavior": "Доходность ≈ 5…8% в юанях. Рублёвая доходность = юаневая + динамика CNY/RUB.",
"savings.classes.cny_bond.edu.tax": "НДФЛ 13% с купона и с курсовой разницы при продаже/погашении.",
"savings.classes.cny_bond.edu.whenToPick": "Диверсификация по валюте без долларовых рисков. Готовность к узкому вторичному рынку.",

"savings.classes.gold.edu.whatItIs": "Биржевое золото или золотые облигации (ОМС, фьючерсы, замещающие облигации Селигдара). Тело привязано к цене золота на LBMA.",
"savings.classes.gold.edu.howToBuy": "На Московской бирже через брокера или в банке (обезличенный металлический счёт).",
"savings.classes.gold.edu.yieldBehavior": "Доходность = изменение цены золота в рублях. Может быть как +20%, так и −15% за год. Не приносит купонного дохода.",
"savings.classes.gold.edu.tax": "НДФЛ 13% с прибыли при продаже. ИИС типа Б — освобождение для биржевых форм.",
"savings.classes.gold.edu.whenToPick": "Для защиты от системных шоков. Не более 5–10% портфеля. Готовность к большой просадке."
```

- [ ] **Step 2: Add the SAME keys with English translations to `en.json`**

In `src/lib/i18n/en.json`, add the corresponding 50 keys with English values. Sample for the first class:

```json
"savings.classes.savings_account.edu.whatItIs": "Bank account that pays interest on the balance. Money is available any day; the rate may be changed by the bank.",
"savings.classes.savings_account.edu.howToBuy": "Opened at a bank branch or via the bank's mobile app. Often linked to a debit card.",
"savings.classes.savings_account.edu.yieldBehavior": "Rate ≈ CBR − 1…3 pp. The bank may change it unilaterally. Interest accrues monthly.",
"savings.classes.savings_account.edu.tax": "Russian bank interest is taxed at 13% PIT above the annual exempt threshold (CBR × ₽1M/year).",
"savings.classes.savings_account.edu.whenToPick": "For the 0–30 day cash cushion. Up to ₽1.4M per bank is covered by deposit insurance (АСВ).",
```

Continue with the same structure for the remaining 9 classes. Use the RU originals in Step 1 as the source — English is a descriptive translation, not a marketing rewrite.

(Full English text for all 10 classes is 45 more entries. The implementer translates each blurb 1-to-1 from the RU original. Length should match roughly; tone is neutral and explanatory.)

- [ ] **Step 3: Verify i18n parity**

Run:
```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
```

Expected: empty output.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/ru.json src/lib/i18n/en.json
git commit -m "i18n(savings/edu): add 5-field educational blurbs for all 10 instrument classes (RU + EN)"
```

---

## Task 14: CSS additions in `global.css`

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Widen `.layer-class` grid**

In `src/styles/global.css`, find the existing `.layer-class` selector (around line 755). Change:

```css
.layer-class {
  display: grid; grid-template-columns: 1fr auto;
  gap: var(--gap-2);
  padding: 6px 0;
  border-top: 1px dashed var(--border);
  font-size: var(--t-small);
}
```

to:

```css
.layer-class {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  column-gap: var(--gap-2);
  align-items: center;
  padding: var(--gap-2) 0;
  border-top: 1px dashed var(--border);
  font-size: var(--t-small);
}
.layer-class:first-of-type { border-top: 1px solid var(--border); }
.layer-class.off { opacity: 0.42; }
```

- [ ] **Step 2: Append new selectors at the end of the savings styles block**

Locate the end of the existing savings/layer styles block (after `.layer-empty { ... }`, around line 776, before the `.report-foot` block). Insert:

```css
/* ────────── Layer presets row ────────── */
.layer-presets {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  font-family: var(--mono);
  font-size: var(--t-micro);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  align-self: flex-start;
}
.layer-presets button {
  background: transparent;
  color: var(--fg-3);
  border: 0; padding: 5px 9px;
  cursor: pointer;
  border-right: 1px solid var(--border);
  font-family: inherit; font-size: inherit; letter-spacing: inherit;
}
.layer-presets button:last-child { border-right: 0; }
.layer-presets button.active { background: var(--surface-1); color: var(--fg); }
.layer.a .layer-presets button.active { color: var(--accent); }
.layer.b .layer-presets button.active { color: var(--primary); }
.layer.c .layer-presets button.active { color: var(--warn); }
.preset-reset {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--fg-4);
  width: 24px; height: 24px;
  cursor: pointer;
  font-size: var(--t-med);
  line-height: 1;
  border-radius: var(--radius-sm);
  padding: 0;
  margin-left: 6px;
}
.preset-reset:hover { color: var(--primary); border-color: var(--primary); }

/* ────────── ClassRow primitives ────────── */
.cb {
  width: 14px; height: 14px;
  border: 1px solid var(--fg-4); border-radius: 3px;
  display: inline-flex; align-items: center; justify-content: center;
  color: transparent; font-size: 10px; font-weight: 700;
  cursor: pointer;
  background: transparent;
  padding: 0;
}
.cb.on { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.layer.b .cb.on { background: var(--primary); border-color: var(--primary); }
.layer.c .cb.on { background: var(--warn); border-color: var(--warn); }

.risk-badge {
  display: inline-block;
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.12em; padding: 1px 5px;
  border-radius: 3px;
}
.risk-badge.cons { background: rgba(16,185,129,0.14); color: var(--accent); }
.risk-badge.std  { background: rgba(59,130,246,0.14); color: var(--primary); }
.risk-badge.high { background: rgba(245,158,11,0.14); color: var(--warn); }

.share-input {
  width: 84px;
  background: transparent;
  border: none; border-bottom: 1px solid var(--border);
  color: var(--fg);
  text-align: right;
  font-family: var(--mono); font-size: var(--t-small);
  font-variant-numeric: tabular-nums;
  padding: 2px 0;
}
.share-input:focus { outline: none; border-bottom-color: var(--accent); }
.layer.b .share-input:focus { border-bottom-color: var(--primary); }
.layer.c .share-input:focus { border-bottom-color: var(--warn); }
.share-cur { color: var(--fg-4); font-family: var(--mono); font-size: var(--t-micro); }

.chev {
  color: var(--fg-4);
  cursor: pointer;
  font-family: var(--mono);
  user-select: none;
  width: 16px;
  text-align: center;
}
.chev:hover { color: var(--fg-2); }

.class-edu {
  grid-column: 1 / -1;
  margin: 6px calc(-1 * var(--gap-5)) var(--gap-2);
  padding: var(--gap-3) var(--gap-5);
  background: rgba(0,0,0,0.18);
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
  font-size: var(--t-small);
  color: var(--fg-2);
  line-height: 1.55;
}
.class-edu dt {
  font-family: var(--mono); font-size: var(--t-micro);
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--fg-3);
  margin-top: var(--gap-2);
}
.class-edu dt:first-of-type { margin-top: 0; }
.class-edu dd { margin: 2px 0 0 0; }

/* ────────── Layer foot pill ────────── */
.unalloc-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px; border: 1px solid var(--border);
  border-radius: 999px;
  font-family: var(--mono); font-size: var(--t-micro);
  color: var(--fg-3);
  background: rgba(255,255,255,0.02);
  cursor: default;
}
.unalloc-pill.ok { color: var(--accent); }
.unalloc-pill.warn {
  color: var(--warn);
  border-color: rgba(245,158,11,0.4);
  cursor: pointer;
}
.unalloc-pill.over {
  color: var(--danger);
  border-color: rgba(220,38,38,0.45);
}
```

- [ ] **Step 3: Mobile collapse for `.layer-class`**

Find the existing `@media (max-width: 640px)` block (around line 811) and inside it, add:

```css
  .layer-class {
    grid-template-columns: 18px 1fr auto;
    grid-template-areas:
      "cb name right"
      ".  meta meta";
    row-gap: 4px;
  }
  .layer-class .cb        { grid-area: cb; }
  .layer-class .class-main{ grid-area: name; }
  .layer-class .class-meta{ grid-area: meta; }
  .layer-class .class-right{ grid-area: right; }
```

(Some of these grid-area names — `.class-main`, `.class-meta`, `.class-right` — will be defined as nested wrappers inside `ClassRow.svelte`. Make sure ClassRow's markup uses those class names.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS — CSS compiles, no Svelte errors yet (we haven't touched components). Open `dist/assets/*.css` and grep for `.risk-badge` to confirm the new selectors are emitted.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(savings/css): add preset row, ClassRow, risk badge, edu panel, unalloc pill primitives"
```

---

## Task 15: Create `ClassRow.svelte`

**Files:**
- Create: `src/components/sections/savings/ClassRow.svelte`

- [ ] **Step 1: Write the component**

Create `src/components/sections/savings/ClassRow.svelte`:

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { InstrumentClass, ClassPick, LayerKey } from '../../../lib/calc/types';

  let { cls, pick, cbrPct, onToggle, onShareChange, onExpandToggle, expanded } = $props<{
    cls: InstrumentClass;
    pick: ClassPick | undefined;
    cbrPct: number;
    onToggle: () => void;
    onShareChange: (n: number) => void;
    onExpandToggle: () => void;
    expanded: boolean;
  }>();

  const checked = $derived(pick !== undefined);
  const shareValue = $derived(pick && pick.share > 0 ? String(Math.round(pick.share)) : '');

  const yieldLow  = $derived(cbrPct + cls.cbrOffset.low);
  const yieldHigh = $derived(cbrPct + cls.cbrOffset.high);

  function fmtPct(n: number): string {
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function onShareInput(e: Event) {
    const t = e.target as HTMLInputElement;
    const raw = t.value.replace(/\s/g, '');
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) {
      onShareChange(n);
    }
  }
</script>

<div class="layer-class" class:off={!checked}>
  <button
    class="cb"
    class:on={checked}
    type="button"
    aria-pressed={checked}
    aria-label={cls.id}
    onclick={onToggle}
  >{checked ? '✓' : ''}</button>

  <div class="class-main">
    <div class="class-name">
      <span class="nm">{$_(`savings.classes.${cls.id}.name`)}</span>
      <span class="risk-badge {cls.risk}">{$_(`savings.riskBadge.${cls.risk}`)}</span>
    </div>
    <div class="class-meta">
      {#if Math.abs(yieldLow - yieldHigh) < 0.05}
        <span class="yld">{fmtPct(yieldLow)}%</span>
      {:else}
        <span class="yld">{fmtPct(yieldLow)}–{fmtPct(yieldHigh)}%</span>
      {/if}
      <span class="sep">·</span>
      <span>{$_(`savings.currency.${cls.currency}`)}</span>
      {#if cls.isDeposit}<span class="sep">·</span><span>ДЕП</span>{/if}
      <span class="sep">·</span>
      <span>{$_(`savings.liquidity.${cls.liquidity}`)}</span>
    </div>
  </div>

  <span class="class-right">
    <input
      class="share-input"
      type="number"
      inputmode="decimal"
      min="0"
      step="any"
      placeholder="—"
      value={shareValue}
      oninput={onShareInput}
      aria-label={cls.id + ' share'}
    />
    <span class="share-cur">₽</span>
    <button class="chev" type="button" onclick={onExpandToggle} aria-label={$_('savings.classRow.expandLabel')}>
      {expanded ? '⌄' : '›'}
    </button>
  </span>

  {#if expanded}
    <dl class="class-edu">
      <dt>{$_('savings.classes.' + cls.id + '.edu.whatItIs').split('.')[0]}</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.whatItIs`)}</dd>
      <dt>Как купить</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.howToBuy`)}</dd>
      <dt>Доходность</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.yieldBehavior`)}</dd>
      <dt>Налог</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.tax`)}</dd>
      <dt>Когда выбирать</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.whenToPick`)}</dd>
    </dl>
  {/if}
</div>
```

NOTE: The `<dt>` labels above ("Как купить", "Доходность", "Налог", "Когда выбирать") are hardcoded. To make them i18n-driven, add five extra keys in Task 12 — `savings.classRow.edu.{whatItIs|howToBuy|yieldBehavior|tax|whenToPick}` — and replace the hardcoded labels with `$_('savings.classRow.edu.howToBuy')` etc. The implementer should add these five label keys to both locales now (before testing) so the labels translate. Update the i18n parity check after.

- [ ] **Step 2: Verify svelte-check passes**

Run: `npm run typecheck`
Expected: PASS — the new component compiles. If a missing-key warning surfaces at runtime, ensure the five `savings.classRow.edu.*` label keys (added in Step 1's note) exist in both locales.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/savings/ClassRow.svelte src/lib/i18n/ru.json src/lib/i18n/en.json
git commit -m "feat(savings/ui): add ClassRow.svelte with checkbox, share input, expandable edu panel"
```

---

## Task 16: Rewrite `LayerCard.svelte`

**Files:**
- Modify: `src/components/sections/savings/LayerCard.svelte`

- [ ] **Step 1: Replace LayerCard with picks-driven version**

Replace the entire contents of `src/components/sections/savings/LayerCard.svelte`:

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { autoFillFromPreset } from '../../../lib/calc/allocate';
  import { formatRub } from '../../../lib/format';
  import type { LayerKey, Preset } from '../../../lib/calc/types';
  import ClassRow from './ClassRow.svelte';

  let { layer }: { layer: LayerKey } = $props();

  const LAYER_DEFAULT_PRESET: Record<LayerKey, Exclude<Preset, 'custom'>> = {
    A: 'cons', B: 'cons', C: 'bal',
  };

  let expandedClassId = $state<string | null>(null);

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const info   = $derived(result.alloc.layers[layer]);
  const picks  = $derived(inputs.savingsPicks[layer]);

  function shortName(full: string): string {
    const idx = full.indexOf('·');
    return idx >= 0 ? full.slice(idx + 1).trim() : full;
  }

  function onAmount(e: Event) {
    const t = e.target as HTMLInputElement;
    const raw = t.value.replace(/\s/g, '');
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.layerOverride = { ...inputs.layerOverride, [layer]: n };
      persistSoon();
    }
  }

  function applyPreset(p: Exclude<Preset, 'custom'>) {
    const classes = autoFillFromPreset(info.amountRub, info.candidates, p);
    inputs.savingsPicks = {
      ...inputs.savingsPicks,
      [layer]: { preset: p, classes },
    };
    persistSoon();
  }

  function resetToLayerDefault() {
    applyPreset(LAYER_DEFAULT_PRESET[layer]);
  }

  function toggleClass(id: string) {
    const current = picks.classes;
    const next: typeof current = { ...current };
    if (id in next) {
      delete next[id];
    } else {
      next[id] = { share: 0 };
    }
    inputs.savingsPicks = {
      ...inputs.savingsPicks,
      [layer]: { preset: 'custom', classes: next },
    };
    persistSoon();
  }

  function changeShare(id: string, n: number) {
    const next = { ...picks.classes, [id]: { share: n } };
    inputs.savingsPicks = {
      ...inputs.savingsPicks,
      [layer]: { preset: 'custom', classes: next },
    };
    persistSoon();
  }

  function balanceRemainder() {
    const remainder = info.unallocatedRub;
    if (remainder <= 0) return;
    const ids = Object.keys(picks.classes);
    if (ids.length === 0) return;
    const per = Math.floor(remainder / ids.length);
    const leftover = remainder - per * ids.length;
    const next = { ...picks.classes };
    ids.forEach((id, i) => {
      const add = i === ids.length - 1 ? per + leftover : per;
      next[id] = { share: next[id].share + add };
    });
    inputs.savingsPicks = {
      ...inputs.savingsPicks,
      [layer]: { preset: 'custom', classes: next },
    };
    persistSoon();
  }

  function toggleExpand(id: string) {
    expandedClassId = expandedClassId === id ? null : id;
  }
</script>

<div class="layer {layer.toLowerCase()}">
  <div class="layer-head">
    <div class="layer-tag">
      <span class="swatch"></span>
      {layer} · {shortName($_(`savings.layer.${layer}.name`))}
    </div>
  </div>

  <input
    class="layer-amt-input"
    type="number"
    inputmode="decimal"
    min="0"
    step="any"
    value={info.amountRub === 0 ? '' : Math.round(info.amountRub)}
    placeholder="0"
    oninput={onAmount}
    aria-label={$_('savings.layerCard.amount')}
  />

  <div class="layer-bar">
    <div style="width: {inputs.freeCashRub > 0 ? Math.round(info.amountRub * 100 / inputs.freeCashRub) : 0}%"></div>
  </div>

  <div style="display: flex; align-items: center;">
    <div class="layer-presets">
      <button class:active={picks.preset === 'cons'} onclick={() => applyPreset('cons')}>{$_('savings.preset.cons')}</button>
      <button class:active={picks.preset === 'bal'}  onclick={() => applyPreset('bal')}>{$_('savings.preset.bal')}</button>
      <button class:active={picks.preset === 'all'}  onclick={() => applyPreset('all')}>{$_('savings.preset.all')}</button>
    </div>
    {#if picks.preset === 'custom'}
      <button class="preset-reset" type="button" onclick={resetToLayerDefault} title={$_('savings.preset.resetTooltip')} aria-label={$_('savings.preset.resetTooltip')}>↺</button>
    {/if}
  </div>

  {#if info.candidates.length === 0}
    <p class="layer-empty">{$_('savings.layerCard.noCandidates')}</p>
  {:else}
    <div class="layer-classes">
      {#each info.candidates as cls (cls.id)}
        <ClassRow
          cls={cls}
          pick={picks.classes[cls.id]}
          cbrPct={inputs.cbrKeyRatePct}
          expanded={expandedClassId === cls.id}
          onToggle={() => toggleClass(cls.id)}
          onShareChange={(n: number) => changeShare(cls.id, n)}
          onExpandToggle={() => toggleExpand(cls.id)}
        />
      {/each}
    </div>
  {/if}

  <div class="layer-foot">
    <span class="lbl">{$_('savings.layerCard.expectedIncomeMid')}</span>
    <span>
      {#if info.incomeMidRub > 0}
        <span class="val-big">≈ {formatRub(info.incomeMidRub, app.ui.language)}</span>
        <span class="val-rng">{$_('savings.layerCard.expectedIncomeRange')} {formatRub(info.incomeRangeRub.low, app.ui.language)} – {formatRub(info.incomeRangeRub.high, app.ui.language)}</span>
      {:else}
        <span class="val-big foot-empty">—</span>
      {/if}
      {#if info.overAllocatedRub > 0}
        <span class="unalloc-pill over">{$_('savings.unalloc.over', { values: { amount: formatRub(info.overAllocatedRub, app.ui.language) } })}</span>
      {:else if info.unallocatedRub > 0}
        <button class="unalloc-pill warn" type="button" onclick={balanceRemainder} title={$_('savings.layerCard.balanceUnallocated')}>
          {$_('savings.unalloc.warn', { values: { amount: formatRub(info.unallocatedRub, app.ui.language) } })}
        </button>
      {:else}
        <span class="unalloc-pill ok">{$_('savings.unalloc.ok')}</span>
      {/if}
    </span>
  </div>
</div>

<style>
  .layer-amt-input {
    all: unset;
    font-family: var(--mono);
    font-size: var(--t-2xl);
    font-weight: 600;
    color: var(--fg);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    width: 100%;
    border-bottom: 1px solid transparent;
    padding: 2px 0;
    transition: border-color 150ms ease;
    cursor: text;
    box-sizing: border-box;
  }
  .layer-amt-input:hover { border-bottom-color: var(--border); }
  .layer-amt-input:focus { border-bottom-color: var(--primary); outline: none; }
  .layer-amt-input::placeholder { color: var(--fg-4); }

  .layer-foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: var(--gap-2);
    border-top: 1px dashed var(--border);
    font-size: var(--t-small);
    flex-wrap: wrap;
    gap: 8px;
  }
  .layer-foot .lbl {
    color: var(--fg-3);
    font-family: var(--mono);
    font-size: var(--t-mini);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .layer-foot .val-big {
    color: var(--accent);
    font-family: var(--mono);
    font-size: var(--t-lg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .layer.b .layer-foot .val-big { color: var(--primary); }
  .layer.c .layer-foot .val-big { color: var(--warn); }
  .layer-foot .val-rng {
    font-family: var(--mono);
    font-size: var(--t-mini);
    color: var(--fg-4);
    margin-left: 8px;
  }
  .foot-empty { color: var(--fg-4); }
</style>
```

- [ ] **Step 2: Run typecheck and build**

```bash
npm run typecheck
npm run build
```

Expected: PASS. If a missing-key warning surfaces in build output for any `savings.*` key, add it to both locales.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/savings/LayerCard.svelte
git commit -m "feat(savings/ui): rewrite LayerCard to drive picks (preset row, ClassRow loop, midpoint foot)"
```

---

## Task 17: Delete `ClassCard.svelte`

**Files:**
- Delete: `src/components/sections/savings/ClassCard.svelte`

- [ ] **Step 1: Confirm no remaining references**

Run:
```bash
grep -rn "ClassCard" src/
```

Expected: zero matches in `src/`. (LayerCard was the only consumer; it now uses ClassRow.)

If any reference remains, fix it (likely a leftover import line) before deletion.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/sections/savings/ClassCard.svelte
```

- [ ] **Step 3: Run typecheck and full test suite**

```bash
npm run typecheck
npm test
```

Expected: PASS on both.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(savings/ui): remove ClassCard.svelte (replaced by ClassRow)"
```

---

## Task 18: Rewrite PrintView savings block

**Files:**
- Modify: `src/components/PrintView.svelte`

- [ ] **Step 1: Inspect the current PrintView**

Run: `cat src/components/PrintView.svelte`

Identify the existing savings block (currently lists layer name, amount, expected income range — per the v1 spec). It is the block to replace.

- [ ] **Step 2: Replace the savings block**

Inside `src/components/PrintView.svelte`, replace the existing savings block with this structure:

```svelte
<section class="print-savings">
  <h2>{$_('savings.print.title')}</h2>
  <p>
    {$_('savings.print.regimeLine', { values: {
      regime: $_(`savings.regime.${result.alloc.regime}`),
      pct: inputs.cbrKeyRatePct,
      date: inputs.cbrRateUpdatedAt,
    } })}
  </p>
  <p>
    {$_('savings.print.horizonLine', { values: {
      date: inputs.horizonDate,
      days: result.alloc.horizonDays,
    } })}
  </p>

  {#each (['A', 'B', 'C'] as const) as layer}
    {@const L = result.alloc.layers[layer]}
    {@const picks = inputs.savingsPicks[layer]}
    <div class="print-layer">
      <h3>
        {$_('savings.print.layerLine', { values: {
          layer,
          name: $_(`savings.layer.${layer}.name`).split('·').pop()?.trim(),
          window: $_(`savings.layer.${layer}.window`),
          amount: formatRub(L.amountRub, app.ui.language),
          preset: $_(`savings.preset.${picks.preset}`),
        } })}
      </h3>
      <ul>
        {#each L.pickedClasses as p}
          <li>
            ✓ {$_(`savings.classes.${p.cls.id}.name`)} —
            {formatRub(p.share, app.ui.language)} —
            {fmtPct(inputs.cbrKeyRatePct + p.cls.cbrOffset.low)}–{fmtPct(inputs.cbrKeyRatePct + p.cls.cbrOffset.high)}% p.a. —
            [{$_(`savings.riskBadge.${p.cls.risk}`)}]
          </li>
        {/each}
      </ul>
      <p class="subtotal">
        {$_('savings.print.layerSubtotal', { values: {
          window: $_(`savings.layer.${layer}.window`),
          mid: formatRub(L.incomeMidRub, app.ui.language),
          low: formatRub(L.incomeRangeRub.low, app.ui.language),
          high: formatRub(L.incomeRangeRub.high, app.ui.language),
        } })}
      </p>
    </div>
  {/each}

  <p class="grand-total">
    {$_('savings.print.grandTotal', { values: {
      mid: formatRub(result.alloc.layers.A.incomeMidRub + result.alloc.layers.B.incomeMidRub + result.alloc.layers.C.incomeMidRub, app.ui.language),
      low: formatRub(result.alloc.layers.A.incomeRangeRub.low + result.alloc.layers.B.incomeRangeRub.low + result.alloc.layers.C.incomeRangeRub.low, app.ui.language),
      high: formatRub(result.alloc.layers.A.incomeRangeRub.high + result.alloc.layers.B.incomeRangeRub.high + result.alloc.layers.C.incomeRangeRub.high, app.ui.language),
    } })}
  </p>

  <p>— {$_('savings.taxBanner', { values: { amount: formatRub(result.alloc.taxThresholdRub, app.ui.language) } })}</p>
  {#each result.alloc.asvWarningLayers as l}
    <p>— {l}: {$_('savings.asvWarning')}</p>
  {/each}
  <p>— {$_('savings.disclaimer')}</p>
  <h4>{$_('savings.print.riskMethodologyHeading')}</h4>
  <p>{$_('savings.riskBadge.methodology')}</p>
</section>
```

The implementer should adapt the `<script>` part of PrintView to expose `inputs`, `result`, `app`, and a `fmtPct` helper if not already present. The existing PrintView is already wired to the rune store; only the savings block markup changes.

- [ ] **Step 3: Build and visually verify**

```bash
npm run build
npm run dev
```

Open `http://localhost:5173`, hit "Print / PDF", confirm the savings block renders with picked classes, shares, yield ranges, risk badges, and grand total on the paper-terminal palette.

- [ ] **Step 4: Commit**

```bash
git add src/components/PrintView.svelte
git commit -m "feat(print): rewrite savings block as consultant-validation document (picks + yields + grand total)"
```

---

## Task 19: i18n parity sanity check and full test suite

**Files:** none

- [ ] **Step 1: Run i18n parity check**

```bash
diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)
```

Expected: empty. If non-empty, add the missing key to the other file using the existing translation.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: PASS — all suites. If anything fails:
- A missing `savingsPicks` field on an `Inputs` literal → add the `EMPTY_PICKS` shape.
- A leftover `schemaVersion).toBe(2)` → bump to 3.
- An old "min/max over all candidates" assertion in `allocate.test.ts` → rewrite with concrete picks.

- [ ] **Step 3: Run typecheck and build**

```bash
npm run typecheck
npm run build
```

Expected: PASS on both.

- [ ] **Step 4: No commit needed unless fixes were made**

If you had to edit anything to make the above pass, commit:

```bash
git add -A
git commit -m "fix(savings): post-implementation parity and test fixes"
```

---

## Task 20: Manual UI verification

**Files:** none — runtime browser verification only.

This task does NOT produce a commit. Its output is either "verified, proceed" or a written defect list that triggers fixes (re-enter relevant Task N).

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173`.

- [ ] **Step 2: Migration check (clean localStorage)**

In browser devtools console: `localStorage.clear(); location.reload();`. The page should load on `Default` scenario; Layer A and B should show preset = `Conservative` highlighted; Layer C should show `Balanced`. With `freeCashRub === 0`, layer amounts are 0 and class lists exist but no checkboxes are on. Numbers populate when you raise free cash.

- [ ] **Step 3: Preset switching**

Set `freeCashRub` to 2_000_000 in the sidebar. Layer A should auto-show Conservative classes checked with equal split.
Click "Balanced" in Layer A. Shares redistribute; midpoint + range update reactively.

- [ ] **Step 4: Custom + reset**

Edit one share in Layer A. Preset pills de-highlight (preset becomes `custom`). The `↺` button appears. Click `↺` — Layer A returns to Conservative auto-fill.

- [ ] **Step 5: Uncheck a class**

Uncheck one row. The row dims (`opacity: 0.42`). Share clears. Unallocated pill turns amber with the delta.

- [ ] **Step 6: Auto-balance**

Click the amber pill. The remainder distributes across the currently-checked classes; pill turns green ✓.

- [ ] **Step 7: Over-allocate**

Type a share larger than the layer amount in Layer A. Footer pill shows red `over-allocated: X ₽`. The midpoint number still adds up to what you typed (engine doesn't cap).

- [ ] **Step 8: Education panel**

Tap `›` next to any class name. Inline `.class-edu` panel expands with 5 blurbs in current language. Tap again to collapse.

- [ ] **Step 9: i18n flip**

Switch RU ↔ EN via the language toggle. Every blurb, badge, preset label, and footer label translates. Check the browser console for missing-key warnings — there should be none.

- [ ] **Step 10: Regime change**

In the sidebar, change CBR from 16 → 9. Regime indicator goes from HIGH to LOW; candidate sets in each layer shrink. Any picks for now-ineligible classes are silently ignored in math but stay in state (the row still shows greyed). Flip CBR back to 16 → income recomputes correctly.

- [ ] **Step 11: Print preview**

Click "Печать / PDF" in the header. Browser print dialog opens. The savings block lists every picked class with share + yield + risk badge per layer, plus grand total, on paper-terminal palette.

- [ ] **Step 12: Export / re-import**

Click "Экспорт JSON". Save the file. Run `localStorage.clear(); location.reload();`. Click "Импорт JSON" and load the file. All picks should restore exactly.

- [ ] **Step 13: Report**

Confirm all 12 steps pass. If any step fails, write the defect in this checklist and route back to the relevant Task N (e.g. "Step 5 fails — share doesn't clear on uncheck → Task 16 changeShare logic").

---

## Task 21: Editorial review gate (manual, blocks `npm run deploy`)

**Files:** none — out-of-app review by the user's consultant.

- [ ] **Step 1: Render RU edu blurbs**

In the dev server with RU locale active, screenshot or save-as-PDF the savings section with one class expanded per layer. Alternatively, render the new PrintView (which already lists the picked classes and includes the risk methodology paragraph).

- [ ] **Step 2: Hand off to consultant**

Share the PDF / screenshots with the user's financial consultant. Ask specifically:
- Are the 5 edu blurbs per class accurate?
- Is the risk classification (CONS / STD / HIGH) defensible?
- Are tax notes current?
- Is anything misleading or missing?

- [ ] **Step 3: Capture sign-off**

Either:
- Consultant approves → record in a brief note (e.g., `docs/superpowers/specs/2026-05-16-savings-guidance-design.md` gets a "Consultant approved: <date>" footnote) and proceed.
- Consultant requests changes → cycle: edit i18n RU strings, re-render, re-review.

- [ ] **Step 4: Commit any edits**

If the consultant's feedback led to RU/EN edits:

```bash
git add src/lib/i18n/ru.json src/lib/i18n/en.json
git commit -m "i18n(savings/edu): incorporate consultant review feedback"
```

- [ ] **Step 5: Deploy is now unblocked**

`npm run deploy` can be run once the user explicitly approves deployment.

---

## Self-Review

**Spec coverage:**
- Section 4.1 (catalog `risk`) → Tasks 1, 2, 3 ✓
- Section 4.2 (`savingsPicks` on Inputs) → Task 4 ✓
- Section 4.3 (subset math, pickedClasses, unallocated/overAllocated) → Tasks 4, 7 ✓
- Section 4.4 (`autoFillFromPreset`) → Task 5 ✓
- Section 4.5 (engine integration) → Task 10 ✓
- Section 5.2 (LayerCard rewrite) → Task 16 ✓
- Section 5.3 (ClassRow) → Task 15 ✓
- Section 5.4 (CSS additions) → Task 14 ✓
- Section 5.5 (PrintView) → Task 18 ✓
- Section 6 (i18n) → Tasks 12, 13, 15 (label keys) ✓
- Section 7 (v2→v3 migration) → Tasks 8, 9 ✓
- Section 8 (testing plan) → Tasks 3, 5, 7, 9, 10, 11, 19 ✓
- Section 8.6 (manual verification) → Task 20 ✓
- Section 8.6 step 11 (editorial review gate) → Task 21 ✓

**Placeholder scan:** No "TBD" / "TODO" / "implement later". One place in Task 13 says the implementer continues the pattern for 9 more classes — this is repetitive but each blurb is short enough that listing one full example + instructions to mirror the structure is concrete enough. The RU originals are the source of truth and Task 13 Step 1 lists them in full.

**Type consistency:** `Risk` defined in Task 1, used in Task 2 catalog, Task 3 test, Task 5 (`autoFillFromPreset`). `Preset` defined in Task 4, used in Task 5, Task 16. `ClassPick` defined in Task 4, used in Task 5, Task 15, Task 16. `LayerPicks` / `SavingsPicks` defined in Task 4, used everywhere downstream. `LayerInfo` extension in Task 4, populated in Task 7, consumed by Task 16 and Task 18. `autoFillFromPreset` signature stable across Tasks 5, 8, 16.

**Audit fix applied inline:**
- Task 14 mentions `.class-main`, `.class-meta`, `.class-right` class names; Task 15 markup uses the same names (verified above).
- Task 16 (LayerCard) uses `autoFillFromPreset` with the same signature as Task 5.
- The `↺` reset re-applies `LAYER_DEFAULT_PRESET[layer]` (Task 16) per spec §5.2 (not "last non-custom preset" — that was an earlier idea in the spec which was corrected to layer-default).

Plan is internally consistent.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-savings-guidance.md`. Two execution options:

**1. Subagent-Driven (recommended)** — A fresh subagent per task, the orchestrator reviews between tasks, fast iteration. Best for a 21-task plan with a mix of TDD pure-function work, i18n bulk, CSS, and Svelte components — different tasks benefit from focused context.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review. Simpler if you want a single linear thread.

Which approach?
