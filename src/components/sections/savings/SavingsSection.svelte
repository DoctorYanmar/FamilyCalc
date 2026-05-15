<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatDate } from '../../../lib/format';
  import CollapsibleCard from '../../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../../controls/CurrencyInput.svelte';
  import DateInput from '../../controls/DateInput.svelte';
  import LayerCard from './LayerCard.svelte';
  import TaxBanner from './TaxBanner.svelte';
  import SavingsDisclaimer from './SavingsDisclaimer.svelte';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const hasCash = $derived(inputs.freeCashRub > 0);

  function setFreeCash(v: number) { inputs.freeCashRub = v; persistSoon(); }
  function onCbr(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.cbrKeyRatePct = n;
      inputs.cbrRateUpdatedAt = new Date().toISOString().slice(0, 10);
      persistSoon();
    }
  }
  function setHorizon(v: string) { inputs.horizonDate = v; persistSoon(); }
  function onYieldToggle(e: Event) {
    inputs.includeExpectedYield = (e.target as HTMLInputElement).checked;
    persistSoon();
  }
</script>

<CollapsibleCard title={$_('savings.title')} subtitle={$_(`savings.regime.${result.alloc.regime}`)}>
  <CurrencyInput
    label={$_('savings.inputs.freeCash')}
    value={inputs.freeCashRub}
    onChange={setFreeCash}
    suffix="₽"
  />

  <div class="field">
    <span class="field-key">
      {$_('savings.inputs.cbrRate')}
      <span class="field-hint" title={$_('savings.inputs.cbrTooltip')}>
        ⓘ {$_('savings.inputs.cbrUpdated')} {formatDate(inputs.cbrRateUpdatedAt, app.ui.language)}
      </span>
    </span>
    <span class="cbr-row">
      <span class="regime-pill regime-{result.alloc.regime}">{result.alloc.regime}</span>
      <input
        class="input"
        type="number" inputmode="decimal" min="0" max="30" step="0.1"
        value={inputs.cbrKeyRatePct}
        oninput={onCbr}
      />
    </span>
  </div>

  <DateInput
    label={$_('savings.inputs.horizon')}
    value={inputs.horizonDate}
    onChange={setHorizon}
  />

  <div class="rule"></div>

  {#if !hasCash}
    <div class="empty-state">
      <span class="empty-arrow">▴</span>
      <span class="empty-text">{$_('savings.emptyState')}</span>
    </div>
  {:else}
    <div class="layers">
      <LayerCard layer="A" />
      <LayerCard layer="B" />
      <LayerCard layer="C" />
    </div>
  {/if}

  <div class="rule"></div>

  <TaxBanner />

  <label class="field toggle-field">
    <span class="field-key">{$_('savings.inputs.includeYield')}</span>
    <input type="checkbox" class="toggle-cb" checked={inputs.includeExpectedYield} onchange={onYieldToggle} />
  </label>

  <SavingsDisclaimer />
</CollapsibleCard>

<style>
  /* CBR row: regime pill + standard-width input, right-aligned like every other field */
  .cbr-row {
    display: inline-flex;
    align-items: center;
    gap: var(--gap-2);
  }
  .regime-pill {
    font-size: var(--t-micro);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 4px 8px;
    border: 1px solid currentColor;
    line-height: 1;
    white-space: nowrap;
  }
  .regime-high     { color: var(--amber); }
  .regime-moderate { color: var(--ok); }
  .regime-low      { color: var(--info); }

  /* Section divider between input rows and layer rows */
  .rule {
    height: 1px;
    background: repeating-linear-gradient(90deg, var(--border-2) 0 6px, transparent 6px 10px);
    margin: var(--gap-4) 0 var(--gap-2);
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--gap-2);
    padding: var(--gap-8) var(--gap-4);
    color: var(--muted);
    text-align: center;
  }
  .empty-arrow {
    color: var(--amber);
    font-size: var(--t-lg);
    animation: bob 1.6s ease-in-out infinite;
  }
  @keyframes bob {
    0%, 100% { transform: translateY(-2px); }
    50%      { transform: translateY(-8px); }
  }
  .empty-text {
    font-size: var(--t-small);
    letter-spacing: 0.06em;
    max-width: 360px;
  }

  .layers { display: flex; flex-direction: column; }

  /* Toggle row: align checkbox to the same right edge as every other input */
  .toggle-field { cursor: pointer; }
  .toggle-cb {
    accent-color: var(--amber);
    width: 16px;
    height: 16px;
    margin: 0;
  }
</style>
