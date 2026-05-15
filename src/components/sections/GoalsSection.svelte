<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { get } from 'svelte/store';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import type { Goal, GoalMode } from '../../lib/calc/types';

  const inputs = $derived(activeInputs());

  function newId(): string { return crypto.randomUUID(); }
  function todayISO(): string { return new Date().toISOString().slice(0, 10); }

  function addGoal() {
    inputs.goals = [...inputs.goals, {
      id: newId(),
      name: '',
      amountRub: 0,
      mode: 'lump',
      date: todayISO(),
      enabled: true,
    }];
    persistSoon();
  }

  function removeGoal(id: string) {
    if (!confirm(get(_)('goals.delete') + '?')) return;
    inputs.goals = inputs.goals.filter(g => g.id !== id);
    persistSoon();
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    inputs.goals = inputs.goals.map(g => g.id === id ? { ...g, ...patch } : g);
    persistSoon();
  }

  const cols = 'minmax(110px, 1fr) 96px 104px 116px 116px 32px 32px';
  const gap = '6px';
</script>

<CollapsibleCard title={$_('goals.title')}>
  <div class="field-multi-list" style="--multi-cols: {cols}; --multi-gap: {gap};">
    <div class="field-multi-head">
      <span>{$_('goals.name')}</span>
      <span>{$_('goals.amount')}</span>
      <span>{$_('goals.mode')}</span>
      <span>{$_('goals.date')}</span>
      <span>{$_('goals.endDate')}</span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </div>

    {#each inputs.goals as g (g.id)}
      <div class="field-multi-row" class:disabled={!g.enabled}>
        <input class="input text" type="text"
               placeholder={$_('goals.name')}
               value={g.name}
               oninput={(e) => updateGoal(g.id, { name: (e.target as HTMLInputElement).value })} />
        <input class="input" type="number" inputmode="decimal" min="0" step="any"
               placeholder="0"
               value={g.amountRub === 0 ? '' : g.amountRub}
               oninput={(e) => updateGoal(g.id, { amountRub: Number((e.target as HTMLInputElement).value) || 0 })} />
        <select class="select" value={g.mode}
                onchange={(e) => updateGoal(g.id, { mode: (e.target as HTMLSelectElement).value as GoalMode })}>
          <option value="lump">{$_('goals.mode.lump')}</option>
          <option value="spread">{$_('goals.mode.spread')}</option>
        </select>
        <input class="input date" type="date" value={g.date}
               oninput={(e) => updateGoal(g.id, { date: (e.target as HTMLInputElement).value })} />
        {#if g.mode === 'spread'}
          <input class="input date" type="date" value={g.endDate ?? g.date}
                 oninput={(e) => updateGoal(g.id, { endDate: (e.target as HTMLInputElement).value })} />
        {:else}
          <span class="cell-empty" aria-hidden="true">—</span>
        {/if}
        <input class="row-check" type="checkbox" checked={g.enabled}
               onchange={(e) => updateGoal(g.id, { enabled: (e.target as HTMLInputElement).checked })}
               aria-label={$_('goals.enabled')}
               title={$_('goals.enabled')} />
        <button class="btn icon danger row-del" type="button"
                onclick={() => removeGoal(g.id)}
                aria-label={$_('goals.delete')}
                title={$_('goals.delete')}>×</button>
      </div>
    {/each}
  </div>
  <button class="btn btn-block" type="button" onclick={addGoal}>{$_('goals.add')}</button>
</CollapsibleCard>

<style>
  .cell-empty {
    color: var(--label);
    text-align: center;
    font-size: var(--t-mini);
  }
  .row-check {
    accent-color: var(--amber);
    width: 18px;
    height: 18px;
    margin: 0;
    justify-self: center;
  }
  .row-del { padding: 4px 6px; justify-self: end; }

  /* Compact on narrow viewports: stack into 2 grid columns instead of 7.
     Keeps rows visually grouped by border-bottom dashed line. */
  @media (max-width: 640px) {
    .field-multi-list :global(.field-multi-head) { display: none; }
    .field-multi-list :global(.field-multi-row) {
      grid-template-columns: 1fr auto !important;
      row-gap: var(--gap-1);
    }
    .field-multi-list :global(.field-multi-row > *) { grid-column: 1 / -1; }
    .field-multi-list :global(.field-multi-row > .row-check),
    .field-multi-list :global(.field-multi-row > .row-del) {
      grid-column: 2;
      grid-row: 1;
    }
  }
</style>
