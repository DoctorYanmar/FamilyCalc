<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../../controls/CurrencyInput.svelte';
  import DateInput from '../../controls/DateInput.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatDate } from '../../../lib/format';
  import { app } from '../../../lib/state/scenarios.svelte';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  function onFreeCash(n: number) { inputs.freeCashRub = n; persistSoon(); }
  function onCbr(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.cbrKeyRatePct = n;
      inputs.cbrRateUpdatedAt = new Date().toISOString().slice(0, 10);
      persistSoon();
    }
  }
  function onHorizon(iso: string) { inputs.horizonDate = iso; persistSoon(); }
  function onYield(e: Event) {
    inputs.includeExpectedYield = (e.target as HTMLInputElement).checked;
    persistSoon();
  }
</script>

<CollapsibleCard title={$_('savings.inputs.title')}>
  <CurrencyInput
    label={$_('savings.inputs.freeCash')}
    value={inputs.freeCashRub}
    onChange={onFreeCash}
  />

  <label class="field">
    <span>
      <span class="field-key">{$_('savings.inputs.cbrRate')}</span>
      <span class="field-hint" title={$_('savings.inputs.cbrTooltip')}>
        ⓘ {$_('savings.inputs.cbrUpdated')}: {formatDate(inputs.cbrRateUpdatedAt, app.ui.language)}
      </span>
    </span>
    <input
      class="input"
      type="number"
      inputmode="decimal"
      min="0"
      max="30"
      step="0.1"
      value={inputs.cbrKeyRatePct}
      oninput={onCbr}
    />
  </label>

  <p class="regime-tag">{$_(`savings.regime.${result.alloc.regime}`)}</p>

  <DateInput
    label={$_('savings.inputs.horizon')}
    value={inputs.horizonDate}
    onChange={onHorizon}
  />

  <label class="toggle">
    <input type="checkbox" checked={inputs.includeExpectedYield} onchange={onYield} />
    <span>{$_('savings.inputs.includeYield')}</span>
  </label>
</CollapsibleCard>

<style>
  .regime-tag {
    color: var(--amber);
    font-size: var(--t-mini);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: var(--gap-1) 0 0;
  }
  .toggle {
    display: flex; gap: var(--gap-2); align-items: center;
    color: var(--muted); font-size: var(--t-small);
    margin-top: var(--gap-2);
  }
  .toggle input { accent-color: var(--amber); }
</style>
