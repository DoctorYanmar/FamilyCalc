<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { currentResult } from '../lib/state/derived';
  import { app } from '../lib/state/scenarios';

  Chart.register(...registerables);

  let canvas: HTMLCanvasElement;
  let chart: Chart | undefined;

  function colors() {
    const dark = app.ui.theme === 'dark';
    return {
      line: dark ? '#ffb454' : '#b8651d',
      fill: dark ? 'rgba(255,180,84,0.10)' : 'rgba(184,101,29,0.08)',
      grid: dark ? '#1f1f1f' : '#c8bfa8',
      label: dark ? '#707070' : '#6e6655',
    };
  }

  function buildOrUpdate() {
    const r = currentResult();
    const c = colors();
    const data = {
      labels: r.days.map(d => d.date),
      datasets: [{
        data: r.days.map(d => d.totalRub),
        borderColor: c.line,
        backgroundColor: c.fill,
        borderWidth: 1.5,
        fill: true,
        pointRadius: 0,
        tension: 0,  // sharp, deterministic line — no smoothing
      }],
    };
    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutCubic' },
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: 'rgba(15,15,15,0.95)', borderColor: c.line, borderWidth: 1,
        titleColor: c.line, bodyColor: '#e4e4e4', titleFont: { family: 'JetBrains Mono' },
        bodyFont: { family: 'JetBrains Mono' },
      } },
      scales: {
        x: { ticks: { color: c.label, font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 6 },
             grid: { color: c.grid } },
        y: { ticks: { color: c.label, font: { family: 'JetBrains Mono', size: 10 } },
             grid: { color: c.grid } },
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
    // depend on result + theme
    void currentResult();
    void app.ui.theme;
    if (chart) buildOrUpdate();
  });
</script>

<div class="chart-wrap">
  <div class="chart-frame">
    <div class="chart-corner tl"></div><div class="chart-corner tr"></div>
    <div class="chart-corner bl"></div><div class="chart-corner br"></div>
    <div class="chart-label">▸ BALANCE / TIME · ₽</div>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .chart-wrap { margin-top: var(--gap-4); }
  .chart-frame {
    position: relative;
    height: 240px;
    padding: var(--gap-5) var(--gap-4) var(--gap-3);
    background: var(--surface-1);
    border: 1px solid var(--border-2);
  }
  .chart-label {
    position: absolute;
    top: 8px; left: 12px;
    font-size: var(--t-mini);
    color: var(--amber);
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .chart-corner {
    position: absolute;
    width: 10px; height: 10px;
    border-color: var(--amber);
    border-style: solid;
    border-width: 0;
  }
  .tl { top: -1px; left: -1px;   border-top-width: 1px; border-left-width: 1px; }
  .tr { top: -1px; right: -1px;  border-top-width: 1px; border-right-width: 1px; }
  .bl { bottom: -1px; left: -1px; border-bottom-width: 1px; border-left-width: 1px; }
  .br { bottom: -1px; right: -1px; border-bottom-width: 1px; border-right-width: 1px; }
  canvas { width: 100%; height: 100%; }
</style>
