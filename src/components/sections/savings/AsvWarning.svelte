<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { currentResult } from '../../../lib/state/derived';

  const result = $derived(currentResult());
  const visible = $derived(result.alloc.asvWarningLayers.length > 0);
</script>

{#if visible}
  <div class="report-notice danger">
    ⚠ {$_('savings.asvWarning')}
  </div>
{/if}
