import { describe, it, expect, beforeEach } from 'vitest';
import { defaultState, loadState, saveState, STORAGE_KEY } from '../../src/lib/state/persistence';

describe('persistence — localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState returns defaultState when storage empty', () => {
    const s = loadState();
    expect(s.schemaVersion).toBe(2);
    expect(Object.keys(s.scenarios)).toHaveLength(1);
  });

  it('saves and reloads state', () => {
    const s = defaultState();
    s.ui.language = 'en';
    saveState(s);
    const reloaded = loadState();
    expect(reloaded.ui.language).toBe('en');
  });

  it('falls back to defaultState on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    const s = loadState();
    expect(s.schemaVersion).toBe(2);
  });
});

import { exportJson, importJson } from '../../src/lib/state/persistence';

describe('persistence — JSON export/import', () => {
  it('round-trips state via JSON', () => {
    const s = defaultState();
    s.ui.theme = 'light';
    const json = exportJson(s);
    const parsed = importJson(json);
    expect(parsed.ui.theme).toBe('light');
    expect(parsed.schemaVersion).toBe(2);
  });

  it('importJson rejects invalid JSON', () => {
    expect(() => importJson('not-json')).toThrow();
  });

  it('importJson rejects bad schemaVersion with descriptive message', () => {
    expect(() => importJson(JSON.stringify({ schemaVersion: 99 }))).toThrow(/Unsupported schemaVersion/);
  });

  it('importJson rejects v1 object missing activeScenarioId', () => {
    expect(() => importJson(JSON.stringify({ schemaVersion: 1, scenarios: {} }))).toThrow(/Invalid state shape/);
  });

  it('importJson rejects v1 object missing scenarios', () => {
    expect(() => importJson(JSON.stringify({ schemaVersion: 1, activeScenarioId: 'x' }))).toThrow(/Invalid state shape/);
  });
});

describe('migrate v1 → v2', () => {
  it('seeds freeCashRub from sum of investment amounts and drops investments', () => {
    const v1 = {
      schemaVersion: 1,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'Old', createdAt: '2026-01-01', updatedAt: '2026-01-01',
          inputs: {
            returnDate: '2026-04-01', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 50_000 },
            rubPerUsd: 90, monthlyFamilyRub: 80_000, goals: [],
            investments: [
              { id: 'i1', kind: 'ofz', name: 'OFZ', amountRub: 500_000, annualRatePct: 12, reinvest: true },
              { id: 'i2', kind: 'vkladRub', name: 'Vklad', amountRub: 300_000, annualRatePct: 10, reinvest: false },
            ],
          },
        },
      },
      ui: { language: 'ru', theme: 'dark', openSections: {} },
    };
    const v2 = importJson(JSON.stringify(v1));
    expect(v2.schemaVersion).toBe(2);
    const inp = v2.scenarios.s1.inputs as any;
    expect(inp.investments).toBeUndefined();
    expect(inp.freeCashRub).toBe(800_000);
    expect(inp.horizonDate).toBe('2026-08-01'); // defaults to voyageDate
    expect(inp.cbrKeyRatePct).toBe(16);
    expect(typeof inp.cbrRateUpdatedAt).toBe('string');
    expect(inp.layerOverride).toEqual({});
    expect(inp.includeExpectedYield).toBe(false);
  });

  it('accepts a v2 blob unchanged', () => {
    const v2 = {
      schemaVersion: 2,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'New', createdAt: '2026-05-01', updatedAt: '2026-05-01',
          inputs: {
            returnDate: '2026-05-01', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
            rubPerUsd: 90, monthlyFamilyRub: 0, goals: [],
            freeCashRub: 123, horizonDate: '2026-08-01',
            cbrKeyRatePct: 12, cbrRateUpdatedAt: '2026-05-01',
            layerOverride: { A: 50 }, includeExpectedYield: true,
          },
        },
      },
      ui: { language: 'en', theme: 'light', openSections: {} },
    };
    const out = importJson(JSON.stringify(v2));
    expect(out.schemaVersion).toBe(2);
    expect((out.scenarios.s1.inputs as any).freeCashRub).toBe(123);
  });

  it('rejects unknown schemaVersion', () => {
    const bad = JSON.stringify({ schemaVersion: 9, activeScenarioId: 's', scenarios: {}, ui: {} });
    expect(() => importJson(bad)).toThrow();
  });
});
