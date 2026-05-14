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

export type InstrumentKind =
  | 'vkladRub'
  | 'ofz'
  | 'corpBond'
  | 'stock'
  | 'longBond'
  | 'custom';

export type Investment = {
  id: ID;
  kind: InstrumentKind;
  name: string;
  amountRub: number;
  annualRatePct: number;
  reinvest: boolean;
};

export type Inputs = {
  returnDate: ISODate;
  voyageDate: ISODate;
  salaryLumpSumUsd: number;
  assets: AssetMix;
  rubPerUsd: number;
  monthlyFamilyRub: number;
  goals: Goal[];
  investments: Investment[];
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
  investmentValueRub: number;
};

export type SimulationResult = {
  days: DayPoint[];
  balanceAtVoyage: number;
  runsOutOn: ISODate | null;
  daysOfRunway: number;
  totalSpentRub: number;
  totalInvestmentYieldRub: number;
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
  schemaVersion: 1;
  activeScenarioId: ID;
  scenarios: Record<ID, Scenario>;
  ui: {
    language: Language;
    theme: Theme;
    openSections: Record<string, boolean>;
  };
};
