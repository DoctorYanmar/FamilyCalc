export type ID = string;
export type ISODate = string;
export type Currency = 'RUB' | 'USD';

export type AssetMix = {
  usdBank: number;
  usdCash: number;
  rubBank: number;
};

export type GoalMode = 'lump' | 'spread';

export type Goal = {
  id: ID;
  name: string;
  amountRub: number;
  mode: GoalMode;
  date: ISODate;
  endDate?: ISODate;
  enabled: boolean;
};

export type Regime = 'high' | 'moderate' | 'low';
export type LayerKey = 'A' | 'B' | 'C';
export type Liquidity = 'daily' | 'fixed-term' | 'secondary-market';
export type ClassCurrency = 'RUB' | 'USD-settled' | 'CNY' | 'Gold';

export type InstrumentClass = {
  id: string;
  liquidity: Liquidity;
  cbrOffset: { low: number; high: number };
  currency: ClassCurrency;
  isDeposit: boolean;
  applicableLayers: LayerKey[];
  applicableRegimes: Regime[];
};

export type LayerOverride = { A?: number; B?: number; C?: number };

export type Inputs = {
  returnDate: ISODate;
  voyageDate: ISODate;
  salaryLumpSumUsd: number;
  assets: AssetMix;
  rubPerUsd: number;
  monthlyFamilyRub: number;
  goals: Goal[];
  // savings framework
  freeCashRub: number;
  horizonDate: ISODate;
  cbrKeyRatePct: number;
  cbrRateUpdatedAt: ISODate;
  layerOverride: LayerOverride;
  includeExpectedYield: boolean;
};

export type GoalEvent = {
  goalId: ID;
  name: string;
  amountRub: number;
};

export type DayPoint = {
  date: ISODate;
  totalRub: number;
  assetsRub: AssetMix;
  events: GoalEvent[];
};

export type SimulationResult = {
  days: DayPoint[];
  balanceAtVoyage: number;
  runsOutOn: ISODate | null;
  daysOfRunway: number;
  totalSpentRub: number;
};

export type LayerInfo = {
  amountRub: number;
  timeDays: number;
  candidates: InstrumentClass[];
  incomeRangeRub: { low: number; high: number };
  incomeMidRub: number;
};

export type AllocationResult = {
  regime: Regime;
  horizonDays: number;
  layers: { A: LayerInfo; B: LayerInfo; C: LayerInfo };
  taxThresholdRub: number;
  asvWarningLayers: LayerKey[];
};

export type CombinedResult = {
  sim: SimulationResult;
  alloc: AllocationResult;
  balanceAtVoyage: number;
  expectedYieldMid: number;
};

export type Scenario = {
  id: ID;
  name: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  inputs: Inputs;
};

export type Language = 'ru' | 'en';
export type Theme = 'dark' | 'light';

export type AppState = {
  schemaVersion: 2;
  activeScenarioId: ID;
  scenarios: Record<ID, Scenario>;
  ui: {
    language: Language;
    theme: Theme;
    openSections: Record<string, boolean>;
  };
};
