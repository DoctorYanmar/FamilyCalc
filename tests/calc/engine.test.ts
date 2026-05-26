import { describe, it, expect } from 'vitest';
import { simulate } from '../../src/lib/calc/engine';
import type { Inputs, SavingsPicks, SavingsInstrument } from '../../src/lib/calc/types';
import { maturityDate, accruedValue as savingsAccrued } from '../../src/lib/calc/savings';

const EMPTY_PICKS: SavingsPicks = {
  A: { preset: 'custom', classes: {} },
  B: { preset: 'custom', classes: {} },
  C: { preset: 'custom', classes: {} },
};

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
  savingsPicks: EMPTY_PICKS,
  savingsInstruments: [],
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

describe('engine — savingsPicks invariance', () => {
  it('simulate() ignores savingsPicks entirely', () => {
    const inputs = emptyInputs();
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

function inst(overrides: Partial<SavingsInstrument>): SavingsInstrument {
  return {
    id: 's1',
    name: 'Test',
    templateId: 'term_deposit',
    amountRub: 500_000,
    annualRatePct: 16,
    startDate: '2026-05-01',
    termMonths: 12,
    compounding: 'monthly',
    enabled: true,
    ...overrides,
  };
}

describe('simulate — savings at-voyage bonus', () => {
  it('assets.rubBank is unaffected at sim start by adding an enabled instrument', () => {
    const noSav = simulate({ ...emptyInputs() }, new Date('2026-05-01T00:00:00Z'));
    const withSav = simulate(
      { ...emptyInputs(), savingsInstruments: [inst({ amountRub: 500_000 })] },
      new Date('2026-05-01T00:00:00Z'),
    );
    expect(withSav.days[0].totalRub).toBe(noSav.days[0].totalRub);
  });

  it('term outlasts voyage + includeExpectedYield: true → balanceAtVoyage = wallet + principal + accrued', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-08-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      includeExpectedYield: true,
      savingsInstruments: [inst({ amountRub: 500_000, startDate: '2026-05-01', termMonths: 12 })],
    };
    const r = simulate(inputs, today);
    const voyage = new Date('2026-08-01T00:00:00Z');
    const expected = 100_000 + savingsAccrued(inputs.savingsInstruments[0], voyage);
    expect(r.balanceAtVoyage).toBeCloseTo(expected, 2);
  });

  it('term outlasts voyage + includeExpectedYield: false → balanceAtVoyage = wallet + principal (no interest)', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-08-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      includeExpectedYield: false,
      savingsInstruments: [inst({ amountRub: 500_000, startDate: '2026-05-01', termMonths: 12 })],
    };
    const r = simulate(inputs, today);
    expect(r.balanceAtVoyage).toBeCloseTo(100_000 + 500_000, 2);
  });

  it('open-ended at voyage → balanceAtVoyage includes full accrued regardless of toggle', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const base: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-08-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      savingsInstruments: [inst({ amountRub: 500_000, startDate: '2026-05-01', termMonths: null, compounding: 'daily' })],
    };
    const on  = simulate({ ...base, includeExpectedYield: true  }, today);
    const off = simulate({ ...base, includeExpectedYield: false }, today);
    expect(on.balanceAtVoyage).toBeCloseTo(off.balanceAtVoyage, 2);
  });

  it('disabled instrument is ignored entirely', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-08-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      includeExpectedYield: true,
      savingsInstruments: [inst({ amountRub: 500_000, enabled: false })],
    };
    const r = simulate(inputs, today);
    expect(r.balanceAtVoyage).toBeCloseTo(100_000, 2);
    expect(r.totalPrincipalRub).toBe(0);
    expect(r.totalAccruedInterestRub).toBe(0);
  });

  it('totalPrincipalRub + totalAccruedInterestRub track enabled instruments only', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-08-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      includeExpectedYield: true,
      savingsInstruments: [
        inst({ id: 'a', amountRub: 500_000, enabled: true }),
        inst({ id: 'b', amountRub: 300_000, enabled: false }),
      ],
    };
    const r = simulate(inputs, today);
    expect(r.totalPrincipalRub).toBe(500_000);
    expect(r.totalAccruedInterestRub).toBeGreaterThan(0);
  });
});

describe('simulate — savings in-window maturity', () => {
  it('matures before voyage → payout lands in rubBank on maturity day', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const i = inst({ amountRub: 500_000, startDate: '2026-05-01', termMonths: 3, compounding: 'monthly' });
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-12-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      includeExpectedYield: true,
      savingsInstruments: [i],
    };
    const r = simulate(inputs, today);
    const matISO = maturityDate(i)!.toISOString().slice(0, 10);
    const idxMat = r.days.findIndex(d => d.date === matISO);
    expect(idxMat).toBeGreaterThanOrEqual(0);
    const before = r.days[idxMat - 1].totalRub;
    const at = r.days[idxMat].totalRub;
    const payout = savingsAccrued(i, maturityDate(i)!);
    expect(at - before).toBeCloseTo(payout, 2);
  });

  it('matured payout is fully (principal + accrued)', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const i = inst({ amountRub: 500_000, startDate: '2026-05-01', termMonths: 3, compounding: 'monthly' });
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-12-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      includeExpectedYield: true,
      savingsInstruments: [i],
    };
    const r = simulate(inputs, today);
    const matValue = savingsAccrued(i, maturityDate(i)!);
    expect(r.balanceAtVoyage).toBeCloseTo(100_000 + matValue, 2);
  });

  it('matured payout is available for daily expenses', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const i = inst({ amountRub: 500_000, startDate: '2026-05-01', termMonths: 1, compounding: 'monthly' });
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2027-05-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      monthlyFamilyRub: 60_000,
      includeExpectedYield: true,
      savingsInstruments: [i],
    };
    const r = simulate(inputs, today);
    const matISO = maturityDate(i)!.toISOString().slice(0, 10);
    const idxMat = r.days.findIndex(d => d.date === matISO);
    expect(r.days[idxMat].totalRub).toBeGreaterThan(r.days[idxMat - 1].totalRub);
  });

  it('already-matured-at-sim-start instrument is skipped entirely', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const i = inst({ amountRub: 500_000, startDate: '2025-11-01', termMonths: 3 });
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-08-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      includeExpectedYield: true,
      savingsInstruments: [i],
    };
    const r = simulate(inputs, today);
    expect(r.balanceAtVoyage).toBeCloseTo(100_000, 2);
    expect(r.totalPrincipalRub).toBe(0);
    expect(r.totalAccruedInterestRub).toBe(0);
  });

  it('multiple instruments with mixed maturity timing do not interact', () => {
    const today = new Date('2026-05-01T00:00:00Z');
    const a = inst({ id: 'a', amountRub: 300_000, startDate: '2026-05-01', termMonths: 2 });
    const b = inst({ id: 'b', amountRub: 200_000, startDate: '2026-05-01', termMonths: 24 });
    const inputs: Inputs = {
      ...emptyInputs(),
      voyageDate: '2026-12-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      includeExpectedYield: true,
      savingsInstruments: [a, b],
    };
    const r = simulate(inputs, today);
    const voyage = new Date('2026-12-01T00:00:00Z');
    const expected =
      100_000
      + savingsAccrued(a, maturityDate(a)!)
      + savingsAccrued(b, voyage);
    expect(r.balanceAtVoyage).toBeCloseTo(expected, 2);
  });
});
