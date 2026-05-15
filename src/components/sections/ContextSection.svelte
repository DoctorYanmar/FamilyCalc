<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
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
</script>

<CollapsibleCard title={$_('context.title')}>
  <DateInput label={$_('context.returnDate')} value={inputs.returnDate} onChange={setReturn} />
  <DateInput label={$_('context.voyageDate')} value={inputs.voyageDate} onChange={setVoyage} />
  <div class="field">
    <span class="field-key">{$_('context.rate')}</span>
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
  /* The .stepper-val is a span in global.css; here it's an <input> so we have
     to reset native input chrome and re-apply the visual rhythm. The .stepper
     wrapper enforces the widget sizing (no user-config width on the input). */
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
    /* iOS auto-zoom workaround — at this widget's small size we accept the
       inherited 14px font from .stepper-val above; iOS still won't zoom
       because the widget itself is wider than the standard .input. */
  }
</style>
