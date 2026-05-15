<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../controls/CurrencyInput.svelte';
  import { formatRub } from '../../lib/format';

  const inputs = $derived(activeInputs());
  const totalRub = $derived(
    inputs.assets.rubBank + inputs.assets.usdBank * inputs.rubPerUsd + inputs.assets.usdCash * inputs.rubPerUsd
  );

  function setUsdBank(v: number) { inputs.assets.usdBank = v; persistSoon(); }
  function setUsdCash(v: number) { inputs.assets.usdCash = v; persistSoon(); }
  function setRubBank(v: number) { inputs.assets.rubBank = v; persistSoon(); }
</script>

<CollapsibleCard title={$_('assets.title')} subtitle={formatRub(totalRub, app.ui.language)}>
  <CurrencyInput label={$_('assets.usdBank')} value={inputs.assets.usdBank} onChange={setUsdBank} suffix="$" />
  <CurrencyInput label={$_('assets.usdCash')} value={inputs.assets.usdCash} onChange={setUsdCash} suffix="$" />
  <CurrencyInput label={$_('assets.rubBank')} value={inputs.assets.rubBank} onChange={setRubBank} suffix="₽" />
</CollapsibleCard>
