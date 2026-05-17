<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { InstrumentClass, ClassPick } from '../../../lib/calc/types';

  let {
    cls,
    pick,
    cbrPct,
    onToggle,
    onShareChange,
    onExpandToggle,
    expanded,
  }: {
    cls: InstrumentClass;
    pick: ClassPick | undefined;
    cbrPct: number;
    onToggle: () => void;
    onShareChange: (n: number) => void;
    onExpandToggle: () => void;
    expanded: boolean;
  } = $props();

  const checked = $derived(pick !== undefined);
  const shareValue = $derived(pick && pick.share > 0 ? String(Math.round(pick.share)) : '');

  const yieldLow  = $derived(cbrPct + cls.cbrOffset.low);
  const yieldHigh = $derived(cbrPct + cls.cbrOffset.high);

  function fmtPct(n: number): string {
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function onShareInput(e: Event) {
    const t = e.target as HTMLInputElement;
    const raw = t.value.replace(/\s/g, '');
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) {
      onShareChange(n);
    }
  }
</script>

<div class="layer-class" class:off={!checked}>
  <button
    class="cb"
    class:on={checked}
    type="button"
    aria-pressed={checked}
    aria-label={cls.id}
    onclick={onToggle}
  >{checked ? '✓' : ''}</button>

  <div class="class-main">
    <div class="class-name">
      <span class="nm">{$_(`savings.classes.${cls.id}.name`)}</span>
      <span class="risk-badge {cls.risk}">{$_(`savings.riskBadge.${cls.risk}`)}</span>
    </div>
    <div class="class-meta">
      {#if Math.abs(yieldLow - yieldHigh) < 0.05}
        <span class="yld">{fmtPct(yieldLow)}%</span>
      {:else}
        <span class="yld">{fmtPct(yieldLow)}–{fmtPct(yieldHigh)}%</span>
      {/if}
      <span class="sep">·</span>
      <span>{$_(`savings.currency.${cls.currency}`)}</span>
      {#if cls.isDeposit}<span class="sep">·</span><span>ДЕП</span>{/if}
      <span class="sep">·</span>
      <span>{$_(`savings.liquidity.${cls.liquidity}`)}</span>
    </div>
  </div>

  <span class="class-right">
    <input
      class="share-input"
      type="number"
      inputmode="decimal"
      min="0"
      step="any"
      placeholder="—"
      value={shareValue}
      oninput={onShareInput}
      aria-label={cls.id + ' share'}
    />
    <span class="share-cur">₽</span>
    <button class="chev" type="button" onclick={onExpandToggle} aria-label={$_('savings.classRow.expandLabel')}>
      {expanded ? '⌄' : '›'}
    </button>
  </span>

  {#if expanded}
    <dl class="class-edu">
      <dt>{$_('savings.classRow.edu.whatItIs')}</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.whatItIs`)}</dd>
      <dt>{$_('savings.classRow.edu.howToBuy')}</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.howToBuy`)}</dd>
      <dt>{$_('savings.classRow.edu.yieldBehavior')}</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.yieldBehavior`)}</dd>
      <dt>{$_('savings.classRow.edu.tax')}</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.tax`)}</dd>
      <dt>{$_('savings.classRow.edu.whenToPick')}</dt>
      <dd>{$_(`savings.classes.${cls.id}.edu.whenToPick`)}</dd>
    </dl>
  {/if}
</div>
