import { mount } from 'svelte';
import './app.css';
import { initI18n } from './lib/i18n';
import { app as appState } from './lib/state/scenarios.svelte';
import App from './App.svelte';

// Initialize i18n and theme BEFORE mounting so child components
// have a locale to read from on first render.
initI18n(appState.ui.language);
document.documentElement.setAttribute('data-theme', appState.ui.theme);
document.documentElement.lang = appState.ui.language;

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
