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
      includeExpectedYield: true,
      savingsInstruments: [],
      localCurrency: 'RUB',
    },
  };
}

export function defaultState(): AppState {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'default-' + Math.random().toString(36).slice(2);
  return {
    schemaVersion: 6,
    activeScenarioId: id,
    scenarios: { [id]: defaultScenario(id) },
    ui: { language: 'ru', theme: 'dark', openSections: {}, onboardingDone: false },
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

type V2Inputs = {
  returnDate: string;
  voyageDate: string;
  salaryLumpSumUsd: number;
  assets: { usdBank: number; usdCash: number; rubBank: number };
  rubPerUsd: number;
  monthlyFamilyRub: number;
  goals: unknown[];
  freeCashRub: number;
  horizonDate: string;
  cbrKeyRatePct: number;
  cbrRateUpdatedAt: string;
  layerOverride: unknown;
  includeExpectedYield: boolean;
  savingsInstruments: never[];
};
type V2State = {
  schemaVersion: 2;
  activeScenarioId: string;
  scenarios: Record<string, { id: string; name: string; createdAt: string; updatedAt: string; inputs: V2Inputs }>;
  ui: { language: string; theme: string; openSections: Record<string, boolean> };
};

function migrateV1ToV2(raw: V1State): V2State {
  const today = todayISO();
  const scenarios: V2State['scenarios'] = {};
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
        goals:            oi.goals as V2Inputs['goals'],
        freeCashRub:      seededFreeCash,
        horizonDate:      oi.voyageDate,
        cbrKeyRatePct:    16.0,
        cbrRateUpdatedAt: today,
        layerOverride:    {},
        includeExpectedYield: false,
        savingsInstruments: [],
      },
    };
  }
  return {
    schemaVersion: 2,
    activeScenarioId: raw.activeScenarioId,
    scenarios,
    ui: raw.ui,
  };
}

function migrateV2ToV3(raw: V2State): V3State {
  const scenarios: V3State['scenarios'] = {};
  for (const sid of Object.keys(raw.scenarios)) {
    const old = raw.scenarios[sid];
    scenarios[sid] = {
      id: old.id, name: old.name, createdAt: old.createdAt, updatedAt: old.updatedAt,
      inputs: {
        ...old.inputs,
        savingsPicks: {
          A: { preset: 'cons', classes: {} },
          B: { preset: 'cons', classes: {} },
          C: { preset: 'bal',  classes: {} },
        },
      } as unknown as V3State['scenarios'][string]['inputs'],
    };
  }
  return {
    schemaVersion: 3,
    activeScenarioId: raw.activeScenarioId,
    scenarios,
    ui: raw.ui,
  };
}

type V3State = {
  schemaVersion: 3;
  activeScenarioId: string;
  scenarios: Record<string, { id: string; name: string; createdAt: string; updatedAt: string; inputs: Record<string, unknown> }>;
  ui: { language: string; theme: string; openSections: Record<string, boolean> };
};

function migrateV3ToV4(raw: V3State): V4State {
  const scenarios: V4State['scenarios'] = {};
  for (const sid of Object.keys(raw.scenarios)) {
    const old = raw.scenarios[sid];
    const oi = old.inputs;
    const includeExpectedYield = typeof oi.includeExpectedYield === 'boolean' ? oi.includeExpectedYield : true;
    scenarios[sid] = {
      id: old.id,
      name: old.name,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      inputs: {
        returnDate:       oi.returnDate as string,
        voyageDate:       oi.voyageDate as string,
        salaryLumpSumUsd: oi.salaryLumpSumUsd as number,
        assets:           oi.assets as { usdBank: number; usdCash: number; rubBank: number },
        rubPerUsd:        oi.rubPerUsd as number,
        monthlyFamilyRub: oi.monthlyFamilyRub as number,
        goals:            oi.goals as any[],
        includeExpectedYield,
        savingsInstruments: [],
      } as unknown as Scenario['inputs'],
    };
  }
  return {
    schemaVersion: 4,
    activeScenarioId: raw.activeScenarioId,
    scenarios,
    ui: raw.ui as AppState['ui'],
  };
}

type V4State = {
  schemaVersion: 4;
  activeScenarioId: string;
  scenarios: Record<string, { id: string; name: string; createdAt: string; updatedAt: string; inputs: Record<string, unknown> }>;
  ui: { language: string; theme: string; openSections: Record<string, boolean> };
};

type V5State = {
  schemaVersion: 5;
  activeScenarioId: string;
  scenarios: Record<string, { id: string; name: string; createdAt: string; updatedAt: string; inputs: Record<string, unknown> }>;
  ui: { language: string; theme: string; openSections: Record<string, boolean> };
};

function migrateV4ToV5(raw: V4State): V5State {
  const scenarios: V5State['scenarios'] = {};
  for (const sid of Object.keys(raw.scenarios)) {
    const old = raw.scenarios[sid];
    scenarios[sid] = {
      id: old.id,
      name: old.name,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      inputs: {
        ...old.inputs,
        localCurrency: 'RUB',
      } as unknown as V5State['scenarios'][string]['inputs'],
    };
  }
  return {
    schemaVersion: 5,
    activeScenarioId: raw.activeScenarioId,
    scenarios,
    ui: raw.ui as V5State['ui'],
  };
}

function migrateV5ToV6(raw: V5State): AppState {
  return {
    schemaVersion: 6,
    activeScenarioId: raw.activeScenarioId,
    scenarios: raw.scenarios as unknown as AppState['scenarios'],
    ui: {
      ...raw.ui,
      onboardingDone: true,
    } as AppState['ui'],
  };
}

function migrate(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid state');
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion === 1) {
    if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
      throw new Error('Invalid state shape');
    }
    const v2 = migrateV1ToV2(s as unknown as V1State);
    const v3 = migrateV2ToV3(v2);
    return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(v3 as unknown as V3State) as unknown as V4State));
  }
  if (s.schemaVersion === 2) {
    if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
      throw new Error('Invalid state shape');
    }
    const v3 = migrateV2ToV3(s as unknown as V2State);
    return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(v3 as unknown as V3State) as unknown as V4State));
  }
  if (s.schemaVersion === 3) {
    if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
      throw new Error('Invalid state shape');
    }
    return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(s as unknown as V3State) as unknown as V4State));
  }
  if (s.schemaVersion === 4) {
    if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
      throw new Error('Invalid state shape');
    }
    return migrateV5ToV6(migrateV4ToV5(s as unknown as V4State));
  }
  if (s.schemaVersion === 5) {
    if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
      throw new Error('Invalid state shape');
    }
    return migrateV5ToV6(s as unknown as V5State);
  }
  if (s.schemaVersion !== 6) throw new Error(`Unsupported schemaVersion: ${String(s.schemaVersion)}`);
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
