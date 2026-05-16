import { describe, it, expect } from 'vitest';
import { INSTRUMENT_CLASSES } from '../../src/lib/calc/instrumentClasses';
import type { LayerKey, Regime, Risk } from '../../src/lib/calc/types';

describe('instrument catalog invariants', () => {
  it('every class has a valid risk value', () => {
    const valid: ReadonlySet<Risk> = new Set(['cons', 'std', 'high'] as const);
    for (const c of INSTRUMENT_CLASSES) {
      expect(valid.has(c.risk)).toBe(true);
    }
  });

  it('every class id is unique', () => {
    const ids = INSTRUMENT_CLASSES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Conservative preset is never empty for any (layer, regime) combo that has any candidates', () => {
    const layers: LayerKey[] = ['A', 'B', 'C'];
    const regimes: Regime[] = ['high', 'moderate', 'low'];
    for (const layer of layers) {
      for (const regime of regimes) {
        const candidates = INSTRUMENT_CLASSES.filter(
          c => c.applicableLayers.includes(layer) && c.applicableRegimes.includes(regime),
        );
        if (candidates.length === 0) continue;
        const conservative = candidates.filter(c => c.risk === 'cons');
        expect(
          conservative.length,
          `Layer ${layer} regime ${regime} has candidates but no Conservative — first-time default would be empty`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
