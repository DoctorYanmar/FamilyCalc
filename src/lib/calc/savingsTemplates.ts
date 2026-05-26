import type { Compounding, SavingsTemplateId } from './types';

export type SavingsTemplate = {
  id: SavingsTemplateId;
  defaultCompounding: Compounding;
  defaultTermMonths: number | null;
  termFixed: boolean;
};

export const SAVINGS_TEMPLATES: readonly SavingsTemplate[] = [
  { id: 'savings_account', defaultCompounding: 'daily',       defaultTermMonths: null, termFixed: true  },
  { id: 'term_deposit',    defaultCompounding: 'monthly',     defaultTermMonths: 12,   termFixed: false },
  { id: 'mm_fund',         defaultCompounding: 'daily',       defaultTermMonths: null, termFixed: true  },
  { id: 'ofz_pd',          defaultCompounding: 'at-maturity', defaultTermMonths: 36,   termFixed: false },
  { id: 'ofz_pk',          defaultCompounding: 'at-maturity', defaultTermMonths: 36,   termFixed: false },
  { id: 'corp_bond',       defaultCompounding: 'at-maturity', defaultTermMonths: 24,   termFixed: false },
  { id: 'custom',          defaultCompounding: 'monthly',     defaultTermMonths: 12,   termFixed: false },
];

export function templateById(id: SavingsTemplateId): SavingsTemplate {
  const t = SAVINGS_TEMPLATES.find(t => t.id === id);
  if (!t) throw new Error(`Unknown template id: ${id}`);
  return t;
}
