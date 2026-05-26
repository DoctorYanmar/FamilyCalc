import { describe, it, expect } from 'vitest';
import { maturityDate, accruedValue } from '../../src/lib/calc/savings';
import type { SavingsInstrument } from '../../src/lib/calc/types';

const DAYS_PER_MONTH = 30.4375;

function baseInst(overrides: Partial<SavingsInstrument> = {}): SavingsInstrument {
  return {
    id: 'i1',
    name: 'Test',
    templateId: 'term_deposit',
    amountRub: 1_000_000,
    annualRatePct: 16,
    startDate: '2026-01-01',
    termMonths: 12,
    compounding: 'monthly',
    enabled: true,
    ...overrides,
  };
}

describe('maturityDate', () => {
  it('returns null when termMonths is null', () => {
    expect(maturityDate(baseInst({ termMonths: null }))).toBeNull();
  });

  it('returns startDate + termMonths × DAYS_PER_MONTH at UTC midnight', () => {
    const m = maturityDate(baseInst({ startDate: '2026-01-01', termMonths: 12 }))!;
    const expectedMs = new Date('2026-01-01T00:00:00Z').getTime() + Math.round(12 * DAYS_PER_MONTH) * 86_400_000;
    expect(m.getTime()).toBe(expectedMs);
  });
});

describe('accruedValue — daily compounding', () => {
  it('returns 0 when day < startDate', () => {
    const inst = baseInst({ startDate: '2026-06-01', compounding: 'daily' });
    expect(accruedValue(inst, new Date('2026-05-01T00:00:00Z'))).toBe(0);
  });

  it('compounds (1 + r/365)^t exactly', () => {
    const inst = baseInst({ amountRub: 1_000_000, annualRatePct: 16, startDate: '2026-01-01', compounding: 'daily', termMonths: 24 });
    const day = new Date('2027-01-01T00:00:00Z'); // 365 days later
    const expected = 1_000_000 * Math.pow(1 + 0.16 / 365, 365);
    expect(accruedValue(inst, day)).toBeCloseTo(expected, 2);
  });

  it('caps growth at maturity day (frozen post-maturity)', () => {
    const inst = baseInst({ amountRub: 1_000_000, annualRatePct: 16, startDate: '2026-01-01', termMonths: 12, compounding: 'daily' });
    const valAtMaturity = accruedValue(inst, maturityDate(inst)!);
    const valAfterMaturity = accruedValue(inst, new Date('2030-01-01T00:00:00Z'));
    expect(valAfterMaturity).toBe(valAtMaturity);
  });
});

describe('accruedValue — monthly compounding', () => {
  it('matches (1 + r/12)^(t / DAYS_PER_MONTH) within 1e-6', () => {
    const inst = baseInst({ amountRub: 1_000_000, annualRatePct: 16, startDate: '2026-01-01', termMonths: 24, compounding: 'monthly' });
    const day = new Date(new Date('2026-01-01T00:00:00Z').getTime() + 365 * 86_400_000);
    const t = 365;
    const expected = 1_000_000 * Math.pow(1 + 0.16 / 12, t / DAYS_PER_MONTH);
    expect(accruedValue(inst, day)).toBeCloseTo(expected, 2);
  });
});

describe('accruedValue — at-maturity simple interest', () => {
  it('returns principal × (1 + r × months/12) on maturity day', () => {
    const inst = baseInst({ amountRub: 1_000_000, annualRatePct: 16, startDate: '2026-01-01', termMonths: 12, compounding: 'at-maturity' });
    const m = maturityDate(inst)!;
    const t = Math.round(12 * DAYS_PER_MONTH);
    const expected = 1_000_000 * (1 + 0.16 * t / 365);
    expect(accruedValue(inst, m)).toBeCloseTo(expected, 2);
  });

  it('interpolates linearly before maturity', () => {
    const inst = baseInst({ amountRub: 1_000_000, annualRatePct: 16, startDate: '2026-01-01', termMonths: 12, compounding: 'at-maturity' });
    const half = new Date(new Date('2026-01-01T00:00:00Z').getTime() + Math.round(6 * DAYS_PER_MONTH) * 86_400_000);
    const t = Math.round(6 * DAYS_PER_MONTH);
    const expected = 1_000_000 * (1 + 0.16 * t / 365);
    expect(accruedValue(inst, half)).toBeCloseTo(expected, 2);
  });
});

describe('accruedValue — startDate in the past', () => {
  it('accrues head-start from past startDate', () => {
    const inst = baseInst({ amountRub: 1_000_000, annualRatePct: 16, startDate: '2026-01-01', termMonths: 24, compounding: 'daily' });
    const t = 90;
    const day = new Date(new Date('2026-01-01T00:00:00Z').getTime() + t * 86_400_000);
    const expected = 1_000_000 * Math.pow(1 + 0.16 / 365, t);
    expect(accruedValue(inst, day)).toBeCloseTo(expected, 2);
  });
});

describe('accruedValue — open-ended', () => {
  it('keeps growing indefinitely when termMonths is null', () => {
    const inst = baseInst({ amountRub: 1_000_000, annualRatePct: 16, startDate: '2026-01-01', termMonths: null, compounding: 'daily' });
    const tenYears = new Date('2036-01-01T00:00:00Z');
    const days = Math.floor((tenYears.getTime() - new Date('2026-01-01T00:00:00Z').getTime()) / 86_400_000);
    const expected = 1_000_000 * Math.pow(1 + 0.16 / 365, days);
    expect(accruedValue(inst, tenYears)).toBeCloseTo(expected, 0);
  });
});
