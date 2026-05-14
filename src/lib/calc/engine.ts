import type { Inputs, SimulationResult, DayPoint, AssetMix } from './types';

const MS_PER_DAY = 86_400_000;

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromISO(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

function totalRub(assets: AssetMix, rate: number, investmentTotal: number): number {
  return assets.rubBank + assets.usdBank * rate + assets.usdCash * rate + investmentTotal;
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
  const investmentTotalStart = inputs.investments.reduce((s, i) => s + i.amountRub, 0);

  const days: DayPoint[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    const t = totalRub(assets, inputs.rubPerUsd, investmentTotalStart);
    days.push({
      date: toISO(d),
      totalRub: t,
      assetsRub: { ...assets },
      events: [],
      investmentValueRub: investmentTotalStart,
    });
  }

  const balanceAtVoyage = days[days.length - 1].totalRub;
  return {
    days,
    balanceAtVoyage,
    runsOutOn: null,
    daysOfRunway: totalDays - 1,
    totalSpentRub: 0,
    totalInvestmentYieldRub: 0,
  };
}
