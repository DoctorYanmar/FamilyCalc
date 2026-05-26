import { simulate } from '../calc/engine';
import type { CombinedResult } from '../calc/types';
import { activeInputs } from './scenarios.svelte';

export function currentResult(): CombinedResult {
  const inputs = activeInputs();
  const today = new Date();
  const sim = simulate(inputs, today);
  return { sim, balanceAtVoyage: sim.balanceAtVoyage };
}
