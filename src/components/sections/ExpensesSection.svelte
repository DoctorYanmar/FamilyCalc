<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../controls/CurrencyInput.svelte';

  const inputs = $derived(activeInputs());
  const dailyRate = $derived(inputs.monthlyFamilyRub / 30.4375);

  function setMonthly(v: number) { inputs.monthlyFamilyRub = v; persistSoon(); }
</script>

<CollapsibleCard title={$_('expenses.title')}>
  <CurrencyInput label={$_('expenses.monthly')} value={inputs.monthlyFamilyRub} onChange={setMonthly} suffix="₽/mo" />
  <div class="field">
    <span class="field-key">
      {$_('expenses.daily')}
      <span class="hint">{$_('expenses.dailyHint')}</span>
    </span>
    <span class="input-wrap">
      <input class="input with-suffix" type="text" readonly value={Math.round(dailyRate).toLocaleString()} />
      <span class="suffix">₽/d</span>
    </span>
  </div>
</CollapsibleCard>
