<script lang="ts">
  import { app, persistSoon } from '../../lib/state/scenarios';

  function setTheme(t: 'dark' | 'light') {
    app.ui.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    persistSoon();
  }
</script>

<button type="button" class="btn icon"
        onclick={() => setTheme(app.ui.theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme">
  {app.ui.theme === 'dark' ? '☀' : '☾'}
</button>
