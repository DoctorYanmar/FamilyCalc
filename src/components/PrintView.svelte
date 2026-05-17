<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeScenario, activeInputs } from '../lib/state/scenarios.svelte';
  import { currentResult } from '../lib/state/derived';
  import { formatRub, formatUsd, formatDate } from '../lib/format';
  import type { LayerKey } from '../lib/calc/types';

  const lang = $derived(app.ui.language);
  const inputs = $derived(activeInputs());
  const sc = $derived(activeScenario());
  const r = $derived(currentResult());
  const totalAssetsRub = $derived(
    inputs.assets.rubBank + inputs.assets.usdBank * inputs.rubPerUsd + inputs.assets.usdCash * inputs.rubPerUsd
  );

  const layerKeys: LayerKey[] = ['A', 'B', 'C'];

  function fmtPct(n: number): string {
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  const grandMid  = $derived(r.alloc.layers.A.incomeMidRub + r.alloc.layers.B.incomeMidRub + r.alloc.layers.C.incomeMidRub);
  const grandLow  = $derived(r.alloc.layers.A.incomeRangeRub.low + r.alloc.layers.B.incomeRangeRub.low + r.alloc.layers.C.incomeRangeRub.low);
  const grandHigh = $derived(r.alloc.layers.A.incomeRangeRub.high + r.alloc.layers.B.incomeRangeRub.high + r.alloc.layers.C.incomeRangeRub.high);
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

  <section>
    <h2>{$_('savings.print.title')}</h2>
    <p>
      {$_('savings.print.regimeLine', { values: {
        regime: $_(`savings.regime.${r.alloc.regime}`),
        pct: inputs.cbrKeyRatePct,
        date: formatDate(inputs.cbrRateUpdatedAt, lang),
      } })}
    </p>
    <p>
      {$_('savings.print.horizonLine', { values: {
        date: formatDate(inputs.horizonDate, lang),
        days: r.alloc.horizonDays,
      } })}
    </p>

    {#each layerKeys as k}
      {@const info = r.alloc.layers[k]}
      {@const picks = inputs.savingsPicks[k]}
      <div class="print-layer">
        <h3>
          {$_('savings.print.layerLine', { values: {
            layer: k,
            name: $_(`savings.layer.${k}.name`).split('·').pop()?.trim() ?? k,
            window: $_(`savings.layer.${k}.window`),
            amount: formatRub(info.amountRub, lang),
            preset: $_(`savings.preset.${picks.preset}`),
          } })}
        </h3>
        {#if info.pickedClasses.length > 0}
          <ul>
            {#each info.pickedClasses as p}
              <li>
                {$_(`savings.classes.${p.cls.id}.name`)} —
                {formatRub(p.share, lang)} —
                {fmtPct(inputs.cbrKeyRatePct + p.cls.cbrOffset.low)}–{fmtPct(inputs.cbrKeyRatePct + p.cls.cbrOffset.high)}% p.a. —
                [{$_(`savings.riskBadge.${p.cls.risk}`)}]
              </li>
            {/each}
          </ul>
        {/if}
        <p class="subtotal">
          {$_('savings.print.layerSubtotal', { values: {
            window: $_(`savings.layer.${k}.window`),
            mid: formatRub(info.incomeMidRub, lang),
            low: formatRub(info.incomeRangeRub.low, lang),
            high: formatRub(info.incomeRangeRub.high, lang),
          } })}
        </p>
      </div>
    {/each}

    <p class="grand-total">
      {$_('savings.print.grandTotal', { values: {
        mid: formatRub(grandMid, lang),
        low: formatRub(grandLow, lang),
        high: formatRub(grandHigh, lang),
      } })}
    </p>

    <p class="muted">— {$_('savings.taxBanner', { values: { amount: formatRub(r.alloc.taxThresholdRub, lang) } })}</p>
    {#each r.alloc.asvWarningLayers as l}
      <p class="muted">— {l}: {$_('savings.asvWarning')}</p>
    {/each}
    <p class="muted">— {$_('savings.disclaimer')}</p>

    <h3>{$_('savings.print.riskMethodologyHeading')}</h3>
    <p class="muted">{$_('savings.riskBadge.methodology')}</p>
  </section>
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
  .print-view .print-layer { margin: 8px 0 12px; }
  .print-view .print-layer h3 {
    font-size: 11pt; margin: 6px 0 4px;
    letter-spacing: 0.04em; text-transform: none;
    color: #1a1815;
  }
  .print-view .print-layer h3::before { content: ''; }
  .print-view .subtotal { font-weight: 600; margin: 4px 0; }
  .print-view .grand-total { font-weight: 700; margin: 10px 0; border-top: 1px solid #1a1815; padding-top: 6px; }
</style>
