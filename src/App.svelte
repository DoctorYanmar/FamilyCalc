<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

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
  import BreakdownSection from './components/sections/BreakdownSection.svelte';
  import LayerCard from './components/sections/savings/LayerCard.svelte';
  import SavingsInputsCard from './components/sections/savings/SavingsInputsCard.svelte';
  import TaxBanner from './components/sections/savings/TaxBanner.svelte';
  import SavingsDisclaimer from './components/sections/savings/SavingsDisclaimer.svelte';
  import PrintView from './components/PrintView.svelte';

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

  <main class="layout">
    <section class="layers">
      <LayerCard layer="A" />
      <LayerCard layer="B" />
      <LayerCard layer="C" />
      <TaxBanner />
      <SavingsDisclaimer />
    </section>
    <aside class="sidebar">
      <ContextSection />
      <AssetsSection />
      <ExpensesSection />
      <GoalsSection />
      <SavingsInputsCard />
    </aside>
  </main>

  <BreakdownSection />

  <div class="ornament">─── FIN ───</div>
</div>

<PrintView />

<style>
  .header-controls {
    display: flex;
    gap: var(--gap-2);
    align-items: center;
    flex-wrap: wrap;
    padding: var(--gap-3) 0;
    border-bottom: 1px solid var(--border);
  }
  .layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: var(--gap-5);
    margin-top: var(--gap-4);
  }
  .layers, .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--gap-4);
  }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }
</style>
