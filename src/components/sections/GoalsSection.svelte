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
    if (!confirm(get(_)('goals.deleteConfirm'))) return;
    inputs.goals = inputs.goals.filter(g => g.id !== id);
    persistSoon();
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    inputs.goals = inputs.goals.map(g => g.id === id ? { ...g, ...patch } : g);
    persistSoon();
  }

  const enabledCount = $derived(inputs.goals.filter(g => g.enabled).length);
</script>

<CollapsibleCard
  title={$_('goals.title')}
  meta={$_('goals.meta', { values: { total: inputs.goals.length, enabled: enabledCount } })}
>
  <div class="goals-list">
    <div class="goals-row header">
      <span>{$_('goals.name')}</span>
      <span>{$_('goals.amount')}</span>
      <span>{$_('goals.mode')}</span>
      <span>{$_('goals.date')}</span>
      <span>{$_('goals.endDate')}</span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </div>

    {#each inputs.goals as g (g.id)}
      <div class="goals-row" class:disabled={!g.enabled}>
        <input class="input text cell-name" type="text"
               placeholder={$_('goals.name')}
               value={g.name}
               oninput={(e) => updateGoal(g.id, { name: (e.target as HTMLInputElement).value })} />
        <input class="input amount cell-amount" type="number" inputmode="decimal" min="0" step="any"
               placeholder="0"
               value={g.amountRub === 0 ? '' : g.amountRub}
               oninput={(e) => updateGoal(g.id, { amountRub: Number((e.target as HTMLInputElement).value) || 0 })} />
        <select class="select cell-mode" value={g.mode}
                onchange={(e) => updateGoal(g.id, { mode: (e.target as HTMLSelectElement).value as GoalMode })}>
          <option value="lump">{$_('goals.mode.lump')}</option>
          <option value="spread">{$_('goals.mode.spread')}</option>
        </select>
        <input class="input date cell-date" type="date" value={g.date}
               oninput={(e) => updateGoal(g.id, { date: (e.target as HTMLInputElement).value })} />
        {#if g.mode === 'spread'}
          <input class="input date cell-end" type="date" value={g.endDate ?? g.date}
                 oninput={(e) => updateGoal(g.id, { endDate: (e.target as HTMLInputElement).value })} />
        {:else}
          <span class="cell-end cell-empty" aria-hidden="true">—</span>
        {/if}
        <div class="cell-toggle">
          <div
            class="toggle-cb"
            class:on={g.enabled}
            role="switch"
            aria-checked={g.enabled}
            tabindex="0"
            onclick={() => updateGoal(g.id, { enabled: !g.enabled })}
            onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); updateGoal(g.id, { enabled: !g.enabled }); } }}
            aria-label={$_('goals.enabled')}
            title={$_('goals.enabled')}
          ></div>
        </div>
        <button class="icon-btn danger cell-delete" type="button"
                onclick={() => removeGoal(g.id)}
                aria-label={$_('goals.delete')}
                title={$_('goals.delete')}>
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    {/each}
  </div>
  <button class="btn btn-block" type="button" onclick={addGoal}>{$_('goals.add')}</button>
</CollapsibleCard>

<style>
  .cell-empty {
    color: var(--fg-4);
    text-align: center;
    font-size: var(--t-small);
    align-self: center;
  }
</style>
