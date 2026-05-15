<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

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
  import SavingsSection from './components/sections/savings/SavingsSection.svelte';
  import SummarySection from './components/sections/SummarySection.svelte';
  import PrintView from './components/PrintView.svelte';

  let clock = $state('');
  function updateClock() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    clock = `${dd}.${mm}.${yyyy} · ${hh}:${mi}`;
  }

  onMount(() => {
    updateClock();
    const id = setInterval(updateClock, 30_000);
    return () => clearInterval(id);
  });

  function onPrint() { window.print(); }
</script>

<div class="app-shell">

  <header class="topbar">
    <div class="brand">
      <span class="brand-mark">$</span>
      <span>FamilyCalc</span>
      <span class="brand-sep">/</span>
      <span class="brand-sub">{$_('app.title')}</span>
    </div>
    <div class="topbar-tools">
      <span class="clock">{clock}</span>
      <span class="divider-v"></span>
      <ScenarioPicker />
      <LangToggle />
      <ThemeToggle />
      <button class="btn" type="button" onclick={onPrint} title={$_('header.print')}>
        <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span class="btn-label">{$_('header.print')}</span>
      </button>
    </div>
  </header>

  <ResultsHeader />

  <BalanceChart />

  <div class="grid-2">
    <ContextSection />
    <AssetsSection />
    <ExpensesSection />
    <SummarySection />
    <div class="span-2"><GoalsSection /></div>
    <div class="span-2"><SavingsSection /></div>
    <div class="span-2"><BreakdownSection /></div>
  </div>

  <div class="app-footer">
    <span>FAMILYCALC · LOCAL-FIRST</span>
    <span>{clock}</span>
  </div>

</div>

<PrintView />
