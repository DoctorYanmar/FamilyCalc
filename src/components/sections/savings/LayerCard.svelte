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

  function layerName(full: string): string {
    const idx = full.indexOf('·');
    return idx >= 0 ? full.slice(idx + 1).trim() : full;
  }
</script>

<div class="layer">
  <!-- Header row: badge + name + window, label-style left half (matches .field column structure) -->
  <div class="field">
    <span class="field-key layer-key">
      <span class="badge">{layer}</span>
      <span class="name">{layerName($_(`savings.layer.${layer}.name`))}</span>
      <span class="window">{$_(`savings.layer.${layer}.window`)}</span>
    </span>
    <span class="amount-wrap">
      {#if overridden}
        <button class="reset" type="button" onclick={resetToAuto} title={$_('savings.layerCard.resetToAuto')}>↺</button>
      {/if}
      <input
        class="input"
        type="number"
        inputmode="decimal"
        min="0"
        step="any"
        value={info.amountRub === 0 ? '' : Math.round(info.amountRub)}
        placeholder="0"
        oninput={onAmount}
        aria-label={$_('savings.layerCard.amount')}
      />
    </span>
  </div>

  {#if info.candidates.length > 0}
    <div class="classes">
      {#each info.candidates as cls (cls.id)}
        <ClassCard {cls} cbrPct={inputs.cbrKeyRatePct} />
      {/each}
    </div>
  {:else}
    <p class="empty">{$_('savings.layerCard.noCandidates')}</p>
  {/if}

  <!-- Footer row: expected income, same .field column structure -->
  <div class="field foot">
    <span class="field-key">{$_('savings.layerCard.expectedIncome')}</span>
    <span class="amber number">
      {formatRub(info.incomeRangeRub.low, app.ui.language)} – {formatRub(info.incomeRangeRub.high, app.ui.language)}
    </span>
  </div>

  {#if asvFired}
    <AsvWarning />
  {/if}
</div>

<style>
  .layer {
    padding: var(--gap-3) 0;
    border-bottom: 1px dashed var(--border);
  }
  .layer:last-of-type { border-bottom: 0; padding-bottom: var(--gap-2); }
  .layer:first-of-type { padding-top: var(--gap-2); }

  /* Header field's key cell: badge + name + window inline */
  .layer-key {
    display: inline-flex;
    align-items: center;
    gap: var(--gap-2);
    color: var(--fg);
    text-transform: none;
    letter-spacing: 0;
  }
  .badge {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--amber);
    color: var(--amber);
    font-size: var(--t-small);
    font-weight: 700;
    line-height: 1;
  }
  .name {
    font-size: var(--t-small);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .window {
    font-size: var(--t-mini);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    padding-left: var(--gap-2);
    border-left: 1px solid var(--border);
  }

  .amount-wrap {
    display: inline-flex;
    align-items: center;
    gap: var(--gap-2);
  }
  .reset {
    background: transparent;
    border: 1px solid var(--border-2);
    color: var(--muted);
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: var(--t-med);
    line-height: 1;
    transition: color 0.12s ease, border-color 0.12s ease;
  }
  .reset:hover { color: var(--amber); border-color: var(--amber); }

  /* Class list — borderless rows in 2 cols, indented inside the layer */
  .classes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: var(--gap-5);
    padding: var(--gap-1) 0 var(--gap-2);
  }
  @media (max-width: 540px) {
    .classes { grid-template-columns: 1fr; }
  }
  .empty {
    color: var(--muted);
    font-size: var(--t-small);
    margin: 0;
    padding: var(--gap-2) 0;
  }

  /* Footer field uses the standard .field grid; amber value aligns to same right edge */
  .foot {
    border-bottom: 0 !important;
    padding-top: var(--gap-1);
  }
  .foot .amber {
    color: var(--amber);
    font-size: var(--t-small);
  }
</style>
