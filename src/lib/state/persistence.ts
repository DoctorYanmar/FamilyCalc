import type { AppState, Scenario } from '../calc/types';

export const STORAGE_KEY = 'familycalc.state.v1';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultScenario(id: string): Scenario {
  const today = todayISO();
  return {
    id,
    name: 'Default',
    createdAt: today,
    updatedAt: today,
    inputs: {
      returnDate: today,
      voyageDate: today,
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [],
      investments: [],
    },
  };
}

export function defaultState(): AppState {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'default-' + Math.random().toString(36).slice(2);
  return {
    schemaVersion: 1,
    activeScenarioId: id,
    scenarios: { [id]: defaultScenario(id) },
    ui: { language: 'ru', theme: 'dark', openSections: {} },
  };
}

function migrate(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid state');
  const s = raw as Partial<AppState>;
  if (s.schemaVersion !== 1) throw new Error(`Unsupported schemaVersion: ${s.schemaVersion}`);
  return s as AppState;
}

export function loadState(): AppState {
  const raw = typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY)
    : null;
  if (!raw) return defaultState();
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveState(s: AppState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // quota exceeded — ignored; UI may surface a toast later
  }
}

export function exportJson(s: AppState): string {
  return JSON.stringify(s, null, 2);
}

export function importJson(json: string): AppState {
  const parsed = JSON.parse(json);
  return migrate(parsed);
}
