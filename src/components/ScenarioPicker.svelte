<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { get } from 'svelte/store';
  import {
    app, switchScenario, saveAsNew, renameScenario, deleteScenario, replaceState,
  } from '../lib/state/scenarios.svelte';
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
  <select class="select" value={app.activeScenarioId} onchange={onSwitch} aria-label={$_('header.scenario')}>
    {#each Object.values(app.scenarios) as s}
      <option value={s.id}>{s.name}</option>
    {/each}
  </select>
  <button class="btn icon" type="button" onclick={onSaveAs} title={$_('header.saveAs')} aria-label={$_('header.saveAs')}>+</button>
  <button class="btn icon" type="button" onclick={onRename} title={$_('header.rename')} aria-label={$_('header.rename')}>✎</button>
  <button class="btn icon danger" type="button" onclick={onDelete} title={$_('header.delete')} aria-label={$_('header.delete')}>×</button>
  <button class="btn icon" type="button" onclick={onExport} title={$_('header.export')} aria-label={$_('header.export')}>↓</button>
  <label class="btn icon import-btn" title={$_('header.import')} aria-label={$_('header.import')}>
    ↑
    <input type="file" accept="application/json" onchange={onImport} hidden />
  </label>
</div>

<style>
  .scenario-picker { display: inline-flex; gap: var(--gap-1); align-items: stretch; flex-wrap: wrap; }
  /* Header dropdown is a widget — keep it modestly sized, not the form-section 160–220px. */
  .scenario-picker :global(.select) { max-width: 200px; padding: 4px 26px 4px 8px; }
  .import-btn { display: inline-flex; align-items: center; cursor: pointer; }
</style>
