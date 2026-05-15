<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatDate, formatRub } from '../../../lib/format';
  import LayerCard from './LayerCard.svelte';
  import TaxBanner from './TaxBanner.svelte';
  import AsvWarning from './AsvWarning.svelte';
  import SavingsDisclaimer from './SavingsDisclaimer.svelte';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const hasCash = $derived(inputs.freeCashRub > 0);

  function setFreeCash(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.freeCashRub = n;
      persistSoon();
    }
  }
  function setCbr(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    if (!Number.isNaN(n) && n >= 0 && n <= 30) {
      inputs.cbrKeyRatePct = +n.toFixed(2);
      inputs.cbrRateUpdatedAt = new Date().toISOString().slice(0, 10);
      persistSoon();
    }
  }
  function bumpCbr(d: number) {
    const next = +(inputs.cbrKeyRatePct + d).toFixed(2);
    if (next >= 0 && next <= 30) {
      inputs.cbrKeyRatePct = next;
      inputs.cbrRateUpdatedAt = new Date().toISOString().slice(0, 10);
      persistSoon();
    }
  }
  function setHorizon(e: Event) { inputs.horizonDate = (e.target as HTMLInputElement).value; persistSoon(); }
  function onYieldToggle() {
    inputs.includeExpectedYield = !inputs.includeExpectedYield;
    persistSoon();
  }
</script>

<section class="report-card">
  <header class="report-head">
    <div class="report-title">
      {$_('savings.title')}
      <span class="badge">{$_('savings.badge')}</span>
    </div>
    <div class="report-meta">
      <span>{$_('savings.freeCashShort')} <strong style="color:var(--fg);font-family:var(--mono)">{formatRub(inputs.freeCashRub, app.ui.language)}</strong></span>
      <span class="regime">{$_(`savings.regime.${result.alloc.regime}`)}</span>
    </div>
  </header>

  <div class="report-inputs">
    <div class="report-input">
      <div class="lbl">{$_('savings.inputs.freeCash')}</div>
      <span class="input-wrap">
        <input class="input with-suffix" type="number" inputmode="decimal" min="0" step="any"
               value={inputs.freeCashRub === 0 ? '' : inputs.freeCashRub}
               placeholder="0"
               oninput={setFreeCash} />
        <span class="suffix">₽</span>
      </span>
    </div>
    <div class="report-input">
      <div class="lbl">
        {$_('savings.inputs.cbrRate')}
        <span class="hint" title={$_('savings.inputs.cbrTooltip')}>
          ⓘ {$_('savings.inputs.cbrUpdated')} {formatDate(inputs.cbrRateUpdatedAt, app.ui.language)}
        </span>
      </div>
      <div class="stepper" role="group" aria-label={$_('savings.inputs.cbrRate')}>
        <button type="button" onclick={() => bumpCbr(-0.25)} aria-label="-0.25">−</button>
        <input class="stepper-val" type="number" inputmode="decimal" min="0" max="30" step="0.25"
               value={inputs.cbrKeyRatePct}
               oninput={setCbr} />
        <button type="button" onclick={() => bumpCbr(0.25)} aria-label="+0.25">+</button>
      </div>
    </div>
    <div class="report-input">
      <div class="lbl">{$_('savings.inputs.horizon')}</div>
      <input class="input date" type="date" value={inputs.horizonDate} oninput={setHorizon} />
    </div>
  </div>

  {#if !hasCash}
    <div class="layer-empty">{$_('savings.emptyState')}</div>
  {:else}
    <div class="report-layers">
      <LayerCard layer="A" />
      <LayerCard layer="B" />
      <LayerCard layer="C" />
    </div>
  {/if}

  <TaxBanner />
  <AsvWarning />

  <footer class="report-foot">
    <span
      class="toggle-label"
      role="switch"
      aria-checked={inputs.includeExpectedYield}
      tabindex="0"
      onclick={onYieldToggle}
      onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onYieldToggle(); } }}
      aria-label={$_('savings.inputs.includeYield')}
    >
      <span class="toggle-cb" class:on={inputs.includeExpectedYield} aria-hidden="true"></span>
      <span>{$_('savings.inputs.includeYield')}</span>
    </span>
    <span class="number" style="font-family:var(--mono);color:var(--fg-3)">
      {$_('savings.midYield')} · <strong style="color:var(--accent);font-weight:600">+ {formatRub(result.expectedYieldMid, app.ui.language)}</strong>
    </span>
  </footer>

  <SavingsDisclaimer />
</section>

<style>
  /* .stepper-val is a span in global.css; here it's an editable <input>
     so we reset native chrome and re-apply the visual rhythm. The stepper
     widget itself enforces the size — no per-input width hack. */
  .stepper > .stepper-val {
    all: unset;
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    padding: 8px 14px;
    font-family: var(--mono);
    font-size: var(--t-med);
    color: var(--fg);
    font-variant-numeric: tabular-nums;
    flex: 1;
    text-align: center;
  }
</style>
