<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { SAVINGS_TEMPLATES, type SavingsTemplate } from '../../../lib/calc/savingsTemplates';
  import type { SavingsTemplateId } from '../../../lib/calc/types';

  type Props = {
    onAdd: (templateId: SavingsTemplateId) => void;
    onCancel: () => void;
  };

  const { onAdd, onCancel }: Props = $props();

  let selected: SavingsTemplateId | null = $state(null);
  let expanded: SavingsTemplateId | null = $state(null);

  function pick(t: SavingsTemplate) {
    selected = t.id;
    expanded = expanded === t.id ? null : t.id;
  }

  function confirm() {
    if (selected) onAdd(selected);
  }
</script>

<div class="picker" role="group" aria-label={$_('savings.picker.title')}>
  <header class="picker-head">{$_('savings.picker.title')}</header>
  <ul class="picker-list">
    {#each SAVINGS_TEMPLATES as t (t.id)}
      <li class="picker-row" class:selected={selected === t.id}>
        <button type="button" class="picker-btn" onclick={() => pick(t)}>
          <span class="radio" aria-hidden="true"></span>
          <span class="picker-name">{$_(`savings.templates.${t.id}.name`)}</span>
          <span class="picker-blurb">{$_(`savings.templates.${t.id}.blurb`)}</span>
        </button>
        {#if expanded === t.id}
          <p class="picker-details">{$_(`savings.templates.${t.id}.details`)}</p>
        {/if}
      </li>
    {/each}
  </ul>
  <div class="picker-foot">
    <span class="picker-hint">▸ {$_('savings.picker.hint')}</span>
    <span class="picker-actions">
      <button type="button" class="btn" onclick={onCancel}>{$_('savings.picker.cancel')}</button>
      <button type="button" class="btn primary" disabled={!selected} onclick={confirm}>{$_('savings.picker.add')}</button>
    </span>
  </div>
</div>

<style>
  .picker { border: 1px solid var(--border); border-radius: 8px; padding: var(--gap-4); background: var(--surface-2); }
  .picker-head { font-family: var(--mono); font-size: var(--t-sm); color: var(--fg-3); margin-bottom: var(--gap-3); text-transform: uppercase; letter-spacing: 0.04em; }
  .picker-list { list-style: none; padding: 0; margin: 0; }
  .picker-row { border-bottom: 1px solid var(--border-soft); }
  .picker-row.selected { background: var(--surface-3); }
  .picker-btn { display: grid; grid-template-columns: 16px 1fr auto; gap: var(--gap-3); width: 100%; padding: var(--gap-3); background: none; border: none; text-align: left; cursor: pointer; align-items: center; color: var(--fg); }
  .picker-btn:hover { background: var(--surface-3); }
  .radio { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 50%; }
  .picker-row.selected .radio { border-color: var(--accent); box-shadow: inset 0 0 0 3px var(--accent); }
  .picker-name { font-family: var(--mono); font-weight: 600; }
  .picker-blurb { color: var(--fg-3); font-size: var(--t-sm); }
  .picker-details { padding: 0 var(--gap-4) var(--gap-4); color: var(--fg-2); font-size: var(--t-sm); line-height: 1.5; margin: 0; }
  .picker-foot { display: flex; justify-content: space-between; align-items: center; margin-top: var(--gap-3); flex-wrap: wrap; gap: var(--gap-3); }
  .picker-hint { color: var(--fg-3); font-size: var(--t-sm); }
  .picker-actions { display: inline-flex; gap: var(--gap-2); }
  @media (max-width: 480px) {
    .picker-btn { grid-template-columns: 16px 1fr; }
    .picker-blurb { grid-column: 2; }
  }
</style>
