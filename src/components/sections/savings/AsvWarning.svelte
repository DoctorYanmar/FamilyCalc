<script lang="ts">
  import { _ } from 'svelte-i18n';
</script>

<div class="warn">
  ⚠ {$_('savings.asvWarning')}
</div>

<style>
  .warn {
    border: 1px solid var(--danger);
    background: rgba(255, 90, 90, 0.06);
    color: var(--danger);
    padding: var(--gap-1) var(--gap-2);
    font-size: var(--t-mini);
    letter-spacing: 0.06em;
  }
</style>
