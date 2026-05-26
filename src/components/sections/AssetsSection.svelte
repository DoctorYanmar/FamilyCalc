<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import { currencySymbol } from '../../lib/calc/currencies';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../controls/CurrencyInput.svelte';

  const inputs = $derived(activeInputs());

  function setRubBank(v: number) { inputs.assets.rubBank = v; persistSoon(); }
  function setUsdBank(v: number) { inputs.assets.usdBank = v; persistSoon(); }
  function setUsdCash(v: number) { inputs.assets.usdCash = v; persistSoon(); }
  function setSalaryLump(v: number) { inputs.salaryLumpSumUsd = v; persistSoon(); }
</script>

<CollapsibleCard title={$_('assets.title')} dataTour="assets">
  <CurrencyInput label={$_('assets.rubBank', { values: { symbol: currencySymbol(inputs.localCurrency) } })} value={inputs.assets.rubBank} onChange={setRubBank} suffix={currencySymbol(inputs.localCurrency)} />
  <CurrencyInput label={$_('assets.usdBank')} value={inputs.assets.usdBank} onChange={setUsdBank} suffix="$" />
  <CurrencyInput label={$_('assets.usdCash')} value={inputs.assets.usdCash} onChange={setUsdCash} suffix="$" />
  <CurrencyInput label={$_('assets.salaryLumpSum')} value={inputs.salaryLumpSumUsd} onChange={setSalaryLump} suffix="$" />
</CollapsibleCard>
