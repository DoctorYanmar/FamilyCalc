import { describe, it, expect } from 'vitest';
import { formatRub, formatUsd, formatDate } from '../src/lib/format';

describe('format helpers', () => {
  it('formats RUB without decimals', () => {
    expect(formatRub(1_250_000, 'ru')).toMatch(/1\s?250\s?000/);
    expect(formatRub(1_250_000, 'en')).toMatch(/1,250,000/);
  });
  it('formats USD without decimals', () => {
    expect(formatUsd(13_888, 'en')).toMatch(/\$\s?13,888/);
  });
  it('formats date per locale', () => {
    expect(formatDate('2026-10-01', 'en')).toMatch(/Oct/);
    expect(formatDate('2026-10-01', 'ru')).toMatch(/окт/);
  });
});
