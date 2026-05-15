import type { AppState, Scenario } from '../calc/types';

export const STORAGE_KEY = 'familycalc.state.v1';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultScenario(id: string): Scenario {
  const today = todayISO();
  return {
    id,
    name: 'Default',  // intentionally English — set before i18n loads; user can rename
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
      freeCashRub: 0,
      horizonDate: today,
      cbrKeyRatePct: 16.0,
      cbrRateUpdatedAt: today,
      layerOverride: {},
      includeExpectedYield: false,
    },
  };
}

export function defaultState(): AppState {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'default-' + Math.random().toString(36).slice(2);
  return {
    schemaVersion: 2,
    activeScenarioId: id,
    scenarios: { [id]: defaultScenario(id) },
    ui: { language: 'ru', theme: 'dark', openSections: {} },
  };
}

type V1Investment = { id: string; kind: string; name: string; amountRub: number; annualRatePct: number; reinvest: boolean };
type V1Inputs = {
  returnDate: string;
  voyageDate: string;
  salaryLumpSumUsd: number;
  assets: { usdBank: number; usdCash: number; rubBank: number };
  rubPerUsd: number;
  monthlyFamilyRub: number;
  goals: unknown[];
  investments?: V1Investment[];
};
type V1State = {
  schemaVersion: 1;
  activeScenarioId: string;
  scenarios: Record<string, { id: string; name: string; createdAt: string; updatedAt: string; inputs: V1Inputs }>;
  ui: { language: string; theme: string; openSections: Record<string, boolean> };
};

function migrateV1ToV2(raw: V1State): AppState {
  const today = todayISO();
  const scenarios: AppState['scenarios'] = {};
  for (const sid of Object.keys(raw.scenarios)) {
    const old = raw.scenarios[sid];
    const oi = old.inputs;
    const seededFreeCash = (oi.investments ?? []).reduce(
      (s, i) => s + (typeof i.amountRub === 'number' ? i.amountRub : 0), 0,
    );
    scenarios[sid] = {
      id: old.id,
      name: old.name,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      inputs: {
        returnDate:       oi.returnDate,
        voyageDate:       oi.voyageDate,
        salaryLumpSumUsd: oi.salaryLumpSumUsd,
        assets:           oi.assets,
        rubPerUsd:        oi.rubPerUsd,
        monthlyFamilyRub: oi.monthlyFamilyRub,
        goals:            oi.goals as AppState['scenarios'][string]['inputs']['goals'],
        freeCashRub:      seededFreeCash,
        horizonDate:      oi.voyageDate,
        cbrKeyRatePct:    16.0,
        cbrRateUpdatedAt: today,
        layerOverride:    {},
        includeExpectedYield: false,
      },
    };
  }
  return {
    schemaVersion: 2,
    activeScenarioId: raw.activeScenarioId,
    scenarios,
    ui: raw.ui as AppState['ui'],
  };
}

function migrate(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid state');
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion === 1) {
    if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
      throw new Error('Invalid state shape');
    }
    return migrateV1ToV2(s as unknown as V1State);
  }
  if (s.schemaVersion !== 2) throw new Error(`Unsupported schemaVersion: ${String(s.schemaVersion)}`);
  if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
    throw new Error('Invalid state shape');
  }
  return s as unknown as AppState;
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

/** Serialise the full AppState to a pretty-printed JSON string for download/backup. */
export function exportJson(s: AppState): string {
  return JSON.stringify(s, null, 2);
}

/**
 * Parse a JSON backup string back into AppState.
 * Throws if the JSON is invalid or the schemaVersion is not supported.
 */
export function importJson(json: string): AppState {
  const parsed = JSON.parse(json);
  return migrate(parsed);
}
