<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';
  import type { LayerKey } from '../../../lib/calc/types';
  import ClassCard from './ClassCard.svelte';

  let { layer }: { layer: LayerKey } = $props();

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const info = $derived(result.alloc.layers[layer]);
  const overridden = $derived(inputs.layerOverride[layer] !== undefined);

  const share = $derived(inputs.freeCashRub > 0 ? info.amountRub / inputs.freeCashRub : 0);
  const sharePct = $derived(Math.round(share * 100));

  function layerShortName(full: string): string {
    const idx = full.indexOf('·');
    return idx >= 0 ? full.slice(idx + 1).trim() : full;
  }

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

<div class="layer {layer.toLowerCase()}">
  <div class="layer-head">
    <div class="layer-tag">
      <span class="swatch"></span>
      {layer} · {layerShortName($_(`savings.layer.${layer}.name`))}
    </div>
    <div class="layer-share-row">
      {#if overridden}
        <button class="reset-btn" type="button" onclick={resetToAuto} title={$_('savings.layerCard.resetToAuto')} aria-label={$_('savings.layerCard.resetToAuto')}>↺</button>
      {/if}
      <span class="layer-share">{sharePct}%</span>
    </div>
  </div>

  <input
    class="layer-amt-input"
    type="number"
    inputmode="decimal"
    min="0"
    step="any"
    value={info.amountRub === 0 ? '' : Math.round(info.amountRub)}
    placeholder="0"
    oninput={onAmount}
    aria-label={$_('savings.layerCard.amount')}
  />

  <div class="layer-bar"><div style="width: {sharePct}%"></div></div>

  {#if info.candidates.length === 0}
    <p class="layer-empty-mini">{$_('savings.layerCard.noCandidates')}</p>
  {:else}
    <div class="layer-classes">
      {#each info.candidates as cls (cls.id)}
        <ClassCard cls={cls} cbrPct={inputs.cbrKeyRatePct} />
      {/each}
    </div>
  {/if}

  <div class="layer-foot">
    <span class="foot-lbl">{$_('savings.layerCard.expectedIncome')}</span>
    <span class="foot-val">{formatRub(info.incomeRangeRub.low, app.ui.language)} – {formatRub(info.incomeRangeRub.high, app.ui.language)}</span>
  </div>
</div>

<style>
  /* Override the global .layer-amt span style by using an input that
     looks like the big number but is editable. all:unset strips native
     input chrome; the rules below re-apply the layer-amt visual rhythm. */
  .layer-amt-input {
    all: unset;
    font-family: var(--mono);
    font-size: var(--t-2xl);
    font-weight: 600;
    color: var(--fg);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    width: 100%;
    border-bottom: 1px solid transparent;
    padding: 2px 0;
    transition: border-color 150ms ease;
    cursor: text;
    box-sizing: border-box;
  }
  .layer-amt-input:hover  { border-bottom-color: var(--border); }
  .layer-amt-input:focus  { border-bottom-color: var(--primary); outline: none; }
  .layer-amt-input::placeholder { color: var(--fg-4); }

  .layer-share-row {
    display: inline-flex;
    align-items: center;
    gap: var(--gap-2);
  }
  .reset-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg-4);
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: var(--t-med);
    line-height: 1;
    border-radius: var(--radius-sm);
    transition: color 150ms ease, border-color 150ms ease;
    padding: 0;
  }
  .reset-btn:hover { color: var(--primary); border-color: var(--primary); }

  .layer-empty-mini {
    color: var(--fg-4);
    font-size: var(--t-small);
    margin: 0;
    padding: var(--gap-2) 0;
    text-align: center;
  }

  .layer-foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: var(--gap-2);
    border-top: 1px dashed var(--border);
    font-size: var(--t-small);
  }
  .foot-lbl { color: var(--fg-3); }
  .foot-val {
    color: var(--accent);
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .layer.b .foot-val { color: var(--primary); }
  .layer.c .foot-val { color: var(--warn); }
</style>
