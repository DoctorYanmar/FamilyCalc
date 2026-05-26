<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import { CURRENCIES, currencySymbol } from '../../lib/calc/currencies';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import DateInput from '../controls/DateInput.svelte';

  const inputs = $derived(activeInputs());

  function bumpRate(d: number) {
    const next = +(inputs.rubPerUsd + d).toFixed(2);
    if (next >= 1 && next <= 500) {
      inputs.rubPerUsd = next;
      persistSoon();
    }
  }

  function setRate(v: string) {
    const n = Number(v);
    if (!Number.isNaN(n) && n >= 1 && n <= 500) {
      inputs.rubPerUsd = +n.toFixed(2);
      persistSoon();
    }
  }

  function setVoyage(v: string) { inputs.voyageDate = v; persistSoon(); }
  function setReturn(v: string) { inputs.returnDate = v; persistSoon(); }

  function setCurrency(e: Event) {
    inputs.localCurrency = (e.target as HTMLSelectElement).value;
    persistSoon();
  }
</script>

<CollapsibleCard title={$_('context.title')}>
  <DateInput label={$_('context.returnDate')} value={inputs.returnDate} onChange={setReturn} />
  <DateInput label={$_('context.voyageDate')} value={inputs.voyageDate} onChange={setVoyage} />
  <label class="field">
    <span class="field-key">{$_('context.currency')}</span>
    <select class="select" value={inputs.localCurrency} onchange={setCurrency}>
      {#each CURRENCIES as c (c.code)}
        <option value={c.code}>{c.symbol} {app.ui.language === 'ru' ? c.nameRu : c.name}</option>
      {/each}
    </select>
  </label>
  <div class="field">
    <span class="field-key">{$_('context.rate', { values: { code: inputs.localCurrency, symbol: currencySymbol(inputs.localCurrency) } })}</span>
    <div class="stepper" role="group" aria-label={$_('context.rate')}>
      <button type="button" onclick={() => bumpRate(-0.5)} aria-label="-0.5">−</button>
      <input class="stepper-val" type="number" inputmode="decimal" step="0.01" min="1" max="500"
             value={inputs.rubPerUsd}
             oninput={(e) => setRate((e.target as HTMLInputElement).value)} />
      <button type="button" onclick={() => bumpRate(0.5)} aria-label="+0.5">+</button>
    </div>
  </div>
</CollapsibleCard>

<style>
  .field > :global(.select) {
    width: 180px;
    text-align: center;
  }
  .stepper > .stepper-val {
    all: unset;
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    padding: 8px 14px;
    font-family: var(--mono);
    font-size: var(--t-med);
    color: var(--fg);
    font-variant-numeric: tabular-nums;
    min-width: 90px;
    max-width: 110px;
    text-align: center;
    background: transparent;
    box-sizing: border-box;
    /* iOS auto-zoom workaround — at this widget's small size we accept the
       inherited 14px font from .stepper-val above; iOS still won't zoom
       because the widget itself is wider than the standard .input. */
  }
  /* On phones the .stepper wrapper goes full-width (global rule). The desktop
     max-width of 110px would then clamp the value column while the buttons
     flex-grow to fill the rest, making the buttons look much larger than the
     input. Drop the clamp on phones so the input absorbs the available width
     and the ± buttons stay at their min tap-target size (44px). */
  @media (max-width: 480px) {
    .stepper > .stepper-val {
      flex: 1 1 0%;
      max-width: none;
      width: auto;
    }
  }
</style>
