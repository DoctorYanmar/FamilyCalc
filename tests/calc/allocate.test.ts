import { describe, it, expect } from 'vitest';
import { regimeFor } from '../../src/lib/calc/allocate';
import { allocate } from '../../src/lib/calc/allocate';
import { autoFillFromPreset } from '../../src/lib/calc/allocate';
import type { Inputs, InstrumentClass, SavingsPicks } from '../../src/lib/calc/types';

const EMPTY_PICKS: SavingsPicks = {
  A: { preset: 'custom', classes: {} },
  B: { preset: 'custom', classes: {} },
  C: { preset: 'custom', classes: {} },
};

describe('regimeFor', () => {
  it('returns "low" for rate < 10', () => {
    expect(regimeFor(0)).toBe('low');
    expect(regimeFor(9.99)).toBe('low');
  });
  it('returns "moderate" for 10 <= rate < 15', () => {
    expect(regimeFor(10)).toBe('moderate');
    expect(regimeFor(14.99)).toBe('moderate');
  });
  it('returns "high" for rate >= 15', () => {
    expect(regimeFor(15)).toBe('high');
    expect(regimeFor(20)).toBe('high');
  });
});

function baseInputs(overrides: Partial<Inputs> = {}): Inputs {
  return {
    returnDate: '2026-05-01',
    voyageDate: '2026-08-01',
    salaryLumpSumUsd: 0,
    assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
    rubPerUsd: 90,
    monthlyFamilyRub: 100_000,
    goals: [],
    freeCashRub: 1_000_000,
    horizonDate: '2027-05-01',  // ~ 365 days from 2026-05-01
    cbrKeyRatePct: 16,
    cbrRateUpdatedAt: '2026-05-01',
    layerOverride: {},
    includeExpectedYield: false,
    savingsPicks: EMPTY_PICKS,
    ...overrides,
  };
}

describe('allocate — auto-allocation', () => {
  const today = new Date('2026-05-01T00:00:00Z');

  it('A gets monthlyFamilyRub when no goals in next 30 days', () => {
    const r = allocate(baseInputs({ freeCashRub: 1_000_000, monthlyFamilyRub: 100_000 }), today);
    expect(r.layers.A.amountRub).toBe(100_000);
    expect(r.layers.B.amountRub).toBe(0);
    expect(r.layers.C.amountRub).toBe(900_000);
  });

  it('A also includes enabled goals dated within 30 days', () => {
    const r = allocate(baseInputs({
      monthlyFamilyRub: 100_000,
      goals: [{ id: 'g1', name: 'Visa', amountRub: 50_000, mode: 'lump', date: '2026-05-15', enabled: true }],
    }), today);
    expect(r.layers.A.amountRub).toBe(150_000);
    expect(r.layers.C.amountRub).toBe(850_000);
  });

  it('B includes goals dated 31–180 days out', () => {
    const r = allocate(baseInputs({
      goals: [
        { id: 'g1', name: 'Repairs', amountRub: 300_000, mode: 'lump', date: '2026-08-15', enabled: true },
        { id: 'g2', name: 'Way later', amountRub: 999_000, mode: 'lump', date: '2027-03-01', enabled: true },
      ],
    }), today);
    expect(r.layers.B.amountRub).toBe(300_000);
  });

  it('disabled goals are ignored in auto-allocation', () => {
    const r = allocate(baseInputs({
      goals: [{ id: 'g1', name: 'X', amountRub: 50_000, mode: 'lump', date: '2026-05-10', enabled: false }],
    }), today);
    expect(r.layers.A.amountRub).toBe(100_000); // monthly only
  });

  it('shrinks A and B proportionally if A+B > free cash', () => {
    const r = allocate(baseInputs({
      freeCashRub: 100_000,
      monthlyFamilyRub: 200_000,
      goals: [{ id: 'g1', name: 'Big', amountRub: 100_000, mode: 'lump', date: '2026-06-15', enabled: true }],
    }), today);
    expect(r.layers.A.amountRub).toBeCloseTo(66_666.67, 1);
    expect(r.layers.B.amountRub).toBeCloseTo(33_333.33, 1);
    expect(r.layers.C.amountRub).toBe(0);
  });

  it('respects layerOverride per layer; unset keys fall back to auto', () => {
    const r = allocate(baseInputs({
      freeCashRub: 1_000_000,
      monthlyFamilyRub: 100_000,
      layerOverride: { A: 250_000 },  // override A only
    }), today);
    expect(r.layers.A.amountRub).toBe(250_000);
    // B falls back to 0 (no goals), C falls back to auto = max(0, 1_000_000 - A_auto - B_auto) = 900_000
    expect(r.layers.C.amountRub).toBe(900_000);
  });
});

describe('allocate — candidates and yield range', () => {
  const today = new Date('2026-05-01T00:00:00Z');

  it('filters candidates by layer ∩ regime (high regime, layer A)', () => {
    const r = allocate(baseInputs({ cbrKeyRatePct: 16 }), today);
    const ids = r.layers.A.candidates.map(c => c.id);
    // High regime, layer A: savings_account, term_deposit, mm_fund
    expect(ids).toContain('savings_account');
    expect(ids).toContain('term_deposit');
    expect(ids).toContain('mm_fund');
    // OFZ-PD belongs to layer B/C only — must not appear in A
    expect(ids).not.toContain('ofz_pd');
  });

  it('low regime hides high-only classes', () => {
    const r = allocate(baseInputs({ cbrKeyRatePct: 5 }), today);
    const idsC = r.layers.C.candidates.map(c => c.id);
    expect(idsC).not.toContain('ofz_pd');       // high-only
    expect(idsC).not.toContain('term_deposit'); // high+moderate only
    expect(idsC).toContain('ofz_pk');
  });

  it('Layer A amount and time are populated regardless of picks; empty picks → zero income', () => {
    // With empty picks (no user-selected instruments), income is 0 even though
    // amount and timeDays are correctly set. Income now comes from picks, not
    // min/max over all candidates.
    const r = allocate(baseInputs({ cbrKeyRatePct: 16, freeCashRub: 100_000, monthlyFamilyRub: 100_000 }), today);
    expect(r.layers.A.amountRub).toBe(100_000);
    expect(r.layers.A.timeDays).toBe(30);
    expect(r.layers.A.incomeRangeRub).toEqual({ low: 0, high: 0 });
    expect(r.layers.A.incomeMidRub).toBe(0);
  });

  it('returns zero income when amount is zero', () => {
    const r = allocate(baseInputs({ freeCashRub: 0, monthlyFamilyRub: 0 }), today);
    expect(r.layers.A.incomeRangeRub).toEqual({ low: 0, high: 0 });
    expect(r.layers.A.incomeMidRub).toBe(0);
  });
});

describe('allocate — horizon edges', () => {
  const today = new Date('2026-05-01T00:00:00Z');

  it('horizonDays = 0 when horizon == today; all incomes 0', () => {
    const r = allocate(baseInputs({ horizonDate: '2026-05-01' }), today);
    expect(r.horizonDays).toBe(0);
    expect(r.layers.A.incomeMidRub).toBe(0);
    expect(r.layers.B.incomeMidRub).toBe(0);
    expect(r.layers.C.incomeMidRub).toBe(0);
  });

  it('horizon < 30d: only Layer A has nonzero time; B and C income are 0', () => {
    const r = allocate(baseInputs({ horizonDate: '2026-05-20' }), today);
    expect(r.layers.A.timeDays).toBe(19);
    expect(r.layers.B.timeDays).toBe(0);
    expect(r.layers.C.timeDays).toBe(0);
    expect(r.layers.B.incomeMidRub).toBe(0);
    expect(r.layers.C.incomeMidRub).toBe(0);
  });

  it('horizon < 180d: Layer C income is 0', () => {
    // 2026-05-01 + 90d = 2026-07-30
    const r = allocate(baseInputs({ horizonDate: '2026-07-30' }), today);
    expect(r.layers.C.timeDays).toBe(0);
    expect(r.layers.C.incomeMidRub).toBe(0);
  });
});

describe('allocate — tax threshold and АСВ warning', () => {
  const today = new Date('2026-05-01T00:00:00Z');

  it('taxThreshold = cbrPct/100 × 1_000_000', () => {
    expect(allocate(baseInputs({ cbrKeyRatePct: 16 }), today).taxThresholdRub).toBe(160_000);
    expect(allocate(baseInputs({ cbrKeyRatePct: 8.5 }), today).taxThresholdRub).toBe(85_000);
  });

  it('АСВ warning fires when a layer with deposit-eligible candidates exceeds 1.4M ₽', () => {
    const r = allocate(baseInputs({
      freeCashRub: 3_000_000,
      monthlyFamilyRub: 0,
      layerOverride: { A: 1_500_000 },  // Layer A has savings_account + term_deposit (both deposits)
      cbrKeyRatePct: 16,
    }), today);
    expect(r.asvWarningLayers).toContain('A');
  });

  it('АСВ warning does not fire when no deposit-eligible candidates in the layer', () => {
    // Layer C at low regime: candidates = mm_fund, ofz_pk, ofz_in, replacement_bond, cny_bond, gold
    // None are deposits.
    const r = allocate(baseInputs({
      freeCashRub: 5_000_000,
      monthlyFamilyRub: 0,
      layerOverride: { C: 5_000_000 },
      cbrKeyRatePct: 5,
    }), today);
    expect(r.asvWarningLayers).not.toContain('C');
  });

  it('АСВ warning does not fire below 1.4M ₽', () => {
    const r = allocate(baseInputs({
      freeCashRub: 1_400_000,
      monthlyFamilyRub: 1_400_000,
      cbrKeyRatePct: 16,
    }), today);
    expect(r.asvWarningLayers).not.toContain('A');
  });
});

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
      A: { preset: 'custom', classes: { savings_account: { share: 300_000 } } },
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
          term_deposit:    { share: 200_000 },
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
    // ofz_pd is layer B/C only; high regime. Putting it in layer A → not a candidate.
    const inputs = baseInputsWithPicks({
      A: {
        preset: 'custom',
        classes: {
          savings_account: { share: 300_000 },
          ofz_pd:          { share: 300_000 },
        },
      },
      B: { preset: 'cons', classes: {} },
      C: { preset: 'bal',  classes: {} },
    });
    const today = new Date(Date.UTC(2026, 4, 16));
    const result = allocate(inputs, today);
    expect(result.layers.A.pickedClasses.map(p => p.cls.id)).toEqual(['savings_account']);
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
