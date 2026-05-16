import type { Regime } from './types';

export function regimeFor(cbrPct: number): Regime {
  if (cbrPct >= 15) return 'high';
  if (cbrPct >= 10) return 'moderate';
  return 'low';
}

import type {
  Inputs,
  AllocationResult,
  LayerInfo,
  LayerKey,
  InstrumentClass,
  LayerPicks,
  ClassPick,
  Preset,
  Risk,
} from './types';
import { INSTRUMENT_CLASSES } from './instrumentClasses';

const MS_PER_DAY = 86_400_000;

function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function startOfUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

type AutoSplit = { A: number; B: number; C: number };

function autoSplit(inputs: Inputs, today: Date): AutoSplit {
  const t0 = startOfUtc(today);
  const t30 = new Date(t0.getTime() + 30 * MS_PER_DAY);
  const t180 = new Date(t0.getTime() + 180 * MS_PER_DAY);

  let A = inputs.monthlyFamilyRub;
  let B = 0;
  for (const g of inputs.goals) {
    if (!g.enabled) continue;
    const gd = isoToDate(g.date);
    if (gd >= t0 && gd <= t30) {
      A += g.amountRub;
    } else if (gd > t30 && gd <= t180) {
      B += g.amountRub;
    }
  }

  if (A + B > inputs.freeCashRub) {
    const total = A + B;
    if (total > 0) {
      A = (A * inputs.freeCashRub) / total;
      B = (B * inputs.freeCashRub) / total;
    } else {
      A = 0; B = 0;
    }
    return { A, B, C: 0 };
  }
  const C = Math.max(0, inputs.freeCashRub - A - B);
  return { A, B, C };
}

function effectiveAmount(auto: number, override: number | undefined): number {
  return override === undefined ? auto : override;
}

function layerInfo(
  amount: number,
  timeDays: number,
  candidates: InstrumentClass[],
  cbrPct: number,
  picks: LayerPicks,
): LayerInfo {
  const factor = timeDays / 365;

  type Pick = {
    cls: InstrumentClass;
    share: number;
    incomeLow: number;
    incomeHigh: number;
    incomeMid: number;
  };

  const pickedClasses: Pick[] = [];
  let sumLow = 0;
  let sumHigh = 0;
  let sumShare = 0;

  for (const c of candidates) {
    const entry = picks.classes[c.id];
    if (!entry || entry.share <= 0) continue;
    const share = entry.share;
    const rateLow  = cbrPct + c.cbrOffset.low;
    const rateHigh = cbrPct + c.cbrOffset.high;
    const incomeLow  = share * (rateLow  / 100) * factor;
    const incomeHigh = share * (rateHigh / 100) * factor;
    pickedClasses.push({
      cls: c,
      share,
      incomeLow,
      incomeHigh,
      incomeMid: (incomeLow + incomeHigh) / 2,
    });
    sumLow  += incomeLow;
    sumHigh += incomeHigh;
    sumShare += share;
  }

  const unallocatedRub  = Math.max(0, amount - sumShare);
  const overAllocatedRub = Math.max(0, sumShare - amount);

  return {
    amountRub: amount,
    timeDays,
    candidates,
    pickedClasses,
    incomeRangeRub: { low: sumLow, high: sumHigh },
    incomeMidRub: (sumLow + sumHigh) / 2,
    unallocatedRub,
    overAllocatedRub,
  };
}

export function candidatesFor(layer: LayerKey, regime: Regime): InstrumentClass[] {
  return INSTRUMENT_CLASSES.filter(c =>
    c.applicableLayers.includes(layer) &&
    c.applicableRegimes.includes(regime),
  );
}

export function allocate(inputs: Inputs, today: Date): AllocationResult {
  const regime = regimeFor(inputs.cbrKeyRatePct);
  const t0 = startOfUtc(today);
  const horizon = isoToDate(inputs.horizonDate);
  const horizonDays = Math.max(0, daysBetween(t0, horizon));

  const auto = autoSplit(inputs, today);
  const amounts = {
    A: effectiveAmount(auto.A, inputs.layerOverride.A),
    B: effectiveAmount(auto.B, inputs.layerOverride.B),
    C: effectiveAmount(auto.C, inputs.layerOverride.C),
  };

  const tA = Math.min(30, horizonDays);
  const tB = Math.max(0, Math.min(horizonDays, 180) - 30);
  const tC = Math.max(0, horizonDays - 180);

  const candA = candidatesFor('A', regime);
  const candB = candidatesFor('B', regime);
  const candC = candidatesFor('C', regime);

  const layers = {
    A: layerInfo(amounts.A, tA, candA, inputs.cbrKeyRatePct, inputs.savingsPicks.A),
    B: layerInfo(amounts.B, tB, candB, inputs.cbrKeyRatePct, inputs.savingsPicks.B),
    C: layerInfo(amounts.C, tC, candC, inputs.cbrKeyRatePct, inputs.savingsPicks.C),
  };

  const asvWarningLayers: LayerKey[] = [];
  for (const key of ['A', 'B', 'C'] as const) {
    const L = layers[key];
    const hasDeposit = L.candidates.some(c => c.isDeposit);
    if (hasDeposit && L.amountRub > 1_400_000) asvWarningLayers.push(key);
  }

  const taxThresholdRub = (inputs.cbrKeyRatePct / 100) * 1_000_000;

  return {
    regime,
    horizonDays,
    layers,
    taxThresholdRub,
    asvWarningLayers,
  };
}

const PRESET_RISK_FILTER: Record<Exclude<Preset, 'custom'>, ReadonlySet<Risk>> = {
  cons: new Set(['cons']),
  bal:  new Set(['cons', 'std']),
  all:  new Set(['cons', 'std', 'high']),
};

export function autoFillFromPreset(
  layerAmountRub: number,
  candidates: InstrumentClass[],
  preset: Exclude<Preset, 'custom'>,
): Record<string, ClassPick> {
  if (layerAmountRub <= 0) return {};
  const allow = PRESET_RISK_FILTER[preset];
  const filtered = candidates.filter(c => allow.has(c.risk));
  if (filtered.length === 0) return {};
  const base = Math.floor(layerAmountRub / filtered.length);
  const remainder = layerAmountRub - base * filtered.length;
  const out: Record<string, ClassPick> = {};
  filtered.forEach((c, i) => {
    const share = i === filtered.length - 1 ? base + remainder : base;
    out[c.id] = { share };
  });
  return out;
}

export function autoAllocateLayerAmounts(
  inputs: Pick<Inputs, 'freeCashRub' | 'monthlyFamilyRub' | 'goals' | 'layerOverride'>,
  today: Date,
): { A: number; B: number; C: number } {
  const auto = autoSplit(inputs as Inputs, today);
  return {
    A: effectiveAmount(auto.A, inputs.layerOverride.A),
    B: effectiveAmount(auto.B, inputs.layerOverride.B),
    C: effectiveAmount(auto.C, inputs.layerOverride.C),
  };
}
