import { describe, it, expect } from 'vitest';
import { formatLocal, formatUsd, formatDate } from '../src/lib/format';

describe('formatLocal', () => {
  it('formats RUB in RU locale with ₽ symbol', () => {
    const result = formatLocal(1_250_000, 'ru', 'RUB');
    expect(result).toMatch(/₽/);
    expect(result).toMatch(/1\s?250\s?000/);
  });

  it('formats RUB in EN locale with RUB indicator', () => {
    const result = formatLocal(1_250_000, 'en', 'RUB');
    expect(result).toMatch(/RUB/);
    expect(result).toMatch(/1,250,000/);
  });

  it('formats PHP with ₱ symbol', () => {
    const result = formatLocal(50_000, 'en', 'PHP');
    expect(result).toMatch(/₱/);
    expect(result).toMatch(/50,000/);
  });

  it('formats EUR with € symbol', () => {
    const result = formatLocal(1_234, 'en', 'EUR');
    expect(result).toMatch(/€/);
  });

  it('formats PLN with zł', () => {
    const result = formatLocal(10_000, 'en', 'PLN');
    expect(result).toMatch(/PLN|zł/);
  });

  it('never shows decimal places', () => {
    const result = formatLocal(1234.56, 'en', 'PHP');
    expect(result).not.toMatch(/\.\d/);
  });
});

describe('formatUsd', () => {
  it('formats USD without decimals', () => {
    expect(formatUsd(13_888, 'en')).toMatch(/\$\s?13,888/);
  });
});

describe('formatDate', () => {
  it('formats date per locale', () => {
    expect(formatDate('2026-10-01', 'en')).toMatch(/Oct/);
    expect(formatDate('2026-10-01', 'ru')).toMatch(/окт/);
  });
});
