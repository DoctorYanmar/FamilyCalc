<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../../lib/state/scenarios.svelte';
  import { currentResult } from '../../lib/state/derived';
  import { formatLocal } from '../../lib/format';
  import { currencySymbol } from '../../lib/calc/currencies';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  const daysToVoyage = $derived(Math.max(0, result.sim.days.length - 1));
  const totalRubEquiv = $derived(
    inputs.assets.rubBank +
    inputs.assets.usdBank * inputs.rubPerUsd +
    inputs.assets.usdCash * inputs.rubPerUsd
  );
  const totalSpent = $derived(result.sim.totalSpentRub);
  const netAtVoyage = $derived(result.balanceAtVoyage);
</script>

<section class="card">
  <div class="card-head">
    <div class="card-title">{$_('summary.title')}</div>
    <div class="card-meta">{$_('summary.meta')}</div>
  </div>
  <div class="card-body">
    <div class="field">
      <span class="field-key">{$_('summary.daysToVoyage')}</span>
      <span class="number">{$_('results.daysUnit', { values: { n: daysToVoyage } })}</span>
    </div>
    <div class="field">
      <span class="field-key">{$_('summary.totalAssetsRub', { values: { symbol: currencySymbol(inputs.localCurrency) } })}</span>
      <span class="number">{formatLocal(totalRubEquiv, app.ui.language, inputs.localCurrency)}</span>
    </div>
    <div class="field">
      <span class="field-key">{$_('summary.outflowWindow')}</span>
      <span class="number">{formatLocal(totalSpent, app.ui.language, inputs.localCurrency)}</span>
    </div>
    <div class="field">
      <span class="field-key">{$_('summary.netAtVoyage')}</span>
      <span class="number" style="color: var(--accent); font-weight: 600;">{formatLocal(netAtVoyage, app.ui.language, inputs.localCurrency)}</span>
    </div>
  </div>
</section>
