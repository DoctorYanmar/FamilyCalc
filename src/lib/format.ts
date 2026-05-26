import type { Language, ISODate } from './calc/types';

export function formatRub(n: number, lang: Language): string {
  if (lang === 'ru') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(n)) + ' LC';
}

export function formatUsd(n: number, lang: Language): string {
  return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatDate(iso: ISODate, lang: Language): string {
  const d = new Date(iso + 'T00:00:00Z');
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(d);
}
