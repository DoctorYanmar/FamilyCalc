<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { formatRub, formatDate } from '../../../lib/format';
  import { templateById } from '../../../lib/calc/savingsTemplates';
  import { maturityDate, accruedValue } from '../../../lib/calc/savings';
  import type { SavingsInstrument, Compounding } from '../../../lib/calc/types';

  type Props = {
    instrument: SavingsInstrument;
    voyageDate: string;
    onDelete: () => void;
  };

  const { instrument, voyageDate, onDelete }: Props = $props();

  const template = $derived(templateById(instrument.templateId));
  const todayISO = new Date().toISOString().slice(0, 10);

  const matDate = $derived(maturityDate(instrument));
  const voyage = $derived(new Date(voyageDate + 'T00:00:00Z'));

  const valueAtVoyage = $derived(accruedValue(instrument, voyage));
  const interestAtVoyage = $derived(Math.max(0, valueAtVoyage - instrument.amountRub));

  const statusKey = $derived.by(() => {
    if (matDate === null) return 'none';
    const m = matDate.toISOString().slice(0, 10);
    if (m <= todayISO) return 'maturedAt';
    if (matDate.getTime() <= voyage.getTime()) return 'maturesAt';
    return 'earlyWithdraw';
  });

  function setName(v: string)         { instrument.name = v; persistSoon(); }
  function setAmount(v: string)       { const n = Number(v); if (!Number.isNaN(n) && n >= 0) { instrument.amountRub = n; persistSoon(); } }
  function setRate(v: string)         { const n = Number(v); if (!Number.isNaN(n) && n >= 0 && n <= 50) { instrument.annualRatePct = +n.toFixed(2); persistSoon(); } }
  function setStart(v: string)        { if (v <= todayISO) { instrument.startDate = v; persistSoon(); } }
  function setTerm(v: string) {
    if (v === 'open') { instrument.termMonths = null; persistSoon(); return; }
    const n = Number(v);
    if (!Number.isNaN(n) && n > 0) {
      const candidateEnd = new Date(instrument.startDate + 'T00:00:00Z').getTime() + Math.round(n * 30.4375) * 86_400_000;
      if (candidateEnd > new Date(todayISO + 'T00:00:00Z').getTime()) {
        instrument.termMonths = n;
        persistSoon();
      }
    }
  }
  function setCompounding(v: string)  { instrument.compounding = v as Compounding; persistSoon(); }
  function toggleEnabled()            { instrument.enabled = !instrument.enabled; persistSoon(); }

  const termOptions = [3, 6, 12, 18, 24, 36];
  const termValueAttr = $derived(instrument.termMonths === null ? 'open' : String(instrument.termMonths));
</script>

<article class="inst-row" class:disabled={!instrument.enabled}>
  <header class="inst-head">
    <input class="input inst-name" type="text" value={instrument.name} oninput={(e) => setName((e.target as HTMLInputElement).value)} aria-label={$_('savings.instrument.name')} />
    <span class="inst-actions">
      <span class="toggle-cb" role="switch" tabindex="0" aria-checked={instrument.enabled} aria-label={$_('savings.instrument.enabled')} class:on={instrument.enabled}
            onclick={toggleEnabled}
            onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleEnabled(); } }}></span>
      <button type="button" class="btn ghost danger" onclick={onDelete} aria-label={$_('savings.instrument.delete')}>✕</button>
    </span>
  </header>

  <div class="inst-fields">
    <label class="field">
      <span class="field-key">{$_('savings.instrument.amount')}</span>
      <span class="input-wrap">
        <input class="input with-suffix" type="number" inputmode="decimal" min="0" step="any"
               value={instrument.amountRub === 0 ? '' : instrument.amountRub}
               placeholder="0"
               oninput={(e) => setAmount((e.target as HTMLInputElement).value)} />
        <span class="suffix">₽</span>
      </span>
    </label>
    <label class="field">
      <span class="field-key">{$_('savings.instrument.rate')}</span>
      <span class="input-wrap">
        <input class="input with-suffix" type="number" inputmode="decimal" min="0" max="50" step="0.25"
               value={instrument.annualRatePct}
               oninput={(e) => setRate((e.target as HTMLInputElement).value)} />
        <span class="suffix">%</span>
      </span>
    </label>
    <label class="field">
      <span class="field-key">{$_('savings.instrument.startDate')}</span>
      <input class="input date" type="date" value={instrument.startDate} max={todayISO}
             oninput={(e) => setStart((e.target as HTMLInputElement).value)} />
    </label>
    <label class="field">
      <span class="field-key">{$_('savings.instrument.term')}</span>
      <select class="input" disabled={template.termFixed} value={termValueAttr} onchange={(e) => setTerm((e.target as HTMLSelectElement).value)}>
        <option value="open">{$_('savings.instrument.termOpen')}</option>
        {#each termOptions as m}
          <option value={String(m)}>{m} {$_('savings.instrument.termCustomLabel')}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span class="field-key">{$_('savings.instrument.compounding')}</span>
      <select class="input" value={instrument.compounding} onchange={(e) => setCompounding((e.target as HTMLSelectElement).value)}>
        <option value="daily">{$_('savings.instrument.compoundingDaily')}</option>
        <option value="monthly">{$_('savings.instrument.compoundingMonthly')}</option>
        <option value="at-maturity">{$_('savings.instrument.compoundingAtMaturity')}</option>
      </select>
    </label>
  </div>

  <footer class="inst-status">
    {#if instrument.amountRub > 0 && instrument.annualRatePct > 0}
      <span class="chip accrued">{$_('savings.status.accrued', { values: { amount: formatRub(interestAtVoyage, app.ui.language) } })}</span>
    {/if}
    {#if statusKey === 'maturedAt'}
      <span class="chip gray">{$_('savings.status.maturedAt')}</span>
    {:else if statusKey === 'maturesAt' && matDate}
      <span class="chip green">{$_('savings.status.maturesAt', { values: { date: formatDate(matDate.toISOString().slice(0, 10), app.ui.language) } })}</span>
    {:else if statusKey === 'earlyWithdraw' && matDate}
      <span class="chip amber">{$_('savings.status.earlyWithdraw', { values: { date: formatDate(matDate.toISOString().slice(0, 10), app.ui.language) } })}</span>
    {/if}
  </footer>
</article>

<style>
  .inst-row { border: 1px solid var(--border); border-radius: 8px; padding: var(--gap-4); background: var(--surface); display: grid; gap: 0; }
  .inst-row.disabled { opacity: 0.55; }
  .inst-head { display: flex; align-items: center; gap: var(--gap-3); justify-content: space-between; padding-bottom: var(--gap-3); border-bottom: 1px solid var(--border); }
  .inst-name { flex: 1; min-width: 0; font-weight: 600; text-align: left; }
  .inst-actions { display: inline-flex; gap: var(--gap-2); align-items: center; flex-shrink: 0; }
  .inst-fields { display: grid; }
  .inst-status { display: flex; flex-wrap: wrap; gap: var(--gap-2); padding-top: var(--gap-3); border-top: 1px solid var(--border); }
  .chip { padding: 2px 8px; border-radius: 999px; font-size: var(--t-sm); font-family: var(--mono); border: 1px solid var(--border-soft); }
  .chip.accrued { color: var(--accent); border-color: var(--accent); }
  .chip.gray { color: var(--fg-3); }
  .chip.green { color: var(--accent); border-color: var(--accent); }
  .chip.amber { color: var(--warn); border-color: var(--warn); }
</style>
