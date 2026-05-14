import type { Inputs, SimulationResult, DayPoint, AssetMix, GoalEvent } from './types';

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.4375;  // 365.25 / 12 (Gregorian average)

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

  // All buckets exhausted; record overspend as negative rubBank so totalRub goes
  // negative on this day and runsOutOn fires.
  assets.rubBank -= remaining;
}

export function simulate(inputs: Inputs, today: Date): SimulationResult {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const voyage = fromISO(inputs.voyageDate);
  const totalDays = Math.max(0, Math.floor((voyage.getTime() - start.getTime()) / MS_PER_DAY) + 1);

  if (totalDays === 0) {
    const investmentTotal = inputs.investments.reduce((s, i) => s + i.amountRub, 0);
    return {
      days: [],
      balanceAtVoyage: totalRub(inputs.assets, inputs.rubPerUsd, investmentTotal),
      runsOutOn: null,
      daysOfRunway: 0,
      totalSpentRub: 0,
      totalInvestmentYieldRub: 0,
    };
  }

  const assets: AssetMix = { ...inputs.assets };
  // Per-investment mutable balances
  const investmentBalances: number[] = inputs.investments.map(i => i.amountRub);

  let totalSpent = 0;
  let totalYield = 0;
  const dailyExpense = inputs.monthlyFamilyRub / DAYS_PER_MONTH;
  const days: DayPoint[] = [];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    const todayISO = toISO(d);
    const todaysEvents: GoalEvent[] = [];

    // 1. Daily expense
    if (dailyExpense > 0) {
      drain(assets, dailyExpense, inputs.rubPerUsd);
      totalSpent += dailyExpense;
    }

    // 2. Lump goals
    for (const g of inputs.goals) {
      if (!g.enabled) continue;
      if (g.mode === 'lump' && g.date === todayISO) {
        drain(assets, g.amountRub, inputs.rubPerUsd);
        totalSpent += g.amountRub;
        todaysEvents.push({ goalId: g.id, name: g.name, amountRub: g.amountRub });
      }
    }

    // 3. Spread goals
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

    // 4. Investment yield
    for (let k = 0; k < inputs.investments.length; k++) {
      const inv = inputs.investments[k];
      const dailyRate = Math.pow(1 + inv.annualRatePct / 100, 1 / 365) - 1;
      if (inv.reinvest) {
        const grow = investmentBalances[k] * dailyRate;
        investmentBalances[k] += grow;
        totalYield += grow;
      } else {
        const payout = investmentBalances[k] * dailyRate;
        assets.rubBank += payout;
        totalYield += payout;
      }
    }

    const investmentTotal = investmentBalances.reduce((a, b) => a + b, 0);
    days.push({
      date: todayISO,
      totalRub: totalRub(assets, inputs.rubPerUsd, investmentTotal),
      assetsRub: { ...assets },
      events: todaysEvents,
      investmentValueRub: investmentTotal,
    });
  }

  // Find runs-out date: first day where totalRub <= 0
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

  return {
    days,
    balanceAtVoyage: days[days.length - 1].totalRub,
    runsOutOn,
    daysOfRunway,
    totalSpentRub: totalSpent,
    totalInvestmentYieldRub: totalYield,
  };
}
