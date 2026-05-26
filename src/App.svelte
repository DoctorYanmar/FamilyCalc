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
  import OnboardingTour from './components/OnboardingTour.svelte';

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

  let tourRef: OnboardingTour | undefined = $state();

  function replayTour() {
    tourRef?.restart();
  }
</script>

<div class="app-shell">

  <header class="topbar">
    <div class="brand">
      <span class="brand-mark">$</span>
      <span>{$_('app.title')}</span>
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
      <button class="btn" type="button" onclick={replayTour} title={$_('onboarding.replay')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span class="btn-label">{$_('onboarding.replay')}</span>
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
    <span>VACATION PLANNER</span>
    <span>{clock}</span>
  </div>

</div>

<PrintView />

<OnboardingTour bind:this={tourRef} />
