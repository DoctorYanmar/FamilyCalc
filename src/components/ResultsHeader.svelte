<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../lib/state/scenarios.svelte';
  import { currentResult } from '../lib/state/derived';
  import { formatRub, formatUsd, formatDate } from '../lib/format';
  import { tweenedNumber } from '../lib/motion';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  const balance = tweenedNumber(0);
  $effect(() => { balance.set(result.balanceAtVoyage); });

  const usdEquiv = $derived(result.balanceAtVoyage / inputs.rubPerUsd);
  const burnPerDay = $derived(
    result.sim.days.length > 1
      ? (result.sim.days[0].totalRub - result.sim.balanceAtVoyage) / Math.max(1, result.sim.daysOfRunway)
      : 0
  );
</script>

<section class="sticky-results">
  <div class="frame-top" aria-hidden="true"></div>

  <div class="grid">
    <div class="kpi-block">
      <div class="kpi-label">
        <span class="dot" aria-hidden="true"></span>
        {$_('results.leftOnVoyage')} · {formatDate(inputs.voyageDate, app.ui.language)}
      </div>
      <div class="kpi-value number">
        {formatRub($balance, app.ui.language)}<span class="cursor" aria-hidden="true"></span>
      </div>
      <div class="kpi-sub">
        ≈ {formatUsd(usdEquiv, app.ui.language)} @ {inputs.rubPerUsd} ₽/$
        <span class="sep">·</span>
        {#if result.sim.runsOutOn}
          <span class="danger">{$_('results.runsOut').toLowerCase()}: {formatDate(result.sim.runsOutOn, app.ui.language)}</span>
        {:else}
          <span class="ok">{$_('results.ok').toLowerCase()}</span>
        {/if}
      </div>
    </div>

    <div class="stats">
      <div class="stat-row">
        <span class="stat-key">{$_('results.runway')}</span>
        <span class="stat-dots"></span>
        <span class="number">{$_('results.daysUnit', { values: { n: result.sim.daysOfRunway } })}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">{$_('results.burnPerDay')}</span>
        <span class="stat-dots"></span>
        <span class="number">{formatRub(burnPerDay, app.ui.language)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">{$_('results.yield')}</span>
        <span class="stat-dots"></span>
        <span class="number ok">+ {formatRub(result.expectedYieldMid, app.ui.language)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">{$_('results.spent')}</span>
        <span class="stat-dots"></span>
        <span class="number">{formatRub(result.sim.totalSpentRub, app.ui.language)}</span>
      </div>
    </div>
  </div>

  <div class="frame-bot" aria-hidden="true"></div>
</section>

<style>
  .sticky-results {
    position: sticky;
    top: 0;
    z-index: 5;
    margin-top: var(--gap-5);
    background: var(--surface-2);
    border: 1px solid var(--amber);
    padding: var(--gap-4) var(--gap-5);
    box-shadow: 0 1px 0 var(--amber-soft);
  }
  .frame-top, .frame-bot {
    height: 1px;
    margin: 0 -1px;
    background: repeating-linear-gradient(90deg, var(--amber) 0 6px, transparent 6px 10px);
    opacity: 0.5;
  }
  .frame-top { margin-bottom: var(--gap-4); }
  .frame-bot { margin-top: var(--gap-4); }
  .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--gap-6); }
  @media (max-width: 620px) { .grid { grid-template-columns: 1fr; gap: var(--gap-4); } }
  .kpi-label { font-size: var(--t-mini); color: var(--muted); letter-spacing: 0.20em; text-transform: uppercase; display: flex; align-items: center; gap: var(--gap-2); }
  .dot { width: 6px; height: 6px; background: var(--amber); border-radius: 50%; box-shadow: 0 0 8px var(--amber); animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .kpi-value { font-size: var(--t-3xl); line-height: 1; font-weight: 700; letter-spacing: -0.02em; color: var(--amber); margin: var(--gap-2) 0 var(--gap-2); }
  .cursor { display: inline-block; width: 0.55em; height: 1em; background: var(--amber); margin-left: 0.18em; vertical-align: -0.15em; animation: blink 1.2s steps(2) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .kpi-sub { font-size: var(--t-small); color: var(--muted); letter-spacing: 0.02em; }
  .kpi-sub .sep { margin: 0 var(--gap-2); color: var(--label); }
  .ok { color: var(--ok); }
  .danger { color: var(--danger); }
  .stats { display: flex; flex-direction: column; gap: var(--gap-2); align-self: center; }
  .stat-row { display: grid; grid-template-columns: auto 1fr auto; align-items: baseline; gap: var(--gap-2); font-size: var(--t-small); }
  .stat-key { color: var(--muted); text-transform: uppercase; letter-spacing: 0.14em; font-size: var(--t-mini); }
  .stat-dots { border-bottom: 1px dotted var(--border-3); height: 1em; }
</style>
