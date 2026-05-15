<script lang="ts">
  import { _ } from 'svelte-i18n';
</script>

<footer class="disclaimer">
  {$_('savings.disclaimer')}
</footer>

<style>
  .disclaimer {
    color: var(--muted);
    font-size: var(--t-mini);
    line-height: 1.5;
    padding: var(--gap-2) 0;
    border-top: 1px dashed var(--border);
    letter-spacing: 0.02em;
  }
</style>
