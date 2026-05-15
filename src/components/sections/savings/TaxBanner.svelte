<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';

  const result = $derived(currentResult());
</script>

<div class="report-notice warn">
  {$_('savings.taxBanner', { values: { amount: formatRub(result.alloc.taxThresholdRub, app.ui.language) } })}
</div>
