<script lang="ts">
  import { app, persistSoon } from '../../lib/state/scenarios';
  import { setLocale } from '../../lib/i18n';

  function setLang(lang: 'ru' | 'en') {
    app.ui.language = lang;
    setLocale(lang);
    persistSoon();
  }
</script>

<div class="toggle-group" role="group" aria-label="Language">
  <button type="button" class:on={app.ui.language === 'ru'} onclick={() => setLang('ru')}>RU</button>
  <button type="button" class:on={app.ui.language === 'en'} onclick={() => setLang('en')}>EN</button>
</div>
