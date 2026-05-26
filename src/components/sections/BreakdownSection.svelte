<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../../lib/state/scenarios.svelte';
  import { currentResult } from '../../lib/state/derived';
  import { formatLocal } from '../../lib/format';
  import type { DayPoint } from '../../lib/calc/types';

  const result = $derived(currentResult());
  const inputs = $derived(activeInputs());

  type MonthRow = { ym: string; open: number; close: number; spent: number; goalsRub: number };
  const rows = $derived.by(() => {
    const byMonth: Record<string, DayPoint[]> = {};
    for (const d of result.sim.days) {
      const ym = d.date.slice(0, 7);
      (byMonth[ym] ||= []).push(d);
    }
    return Object.entries(byMonth).map(([ym, days]): MonthRow => {
      const open = days[0].totalRub;
      const close = days[days.length - 1].totalRub;
      const goalsRub = days.reduce((s, d) => s + d.events.reduce((a, e) => a + e.amountRub, 0), 0);
      const spent = open - close;
      return { ym, open, close, spent, goalsRub };
    });
  });
</script>

<section class="card breakdown">
  <div class="card-head">
    <div class="card-title">{$_('breakdown.title')}</div>
    <div class="card-meta">{rows.length}</div>
  </div>
  <div class="breakdown-scroll">
    <table>
      <thead>
        <tr>
          <th>{$_('breakdown.month')}</th>
          <th style="text-align:right">{$_('breakdown.open')}</th>
          <th style="text-align:right">{$_('breakdown.spent')}</th>
          <th style="text-align:right">{$_('breakdown.goals')}</th>
          <th style="text-align:right">{$_('breakdown.close')}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r}
          <tr>
            <td class="label">{r.ym}</td>
            <td class="amount">{formatLocal(r.open, app.ui.language, inputs.localCurrency)}</td>
            <td class="amount">{formatLocal(r.spent, app.ui.language, inputs.localCurrency)}</td>
            <td class="amount">{formatLocal(r.goalsRub, app.ui.language, inputs.localCurrency)}</td>
            <td class="amount" style={r.close < 0 ? 'color:var(--danger)' : ''}>{formatLocal(r.close, app.ui.language, inputs.localCurrency)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
