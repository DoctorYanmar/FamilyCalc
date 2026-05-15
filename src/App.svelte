<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { app } from './lib/state/scenarios';
  import { initI18n } from './lib/i18n';

  import Atmosphere from './components/Atmosphere.svelte';
  import ScenarioPicker from './components/ScenarioPicker.svelte';
  import LangToggle from './components/controls/LangToggle.svelte';
  import ThemeToggle from './components/controls/ThemeToggle.svelte';
  import ResultsHeader from './components/ResultsHeader.svelte';
  import BalanceChart from './components/BalanceChart.svelte';
  import ContextSection from './components/sections/ContextSection.svelte';
  import AssetsSection from './components/sections/AssetsSection.svelte';
  import ExpensesSection from './components/sections/ExpensesSection.svelte';
  import GoalsSection from './components/sections/GoalsSection.svelte';
  import InvestmentsSection from './components/sections/InvestmentsSection.svelte';
  import BreakdownSection from './components/sections/BreakdownSection.svelte';
  // TODO Phase 10: import PrintView from './components/PrintView.svelte';

  let clock = $state('');
  function updateClock() {
    const d = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = months[d.getMonth()];
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    clock = `${dd}.${mm}.${yyyy} / ${hh}:${mi}`;
  }

  onMount(() => {
    initI18n(app.ui.language);
    document.documentElement.setAttribute('data-theme', app.ui.theme);
    updateClock();
    const id = setInterval(updateClock, 30_000);
    return () => clearInterval(id);
  });

  function onPrint() { window.print(); }
</script>

<Atmosphere />

<div class="app-shell">
  <header class="header">
    <span class="brand">
      <span class="brand-amber">FAMILYCALC</span>
      <span class="brand-sep">::</span>
      <span class="brand-sub">{$_('app.title')}</span>
    </span>
    <span class="header-clock">{clock}</span>
  </header>

  <div class="header-controls">
    <ScenarioPicker />
    <LangToggle />
    <ThemeToggle />
    <button class="btn icon" type="button" onclick={onPrint} title={$_('header.print')}>PRINT</button>
  </div>

  <ResultsHeader />
  <BalanceChart />

  <div class="ornament">─── ─── ───</div>

  <ContextSection />
  <AssetsSection />
  <ExpensesSection />
  <GoalsSection />
  <InvestmentsSection />
  <BreakdownSection />

  <div class="ornament">─── FIN ───</div>
</div>

<!-- TODO Phase 10: <PrintView /> -->

<style>
  .header-controls {
    display: flex;
    gap: var(--gap-2);
    align-items: center;
    flex-wrap: wrap;
    padding: var(--gap-3) 0;
    border-bottom: 1px solid var(--border);
  }
</style>
