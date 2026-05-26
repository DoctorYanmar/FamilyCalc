import type { Language, ISODate } from './calc/types';

export function formatLocal(n: number, lang: Language, currencyCode: string): string {
  return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
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
