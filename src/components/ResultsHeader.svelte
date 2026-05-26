<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../lib/state/scenarios.svelte';
  import { currentResult } from '../lib/state/derived';
  import { formatLocal, formatDate } from '../lib/format';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  const onTrack = $derived(result.sim.runsOutOn === null);
  const daysToVoyage = $derived(Math.max(0, result.sim.days.length - 1));
  const monthlyExpenses = $derived(inputs.monthlyFamilyRub);
</script>

<!-- Status sub-bar -->
<div class="subbar">
  <div class="subbar-group">
    {#if onTrack}
      <span class="status-pill"><span class="dot"></span>{$_('status.onTrack')}</span>
    {:else}
      <span class="status-pill danger"><span class="dot"></span>{$_('status.offTrack')}</span>
    {/if}
    <span class="subbar-meta">
      <strong>{formatDate(inputs.voyageDate, app.ui.language)}</strong>
      · {$_('status.daysFromNow', { values: { n: daysToVoyage } })}
    </span>
  </div>
</div>

<!-- KPI strip -->
<div class="kpis">
  <div class="kpi hero">
    <div class="kpi-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      {$_('kpis.balanceAtVoyage')}
    </div>
    <div class="kpi-val">{formatLocal(result.balanceAtVoyage, app.ui.language, inputs.localCurrency)}</div>
    <div class="kpi-sub">
      <span>{$_('kpis.onDate')} {formatDate(inputs.voyageDate, app.ui.language)}</span>
    </div>
  </div>
  <div class="kpi">
    <div class="kpi-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      {$_('kpis.runway')}
    </div>
    <div class="kpi-val">{$_('results.daysUnit', { values: { n: result.sim.daysOfRunway } })}</div>
    <div class="kpi-sub">
      {#if result.sim.runsOutOn}
        <span>{$_('kpis.drainsOn')} {formatDate(result.sim.runsOutOn, app.ui.language)}</span>
      {:else}
        <span class="delta">{$_('kpis.notDraining')}</span>
      {/if}
    </div>
  </div>
  <div class="kpi">
    <div class="kpi-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      {$_('kpis.monthlyExpenses')}
    </div>
    <div class="kpi-val">{formatLocal(monthlyExpenses, app.ui.language, inputs.localCurrency)}</div>
    <div class="kpi-sub"><span>{$_('kpis.perMonth')}</span></div>
  </div>
</div>
