import { describe, it, expect } from 'vitest';
import { CURRENCIES, currencyByCode, currencySymbol } from '../../src/lib/calc/currencies';

describe('CURRENCIES catalog', () => {
  it('contains at least 15 currencies', () => {
    expect(CURRENCIES.length).toBeGreaterThanOrEqual(15);
  });

  it('every entry has code, symbol, name, nameRu', () => {
    for (const c of CURRENCIES) {
      expect(c.code).toBeTruthy();
      expect(c.symbol).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.nameRu).toBeTruthy();
    }
  });

  it('includes RUB, PHP, EUR', () => {
    const codes = CURRENCIES.map(c => c.code);
    expect(codes).toContain('RUB');
    expect(codes).toContain('PHP');
    expect(codes).toContain('EUR');
  });

  it('has no duplicate codes', () => {
    const codes = CURRENCIES.map(c => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('currencyByCode', () => {
  it('returns correct entry for PHP', () => {
    const php = currencyByCode('PHP');
    expect(php.code).toBe('PHP');
    expect(php.symbol).toBe('₱');
    expect(php.name).toBe('Philippine peso');
  });

  it('throws on unknown code', () => {
    expect(() => currencyByCode('INVALID')).toThrow(/Unknown currency/);
  });
});

describe('currencySymbol', () => {
  it('returns ₽ for RUB', () => {
    expect(currencySymbol('RUB')).toBe('₽');
  });

  it('returns € for EUR', () => {
    expect(currencySymbol('EUR')).toBe('€');
  });
});
