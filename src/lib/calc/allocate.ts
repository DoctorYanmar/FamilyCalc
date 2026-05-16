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
): LayerInfo {
  if (candidates.length === 0 || amount <= 0 || timeDays <= 0) {
    return {
      amountRub: amount,
      timeDays,
      candidates,
      incomeRangeRub: { low: 0, high: 0 },
      incomeMidRub: 0,
    };
  }
  let lowestRate = Infinity;
  let highestRate = -Infinity;
  for (const c of candidates) {
    const r1 = cbrPct + c.cbrOffset.low;
    const r2 = cbrPct + c.cbrOffset.high;
    if (r1 < lowestRate) lowestRate = r1;
    if (r2 > highestRate) highestRate = r2;
  }
  const factor = (timeDays / 365);
  const low  = amount * (lowestRate  / 100) * factor;
  const high = amount * (highestRate / 100) * factor;
  return {
    amountRub: amount,
    timeDays,
    candidates,
    incomeRangeRub: { low, high },
    incomeMidRub: (low + high) / 2,
  };
}

function candidatesFor(layer: LayerKey, regime: ReturnType<typeof regimeFor>): InstrumentClass[] {
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
    A: layerInfo(amounts.A, tA, candA, inputs.cbrKeyRatePct),
    B: layerInfo(amounts.B, tB, candB, inputs.cbrKeyRatePct),
    C: layerInfo(amounts.C, tC, candC, inputs.cbrKeyRatePct),
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
