import type { Compounding, Language, SavingsTemplateId } from './types';

export type SavingsTemplate = {
  id: SavingsTemplateId;
  defaultCompounding: Compounding;
  defaultTermMonths: number | null;
  termFixed: boolean;
  locales: readonly Language[];
};

export const SAVINGS_TEMPLATES: readonly SavingsTemplate[] = [
  { id: 'savings_account', defaultCompounding: 'daily',       defaultTermMonths: null, termFixed: true,  locales: ['ru', 'en'] },
  { id: 'term_deposit',    defaultCompounding: 'monthly',     defaultTermMonths: 12,   termFixed: false, locales: ['ru', 'en'] },
  { id: 'mm_fund',         defaultCompounding: 'daily',       defaultTermMonths: null, termFixed: true,  locales: ['ru', 'en'] },
  { id: 'ofz_pd',          defaultCompounding: 'at-maturity', defaultTermMonths: 36,   termFixed: false, locales: ['ru'] },
  { id: 'ofz_pk',          defaultCompounding: 'at-maturity', defaultTermMonths: 36,   termFixed: false, locales: ['ru'] },
  { id: 'corp_bond',       defaultCompounding: 'at-maturity', defaultTermMonths: 24,   termFixed: false, locales: ['ru'] },
  { id: 'custom',          defaultCompounding: 'monthly',     defaultTermMonths: 12,   termFixed: false, locales: ['ru', 'en'] },
];

export function templateById(id: SavingsTemplateId): SavingsTemplate {
  const t = SAVINGS_TEMPLATES.find(t => t.id === id);
  if (!t) throw new Error(`Unknown template id: ${id}`);
  return t;
}

export function templatesForLocale(lang: Language): readonly SavingsTemplate[] {
  return SAVINGS_TEMPLATES.filter(t => t.locales.includes(lang));
}
