<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { autoFillFromPreset } from '../../../lib/calc/allocate';
  import { formatRub } from '../../../lib/format';
  import type { LayerKey, Preset } from '../../../lib/calc/types';
  import ClassRow from './ClassRow.svelte';

  let { layer }: { layer: LayerKey } = $props();

  const LAYER_DEFAULT_PRESET: Record<LayerKey, Exclude<Preset, 'custom'>> = {
    A: 'cons', B: 'cons', C: 'bal',
  };

  let expandedClassId = $state<string | null>(null);

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const info   = $derived(result.alloc.layers[layer]);
  const picks  = $derived(inputs.savingsPicks[layer]);

  function shortName(full: string): string {
    const idx = full.indexOf('·');
    return idx >= 0 ? full.slice(idx + 1).trim() : full;
  }

  function onAmount(e: Event) {
    const t = e.target as HTMLInputElement;
    const raw = t.value.replace(/\s/g, '');
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.layerOverride = { ...inputs.layerOverride, [layer]: n };
      persistSoon();
    }
  }

  function applyPreset(p: Exclude<Preset, 'custom'>) {
    const classes = autoFillFromPreset(info.amountRub, info.candidates, p);
    inputs.savingsPicks = {
      ...inputs.savingsPicks,
      [layer]: { preset: p, classes },
    };
    persistSoon();
  }

  function resetToLayerDefault() {
    applyPreset(LAYER_DEFAULT_PRESET[layer]);
  }

  function toggleClass(id: string) {
    const current = picks.classes;
    const next: typeof current = { ...current };
    if (id in next) {
      delete next[id];
    } else {
      next[id] = { share: 0 };
    }
    inputs.savingsPicks = {
      ...inputs.savingsPicks,
      [layer]: { preset: 'custom', classes: next },
    };
    persistSoon();
  }

  function changeShare(id: string, n: number) {
    const next = { ...picks.classes, [id]: { share: n } };
    inputs.savingsPicks = {
      ...inputs.savingsPicks,
      [layer]: { preset: 'custom', classes: next },
    };
    persistSoon();
  }

  function balanceRemainder() {
    const remainder = info.unallocatedRub;
    if (remainder <= 0) return;
    const ids = Object.keys(picks.classes);
    if (ids.length === 0) return;
    const per = Math.floor(remainder / ids.length);
    const leftover = remainder - per * ids.length;
    const next = { ...picks.classes };
    ids.forEach((id, i) => {
      const add = i === ids.length - 1 ? per + leftover : per;
      next[id] = { share: next[id].share + add };
    });
    inputs.savingsPicks = {
      ...inputs.savingsPicks,
      [layer]: { preset: 'custom', classes: next },
    };
    persistSoon();
  }

  function toggleExpand(id: string) {
    expandedClassId = expandedClassId === id ? null : id;
  }
</script>

<div class="layer {layer.toLowerCase()}">
  <div class="layer-head">
    <div class="layer-tag">
      <span class="swatch"></span>
      {layer} · {shortName($_(`savings.layer.${layer}.name`))}
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

  <div class="layer-bar">
    <div style="width: {inputs.freeCashRub > 0 ? Math.round(info.amountRub * 100 / inputs.freeCashRub) : 0}%"></div>
  </div>

  <div class="preset-bar">
    <div class="layer-presets">
      <button class:active={picks.preset === 'cons'} type="button" onclick={() => applyPreset('cons')}>{$_('savings.preset.cons')}</button>
      <button class:active={picks.preset === 'bal'}  type="button" onclick={() => applyPreset('bal')}>{$_('savings.preset.bal')}</button>
      <button class:active={picks.preset === 'all'}  type="button" onclick={() => applyPreset('all')}>{$_('savings.preset.all')}</button>
    </div>
    {#if picks.preset === 'custom'}
      <button class="preset-reset" type="button" onclick={resetToLayerDefault} title={$_('savings.preset.resetTooltip')} aria-label={$_('savings.preset.resetTooltip')}>↺</button>
    {/if}
  </div>

  {#if info.candidates.length === 0}
    <p class="layer-empty">{$_('savings.layerCard.noCandidates')}</p>
  {:else}
    <div class="layer-classes">
      {#each info.candidates as cls (cls.id)}
        <ClassRow
          cls={cls}
          pick={picks.classes[cls.id]}
          cbrPct={inputs.cbrKeyRatePct}
          expanded={expandedClassId === cls.id}
          onToggle={() => toggleClass(cls.id)}
          onShareChange={(n: number) => changeShare(cls.id, n)}
          onExpandToggle={() => toggleExpand(cls.id)}
        />
      {/each}
    </div>
  {/if}

  <div class="layer-foot">
    <span class="lbl">{$_('savings.layerCard.expectedIncomeMid')}</span>
    <span class="vals">
      {#if info.incomeMidRub > 0}
        <span class="val-big">≈ {formatRub(info.incomeMidRub, app.ui.language)}</span>
        <span class="val-rng">{$_('savings.layerCard.expectedIncomeRange')} {formatRub(info.incomeRangeRub.low, app.ui.language)} – {formatRub(info.incomeRangeRub.high, app.ui.language)}</span>
      {:else}
        <span class="val-big foot-empty">—</span>
      {/if}
      {#if info.overAllocatedRub > 0}
        <span class="unalloc-pill over">{$_('savings.unalloc.over', { values: { amount: formatRub(info.overAllocatedRub, app.ui.language) } })}</span>
      {:else if info.unallocatedRub > 0}
        <button class="unalloc-pill warn" type="button" onclick={balanceRemainder} title={$_('savings.layerCard.balanceUnallocated')}>
          {$_('savings.unalloc.warn', { values: { amount: formatRub(info.unallocatedRub, app.ui.language) } })}
        </button>
      {:else}
        <span class="unalloc-pill ok">{$_('savings.unalloc.ok')}</span>
      {/if}
    </span>
  </div>
</div>

<style>
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
  .layer-amt-input:hover { border-bottom-color: var(--border); }
  .layer-amt-input:focus { border-bottom-color: var(--primary); outline: none; }
  .layer-amt-input::placeholder { color: var(--fg-4); }

  .preset-bar { display: flex; align-items: center; }

  .layer-foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: var(--gap-2);
    border-top: 1px dashed var(--border);
    font-size: var(--t-small);
    flex-wrap: wrap;
    gap: 8px;
  }
  .layer-foot .lbl {
    color: var(--fg-3);
    font-family: var(--mono);
    font-size: var(--t-mini);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .layer-foot .vals { display: inline-flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .layer-foot .val-big {
    color: var(--accent);
    font-family: var(--mono);
    font-size: var(--t-lg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  :global(.layer.b) .layer-foot .val-big { color: var(--primary); }
  :global(.layer.c) .layer-foot .val-big { color: var(--warn); }
  .layer-foot .val-rng {
    font-family: var(--mono);
    font-size: var(--t-mini);
    color: var(--fg-4);
  }
  .foot-empty { color: var(--fg-4); }
</style>
