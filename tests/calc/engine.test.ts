import { describe, it, expect } from 'vitest';
import { simulate } from '../../src/lib/calc/engine';
import type { Inputs } from '../../src/lib/calc/types';

const emptyInputs = (): Inputs => ({
  returnDate: '2026-05-01',
  voyageDate: '2026-05-03',  // 3-day window
  salaryLumpSumUsd: 0,
  assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
  rubPerUsd: 90,
  monthlyFamilyRub: 0,
  goals: [],
  investments: [],
});

describe('simulate — monthly expenses', () => {
  it('drains rubBank by daily prorated amount', () => {
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2026-05-31',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      rubPerUsd: 90,
      monthlyFamilyRub: 30_000,
      goals: [],
      investments: [],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    // 31 days * (30000 / 30.4375) ≈ 30,554
    expect(result.totalSpentRub).toBeCloseTo(30_554, -1);
    expect(result.balanceAtVoyage).toBeCloseTo(1_000_000 - 30_554, -1);
  });
});

describe('simulate — lump goals', () => {
  it('subtracts the goal amount on the exact date and records the event', () => {
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2026-05-10',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [{
        id: 'g1', name: 'Car', amountRub: 500_000,
        mode: 'lump', date: '2026-05-05', enabled: true,
      }],
      investments: [],
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
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2026-05-10',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [{
        id: 'g1', name: 'Car', amountRub: 500_000,
        mode: 'lump', date: '2026-05-05', enabled: false,
      }],
      investments: [],
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
