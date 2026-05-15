<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import type { Goal, GoalMode } from '../../lib/calc/types';

  const inputs = $derived(activeInputs());

  function newId(): string {
    return crypto.randomUUID();
  }
  function todayISO(): string { return new Date().toISOString().slice(0, 10); }

  function addGoal() {
    inputs.goals = [...inputs.goals, {
      id: newId(),
      name: $_('goals.title'),
      amountRub: 0,
      mode: 'lump',
      date: todayISO(),
      enabled: true,
    }];
    persistSoon();
  }

  function removeGoal(id: string) {
    if (!confirm('Delete?')) return;
    inputs.goals = inputs.goals.filter(g => g.id !== id);
    persistSoon();
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    inputs.goals = inputs.goals.map(g => g.id === id ? { ...g, ...patch } : g);
    persistSoon();
  }
</script>

<CollapsibleCard title={$_('goals.title')}>
  {#each inputs.goals as g (g.id)}
    <div class="goal-row" class:disabled={!g.enabled}>
      <input class="input text"
        type="text" placeholder={$_('goals.name')} value={g.name}
        oninput={(e) => updateGoal(g.id, { name: (e.target as HTMLInputElement).value })} />
      <input class="input"
        type="number" min="0" step="any" placeholder="0" value={g.amountRub === 0 ? '' : g.amountRub}
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
      {/if}
      <label class="goal-check">
        <input type="checkbox" checked={g.enabled}
               onchange={(e) => updateGoal(g.id, { enabled: (e.target as HTMLInputElement).checked })} />
        <span>{$_('goals.enabled')}</span>
      </label>
      <button class="btn icon danger" type="button" onclick={() => removeGoal(g.id)} aria-label="Delete">×</button>
    </div>
  {/each}
  <button class="btn btn-block" type="button" onclick={addGoal}>{$_('goals.add')}</button>
</CollapsibleCard>

<style>
  .goal-row {
    display: grid;
    grid-template-columns: 1.4fr 1fr 0.9fr 1fr 1fr auto auto;
    gap: var(--gap-2);
    align-items: center;
    padding: var(--gap-2) 0;
    border-bottom: 1px dashed var(--border);
    transition: opacity 0.15s ease;
  }
  .goal-row.disabled { opacity: 0.45; }
  .goal-row .input, .goal-row .select { min-width: 0; max-width: none; width: 100%; }
  .goal-check {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    font-size: var(--t-mini);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .goal-check input { accent-color: var(--amber); }
  @media (max-width: 600px) {
    .goal-row { grid-template-columns: 1fr 1fr; }
  }
</style>
