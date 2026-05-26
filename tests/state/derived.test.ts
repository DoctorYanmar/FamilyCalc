import { describe, it, expect } from 'vitest';
// derived.ts no longer exports combineResult — currentResult() is reactive
// and not testable in isolation without a Svelte runtime. The engine's
// balanceAtVoyage computation is tested in tests/calc/engine.test.ts.
// This file is kept as a placeholder for future non-reactive derived tests.

describe('derived — placeholder', () => {
  it('exists', () => {
    expect(true).toBe(true);
  });
});
