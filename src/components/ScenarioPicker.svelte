<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { get } from 'svelte/store';
  import { app, switchScenario, saveAsNew, renameScenario, deleteScenario } from '../lib/state/scenarios.svelte';

  function onChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    switchScenario(id);
  }

  function onRename() {
    const cur = app.scenarios[app.activeScenarioId];
    if (!cur) return;
    const next = prompt(get(_)('scenario.renamePrompt'), cur.name);
    if (next && next.trim()) renameScenario(app.activeScenarioId, next.trim());
  }

  function onDuplicate() {
    const cur = app.scenarios[app.activeScenarioId];
    if (!cur) return;
    const next = prompt(get(_)('scenario.duplicatePrompt'), `${cur.name} (copy)`);
    if (next && next.trim()) saveAsNew(next.trim());
  }

  function onDelete() {
    const cur = app.scenarios[app.activeScenarioId];
    if (!cur) return;
    if (Object.keys(app.scenarios).length <= 1) {
      alert(get(_)('scenario.cannotDeleteLast'));
      return;
    }
    if (confirm(get(_)('scenario.deleteConfirm', { values: { name: cur.name } }))) {
      deleteScenario(app.activeScenarioId);
    }
  }
</script>

<select class="select scenario-select" value={app.activeScenarioId} onchange={onChange} aria-label={$_('scenario.label')}>
  {#each Object.values(app.scenarios) as s (s.id)}
    <option value={s.id}>{s.name}</option>
  {/each}
</select>

<button class="btn icon" data-secondary type="button" onclick={onRename} title={$_('scenario.rename')} aria-label={$_('scenario.rename')}>
  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
</button>
<button class="btn icon" data-secondary type="button" onclick={onDuplicate} title={$_('scenario.duplicate')} aria-label={$_('scenario.duplicate')}>
  <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
</button>
<button class="btn icon danger" data-secondary type="button" onclick={onDelete} title={$_('scenario.delete')} aria-label={$_('scenario.delete')}>
  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
</button>

<style>
  .scenario-select {
    max-width: 200px;
    min-height: 36px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 720px) {
    .scenario-select { max-width: 140px; font-size: var(--t-small); }
  }
  @media (max-width: 480px) {
    .scenario-select { flex: 1; max-width: none; }
  }
</style>
