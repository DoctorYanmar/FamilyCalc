<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../lib/state/scenarios';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import DateInput from '../controls/DateInput.svelte';
  import CurrencyInput from '../controls/CurrencyInput.svelte';

  const inputs = $derived(activeInputs());

  function setReturn(v: string) { inputs.returnDate = v; persistSoon(); }
  function setVoyage(v: string) { inputs.voyageDate = v; persistSoon(); }
  function setLump(v: number)  { inputs.salaryLumpSumUsd = v; persistSoon(); }
  function setRate(v: number)  { inputs.rubPerUsd = v; persistSoon(); }
  function bumpRate(delta: number) { inputs.rubPerUsd = Math.max(0, inputs.rubPerUsd + delta); persistSoon(); }
</script>

<CollapsibleCard title={$_('context.title')}>
  <DateInput label={$_('context.returnDate')} value={inputs.returnDate} onChange={setReturn} />
  <DateInput label={$_('context.voyageDate')} value={inputs.voyageDate} onChange={setVoyage} />
  <CurrencyInput label={$_('context.lumpSum')} hint="informational · already in assets"
                  value={inputs.salaryLumpSumUsd} onChange={setLump} suffix="$" />
  <div class="field">
    <span class="field-key">{$_('context.rate')}<span class="field-hint">tap −/+ to compare</span></span>
    <div class="rate-stepper">
      <button class="btn" type="button" onclick={() => bumpRate(-0.5)}>−</button>
      <input class="input" type="number" step="0.1" min="0" value={inputs.rubPerUsd}
             oninput={(e) => setRate(Number((e.target as HTMLInputElement).value))} />
      <button class="btn" type="button" onclick={() => bumpRate(0.5)}>+</button>
    </div>
  </div>
</CollapsibleCard>

<style>
  .rate-stepper { display: inline-flex; align-items: stretch; gap: 0; }
  .rate-stepper .btn { padding: 0 10px; border-right: 0; }
  .rate-stepper .btn:last-child { border-right: 1px solid var(--border-2); border-left: 0; }
  .rate-stepper .input { min-width: 90px; max-width: 110px; text-align: center; }
</style>
