<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';
  import type { LayerKey } from '../../../lib/calc/types';
  import ClassCard from './ClassCard.svelte';
  import AsvWarning from './AsvWarning.svelte';

  type Props = { layer: LayerKey };
  let { layer }: Props = $props();

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const info   = $derived(result.alloc.layers[layer]);
  const overridden = $derived(inputs.layerOverride[layer] !== undefined);
  const asvFired = $derived(result.alloc.asvWarningLayers.includes(layer));

  function onAmount(e: Event) {
    const target = e.target as HTMLInputElement;
    const raw = target.value.replace(/\s/g, '');
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.layerOverride = { ...inputs.layerOverride, [layer]: n };
      persistSoon();
    }
  }

  function resetToAuto() {
    const next = { ...inputs.layerOverride };
    delete next[layer];
    inputs.layerOverride = next;
    persistSoon();
  }
</script>

<section class="layer-card">
  <header class="layer-head">
    <span class="layer-name">{$_(`savings.layer.${layer}.name`)}</span>
    <span class="layer-window">{$_(`savings.layer.${layer}.window`)}</span>
  </header>

  <div class="amount-row">
    <label class="amount-label">
      <span class="amount-key">{$_('savings.layerCard.amount')}</span>
      <input
        class="input"
        type="number"
        inputmode="decimal"
        min="0"
        step="any"
        value={info.amountRub === 0 ? '' : info.amountRub}
        oninput={onAmount}
      />
    </label>
    {#if overridden}
      <button class="btn icon" type="button" onclick={resetToAuto}>{$_('savings.layerCard.resetToAuto')}</button>
    {/if}
  </div>

  {#if info.candidates.length === 0}
    <p class="empty">{$_('savings.layerCard.noCandidates')}</p>
  {:else}
    <div class="class-grid">
      {#each info.candidates as cls (cls.id)}
        <ClassCard {cls} cbrPct={inputs.cbrKeyRatePct} />
      {/each}
    </div>
  {/if}

  <div class="income">
    <span class="income-key">{$_('savings.layerCard.expectedIncome')}</span>
    <span class="income-val number">
      {formatRub(info.incomeRangeRub.low, app.ui.language)} – {formatRub(info.incomeRangeRub.high, app.ui.language)}
    </span>
  </div>

  {#if asvFired}
    <AsvWarning />
  {/if}
</section>

<style>
  .layer-card {
    border: 1px solid var(--border-2);
    padding: var(--gap-3) var(--gap-4);
    background: var(--surface-1);
    display: flex;
    flex-direction: column;
    gap: var(--gap-3);
  }
  .layer-head { display: flex; justify-content: space-between; align-items: baseline; }
  .layer-name { color: var(--amber); letter-spacing: 0.14em; text-transform: uppercase; font-size: var(--t-small); }
  .layer-window { color: var(--muted); letter-spacing: 0.14em; text-transform: uppercase; font-size: var(--t-mini); }
  .amount-row { display: flex; align-items: end; gap: var(--gap-2); }
  .amount-label { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .amount-key { font-size: var(--t-mini); color: var(--muted); letter-spacing: 0.14em; text-transform: uppercase; }
  .empty { color: var(--muted); font-size: var(--t-small); }
  .class-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap-2); }
  @media (max-width: 700px) { .class-grid { grid-template-columns: 1fr; } }
  .income { display: flex; justify-content: space-between; align-items: baseline; padding-top: var(--gap-2); border-top: 1px dashed var(--border); }
  .income-key { font-size: var(--t-mini); color: var(--muted); letter-spacing: 0.14em; text-transform: uppercase; }
  .income-val { color: var(--amber); }
</style>
