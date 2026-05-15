<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../lib/state/scenarios';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../controls/CurrencyInput.svelte';
  import { formatRub } from '../../lib/format';

  const inputs = $derived(activeInputs());

  const monthsOfLeave = $derived(() => {
    const start = new Date();
    const end = new Date(inputs.voyageDate + 'T00:00:00Z');
    const days = Math.max(0, (end.getTime() - start.getTime()) / 86_400_000);
    return days / 30.4375;
  });

  const totalOver = $derived(monthsOfLeave() * inputs.monthlyFamilyRub);

  function setMonthly(v: number) { inputs.monthlyFamilyRub = v; persistSoon(); }
</script>

<CollapsibleCard
  title={$_('expenses.title')}
  subtitle={`${$_('expenses.totalOverLeave')}: ${formatRub(totalOver, app.ui.language)}`}>
  <CurrencyInput label={$_('expenses.monthly')} value={inputs.monthlyFamilyRub} onChange={setMonthly} suffix="₽" />
</CollapsibleCard>
