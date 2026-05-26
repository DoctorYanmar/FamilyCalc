<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import { currencySymbol } from '../../lib/calc/currencies';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../controls/CurrencyInput.svelte';

  const inputs = $derived(activeInputs());
  const dailyRate = $derived(inputs.monthlyFamilyRub / 30.4375);

  function setMonthly(v: number) { inputs.monthlyFamilyRub = v; persistSoon(); }
</script>

<CollapsibleCard title={$_('expenses.title')} dataTour="expenses">
  <CurrencyInput label={$_('expenses.monthly', { values: { symbol: currencySymbol(inputs.localCurrency) } })} value={inputs.monthlyFamilyRub} onChange={setMonthly} suffix={currencySymbol(inputs.localCurrency) + '/mo'} />
  <div class="field">
    <span class="field-key">
      {$_('expenses.daily')}
      <span class="hint">{$_('expenses.dailyHint')}</span>
    </span>
    <span class="input-wrap">
      <input class="input with-suffix" type="text" readonly value={Math.round(dailyRate).toLocaleString()} />
      <span class="suffix">{currencySymbol(inputs.localCurrency) + '/d'}</span>
    </span>
  </div>
</CollapsibleCard>
