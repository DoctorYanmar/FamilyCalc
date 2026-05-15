<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { InstrumentClass } from '../../../lib/calc/types';

  let { cls, cbrPct }: { cls: InstrumentClass; cbrPct: number } = $props();

  const lo = $derived(cbrPct + cls.cbrOffset.low);
  const hi = $derived(cbrPct + cls.cbrOffset.high);

  function fmtPct(n: number): string {
    return (Math.round(n * 10) / 10).toFixed(1);
  }
</script>

<div class="layer-class" title={$_(`savings.classes.${cls.id}.riskNote`)}>
  <span class="name">{$_(`savings.classes.${cls.id}.name`)}</span>
  <span class="meta">
    {#if Math.abs(lo - hi) < 0.05}
      <span class="yld">{fmtPct(lo)}%</span>
    {:else}
      <span class="yld">{fmtPct(lo)}–{fmtPct(hi)}%</span>
    {/if}
    <span class="sep">·</span>
    <span class="cur">{$_(`savings.currency.${cls.currency}`)}</span>
    {#if cls.isDeposit}<span class="dep" title="АСВ 1.4M ₽">ДЕП</span>{/if}
  </span>
</div>

<style>
  .meta {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    color: var(--fg-3);
    font-family: var(--mono);
    font-size: var(--t-mini);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .sep { color: var(--fg-4); }
  .cur {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--t-micro);
  }
  .dep {
    color: var(--warn);
    border: 1px solid var(--border);
    padding: 0 4px;
    margin-left: 4px;
    font-size: 9px;
    letter-spacing: 0.16em;
    font-family: var(--sans);
  }
</style>
