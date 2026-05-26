<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { Chart, registerables } from 'chart.js';
  import { currentResult } from '../lib/state/derived';
  import { app } from '../lib/state/scenarios.svelte';

  Chart.register(...registerables);

  let canvas: HTMLCanvasElement;
  let chart: Chart | undefined;

  function colors() {
    const dark = app.ui.theme === 'dark';
    return {
      line:  dark ? '#3B82F6' : '#2563EB',
      fill:  dark ? 'rgba(59,130,246,0.18)' : 'rgba(37,99,235,0.10)',
      grid:  dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)',
      label: dark ? '#94A3B8' : '#64748B',
      voyage: dark ? '#F59E0B' : '#D97706',
    };
  }

  function buildOrUpdate() {
    const r = currentResult();
    const c = colors();
    const data = {
      labels: r.sim.days.map(d => d.date),
      datasets: [{
        data: r.sim.days.map(d => d.totalRub),
        borderColor: c.line,
        backgroundColor: c.fill,
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        tension: 0.15,
      }],
    };
    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutCubic' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: app.ui.theme === 'dark' ? 'rgba(19,29,51,0.95)' : 'rgba(248,250,252,0.95)',
          borderColor: c.line,
          borderWidth: 1,
          titleColor: c.line,
          bodyColor: app.ui.theme === 'dark' ? '#F8FAFC' : '#0F172A',
          titleFont: { family: 'Fira Code' },
          bodyFont: { family: 'Fira Code' },
        },
      },
      scales: {
        x: {
          ticks: { color: c.label, font: { family: 'Fira Code', size: 10 }, maxTicksLimit: 8 },
          grid:  { color: c.grid },
        },
        y: {
          ticks: { color: c.label, font: { family: 'Fira Code', size: 10 } },
          grid:  { color: c.grid },
        },
      },
    };
    if (chart) {
      chart.data = data as any;
      chart.options = options;
      chart.update();
    } else {
      chart = new Chart(canvas, { type: 'line', data, options });
    }
  }

  onMount(() => {
    buildOrUpdate();
    return () => chart?.destroy();
  });

  $effect(() => {
    void currentResult();
    void app.ui.theme;
    if (chart) buildOrUpdate();
  });
</script>

<section class="card chart-card" data-tour="chart">
  <div class="card-head">
    <div class="card-title">{$_('chart.title')}</div>
    <div class="chart-legend">
      <span class="ld">{$_('chart.legend.projected')}</span>
    </div>
  </div>
  <div class="chart-body">
    <canvas bind:this={canvas}></canvas>
  </div>
</section>

<style>
  .chart-card { margin-bottom: var(--gap-4); }
  .chart-body { height: 240px; padding: var(--gap-3) var(--gap-5) var(--gap-4); }
  .chart-legend {
    display: flex; gap: var(--gap-3);
    font-size: var(--t-mini); color: var(--fg-3);
  }
  .chart-legend .ld { display: inline-flex; align-items: center; gap: 6px; }
  .chart-legend .ld::before {
    content: ''; width: 10px; height: 2px;
    border-radius: 2px; background: var(--primary);
  }
  @media (max-width: 640px) {
    .chart-body { height: 180px; padding: var(--gap-2) var(--gap-3) var(--gap-3); }
  }
</style>
