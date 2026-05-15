<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, persistSoon } from '../../lib/state/scenarios.svelte';
  import { initI18n } from '../../lib/i18n';

  function toggle() {
    app.ui.language = app.ui.language === 'ru' ? 'en' : 'ru';
    initI18n(app.ui.language);
    document.documentElement.setAttribute('lang', app.ui.language);
    persistSoon();
  }
</script>

<button class="btn" type="button" onclick={toggle} title={$_('header.language')} aria-label={$_('header.language')}>
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  <span class="btn-label">{app.ui.language.toUpperCase()}</span>
</button>
