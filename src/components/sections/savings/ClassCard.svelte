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

<div class="class-card">
  <div class="head">
    <span class="name">{$_(`savings.classes.${cls.id}.name`)}</span>
    <span class="yield number">
      {#if Math.abs(lo - hi) < 0.05}
        {fmtPct(lo)}%
      {:else}
        {fmtPct(lo)}–{fmtPct(hi)}%
      {/if}
      <span class="pa">p.a.</span>
    </span>
  </div>
  <div class="badges">
    <span class="badge">{$_(`savings.liquidity.${cls.liquidity}`)}</span>
    <span class="badge">{$_(`savings.currency.${cls.currency}`)}</span>
    {#if cls.isDeposit}<span class="badge deposit">АСВ</span>{/if}
  </div>
  <div class="risk">
    <span class="risk-key">{$_('savings.classCard.risk')}:</span>
    <span class="risk-text">{$_(`savings.classes.${cls.id}.riskNote`)}</span>
  </div>
</div>

<style>
  .class-card {
    border: 1px solid var(--border-2);
    padding: var(--gap-2) var(--gap-3);
    background: var(--surface-1);
    display: flex;
    flex-direction: column;
    gap: var(--gap-1);
  }
  .head { display: flex; justify-content: space-between; gap: var(--gap-2); align-items: baseline; }
  .name { font-size: var(--t-small); color: var(--fg); letter-spacing: 0.04em; }
  .yield { font-size: var(--t-small); color: var(--amber); white-space: nowrap; }
  .pa { color: var(--muted); font-size: var(--t-mini); letter-spacing: 0.14em; margin-left: 2px; }
  .badges { display: flex; gap: var(--gap-1); flex-wrap: wrap; }
  .badge {
    font-size: var(--t-mini);
    color: var(--muted);
    border: 1px solid var(--border-3);
    padding: 0 6px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .badge.deposit { color: var(--amber); border-color: var(--amber); }
  .risk { font-size: var(--t-mini); color: var(--muted); line-height: 1.4; }
  .risk-key { letter-spacing: 0.14em; text-transform: uppercase; margin-right: 4px; }
</style>
