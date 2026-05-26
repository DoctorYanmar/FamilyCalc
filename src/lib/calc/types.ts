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

export type Compounding = 'daily' | 'monthly' | 'at-maturity';

export type SavingsTemplateId =
  | 'savings_account'
  | 'term_deposit'
  | 'mm_fund'
  | 'ofz_pd'
  | 'ofz_pk'
  | 'corp_bond'
  | 'custom';

export type SavingsInstrument = {
  id: ID;
  name: string;
  templateId: SavingsTemplateId;
  amountRub: number;
  annualRatePct: number;
  startDate: ISODate;
  termMonths: number | null;
  compounding: Compounding;
  enabled: boolean;
};

export type Inputs = {
  returnDate: ISODate;
  voyageDate: ISODate;
  salaryLumpSumUsd: number;
  assets: AssetMix;
  rubPerUsd: number;
  monthlyFamilyRub: number;
  goals: Goal[];
  includeExpectedYield: boolean;
  savingsInstruments: SavingsInstrument[];
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
  totalPrincipalRub: number;
  totalAccruedInterestRub: number;
};

export type CombinedResult = {
  sim: SimulationResult;
  balanceAtVoyage: number;
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
  schemaVersion: 4;
  activeScenarioId: ID;
  scenarios: Record<ID, Scenario>;
  ui: {
    language: Language;
    theme: Theme;
    openSections: Record<string, boolean>;
  };
};
