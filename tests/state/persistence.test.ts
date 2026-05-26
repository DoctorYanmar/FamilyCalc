import { describe, it, expect, beforeEach } from 'vitest';
import { defaultState, loadState, saveState, STORAGE_KEY } from '../../src/lib/state/persistence';

describe('persistence — localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState returns defaultState when storage empty', () => {
    const s = loadState();
    expect(s.schemaVersion).toBe(4);
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
    expect(s.schemaVersion).toBe(4);
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
    expect(parsed.schemaVersion).toBe(4);
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

describe('migrate v1 → v3 (chained)', () => {
  it('seeds freeCashRub from investments AND auto-fills savingsPicks', () => {
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
    const v4 = importJson(JSON.stringify(v1));
    expect(v4.schemaVersion).toBe(4);
    const inp = v4.scenarios.s1.inputs as any;
    expect(inp.investments).toBeUndefined();
    expect('freeCashRub' in inp).toBe(false);
    expect('savingsPicks' in inp).toBe(false);
    expect(Array.isArray(inp.savingsInstruments)).toBe(true);
    expect(inp.savingsInstruments).toHaveLength(0);
  });

  it('migrates a v3 blob to v4, stripping dead fields', () => {
    const v3 = {
      schemaVersion: 3,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'New', createdAt: '2026-05-16', updatedAt: '2026-05-16',
          inputs: {
            returnDate: '2026-05-16', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
            rubPerUsd: 90, monthlyFamilyRub: 0, goals: [],
            freeCashRub: 123, horizonDate: '2026-08-01',
            cbrKeyRatePct: 12, cbrRateUpdatedAt: '2026-05-16',
            layerOverride: { A: 50 }, includeExpectedYield: true,
            savingsPicks: {
              A: { preset: 'custom', classes: {} },
              B: { preset: 'cons',   classes: {} },
              C: { preset: 'bal',    classes: {} },
            },
          },
        },
      },
      ui: { language: 'en', theme: 'light', openSections: {} },
    };
    const out = importJson(JSON.stringify(v3));
    expect(out.schemaVersion).toBe(4);
    const i = out.scenarios.s1.inputs as unknown as Record<string, unknown>;
    expect('freeCashRub'      in i).toBe(false);
    expect('horizonDate'      in i).toBe(false);
    expect('cbrKeyRatePct'    in i).toBe(false);
    expect('cbrRateUpdatedAt' in i).toBe(false);
    expect('layerOverride'    in i).toBe(false);
    expect('savingsPicks'     in i).toBe(false);
    expect(i.includeExpectedYield).toBe(true);
    expect(Array.isArray(i.savingsInstruments)).toBe(true);
  });

  it('migrates a v2 blob to v3, seeding savingsPicks via auto-fill', () => {
    const v2 = {
      schemaVersion: 2,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'V2', createdAt: '2026-05-01', updatedAt: '2026-05-01',
          inputs: {
            returnDate: '2026-05-01', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
            rubPerUsd: 90, monthlyFamilyRub: 80_000, goals: [],
            freeCashRub: 1_000_000, horizonDate: '2026-12-01',
            cbrKeyRatePct: 16, cbrRateUpdatedAt: '2026-05-01',
            layerOverride: {}, includeExpectedYield: false,
          },
        },
      },
      ui: { language: 'ru', theme: 'dark', openSections: {} },
    };
    const v4 = importJson(JSON.stringify(v2));
    expect(v4.schemaVersion).toBe(4);
    const inp = v4.scenarios.s1.inputs as any;
    expect('savingsPicks' in inp).toBe(false);
    expect('freeCashRub'  in inp).toBe(false);
    expect(Array.isArray(inp.savingsInstruments)).toBe(true);
    expect(inp.savingsInstruments).toHaveLength(0);
  });

  it('rejects unknown schemaVersion', () => {
    const bad = JSON.stringify({ schemaVersion: 9, activeScenarioId: 's', scenarios: {}, ui: {} });
    expect(() => importJson(bad)).toThrow();
  });
});

describe('migrate v3 → v4', () => {
  it('strips dead fields and seeds savingsInstruments', () => {
    const v3 = JSON.stringify({
      schemaVersion: 3,
      activeScenarioId: 'a',
      scenarios: {
        a: {
          id: 'a', name: 'X', createdAt: '2026-05-01', updatedAt: '2026-05-01',
          inputs: {
            returnDate: '2026-05-01', voyageDate: '2026-08-01', salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 }, rubPerUsd: 90,
            monthlyFamilyRub: 0, goals: [],
            freeCashRub: 500_000, horizonDate: '2026-08-01', cbrKeyRatePct: 16,
            cbrRateUpdatedAt: '2026-05-01', layerOverride: {}, includeExpectedYield: true,
            savingsPicks: { A: { preset: 'cons', classes: {} }, B: { preset: 'cons', classes: {} }, C: { preset: 'bal', classes: {} } },
          },
        },
      },
      ui: { language: 'ru', theme: 'dark', openSections: {} },
    });
    const out = importJson(v3);
    expect(out.schemaVersion).toBe(4);
    const i = out.scenarios['a'].inputs as unknown as Record<string, unknown>;
    expect('freeCashRub'      in i).toBe(false);
    expect('horizonDate'      in i).toBe(false);
    expect('cbrKeyRatePct'    in i).toBe(false);
    expect('cbrRateUpdatedAt' in i).toBe(false);
    expect('layerOverride'    in i).toBe(false);
    expect('savingsPicks'     in i).toBe(false);
    expect(Array.isArray((i as any).savingsInstruments)).toBe(true);
    expect((i as any).savingsInstruments).toHaveLength(0);
  });

  it('defaults includeExpectedYield to true if absent', () => {
    const v3 = JSON.stringify({
      schemaVersion: 3,
      activeScenarioId: 'a',
      scenarios: {
        a: {
          id: 'a', name: 'X', createdAt: '2026-05-01', updatedAt: '2026-05-01',
          inputs: {
            returnDate: '2026-05-01', voyageDate: '2026-08-01', salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 0 }, rubPerUsd: 90,
            monthlyFamilyRub: 0, goals: [],
            freeCashRub: 0, horizonDate: '2026-08-01', cbrKeyRatePct: 16,
            cbrRateUpdatedAt: '2026-05-01', layerOverride: {},
            savingsPicks: { A: { preset: 'cons', classes: {} }, B: { preset: 'cons', classes: {} }, C: { preset: 'bal', classes: {} } },
          },
        },
      },
      ui: { language: 'ru', theme: 'dark', openSections: {} },
    });
    const out = importJson(v3);
    expect(out.scenarios['a'].inputs.includeExpectedYield).toBe(true);
  });

  it('v1 → v4 chain produces a valid v4 state', () => {
    const v1 = JSON.stringify({
      schemaVersion: 1,
      activeScenarioId: 'a',
      scenarios: {
        a: {
          id: 'a', name: 'X', createdAt: '2026-05-01', updatedAt: '2026-05-01',
          inputs: {
            returnDate: '2026-05-01', voyageDate: '2026-08-01', salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 0 }, rubPerUsd: 90,
            monthlyFamilyRub: 0, goals: [], investments: [],
          },
        },
      },
      ui: { language: 'ru', theme: 'dark', openSections: {} },
    });
    const out = importJson(v1);
    expect(out.schemaVersion).toBe(4);
    expect(Array.isArray(out.scenarios['a'].inputs.savingsInstruments)).toBe(true);
  });
});
