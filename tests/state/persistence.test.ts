import { describe, it, expect, beforeEach } from 'vitest';
import { defaultState, loadState, saveState, STORAGE_KEY } from '../../src/lib/state/persistence';

describe('persistence — localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState returns defaultState when storage empty', () => {
    const s = loadState();
    expect(s.schemaVersion).toBe(1);
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
    expect(s.schemaVersion).toBe(1);
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
    expect(parsed.schemaVersion).toBe(1);
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
