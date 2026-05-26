import type { Inputs, SimulationResult, DayPoint, AssetMix, GoalEvent } from './types';
import { maturityDate, accruedValue } from './savings';

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.4375;  // 365.25 / 12 (Gregorian average)

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromISO(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

function totalRub(assets: AssetMix, rate: number): number {
  return assets.rubBank + assets.usdBank * rate + assets.usdCash * rate;
}

function drain(assets: AssetMix, rubAmount: number, rate: number): void {
  let remaining = rubAmount;
  const fromRub = Math.min(assets.rubBank, remaining);
  assets.rubBank -= fromRub;
  remaining -= fromRub;
  if (remaining <= 0) return;

  const fromUsdBank = Math.min(assets.usdBank, remaining / rate);
  assets.usdBank -= fromUsdBank;
  remaining -= fromUsdBank * rate;
  if (remaining <= 0) return;

  const fromUsdCash = Math.min(assets.usdCash, remaining / rate);
  assets.usdCash -= fromUsdCash;
  remaining -= fromUsdCash * rate;
  if (remaining <= 0) return;

  // All buckets exhausted; record overspend as negative rubBank so totalRub goes
  // negative on this day and runsOutOn fires.
  assets.rubBank -= remaining;
}

export function simulate(inputs: Inputs, today: Date): SimulationResult {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const voyage = fromISO(inputs.voyageDate);
  const totalDays = Math.max(0, Math.floor((voyage.getTime() - start.getTime()) / MS_PER_DAY) + 1);

  if (totalDays === 0) {
    const earlyAssets: AssetMix = { ...inputs.assets };
    if (inputs.freeCashRub > 0) drain(earlyAssets, inputs.freeCashRub, inputs.rubPerUsd);
    return {
      days: [],
      balanceAtVoyage: totalRub(earlyAssets, inputs.rubPerUsd),
      runsOutOn: null,
      daysOfRunway: 0,
      totalSpentRub: 0,
      totalPrincipalRub: 0,
      totalAccruedInterestRub: 0,
    };
  }

  const assets: AssetMix = { ...inputs.assets };
  // Free cash is locked up in savings instruments — not available to cover
  // expenses or goals. Deduct it from the wallet before the daily loop.
  // (Do NOT add to totalSpent; "set aside" is not the same as "spent".)
  if (inputs.freeCashRub > 0) {
    drain(assets, inputs.freeCashRub, inputs.rubPerUsd);
  }
  let totalSpent = 0;
  const dailyExpense = inputs.monthlyFamilyRub / DAYS_PER_MONTH;
  const days: DayPoint[] = [];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    const todayISO = toISO(d);
    const todaysEvents: GoalEvent[] = [];

    if (dailyExpense > 0) {
      drain(assets, dailyExpense, inputs.rubPerUsd);
      totalSpent += dailyExpense;
    }

    for (const g of inputs.goals) {
      if (!g.enabled) continue;
      if (g.mode === 'lump' && g.date === todayISO) {
        drain(assets, g.amountRub, inputs.rubPerUsd);
        totalSpent += g.amountRub;
        todaysEvents.push({ goalId: g.id, name: g.name, amountRub: g.amountRub });
      }
    }

    for (const g of inputs.goals) {
      if (!g.enabled || g.mode !== 'spread') continue;
      const startD = g.date;
      const endD = g.endDate ?? g.date;
      if (endD < startD) continue;
      if (todayISO < startD || todayISO > endD) continue;
      const rangeDays = Math.floor(
        (fromISO(endD).getTime() - fromISO(startD).getTime()) / MS_PER_DAY
      ) + 1;
      const perDay = g.amountRub / rangeDays;
      drain(assets, perDay, inputs.rubPerUsd);
      totalSpent += perDay;
      todaysEvents.push({ goalId: g.id, name: g.name, amountRub: perDay });
    }

    days.push({
      date: todayISO,
      totalRub: totalRub(assets, inputs.rubPerUsd),
      assetsRub: { ...assets },
      events: todaysEvents,
    });
  }

  let runsOutOn: string | null = null;
  for (const d of days) {
    if (d.totalRub <= 0) {
      runsOutOn = d.date;
      break;
    }
  }
  const daysOfRunway = runsOutOn
    ? days.findIndex(d => d.date === runsOutOn)
    : totalDays - 1;

  // Savings 2.0 at-voyage accrued bonus.
  let totalPrincipalRub = 0;
  let totalAccruedInterestRub = 0;
  let accruedBonus = 0;
  for (const si of inputs.savingsInstruments) {
    if (!si.enabled) continue;
    const m = maturityDate(si);
    const stillLockedAtVoyage = m === null || m.getTime() > voyage.getTime();
    if (!stillLockedAtVoyage) {
      // Will mature in-window — Task 5 handles the payout into rubBank.
      // For now, count toward totals only.
      totalPrincipalRub += si.amountRub;
      totalAccruedInterestRub += accruedValue(si, m!) - si.amountRub;
      continue;
    }
    const valueAtVoyage = accruedValue(si, voyage);
    const isOpenEnded = m === null;
    const bonusInterest = (inputs.includeExpectedYield || isOpenEnded) ? valueAtVoyage - si.amountRub : 0;
    accruedBonus += si.amountRub + bonusInterest;
    totalPrincipalRub += si.amountRub;
    totalAccruedInterestRub += bonusInterest;
  }

  return {
    days,
    balanceAtVoyage: days[days.length - 1].totalRub + accruedBonus,
    runsOutOn,
    daysOfRunway,
    totalSpentRub: totalSpent,
    totalPrincipalRub,
    totalAccruedInterestRub,
  };
}
