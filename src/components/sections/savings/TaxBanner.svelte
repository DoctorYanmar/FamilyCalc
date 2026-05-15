<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';

  const result = $derived(currentResult());
</script>

<aside class="banner">
  {$_('savings.taxBanner', { values: { amount: formatRub(result.alloc.taxThresholdRub, app.ui.language) } })}
</aside>

<style>
  .banner {
    border: 1px dashed var(--border-2);
    padding: var(--gap-2) var(--gap-3);
    font-size: var(--t-mini);
    color: var(--muted);
    letter-spacing: 0.02em;
  }
</style>
