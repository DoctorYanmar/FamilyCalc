import { describe, it, expect } from 'vitest';
import { simulate } from '../../src/lib/calc/engine';
import type { Inputs } from '../../src/lib/calc/types';

const emptyInputs = (): Inputs => ({
  returnDate: '2026-05-01',
  voyageDate: '2026-05-03',
  salaryLumpSumUsd: 0,
  assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
  rubPerUsd: 90,
  monthlyFamilyRub: 0,
  goals: [],
  freeCashRub: 0,
  horizonDate: '2026-05-03',
  cbrKeyRatePct: 16,
  cbrRateUpdatedAt: '2026-05-01',
  layerOverride: {},
  includeExpectedYield: false,
});

describe('simulate — monthly expenses', () => {
  it('drains rubBank by daily prorated amount', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-31',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      monthlyFamilyRub: 30_000,
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.totalSpentRub).toBeCloseTo(30_554, 0);
    expect(result.balanceAtVoyage).toBeCloseTo(1_000_000 - 30_554, 0);
  });
});

describe('simulate — lump goals', () => {
  it('subtracts the goal amount on the exact date and records the event', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      goals: [{
        id: 'g1', name: 'Car', amountRub: 500_000,
        mode: 'lump', date: '2026-05-05', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    const dayBefore = result.days.find(d => d.date === '2026-05-04')!;
    const dayOf = result.days.find(d => d.date === '2026-05-05')!;
    expect(dayBefore.totalRub).toBe(1_000_000);
    expect(dayOf.totalRub).toBe(500_000);
    expect(dayOf.events).toHaveLength(1);
    expect(dayOf.events[0].amountRub).toBe(500_000);
  });

  it('ignores disabled lump goal', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      goals: [{
        id: 'g1', name: 'Car', amountRub: 500_000,
        mode: 'lump', date: '2026-05-05', enabled: false,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.balanceAtVoyage).toBe(1_000_000);
  });
});

describe('simulate — baseline', () => {
  it('returns days[] from today to voyageDate inclusive', () => {
    const today = new Date('2026-05-01');
    const result = simulate(emptyInputs(), today);
    expect(result.days.length).toBe(3);
    expect(result.days[0].date).toBe('2026-05-01');
    expect(result.days[2].date).toBe('2026-05-03');
  });

  it('with no spending preserves starting balance', () => {
    const today = new Date('2026-05-01');
    const result = simulate(emptyInputs(), today);
    expect(result.balanceAtVoyage).toBe(100_000);
    expect(result.runsOutOn).toBeNull();
    expect(result.totalSpentRub).toBe(0);
  });
});

describe('simulate — spread goals', () => {
  it('spreads amount evenly across the range, total within 1 RUB', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      goals: [{
        id: 'g1', name: 'Repairs', amountRub: 100_000,
        mode: 'spread', date: '2026-05-03', endDate: '2026-05-07', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.totalSpentRub).toBeCloseTo(100_000, 0);
    expect(result.balanceAtVoyage).toBeCloseTo(900_000, 0);
  });
});

describe('simulate — drain order', () => {
  it('drains RUB bank first, then USD bank, then USD cash', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-04',
      assets: { usdBank: 100, usdCash: 200, rubBank: 500 },
      rubPerUsd: 100,
      goals: [{
        id: 'g1', name: 'Big buy', amountRub: 10_000,
        mode: 'lump', date: '2026-05-03', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    const after = result.days.find(d => d.date === '2026-05-03')!;
    expect(after.assetsRub.rubBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdBank).toBeCloseTo(5, 4);
    expect(after.assetsRub.usdCash).toBeCloseTo(200, 4);
  });

  it('cascades to USD cash when USD bank runs out', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-04',
      assets: { usdBank: 50, usdCash: 100, rubBank: 100 },
      rubPerUsd: 100,
      goals: [{
        id: 'g1', name: 'Spend',
        amountRub: 100 + 50 * 100 + 30 * 100,
        mode: 'lump', date: '2026-05-02', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    const after = result.days.find(d => d.date === '2026-05-02')!;
    expect(after.assetsRub.rubBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdCash).toBeCloseTo(70, 4);
  });
});

describe('simulate — edge cases', () => {
  it('voyage in the past returns empty days and current total', () => {
    const inputs: Inputs = { ...emptyInputs(),
      returnDate: '2026-01-01',
      voyageDate: '2026-04-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.days).toHaveLength(0);
    expect(result.balanceAtVoyage).toBe(100_000);
    expect(result.runsOutOn).toBeNull();
  });

  it('ignores goal outside leave window', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      goals: [{
        id: 'g1', name: 'Way later', amountRub: 999_000,
        mode: 'lump', date: '2027-01-01', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.balanceAtVoyage).toBe(1_000_000);
  });

  it('deducts freeCashRub from balanceAtVoyage but does NOT add to totalSpent', () => {
    const base = simulate({
      ...emptyInputs(),
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
    }, new Date('2026-05-01'));
    const withFreeCash = simulate({
      ...emptyInputs(),
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      freeCashRub: 200_000,
    }, new Date('2026-05-01'));
    expect(withFreeCash.balanceAtVoyage).toBe(base.balanceAtVoyage - 200_000);
    // freeCash is locked up, not spent — totalSpent is unaffected
    expect(withFreeCash.totalSpentRub).toBe(base.totalSpentRub);
  });

  it('non-cash savings-framework fields (cbr, horizon, layerOverride, includeYield) do not affect simulate()', () => {
    const base = simulate(emptyInputs(), new Date('2026-05-01'));
    const withSavingsNoise = simulate({
      ...emptyInputs(),
      // freeCashRub deliberately stays at 0 — this test isolates the OTHER fields
      cbrKeyRatePct: 25,
      horizonDate: '2099-01-01',
      layerOverride: { A: 1_000_000, B: 1_000_000, C: 1_000_000 },
      includeExpectedYield: true,
    }, new Date('2026-05-01'));
    expect(withSavingsNoise.balanceAtVoyage).toBe(base.balanceAtVoyage);
    expect(withSavingsNoise.totalSpentRub).toBe(base.totalSpentRub);
  });
});

describe('simulate — runsOutOn and daysOfRunway', () => {
  it('reports daysOfRunway = totalDays - 1 when money survives the whole window', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.runsOutOn).toBeNull();
    expect(result.daysOfRunway).toBe(9);
  });

  it('detects runsOutOn on a specific day when assets are insufficient', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-31',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      goals: [{
        id: 'g1', name: 'Big', amountRub: 200_000,
        mode: 'lump', date: '2026-05-15', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.runsOutOn).toBe('2026-05-15');
    expect(result.daysOfRunway).toBe(14);
  });
});
