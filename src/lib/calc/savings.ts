import type { SavingsInstrument } from './types';

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.4375;

function fromISO(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

function termDays(inst: SavingsInstrument): number | null {
  if (inst.termMonths === null) return null;
  return Math.round(inst.termMonths * DAYS_PER_MONTH);
}

export function maturityDate(inst: SavingsInstrument): Date | null {
  const td = termDays(inst);
  if (td === null) return null;
  return new Date(fromISO(inst.startDate).getTime() + td * MS_PER_DAY);
}

export function accruedValue(inst: SavingsInstrument, day: Date): number {
  const start = fromISO(inst.startDate);
  if (day.getTime() < start.getTime()) return 0;

  const rawT = Math.floor((day.getTime() - start.getTime()) / MS_PER_DAY);
  const td = termDays(inst);
  const t = td === null ? rawT : Math.min(rawT, td);

  const r = inst.annualRatePct / 100;
  switch (inst.compounding) {
    case 'daily':
      return inst.amountRub * Math.pow(1 + r / 365, t);
    case 'monthly':
      return inst.amountRub * Math.pow(1 + r / 12, t / DAYS_PER_MONTH);
    case 'at-maturity':
      return inst.amountRub * (1 + r * t / 365);
  }
}
