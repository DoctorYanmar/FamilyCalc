<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeScenario, activeInputs } from '../lib/state/scenarios.svelte';
  import { currentResult } from '../lib/state/derived';
  import { formatRub, formatUsd, formatDate } from '../lib/format';

  const lang = $derived(app.ui.language);
  const inputs = $derived(activeInputs());
  const sc = $derived(activeScenario());
  const r = $derived(currentResult());
  const totalAssetsRub = $derived(
    inputs.assets.rubBank + inputs.assets.usdBank * inputs.rubPerUsd + inputs.assets.usdCash * inputs.rubPerUsd
  );
</script>

<div class="print-only print-view">
  <h1>{$_('pdf.title')}</h1>
  <div class="meta">
    {$_('pdf.scenario')}: <b>{sc.name}</b> · {$_('pdf.preparedOn')} {formatDate(new Date().toISOString().slice(0,10), lang)}
  </div>

  <section>
    <h2>{$_('results.leftOnVoyage')}</h2>
    <p class="big">{formatRub(r.balanceAtVoyage, lang)} <span class="muted">(≈ {formatUsd(r.balanceAtVoyage / inputs.rubPerUsd, lang)})</span></p>
    <p>{$_('results.runway')}: {$_('results.daysUnit', { values: { n: r.sim.daysOfRunway } })}</p>
    <p>
      {$_('results.runsOut')}:
      {#if r.sim.runsOutOn}<b>{formatDate(r.sim.runsOutOn, lang)}</b>{:else}{$_('results.ok')}{/if}
    </p>
  </section>

  <section>
    <h2>{$_('context.title')}</h2>
    <p>{$_('context.returnDate')}: {formatDate(inputs.returnDate, lang)}</p>
    <p>{$_('context.voyageDate')}: {formatDate(inputs.voyageDate, lang)}</p>
    <p>{$_('context.lumpSum')}: {formatUsd(inputs.salaryLumpSumUsd, lang)}</p>
    <p>{$_('context.rate')}: {inputs.rubPerUsd}</p>
  </section>

  <section>
    <h2>{$_('assets.title')}</h2>
    <p>{$_('assets.usdBank')}: {formatUsd(inputs.assets.usdBank, lang)} ({formatRub(inputs.assets.usdBank * inputs.rubPerUsd, lang)})</p>
    <p>{$_('assets.usdCash')}: {formatUsd(inputs.assets.usdCash, lang)} ({formatRub(inputs.assets.usdCash * inputs.rubPerUsd, lang)})</p>
    <p>{$_('assets.rubBank')}: {formatRub(inputs.assets.rubBank, lang)}</p>
    <p><b>{$_('assets.totalRub')}: {formatRub(totalAssetsRub, lang)}</b></p>
  </section>

  <section>
    <h2>{$_('expenses.title')}</h2>
    <p>{$_('expenses.monthly')}: {formatRub(inputs.monthlyFamilyRub, lang)}</p>
  </section>

  {#if inputs.goals.length > 0}
    <section>
      <h2>{$_('goals.title')}</h2>
      <ul>
        {#each inputs.goals as g}
          <li>
            {g.name}: {formatRub(g.amountRub, lang)} —
            {g.mode === 'lump' ? formatDate(g.date, lang) : `${formatDate(g.date, lang)} → ${formatDate(g.endDate ?? g.date, lang)}`}
            {#if !g.enabled}<span class="muted">(off)</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if inputs.savingsInstruments.length > 0}
    <section>
      <h2>{$_('savings.title')}</h2>
      <ul>
        {#each inputs.savingsInstruments.filter(i => i.enabled) as inst (inst.id)}
          <li>
            <b>{inst.name}</b>
            ({$_(`savings.templates.${inst.templateId}.name`)})
            — {formatRub(inst.amountRub, lang)},
            {inst.annualRatePct.toFixed(2)}%,
            {inst.termMonths === null ? $_('savings.instrument.termOpen') : `${inst.termMonths} ${$_('savings.instrument.termCustomLabel')}`}
          </li>
        {/each}
      </ul>
      <p>
        {$_('savings.totals.parked', { values: { amount: formatRub(r.sim.totalPrincipalRub, lang) } })}
        · {$_('savings.totals.accrued', { values: { amount: formatRub(r.sim.totalAccruedInterestRub, lang) } })}
      </p>
      <p class="muted">— {$_('savings.disclaimer')}</p>
    </section>
  {/if}
</div>

<style>
  .print-view {
    padding: 0;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    color: #1a1815;
    background: #f5f1e8;
    font-size: 11pt;
    line-height: 1.5;
    font-feature-settings: 'tnum';
  }
  .print-view h1 {
    font-size: 20pt;
    margin: 0 0 6px;
    letter-spacing: 0.04em;
    border-bottom: 2px solid #1a1815;
    padding-bottom: 6px;
  }
  .print-view h2 {
    font-size: 11pt;
    margin: 18px 0 6px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .print-view h2::before { content: '> '; color: #b8651d; }
  .print-view section { page-break-inside: avoid; margin-bottom: 10px; }
  .print-view p { margin: 3px 0; font-size: 11pt; }
  .print-view .big {
    font-size: 28pt;
    font-weight: 700;
    color: #b8651d;
    letter-spacing: -0.02em;
    margin: 4px 0;
  }
  .print-view .meta { font-size: 10pt; color: #6e6655; margin-bottom: 12px; letter-spacing: 0.14em; text-transform: uppercase; }
  .print-view .muted { color: #6e6655; }
  .print-view ul { margin: 0; padding-left: 18px; list-style: none; }
  .print-view li::before { content: '· '; color: #b8651d; }
</style>
