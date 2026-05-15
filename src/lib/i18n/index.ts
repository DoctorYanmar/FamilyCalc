import { register, init, locale } from 'svelte-i18n';
import type { Language } from '../calc/types';

register('ru', () => import('./ru.json'));
register('en', () => import('./en.json'));

export function initI18n(initialLocale: Language): void {
  init({ fallbackLocale: 'ru', initialLocale });
}

export function setLocale(lang: Language): void {
  locale.set(lang);
}
