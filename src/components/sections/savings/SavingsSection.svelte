<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';
  import { templateById } from '../../../lib/calc/savingsTemplates';
  import type { SavingsInstrument, SavingsTemplateId } from '../../../lib/calc/types';
  import AddInstrumentPicker from './AddInstrumentPicker.svelte';
  import InstrumentRow from './InstrumentRow.svelte';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  let pickerOpen = $state(false);

  function newId(): string {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'id-' + Math.random().toString(36).slice(2);
  }

  function todayISO(): string { return new Date().toISOString().slice(0, 10); }

  function addInstrument(templateId: SavingsTemplateId) {
    const t = templateById(templateId);
    const inst: SavingsInstrument = {
      id: newId(),
      name: ($_(`savings.templates.${templateId}.name`) as unknown as string) ?? templateId,
      templateId,
      amountRub: 0,
      annualRatePct: 0,
      startDate: todayISO(),
      termMonths: t.defaultTermMonths,
      compounding: t.defaultCompounding,
      enabled: true,
    };
    inputs.savingsInstruments = [...inputs.savingsInstruments, inst];
    pickerOpen = false;
    persistSoon();
  }

  function deleteInstrument(id: string) {
    inputs.savingsInstruments = inputs.savingsInstruments.filter(i => i.id !== id);
    persistSoon();
  }

  function toggleIncludeYield() {
    inputs.includeExpectedYield = !inputs.includeExpectedYield;
    persistSoon();
  }
</script>

<section class="card">
  <header class="card-head">
    <h2>{$_('savings.title')}</h2>
  </header>

  {#if inputs.savingsInstruments.length === 0}
    <div class="zero">
      <p class="zero-body">{$_('savings.zeroState.body')}</p>
      <button type="button" class="btn primary" onclick={() => (pickerOpen = true)}>{$_('savings.zeroState.add')}</button>
      {#if pickerOpen}
        <div class="picker-wrap">
          <AddInstrumentPicker onAdd={addInstrument} onCancel={() => (pickerOpen = false)} />
        </div>
      {/if}
    </div>
  {:else}
    <div class="inst-list">
      {#each inputs.savingsInstruments as instrument (instrument.id)}
        <InstrumentRow {instrument} voyageDate={inputs.voyageDate} onDelete={() => deleteInstrument(instrument.id)} />
      {/each}
    </div>

    {#if pickerOpen}
      <div class="picker-wrap">
        <AddInstrumentPicker onAdd={addInstrument} onCancel={() => (pickerOpen = false)} />
      </div>
    {:else}
      <button type="button" class="btn" onclick={() => (pickerOpen = true)}>{$_('savings.zeroState.add')}</button>
    {/if}

    <footer class="sav-foot">
      <span class="toggle-label" role="switch" tabindex="0"
            aria-checked={inputs.includeExpectedYield}
            aria-label={$_('savings.footer.includeYield')}
            onclick={toggleIncludeYield}
            onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleIncludeYield(); } }}>
        <span class="toggle-cb" class:on={inputs.includeExpectedYield} aria-hidden="true"></span>
        <span>{$_('savings.footer.includeYield')}</span>
      </span>
      <span class="totals">
        <span>{$_('savings.totals.parked', { values: { amount: formatRub(result.sim.totalPrincipalRub, app.ui.language) } })}</span>
        <span class="dot">·</span>
        <span class="accent">{$_('savings.totals.accrued', { values: { amount: formatRub(result.sim.totalAccruedInterestRub, app.ui.language) } })}</span>
      </span>
    </footer>
  {/if}
</section>

<style>
  .zero { display: grid; gap: var(--gap-3); padding: 0 var(--gap-4); }
  .zero-body { color: var(--fg-2); line-height: 1.5; margin: 0; }
  .inst-list { display: grid; gap: var(--gap-3); margin-bottom: var(--gap-3); }
  .picker-wrap { margin: var(--gap-3) 0; }
  .sav-foot { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--gap-3); margin: var(--gap-4) var(--gap-4) 0; padding-top: var(--gap-3); border-top: 1px solid var(--border-soft); }
  .totals { font-family: var(--mono); color: var(--fg-2); display: inline-flex; gap: var(--gap-2); align-items: center; }
  .totals .accent { color: var(--accent); font-weight: 600; }
  .totals .dot { color: var(--fg-3); }
</style>
