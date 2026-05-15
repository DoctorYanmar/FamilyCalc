import { addMessages, init, locale } from 'svelte-i18n';
import type { Language } from '../calc/types';
import ru from './ru.json';
import en from './en.json';

// Eager-bundle both locale dictionaries so `$_(...)` is available synchronously
// on first render. Locales are small (~3KB gzipped each); lazy loading saves
// nothing meaningful and introduces a render race we don't need.
addMessages('ru', ru);
addMessages('en', en);

export function initI18n(initialLocale: Language): void {
  init({ fallbackLocale: 'ru', initialLocale });
}

export function setLocale(lang: Language): void {
  locale.set(lang);
}
