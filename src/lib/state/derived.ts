import { simulate } from '../calc/engine';
import type { SimulationResult } from '../calc/types';
import { activeInputs } from './scenarios.svelte';

export function currentResult(): SimulationResult {
  return simulate(activeInputs(), new Date());
}
