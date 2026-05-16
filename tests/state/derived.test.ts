import { describe, it, expect } from 'vitest';
import { combineResult } from '../../src/lib/state/derived';
import type { SimulationResult, AllocationResult } from '../../src/lib/calc/types';

function fakeSim(balance: number): SimulationResult {
  return {
    days: [],
    balanceAtVoyage: balance,
    runsOutOn: null,
    daysOfRunway: 0,
    totalSpentRub: 0,
  };
}

function fakeAlloc(midA: number, midB: number, midC: number): AllocationResult {
  const mk = (m: number) => ({
    amountRub: 0,
    timeDays: 0,
    candidates: [],
    pickedClasses: [],
    incomeRangeRub: { low: 0, high: 0 },
    incomeMidRub: m,
    unallocatedRub: 0,
    overAllocatedRub: 0,
  });
  return {
    regime: 'moderate',
    horizonDays: 0,
    layers: { A: mk(midA), B: mk(midB), C: mk(midC) },
    taxThresholdRub: 0,
    asvWarningLayers: [],
  };
}

describe('combineResult', () => {
  it('with includeExpectedYield=false, balanceAtVoyage equals sim balance', () => {
    const r = combineResult(fakeSim(500_000), fakeAlloc(100, 200, 300), false);
    expect(r.balanceAtVoyage).toBe(500_000);
    expect(r.expectedYieldMid).toBe(600);
  });

  it('with includeExpectedYield=true, balanceAtVoyage adds the midpoint sum', () => {
    const r = combineResult(fakeSim(500_000), fakeAlloc(100, 200, 300), true);
    expect(r.balanceAtVoyage).toBe(500_600);
    expect(r.expectedYieldMid).toBe(600);
  });
});
