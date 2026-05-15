import type { AppState, Scenario, ID, Inputs } from '../calc/types';
import { loadState, saveState, defaultState } from './persistence';

function newId(): ID {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// $state is a Svelte 5 rune. This module is consumed by .svelte files.
export const app = $state<AppState>(loadState());

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function persistSoon(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveState($state.snapshot(app));
  }, 300);
}

export function activeScenario(): Scenario {
  return app.scenarios[app.activeScenarioId];
}

export function activeInputs(): Inputs {
  return activeScenario().inputs;
}

export function switchScenario(id: ID): void {
  if (app.scenarios[id]) {
    app.activeScenarioId = id;
    persistSoon();
  }
}

export function saveAsNew(name: string): ID {
  const id = newId();
  const current = activeScenario();
  app.scenarios[id] = {
    id,
    name,
    createdAt: todayISO(),
    updatedAt: todayISO(),
    inputs: JSON.parse(JSON.stringify(current.inputs)),
  };
  app.activeScenarioId = id;
  persistSoon();
  return id;
}

export function renameScenario(id: ID, name: string): void {
  if (app.scenarios[id]) {
    app.scenarios[id].name = name;
    app.scenarios[id].updatedAt = todayISO();
    persistSoon();
  }
}

export function deleteScenario(id: ID): void {
  if (!app.scenarios[id]) return;
  delete app.scenarios[id];
  if (app.activeScenarioId === id) {
    const remaining = Object.keys(app.scenarios);
    if (remaining.length > 0) {
      app.activeScenarioId = remaining[0];
    } else {
      const fresh = defaultState();
      app.activeScenarioId = fresh.activeScenarioId;
      Object.assign(app.scenarios, fresh.scenarios);
    }
  }
  persistSoon();
}

export function replaceState(next: AppState): void {
  app.schemaVersion = next.schemaVersion;
  app.activeScenarioId = next.activeScenarioId;
  app.scenarios = next.scenarios;
  app.ui = next.ui;
  persistSoon();
}
