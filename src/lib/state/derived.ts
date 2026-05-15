import { simulate } from '../calc/engine';
import { allocate } from '../calc/allocate';
import type { SimulationResult, AllocationResult, CombinedResult } from '../calc/types';
import { activeInputs } from './scenarios.svelte';

export function combineResult(
  sim: SimulationResult,
  alloc: AllocationResult,
  includeExpectedYield: boolean,
): CombinedResult {
  const expectedYieldMid =
    alloc.layers.A.incomeMidRub +
    alloc.layers.B.incomeMidRub +
    alloc.layers.C.incomeMidRub;
  const balanceAtVoyage = includeExpectedYield
    ? sim.balanceAtVoyage + expectedYieldMid
    : sim.balanceAtVoyage;
  return { sim, alloc, balanceAtVoyage, expectedYieldMid };
}

export function currentResult(): CombinedResult {
  const inputs = activeInputs();
  const today = new Date();
  const sim = simulate(inputs, today);
  const alloc = allocate(inputs, today);
  return combineResult(sim, alloc, inputs.includeExpectedYield);
}
