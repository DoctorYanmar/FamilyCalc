import { describe, it, expect } from 'vitest';
import { regimeFor } from '../../src/lib/calc/allocate';
import { allocate } from '../../src/lib/calc/allocate';
import { autoFillFromPreset } from '../../src/lib/calc/allocate';
import type { Inputs, InstrumentClass } from '../../src/lib/calc/types';

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

  it('Layer A income range scales with amount, rate range, and time-in-layer', () => {
    // Layer A candidates at CBR=16: savings_account (13..15), term_deposit (15.5..17.5), mm_fund (15..15.5)
    // allRateLow = 13, allRateHigh = 17.5
    // amount = 100k, tA = min(30, 365) = 30 days
    const r = allocate(baseInputs({ cbrKeyRatePct: 16, freeCashRub: 100_000, monthlyFamilyRub: 100_000 }), today);
    expect(r.layers.A.amountRub).toBe(100_000);
    expect(r.layers.A.timeDays).toBe(30);
    const expLow  = 100_000 * (13 / 100) * (30 / 365);
    const expHigh = 100_000 * (17.5 / 100) * (30 / 365);
    expect(r.layers.A.incomeRangeRub.low).toBeCloseTo(expLow, 2);
    expect(r.layers.A.incomeRangeRub.high).toBeCloseTo(expHigh, 2);
    expect(r.layers.A.incomeMidRub).toBeCloseTo((expLow + expHigh) / 2, 2);
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
