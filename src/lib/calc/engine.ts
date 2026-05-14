import type { Inputs, SimulationResult, DayPoint, AssetMix, GoalEvent } from './types';

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.4375;

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromISO(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

function totalRub(assets: AssetMix, rate: number, investmentTotal: number): number {
  return assets.rubBank + assets.usdBank * rate + assets.usdCash * rate + investmentTotal;
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

  // Negative — model overspend by going negative on rubBank
  assets.rubBank -= remaining;
}

export function simulate(inputs: Inputs, today: Date): SimulationResult {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const voyage = fromISO(inputs.voyageDate);
  const totalDays = Math.max(0, Math.floor((voyage.getTime() - start.getTime()) / MS_PER_DAY) + 1);

  if (totalDays === 0) {
    return {
      days: [],
      balanceAtVoyage: totalRub(inputs.assets, inputs.rubPerUsd, 0),
      runsOutOn: null,
      daysOfRunway: 0,
      totalSpentRub: 0,
      totalInvestmentYieldRub: 0,
    };
  }

  const assets: AssetMix = { ...inputs.assets };
  let investmentTotal = inputs.investments.reduce((s, i) => s + i.amountRub, 0);
  let totalSpent = 0;
  const dailyExpense = inputs.monthlyFamilyRub / DAYS_PER_MONTH;

  const days: DayPoint[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    const todayISO = toISO(d);
    const todaysEvents: GoalEvent[] = [];

    // Apply daily expense
    if (dailyExpense > 0) {
      drain(assets, dailyExpense, inputs.rubPerUsd);
      totalSpent += dailyExpense;
    }

    // Apply lump goals due today
    for (const g of inputs.goals) {
      if (!g.enabled) continue;
      if (g.mode === 'lump' && g.date === todayISO) {
        drain(assets, g.amountRub, inputs.rubPerUsd);
        totalSpent += g.amountRub;
        todaysEvents.push({ goalId: g.id, name: g.name, amountRub: g.amountRub });
      }
    }

    // Apply spread goals active today
    for (const g of inputs.goals) {
      if (!g.enabled || g.mode !== 'spread') continue;
      const startD = g.date;
      const endD = g.endDate ?? g.date;
      if (endD < startD) continue;       // invalid range, skip
      if (todayISO < startD || todayISO > endD) continue;
      const rangeDays = Math.floor(
        (fromISO(endD).getTime() - fromISO(startD).getTime()) / MS_PER_DAY
      ) + 1;
      const perDay = g.amountRub / rangeDays;
      drain(assets, perDay, inputs.rubPerUsd);
      totalSpent += perDay;
      todaysEvents.push({ goalId: g.id, name: g.name, amountRub: perDay });
    }

    const t = totalRub(assets, inputs.rubPerUsd, investmentTotal);
    days.push({
      date: todayISO,
      totalRub: t,
      assetsRub: { ...assets },
      events: todaysEvents,
      investmentValueRub: investmentTotal,
    });
  }

  return {
    days,
    balanceAtVoyage: days[days.length - 1].totalRub,
    runsOutOn: null,
    daysOfRunway: totalDays - 1,
    totalSpentRub: totalSpent,
    totalInvestmentYieldRub: 0,
  };
}
