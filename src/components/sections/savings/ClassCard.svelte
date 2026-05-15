<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { InstrumentClass } from '../../../lib/calc/types';

  type Props = {
    cls: InstrumentClass;
    cbrPct: number;
  };
  let { cls, cbrPct }: Props = $props();

  const lo = $derived(cbrPct + cls.cbrOffset.low);
  const hi = $derived(cbrPct + cls.cbrOffset.high);

  function fmtPct(n: number): string {
    return (Math.round(n * 10) / 10).toFixed(1);
  }
</script>

<div class="row" title={$_(`savings.classes.${cls.id}.riskNote`)}>
  <div class="name">{$_(`savings.classes.${cls.id}.name`)}</div>
  <div class="meta number">
    {#if Math.abs(lo - hi) < 0.05}
      <span class="yield">{fmtPct(lo)}%</span>
    {:else}
      <span class="yield">{fmtPct(lo)}–{fmtPct(hi)}%</span>
    {/if}
    <span class="sep">·</span>
    <span class="cur">{$_(`savings.currency.${cls.currency}`)}</span>
    {#if cls.isDeposit}<span class="dep" title="АСВ 1.4M ₽">ДЕП</span>{/if}
  </div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: var(--gap-2);
    padding: 5px 0;
    border-bottom: 1px dotted var(--border);
    cursor: help;
  }
  .row:last-child { border-bottom: 0; }
  .name {
    color: var(--fg);
    font-size: var(--t-small);
    line-height: 1.3;
    letter-spacing: 0.01em;
  }
  .meta {
    color: var(--muted);
    font-size: var(--t-mini);
    letter-spacing: 0.06em;
    white-space: nowrap;
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
  }
  .yield { color: var(--amber); font-feature-settings: 'tnum'; }
  .sep { color: var(--label); }
  .cur { text-transform: uppercase; letter-spacing: 0.12em; }
  .dep {
    color: var(--amber-deep);
    border: 1px solid var(--border-2);
    padding: 0 4px;
    margin-left: 4px;
    font-size: var(--t-micro);
    letter-spacing: 0.16em;
  }
</style>
