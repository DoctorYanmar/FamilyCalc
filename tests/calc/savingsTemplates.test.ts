import { describe, it, expect } from 'vitest';
import { SAVINGS_TEMPLATES, templatesForLocale, templateById } from '../../src/lib/calc/savingsTemplates';

describe('SAVINGS_TEMPLATES', () => {
  it('every template has a locales array with at least one entry', () => {
    for (const t of SAVINGS_TEMPLATES) {
      expect(t.locales.length).toBeGreaterThan(0);
    }
  });
});

describe('templatesForLocale', () => {
  it('RU returns all 7 templates', () => {
    const ru = templatesForLocale('ru');
    expect(ru).toHaveLength(7);
  });

  it('EN returns 4 templates — no ofz_pd, ofz_pk, corp_bond', () => {
    const en = templatesForLocale('en');
    expect(en).toHaveLength(4);
    const ids = en.map(t => t.id);
    expect(ids).toContain('savings_account');
    expect(ids).toContain('term_deposit');
    expect(ids).toContain('mm_fund');
    expect(ids).toContain('custom');
    expect(ids).not.toContain('ofz_pd');
    expect(ids).not.toContain('ofz_pk');
    expect(ids).not.toContain('corp_bond');
  });

  it('templateById still finds Russia-only templates (data compat)', () => {
    expect(templateById('ofz_pd').id).toBe('ofz_pd');
    expect(templateById('corp_bond').id).toBe('corp_bond');
  });
});
