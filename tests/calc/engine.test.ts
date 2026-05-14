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

describe('simulate — spread goals', () => {
  it('spreads amount evenly across the range, total within 1 RUB', () => {
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2026-05-10',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [{
        id: 'g1', name: 'Repairs', amountRub: 100_000,
        mode: 'spread', date: '2026-05-03', endDate: '2026-05-07',
        enabled: true,
      }],
      investments: [],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.totalSpentRub).toBeCloseTo(100_000, 0);
    expect(result.balanceAtVoyage).toBeCloseTo(900_000, 0);
  });
});

describe('simulate — drain order', () => {
  it('drains RUB bank first, then USD bank, then USD cash', () => {
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2026-05-04',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 100, usdCash: 200, rubBank: 500 },
      rubPerUsd: 100,
      monthlyFamilyRub: 0,
      goals: [{
        id: 'g1', name: 'Big buy', amountRub: 10_000,
        mode: 'lump', date: '2026-05-03', enabled: true,
      }],
      investments: [],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    const after = result.days.find(d => d.date === '2026-05-03')!;
    // 500 RUB drained first, then 9500/100 = 95 USD from usdBank, leaving 5 USD bank
    // and 200 cash untouched (since we still had USD bank)
    // wait: 500 RUB + 100 USD bank * 100 rate = 500 + 10000 = 10500 RUB capacity from bank alone
    // After 500 RUB and 95 USD bank drained: rubBank=0, usdBank=5, usdCash=200
    expect(after.assetsRub.rubBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdBank).toBeCloseTo(5, 4);
    expect(after.assetsRub.usdCash).toBeCloseTo(200, 4);
  });

  it('cascades to USD cash when USD bank runs out', () => {
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2026-05-04',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 50, usdCash: 100, rubBank: 100 },
      rubPerUsd: 100,
      monthlyFamilyRub: 0,
      goals: [{
        id: 'g1', name: 'Spend',
        amountRub: 100 + 50 * 100 + 30 * 100, // 100 RUB + all USD bank + 30 USD cash worth
        mode: 'lump', date: '2026-05-02', enabled: true,
      }],
      investments: [],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    const after = result.days.find(d => d.date === '2026-05-02')!;
    expect(after.assetsRub.rubBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdCash).toBeCloseTo(70, 4);
  });
});

describe('simulate — investments reinvest', () => {
  it('compounds investment principal daily when reinvest=true', () => {
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2027-05-01',  // ~365 days
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [],
      investments: [{
        id: 'i1', kind: 'ofz', name: 'OFZ',
        amountRub: 1_000_000, annualRatePct: 12, reinvest: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    // After 365 daily compounding cycles at annual 12%: final ≈ 1,000,000 * 1.12 = 1,120,000
    expect(result.balanceAtVoyage).toBeGreaterThan(1_115_000);
    expect(result.balanceAtVoyage).toBeLessThan(1_125_000);
    expect(result.totalInvestmentYieldRub).toBeGreaterThan(115_000);
  });
});

describe('simulate — investments payout', () => {
  it('with reinvest=false credits interest to rubBank, principal unchanged', () => {
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2027-05-01',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [],
      investments: [{
        id: 'i1', kind: 'vkladRub', name: 'Vklad',
        amountRub: 1_000_000, annualRatePct: 12, reinvest: false,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    // Principal stays 1,000,000; ~117k yield accumulates in rubBank (daily simple-payout
    // accumulates slightly less than compounding ≈ 117k vs ~120k)
    const finalDay = result.days[result.days.length - 1];
    expect(finalDay.investmentValueRub).toBeCloseTo(1_000_000, 0);
    expect(finalDay.assetsRub.rubBank).toBeGreaterThan(110_000);
    expect(finalDay.assetsRub.rubBank).toBeLessThan(125_000);
  });
});

describe('simulate — edge cases', () => {
  it('voyage in the past returns empty days and current total', () => {
    const inputs: Inputs = {
      returnDate: '2026-01-01',
      voyageDate: '2026-04-01',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [],
      investments: [],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.days).toHaveLength(0);
    expect(result.balanceAtVoyage).toBe(100_000);
    expect(result.runsOutOn).toBeNull();
  });

  it('ignores goal outside leave window', () => {
    const inputs: Inputs = {
      returnDate: '2026-05-01',
      voyageDate: '2026-05-10',
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [{
        id: 'g1', name: 'Way later', amountRub: 999_000,
        mode: 'lump', date: '2027-01-01', enabled: true,
      }],
      investments: [],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.balanceAtVoyage).toBe(1_000_000);
  });
});
