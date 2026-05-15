<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app } from '../../lib/state/scenarios';
  import { currentResult } from '../../lib/state/derived';
  import CollapsibleCard from '../controls/CollapsibleCard.svelte';
  import { formatRub } from '../../lib/format';
  import type { DayPoint } from '../../lib/calc/types';

  const result = $derived(currentResult());

  type MonthRow = { ym: string; open: number; close: number; spent: number; goalsRub: number };
  const rows = $derived.by(() => {
    const byMonth: Record<string, DayPoint[]> = {};
    for (const d of result.days) {
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

<CollapsibleCard title={$_('breakdown.title')} open={false}>
  <table>
    <thead>
      <tr>
        <th>{$_('breakdown.month')}</th>
        <th>{$_('breakdown.open')}</th>
        <th>{$_('breakdown.spent')}</th>
        <th>{$_('breakdown.goals')}</th>
        <th>{$_('breakdown.close')}</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as r}
        <tr>
          <td>{r.ym}</td>
          <td class="number">{formatRub(r.open, app.ui.language)}</td>
          <td class="number">{formatRub(r.spent, app.ui.language)}</td>
          <td class="number">{formatRub(r.goalsRub, app.ui.language)}</td>
          <td class="number">{formatRub(r.close, app.ui.language)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</CollapsibleCard>

<style>
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: right; padding: 4px 6px; border-bottom: 1px solid var(--border); }
  th:first-child, td:first-child { text-align: left; }
  th { color: var(--muted); font-weight: 500; }
</style>
