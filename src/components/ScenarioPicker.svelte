<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { get } from 'svelte/store';
  import {
    app, switchScenario, saveAsNew, renameScenario, deleteScenario, replaceState,
  } from '../lib/state/scenarios';
  import { exportJson, importJson } from '../lib/state/persistence';

  function onSwitch(e: Event) {
    switchScenario((e.target as HTMLSelectElement).value);
  }
  function onSaveAs() {
    const name = prompt(get(_)('header.saveAs'));
    if (name) saveAsNew(name);
  }
  function onRename() {
    const id = app.activeScenarioId;
    const current = app.scenarios[id]?.name ?? '';
    const name = prompt(get(_)('scenarios.renamePrompt'), current);
    if (name) renameScenario(id, name);
  }
  function onDelete() {
    const id = app.activeScenarioId;
    if (confirm(get(_)('scenarios.deleteConfirm'))) deleteScenario(id);
  }
  function onExport() {
    const blob = new Blob([exportJson($state.snapshot(app))], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `familycalc-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function onImport(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    f.text().then(text => {
      try {
        const next = importJson(text);
        if (confirm(get(_)('scenarios.replaceConfirm'))) {
          replaceState(next);
        }
      } catch (err) {
        alert(get(_)('scenarios.invalidBackup'));
      }
    });
    (e.target as HTMLInputElement).value = '';
  }
</script>

<div class="scenario-picker">
  <select value={app.activeScenarioId} onchange={onSwitch}>
    {#each Object.values(app.scenarios) as s}
      <option value={s.id}>{s.name}</option>
    {/each}
  </select>
  <button onclick={onSaveAs} title={$_('header.saveAs')}>+</button>
  <button onclick={onRename} title="Rename">✎</button>
  <button onclick={onDelete} title="Delete">🗑</button>
  <button onclick={onExport} title={$_('header.export')}>⤓</button>
  <label class="import-btn" title={$_('header.import')}>
    ⤒
    <input type="file" accept="application/json" onchange={onImport} style="display:none" />
  </label>
</div>

<style>
  .scenario-picker { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
  .scenario-picker select { max-width: 160px; }
  .import-btn { background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; cursor: pointer; }
</style>
