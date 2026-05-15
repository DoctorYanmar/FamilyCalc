<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import type { Investment, InstrumentKind } from '../../lib/calc/types';

  const inputs = $derived(activeInputs());
  const kinds: InstrumentKind[] = ['vkladRub', 'ofz', 'corpBond', 'stock', 'longBond', 'custom'];

  function newId(): string { return crypto.randomUUID(); }

  function add() {
    inputs.investments = [...inputs.investments, {
      id: newId(),
      kind: 'vkladRub',
      name: '',
      amountRub: 0,
      annualRatePct: 12,
      reinvest: true,
    }];
    persistSoon();
  }

  function remove(id: string) {
    if (!confirm('Delete?')) return;
    inputs.investments = inputs.investments.filter(i => i.id !== id);
    persistSoon();
  }

  function update(id: string, patch: Partial<Investment>) {
    inputs.investments = inputs.investments.map(i => i.id === id ? { ...i, ...patch } : i);
    persistSoon();
  }
</script>

<CollapsibleCard title={$_('investments.title')}>
  {#each inputs.investments as inv (inv.id)}
    <div class="inv-row">
      <input class="input text" type="text" placeholder={$_('investments.name')} value={inv.name}
             oninput={(e) => update(inv.id, { name: (e.target as HTMLInputElement).value })} />
      <select class="select" value={inv.kind}
              onchange={(e) => update(inv.id, { kind: (e.target as HTMLSelectElement).value as InstrumentKind })}>
        {#each kinds as k}
          <option value={k}>{$_(`investments.kind.${k}`)}</option>
        {/each}
      </select>
      <input class="input" type="number" min="0" step="any" placeholder="0" value={inv.amountRub === 0 ? '' : inv.amountRub}
             oninput={(e) => update(inv.id, { amountRub: Number((e.target as HTMLInputElement).value) || 0 })} />
      <input class="input" type="number" min="0" step="0.1" placeholder="%" value={inv.annualRatePct}
             oninput={(e) => update(inv.id, { annualRatePct: Number((e.target as HTMLInputElement).value) || 0 })} />
      <label class="inv-check">
        <input type="checkbox" checked={inv.reinvest}
               onchange={(e) => update(inv.id, { reinvest: (e.target as HTMLInputElement).checked })} />
        <span>{$_('investments.reinvest')}</span>
      </label>
      <button class="btn icon danger" type="button" onclick={() => remove(inv.id)} aria-label="Delete">×</button>
    </div>
  {/each}
  <button class="btn btn-block" type="button" onclick={add}>{$_('investments.add')}</button>
</CollapsibleCard>

<style>
  .inv-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr 0.8fr auto auto;
    gap: var(--gap-2);
    align-items: center;
    padding: var(--gap-2) 0;
    border-bottom: 1px dashed var(--border);
  }
  .inv-row .input, .inv-row .select { min-width: 0; max-width: none; width: 100%; }
  .inv-check {
    display: inline-flex; gap: 4px; align-items: center;
    color: var(--muted);
    font-size: var(--t-mini);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .inv-check input { accent-color: var(--amber); }
  @media (max-width: 600px) {
    .inv-row { grid-template-columns: 1fr 1fr; }
  }
</style>
