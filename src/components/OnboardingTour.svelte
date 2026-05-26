<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { app, persistSoon } from '../lib/state/scenarios.svelte';

  type TourStep = {
    targetSelector: string | null;
    i18nKey: string;
    iosOnly?: boolean;
  };

  const ALL_STEPS: TourStep[] = [
    { targetSelector: null, i18nKey: 'onboarding.privacy' },
    { targetSelector: '[data-tour="context"]', i18nKey: 'onboarding.context' },
    { targetSelector: '[data-tour="assets"]', i18nKey: 'onboarding.assets' },
    { targetSelector: '[data-tour="expenses"]', i18nKey: 'onboarding.expenses' },
    { targetSelector: '[data-tour="goals"]', i18nKey: 'onboarding.goals' },
    { targetSelector: '[data-tour="savings"]', i18nKey: 'onboarding.savings' },
    { targetSelector: '[data-tour="kpis"]', i18nKey: 'onboarding.kpis' },
    { targetSelector: '[data-tour="chart"]', i18nKey: 'onboarding.chart' },
    { targetSelector: null, i18nKey: 'onboarding.pwa', iosOnly: true },
  ];

  function isIosSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua);
    const standalone = (navigator as any).standalone === true;
    return ios && !standalone;
  }

  let steps = $state<TourStep[]>([]);
  let stepIndex = $state(0);
  let targetRect = $state<DOMRect | null>(null);
  let tooltipEl: HTMLDivElement | undefined = $state();
  let positioning = $state(false);

  function filteredSteps(): TourStep[] {
    const iosOk = isIosSafari();
    return ALL_STEPS.filter(s => !s.iosOnly || iosOk);
  }

  let currentStep = $derived(steps[stepIndex]);
  let isLast = $derived(stepIndex === steps.length - 1);
  let isCentered = $derived(!currentStep?.targetSelector);

  function clipPath(): string {
    if (!targetRect || isCentered) return 'none';
    const pad = 8;
    const r = 8;
    const x = targetRect.left - pad;
    const y = targetRect.top - pad;
    const w = targetRect.width + pad * 2;
    const h = targetRect.height + pad * 2;
    return `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${x}px ${y + r}px,
      ${x + r}px ${y}px,
      ${x + w - r}px ${y}px,
      ${x + w}px ${y + r}px,
      ${x + w}px ${y + h - r}px,
      ${x + w - r}px ${y + h}px,
      ${x + r}px ${y + h}px,
      ${x}px ${y + h - r}px,
      ${x}px ${y + r}px
    )`;
  }

  function tooltipStyle(): string {
    if (isCentered || !targetRect) {
      return 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);';
    }
    const isMobile = window.innerWidth < 480;
    if (isMobile) {
      return 'position:fixed;bottom:0;left:0;right:0;border-radius:var(--radius-md) var(--radius-md) 0 0;max-width:none;';
    }
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const tooltipHeight = tooltipEl?.offsetHeight ?? 160;
    const putBelow = spaceBelow >= tooltipHeight + 16 || spaceBelow >= spaceAbove;
    const top = putBelow
      ? targetRect.bottom + 12
      : targetRect.top - tooltipHeight - 12;
    let left = targetRect.left + targetRect.width / 2 - 180;
    left = Math.max(16, Math.min(left, window.innerWidth - 376));
    return `position:fixed;top:${top}px;left:${left}px;`;
  }

  function arrowStyle(): string {
    if (isCentered || !targetRect) return 'display:none;';
    const isMobile = window.innerWidth < 480;
    if (isMobile) return 'display:none;';
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const tooltipHeight = tooltipEl?.offsetHeight ?? 160;
    const putBelow = spaceBelow >= tooltipHeight + 16 || spaceBelow >= spaceAbove;
    const centerX = targetRect.left + targetRect.width / 2;
    let left = tooltipEl ? centerX - tooltipEl.getBoundingClientRect().left : 180;
    left = Math.max(20, Math.min(left, 340));
    if (putBelow) {
      return `position:absolute;top:-8px;left:${left}px;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid var(--surface-1);`;
    }
    return `position:absolute;bottom:-8px;left:${left}px;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid var(--surface-1);`;
  }

  async function positionTooltip() {
    positioning = true;
    const step = steps[stepIndex];
    if (!step?.targetSelector) {
      targetRect = null;
      positioning = false;
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      next();
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 350)));
    targetRect = el.getBoundingClientRect();
    positioning = false;
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    stepIndex++;
    positionTooltip();
  }

  function finish() {
    app.ui.onboardingDone = true;
    persistSoon();
  }

  export function restart() {
    steps = filteredSteps();
    stepIndex = 0;
    targetRect = null;
    app.ui.onboardingDone = false;
    persistSoon();
    positionTooltip();
  }

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (currentStep?.targetSelector) {
        const el = document.querySelector(currentStep.targetSelector);
        if (el) targetRect = el.getBoundingClientRect();
      }
    }, 100);
  }

  onMount(() => {
    steps = filteredSteps();
    positionTooltip();
    window.addEventListener('resize', onResize);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onResize);
    }
    if (resizeTimer) clearTimeout(resizeTimer);
  });
</script>

{#if !app.ui.onboardingDone && steps.length > 0}
  <div class="tour-backdrop" style:clip-path={clipPath()} onclick={finish}></div>

  <div
    class="tour-tooltip"
    style={tooltipStyle()}
    bind:this={tooltipEl}
  >
    <div class="tour-arrow" style={arrowStyle()}></div>
    <p class="tour-text">{$_(currentStep.i18nKey)}</p>
    <div class="tour-footer">
      <span class="tour-counter">{stepIndex + 1} / {steps.length}</span>
      <div class="tour-buttons">
        <button class="tour-btn-skip" type="button" onclick={finish}>
          {$_('onboarding.skip')}
        </button>
        <button class="tour-btn-next" type="button" onclick={next}>
          {isLast ? $_('onboarding.done') : $_('onboarding.next')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .tour-backdrop {
    position: fixed;
    inset: 0;
    z-index: 900;
    background: rgba(0, 0, 0, 0.7);
  }

  .tour-tooltip {
    position: fixed;
    z-index: 901;
    background: var(--surface-1);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius-md);
    padding: 16px 20px;
    max-width: 360px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    color: var(--text-1);
    font-family: var(--sans);
    font-size: var(--t-small);
  }

  .tour-arrow {
    width: 0;
    height: 0;
  }

  .tour-text {
    margin: 0 0 12px 0;
    line-height: 1.5;
  }

  .tour-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .tour-counter {
    color: var(--text-3);
    font-size: var(--t-xsmall);
  }

  .tour-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .tour-btn-skip {
    background: none;
    border: none;
    color: var(--text-3);
    font-family: var(--sans);
    font-size: var(--t-small);
    cursor: pointer;
    padding: 6px 10px;
  }

  .tour-btn-skip:hover {
    color: var(--text-2);
  }

  .tour-btn-next {
    background: var(--accent);
    color: var(--bg-base);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: var(--t-small);
    font-weight: 500;
    cursor: pointer;
    padding: 6px 16px;
    min-height: 36px;
  }

  .tour-btn-next:hover {
    filter: brightness(1.1);
  }

  @media (max-width: 480px) {
    .tour-tooltip {
      max-width: none;
    }

    .tour-btn-skip,
    .tour-btn-next {
      min-height: 44px;
      padding: 10px 16px;
    }
  }
</style>
