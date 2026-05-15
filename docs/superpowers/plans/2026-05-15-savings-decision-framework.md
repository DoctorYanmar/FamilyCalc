# Savings Decision Framework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-instrument savings UI with a horizon × regime decision framework that maps free cash to classes of conservative instruments, while preserving every other calculator feature.

**Architecture:** A new pure function `allocate(inputs, today)` runs alongside the existing pure `simulate(inputs, today)`. The Svelte reactive layer combines both via a new `combineResult()` helper. The engine drains cash only; expected yield is an opt-in overlay on the headline balance. A new two-column layout puts Layer A/B/C cards as the hero, with all inputs collapsing into a sidebar.

**Tech Stack:** Svelte 5 (runes), TypeScript 5, Vite 5, Vitest 1, svelte-i18n 4, Chart.js 4 (unchanged).

**Spec:** `docs/superpowers/specs/2026-05-15-savings-decision-framework-design.md`

**Commit policy note:** This repo follows "only commit when explicitly asked." Each task ends with a recommended commit command — execute it only if the user has authorized commits for this batch. Otherwise leave the working tree dirty and proceed to the next task.

---

## File map

**Created:**
- `src/lib/calc/allocate.ts` — pure allocation function + regime + per-layer income.
- `src/lib/calc/instrumentClasses.ts` — typed catalog (10 entries).
- `src/components/sections/savings/SavingsInputsCard.svelte` — free cash, CBR, horizon, toggle.
- `src/components/sections/savings/LayerCard.svelte` — one card per layer.
- `src/components/sections/savings/ClassCard.svelte` — one card per instrument class.
- `src/components/sections/savings/TaxBanner.svelte`
- `src/components/sections/savings/AsvWarning.svelte`
- `src/components/sections/savings/SavingsDisclaimer.svelte`
- `tests/calc/allocate.test.ts`
- `tests/state/derived.test.ts`

**Modified:**
- `src/lib/calc/types.ts` — new types, drop `Investment`/`InstrumentKind`, drop `totalInvestmentYieldRub`, drop `DayPoint.investmentValueRub`.
- `src/lib/calc/engine.ts` — drop investments loop.
- `src/lib/state/persistence.ts` — migration v1→v2; updated `defaultScenario()`.
- `src/lib/state/derived.ts` — add `combineResult()` + new `currentResult()` shape.
- `src/lib/i18n/ru.json` — drop `investments.*`, add `savings.*`.
- `src/lib/i18n/en.json` — drop `investments.*`, add `savings.*`.
- `src/components/ResultsHeader.svelte` — adapt to `CombinedResult` shape.
- `src/components/BalanceChart.svelte` — adapt to `CombinedResult` shape.
- `src/components/sections/BreakdownSection.svelte` — adapt to `CombinedResult` shape.
- `src/components/PrintView.svelte` — drop investments block, add savings block.
- `src/App.svelte` — two-column layout, sidebar.
- `tests/calc/engine.test.ts` — drop investment tests, drop investments from fixtures.
- `tests/state/persistence.test.ts` — add v1→v2 migration tests.

**Deleted:**
- `src/components/sections/InvestmentsSection.svelte`

---

## Phase 1 — Foundation: types, catalog, i18n

### Task 1: Update calc/types.ts

**Files:**
- Modify: `src/lib/calc/types.ts`

- [ ] **Step 1: Replace `src/lib/calc/types.ts` with the new shape**

```ts
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
```

- [ ] **Step 2: Run typecheck — it will fail in many places (expected)**

Run: `npm run typecheck`
Expected: errors in `engine.ts`, `persistence.ts`, `scenarios.svelte.ts`, `derived.ts`, `ResultsHeader.svelte`, `BalanceChart.svelte`, `BreakdownSection.svelte`, `InvestmentsSection.svelte`, `PrintView.svelte`, and tests. Those are addressed in later tasks. **Do not try to fix them here.**

- [ ] **Step 3: Recommended commit**

```bash
git add src/lib/calc/types.ts
git commit -m "types: add savings framework types, drop Investment"
```

---

### Task 2: Create the instrument class catalog

**Files:**
- Create: `src/lib/calc/instrumentClasses.ts`

- [ ] **Step 1: Write the file**

```ts
import type { InstrumentClass } from './types';

// IMPORTANT: ids are stable ASCII slugs used as i18n key suffixes
// (savings.classes.<id>.{name|taxNote|riskNote}). Do not rename.
// cbrOffset values are percentage points relative to the user's CBR snapshot.
export const INSTRUMENT_CLASSES: readonly InstrumentClass[] = [
  {
    id: 'savings_account',
    liquidity: 'daily',
    cbrOffset: { low: -3, high: -1 },
    currency: 'RUB',
    isDeposit: true,
    applicableLayers: ['A'],
    applicableRegimes: ['high', 'moderate', 'low'],
  },
  {
    id: 'term_deposit',
    liquidity: 'fixed-term',
    cbrOffset: { low: -0.5, high: 1.5 },
    currency: 'RUB',
    isDeposit: true,
    applicableLayers: ['A', 'B'],
    applicableRegimes: ['high', 'moderate'],
  },
  {
    id: 'mm_fund',
    liquidity: 'daily',
    cbrOffset: { low: -1, high: -0.5 },
    currency: 'RUB',
    isDeposit: false,
    applicableLayers: ['A', 'B'],
    applicableRegimes: ['high', 'moderate', 'low'],
  },
  {
    id: 'ofz_pd',
    liquidity: 'secondary-market',
    cbrOffset: { low: -1, high: 0.5 },
    currency: 'RUB',
    isDeposit: false,
    applicableLayers: ['B', 'C'],
    applicableRegimes: ['high'],
  },
  {
    id: 'ofz_pk',
    liquidity: 'secondary-market',
    cbrOffset: { low: -0.5, high: 0.5 },
    currency: 'RUB',
    isDeposit: false,
    applicableLayers: ['B', 'C'],
    applicableRegimes: ['moderate', 'low'],
  },
  {
    id: 'ofz_in',
    liquidity: 'secondary-market',
    cbrOffset: { low: -7, high: -4 },
    currency: 'RUB',
    isDeposit: false,
    applicableLayers: ['C'],
    applicableRegimes: ['high', 'moderate', 'low'],
  },
  {
    id: 'corp_bond',
    liquidity: 'secondary-market',
    cbrOffset: { low: 0.5, high: 2 },
    currency: 'RUB',
    isDeposit: false,
    applicableLayers: ['B', 'C'],
    applicableRegimes: ['high', 'moderate'],
  },
  {
    id: 'replacement_bond',
    liquidity: 'secondary-market',
    cbrOffset: { low: -10, high: -7 },
    currency: 'USD-settled',
    isDeposit: false,
    applicableLayers: ['C'],
    applicableRegimes: ['moderate', 'low'],
  },
  {
    id: 'cny_bond',
    liquidity: 'secondary-market',
    cbrOffset: { low: -10, high: -7 },
    currency: 'CNY',
    isDeposit: false,
    applicableLayers: ['C'],
    applicableRegimes: ['moderate', 'low'],
  },
  {
    id: 'gold',
    liquidity: 'secondary-market',
    cbrOffset: { low: -16, high: -2 },
    currency: 'Gold',
    isDeposit: false,
    applicableLayers: ['C'],
    applicableRegimes: ['high', 'moderate', 'low'],
  },
];
```

- [ ] **Step 2: Verify catalog typechecks against the new types**

Run: `npx tsc --noEmit src/lib/calc/instrumentClasses.ts`
Expected: no errors specific to this file. (Project-wide typecheck still fails — that is OK.)

- [ ] **Step 3: Recommended commit**

```bash
git add src/lib/calc/instrumentClasses.ts
git commit -m "feat: add instrument class catalog (10 entries)"
```

---

### Task 3: Update RU + EN i18n files

**Files:**
- Modify: `src/lib/i18n/ru.json`
- Modify: `src/lib/i18n/en.json`

- [ ] **Step 1: Replace `src/lib/i18n/ru.json` contents**

```json
{
  "app.title": "Семейный калькулятор",
  "header.scenario": "Сценарий",
  "header.saveAs": "Сохранить как…",
  "header.export": "Экспорт JSON",
  "header.import": "Импорт JSON",
  "header.print": "Печать / PDF",
  "theme.dark": "Тёмная",
  "theme.light": "Светлая",

  "results.burnPerDay": "Расход в день",
  "results.daysUnit": "{n} {n, plural, one {день} few {дня} other {дней}}",
  "results.leftOnVoyage": "Остаток на дату рейса",
  "results.ok": "✓ хватает",
  "results.runsOut": "Деньги закончатся",
  "results.runway": "Запас",
  "results.spent": "Потрачено",
  "results.yield": "Ожидаемый доход",

  "context.title": "Контекст и курс",
  "context.returnDate": "Дата возвращения",
  "context.voyageDate": "Следующий рейс",
  "context.lumpSum": "Зарплата за контракт (USD)",
  "context.rate": "Курс ₽/$",

  "assets.title": "Текущие активы",
  "assets.usdBank": "USD в банке",
  "assets.usdCash": "USD наличные",
  "assets.rubBank": "₽ в банке",
  "assets.totalRub": "Итого в ₽",

  "expenses.title": "Семейные расходы",
  "expenses.monthly": "₽ в месяц",
  "expenses.totalOverLeave": "Всего за отпуск",

  "goals.title": "Цели",
  "goals.add": "+ Добавить цель",
  "goals.name": "Название",
  "goals.amount": "Сумма ₽",
  "goals.mode": "Тип",
  "goals.mode.lump": "разово",
  "goals.mode.spread": "распределить",
  "goals.date": "Дата",
  "goals.endDate": "Конец",
  "goals.delete": "Удалить",
  "goals.enabled": "Учитывать",
  "goals.outsideWindow": "Дата вне периода отпуска",

  "savings.title": "Сбережения",
  "savings.inputs.title": "Параметры сбережений",
  "savings.inputs.freeCash": "Свободные средства ₽",
  "savings.inputs.cbrRate": "Ставка ЦБ РФ, %",
  "savings.inputs.cbrUpdated": "обновлено",
  "savings.inputs.cbrTooltip": "Ставка ЦБ РФ. Меняется на заседаниях ЦБ (раз в 6 недель максимум). Проверьте на cbr.ru.",
  "savings.inputs.horizon": "Горизонт планирования",
  "savings.inputs.includeYield": "Учитывать ожидаемую доходность в остатке к концу горизонта",
  "savings.regime.high": "Ставка ≥ 15%: фиксируем длинные",
  "savings.regime.moderate": "Ставка 10–15%: микс зафиксированного и плавающего",
  "savings.regime.low": "Ставка < 10%: короткие и плавающие",
  "savings.layer.A.name": "Слой A · Оперативный",
  "savings.layer.A.window": "0–30 дней",
  "savings.layer.B.name": "Слой B · Плановый",
  "savings.layer.B.window": "1–6 месяцев",
  "savings.layer.C.name": "Слой C · Резерв",
  "savings.layer.C.window": "6+ месяцев",
  "savings.layerCard.amount": "Сумма ₽",
  "savings.layerCard.resetToAuto": "Сбросить",
  "savings.layerCard.expectedIncome": "Ожидаемый доход за горизонт",
  "savings.layerCard.noCandidates": "Нет подходящих классов для этого режима",
  "savings.classCard.risk": "Риск",
  "savings.liquidity.daily": "ежедневная",
  "savings.liquidity.fixed-term": "срочный",
  "savings.liquidity.secondary-market": "биржа",
  "savings.currency.RUB": "₽",
  "savings.currency.USD-settled": "USD-расч.",
  "savings.currency.CNY": "юань",
  "savings.currency.Gold": "золото",
  "savings.taxBanner": "Необлагаемый порог процентов по вкладам: ≈ {amount} ₽/год. С превышения — НДФЛ 13%.",
  "savings.asvWarning": "Превышен лимит АСВ 1,4 млн ₽ на банк. Рассмотрите разделение.",
  "savings.disclaimer": "Информационный обзор классов инструментов, не индивидуальная инвестиционная рекомендация. Конкретные банки, эмитенты и условия проверяйте самостоятельно.",

  "savings.classes.savings_account.name": "Накопительный счёт с % на остатке",
  "savings.classes.savings_account.taxNote": "Проценты могут попасть под НДФЛ выше порога.",
  "savings.classes.savings_account.riskNote": "Банк может изменить ставку в любой момент. Лимит АСВ 1,4 млн ₽.",
  "savings.classes.term_deposit.name": "Срочный вклад (3/6/12 мес)",
  "savings.classes.term_deposit.taxNote": "НДФЛ 13% с превышения необлагаемого порога.",
  "savings.classes.term_deposit.riskNote": "Досрочное снятие обнуляет проценты. Лимит АСВ 1,4 млн ₽.",
  "savings.classes.mm_fund.name": "Фонд денежного рынка (RUB)",
  "savings.classes.mm_fund.taxNote": "НДФЛ 13% с прибыли при погашении.",
  "savings.classes.mm_fund.riskNote": "Низкий риск, но не вклад: страховки АСВ нет, доход не гарантирован.",
  "savings.classes.ofz_pd.name": "ОФЗ-ПД (постоянный купон)",
  "savings.classes.ofz_pd.taxNote": "Купон облагается НДФЛ 13%.",
  "savings.classes.ofz_pd.riskNote": "Цена падает при росте ставок — продажа до погашения может дать убыток.",
  "savings.classes.ofz_pk.name": "ОФЗ-ПК (флоутер RUONIA)",
  "savings.classes.ofz_pk.taxNote": "Купон облагается НДФЛ 13%.",
  "savings.classes.ofz_pk.riskNote": "Купон следует за RUONIA, цена стабильнее ПД, но доход переменный.",
  "savings.classes.ofz_in.name": "ОФЗ-ИН (инфляционные)",
  "savings.classes.ofz_in.taxNote": "Купон и индексация облагаются НДФЛ 13%.",
  "savings.classes.ofz_in.riskNote": "Защита от инфляции; при низкой инфляции номинальная доходность скромная.",
  "savings.classes.corp_bond.name": "Корпоративные облигации первого эшелона (RUB)",
  "savings.classes.corp_bond.taxNote": "Купон облагается НДФЛ 13%.",
  "savings.classes.corp_bond.riskNote": "Кредитный риск эмитента, ликвидность ниже ОФЗ.",
  "savings.classes.replacement_bond.name": "Замещающие облигации (USD-номинированные)",
  "savings.classes.replacement_bond.taxNote": "Купон в USD облагается НДФЛ 13% по курсу ЦБ.",
  "savings.classes.replacement_bond.riskNote": "Валютный риск, расчёты в рублях по курсу. Ликвидность ограничена.",
  "savings.classes.cny_bond.name": "Юаневые облигации",
  "savings.classes.cny_bond.taxNote": "Купон и переоценка в CNY облагаются НДФЛ 13%.",
  "savings.classes.cny_bond.riskNote": "Валютный риск (CNY/RUB), узкий круг эмитентов.",
  "savings.classes.gold.name": "Золото (биржевое / ОМС / золотые облигации Селигдара)",
  "savings.classes.gold.taxNote": "ОМС: НДФЛ при продаже. Биржевое золото и ЗО: НДФЛ с прибыли, ЛДВ 3 года.",
  "savings.classes.gold.riskNote": "Цена сильно колеблется, защитный, но не доходный актив.",

  "breakdown.title": "Помесячно",
  "breakdown.month": "Месяц",
  "breakdown.open": "Открытие",
  "breakdown.spent": "Расходы",
  "breakdown.goals": "Цели",
  "breakdown.close": "Закрытие",

  "pdf.title": "Семейный бюджет",
  "pdf.scenario": "Сценарий",
  "pdf.preparedOn": "Дата подготовки",
  "pdf.savings": "Распределение сбережений",

  "scenarios.defaultName": "По умолчанию",
  "scenarios.renamePrompt": "Переименовать:",
  "scenarios.deleteConfirm": "Удалить текущий сценарий?",
  "scenarios.replaceConfirm": "Заменить текущие данные на импортированные?",
  "scenarios.invalidBackup": "Неверный файл резервной копии"
}
```

- [ ] **Step 2: Replace `src/lib/i18n/en.json` contents**

```json
{
  "app.title": "FamilyCalc",
  "header.scenario": "Scenario",
  "header.saveAs": "Save as…",
  "header.export": "Export JSON",
  "header.import": "Import JSON",
  "header.print": "Print / PDF",
  "theme.dark": "Dark",
  "theme.light": "Light",

  "results.burnPerDay": "burn / day",
  "results.daysUnit": "{n} {n, plural, one {day} other {days}}",
  "results.leftOnVoyage": "Left on voyage date",
  "results.ok": "✓ OK",
  "results.runsOut": "Money runs out",
  "results.runway": "Runway",
  "results.spent": "spent",
  "results.yield": "Expected yield",

  "context.title": "Context & rate",
  "context.returnDate": "Return date",
  "context.voyageDate": "Next voyage",
  "context.lumpSum": "Contract salary (USD)",
  "context.rate": "Rate ₽/$",

  "assets.title": "Current assets",
  "assets.usdBank": "USD in bank",
  "assets.usdCash": "USD cash",
  "assets.rubBank": "RUB in bank",
  "assets.totalRub": "Total in ₽",

  "expenses.title": "Family expenses",
  "expenses.monthly": "₽ per month",
  "expenses.totalOverLeave": "Total over leave",

  "goals.title": "Goals",
  "goals.add": "+ Add goal",
  "goals.name": "Name",
  "goals.amount": "Amount ₽",
  "goals.mode": "Mode",
  "goals.mode.lump": "lump",
  "goals.mode.spread": "spread",
  "goals.date": "Date",
  "goals.endDate": "End",
  "goals.delete": "Delete",
  "goals.enabled": "Enabled",
  "goals.outsideWindow": "Date outside leave window",

  "savings.title": "Savings",
  "savings.inputs.title": "Savings parameters",
  "savings.inputs.freeCash": "Free cash, ₽",
  "savings.inputs.cbrRate": "CBR key rate, %",
  "savings.inputs.cbrUpdated": "updated",
  "savings.inputs.cbrTooltip": "Russian Central Bank key rate. Changes at CBR meetings (at most every 6 weeks). Check cbr.ru.",
  "savings.inputs.horizon": "Planning horizon",
  "savings.inputs.includeYield": "Include expected yield in end-of-horizon balance",
  "savings.regime.high": "Rate ≥ 15%: lock in fixed long-term",
  "savings.regime.moderate": "Rate 10–15%: mix locked and floating",
  "savings.regime.low": "Rate < 10%: prefer short and floating",
  "savings.layer.A.name": "Layer A · Operational",
  "savings.layer.A.window": "0–30 days",
  "savings.layer.B.name": "Layer B · Planned",
  "savings.layer.B.window": "1–6 months",
  "savings.layer.C.name": "Layer C · Reserve",
  "savings.layer.C.window": "6+ months",
  "savings.layerCard.amount": "Amount ₽",
  "savings.layerCard.resetToAuto": "Reset",
  "savings.layerCard.expectedIncome": "Expected income over horizon",
  "savings.layerCard.noCandidates": "No instrument classes match this regime",
  "savings.classCard.risk": "Risk",
  "savings.liquidity.daily": "daily",
  "savings.liquidity.fixed-term": "fixed term",
  "savings.liquidity.secondary-market": "exchange",
  "savings.currency.RUB": "₽",
  "savings.currency.USD-settled": "USD-settled",
  "savings.currency.CNY": "CNY",
  "savings.currency.Gold": "Gold",
  "savings.taxBanner": "Tax-free interest threshold on deposits: ≈ {amount} ₽/year. Above it — 13% personal income tax.",
  "savings.asvWarning": "Exceeds the 1.4M ₽ AGV (deposit insurance) limit per bank. Consider splitting.",
  "savings.disclaimer": "Informational overview of instrument classes, not individual investment advice. Verify specific banks, issuers, and terms yourself.",

  "savings.classes.savings_account.name": "Savings account with daily interest",
  "savings.classes.savings_account.taxNote": "Interest may be taxed above the threshold.",
  "savings.classes.savings_account.riskNote": "Bank can change the rate any time. AGV limit 1.4M ₽.",
  "savings.classes.term_deposit.name": "Term deposit (3/6/12 mo)",
  "savings.classes.term_deposit.taxNote": "13% personal income tax above the threshold.",
  "savings.classes.term_deposit.riskNote": "Early withdrawal wipes out interest. AGV limit 1.4M ₽.",
  "savings.classes.mm_fund.name": "Money-market fund (RUB)",
  "savings.classes.mm_fund.taxNote": "13% tax on gains at redemption.",
  "savings.classes.mm_fund.riskNote": "Low risk but not a deposit: no AGV insurance, yield not guaranteed.",
  "savings.classes.ofz_pd.name": "OFZ-PD (fixed-coupon gov bond)",
  "savings.classes.ofz_pd.taxNote": "Coupons taxed at 13%.",
  "savings.classes.ofz_pd.riskNote": "Price falls when rates rise — selling before maturity may lock in a loss.",
  "savings.classes.ofz_pk.name": "OFZ-PK (RUONIA-linked floater)",
  "savings.classes.ofz_pk.taxNote": "Coupons taxed at 13%.",
  "savings.classes.ofz_pk.riskNote": "Coupon tracks RUONIA, price steadier than PD, yield is variable.",
  "savings.classes.ofz_in.name": "OFZ-IN (inflation-linked)",
  "savings.classes.ofz_in.taxNote": "Coupon and indexation taxed at 13%.",
  "savings.classes.ofz_in.riskNote": "Inflation protection; nominal yield modest when inflation is low.",
  "savings.classes.corp_bond.name": "First-tier corporate bonds (RUB)",
  "savings.classes.corp_bond.taxNote": "Coupons taxed at 13%.",
  "savings.classes.corp_bond.riskNote": "Issuer credit risk, lower liquidity than OFZ.",
  "savings.classes.replacement_bond.name": "Replacement bond (USD-settled)",
  "savings.classes.replacement_bond.taxNote": "USD coupon taxed at 13% at CBR exchange rate.",
  "savings.classes.replacement_bond.riskNote": "Currency risk, settlement in RUB at CBR rate. Limited liquidity.",
  "savings.classes.cny_bond.name": "CNY-denominated bonds",
  "savings.classes.cny_bond.taxNote": "Coupon and FX revaluation in CNY taxed at 13%.",
  "savings.classes.cny_bond.riskNote": "Currency risk (CNY/RUB), narrow issuer pool.",
  "savings.classes.gold.name": "Gold (exchange-traded / OMS / Seligdar gold bonds)",
  "savings.classes.gold.taxNote": "OMS: tax on sale. Exchange gold and gold bonds: tax on gains, 3-yr long-hold relief.",
  "savings.classes.gold.riskNote": "Price swings sharply; defensive, not income-producing.",

  "breakdown.title": "Monthly",
  "breakdown.month": "Month",
  "breakdown.open": "Opening",
  "breakdown.spent": "Spent",
  "breakdown.goals": "Goals",
  "breakdown.close": "Closing",

  "pdf.title": "Family budget",
  "pdf.scenario": "Scenario",
  "pdf.preparedOn": "Prepared on",
  "pdf.savings": "Savings distribution",

  "scenarios.defaultName": "Default",
  "scenarios.renamePrompt": "Rename:",
  "scenarios.deleteConfirm": "Delete current scenario?",
  "scenarios.replaceConfirm": "Replace current data with imported?",
  "scenarios.invalidBackup": "Invalid backup file"
}
```

- [ ] **Step 3: Verify both files have identical key sets**

Run: `diff <(jq -r 'keys[]' src/lib/i18n/ru.json | sort) <(jq -r 'keys[]' src/lib/i18n/en.json | sort)`
Expected: empty output (no differences).

- [ ] **Step 4: Recommended commit**

```bash
git add src/lib/i18n/ru.json src/lib/i18n/en.json
git commit -m "i18n: replace investments.* with savings.* (RU/EN in lockstep)"
```

---

### Task 4: Update `defaultScenario()` and bump schema version

**Files:**
- Modify: `src/lib/state/persistence.ts`

- [ ] **Step 1: Replace `defaultScenario()` and `defaultState()` in `src/lib/state/persistence.ts`**

Find:
```ts
function defaultScenario(id: string): Scenario {
  const today = todayISO();
  return {
    id,
    name: 'Default',  // intentionally English — set before i18n loads; user can rename
    createdAt: today,
    updatedAt: today,
    inputs: {
      returnDate: today,
      voyageDate: today,
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [],
      investments: [],
    },
  };
}

export function defaultState(): AppState {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'default-' + Math.random().toString(36).slice(2);
  return {
    schemaVersion: 1,
    activeScenarioId: id,
    scenarios: { [id]: defaultScenario(id) },
    ui: { language: 'ru', theme: 'dark', openSections: {} },
  };
}
```

Replace with:
```ts
function defaultScenario(id: string): Scenario {
  const today = todayISO();
  return {
    id,
    name: 'Default',  // intentionally English — set before i18n loads; user can rename
    createdAt: today,
    updatedAt: today,
    inputs: {
      returnDate: today,
      voyageDate: today,
      salaryLumpSumUsd: 0,
      assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
      rubPerUsd: 90,
      monthlyFamilyRub: 0,
      goals: [],
      freeCashRub: 0,
      horizonDate: today,
      cbrKeyRatePct: 16.0,
      cbrRateUpdatedAt: today,
      layerOverride: {},
      includeExpectedYield: false,
    },
  };
}

export function defaultState(): AppState {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'default-' + Math.random().toString(36).slice(2);
  return {
    schemaVersion: 2,
    activeScenarioId: id,
    scenarios: { [id]: defaultScenario(id) },
    ui: { language: 'ru', theme: 'dark', openSections: {} },
  };
}
```

- [ ] **Step 2: Run typecheck (errors expected elsewhere; this file should be cleaner)**

Run: `npm run typecheck`
Expected: `persistence.ts` errors only on the `migrate()` function (schemaVersion !== 1 check). Migration is rewritten in Task 8.

- [ ] **Step 3: Recommended commit**

```bash
git add src/lib/state/persistence.ts
git commit -m "persistence: bump schemaVersion to 2; new default inputs"
```

---

## Phase 2 — Pure allocate logic (TDD)

### Task 5: `regimeFor()` — test + implement

**Files:**
- Create: `src/lib/calc/allocate.ts`
- Create: `tests/calc/allocate.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `tests/calc/allocate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { regimeFor } from '../../src/lib/calc/allocate';

describe('regimeFor', () => {
  it('returns "low" for rate < 10', () => {
    expect(regimeFor(0)).toBe('low');
    expect(regimeFor(9.99)).toBe('low');
  });
  it('returns "moderate" for 10 <= rate < 15', () => {
    expect(regimeFor(10)).toBe('moderate');
    expect(regimeFor(14.99)).toBe('moderate');
  });
  it('returns "high" for rate >= 15', () => {
    expect(regimeFor(15)).toBe('high');
    expect(regimeFor(20)).toBe('high');
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails for the right reason**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: FAIL — `Cannot find module '../../src/lib/calc/allocate'`.

- [ ] **Step 3: Create `src/lib/calc/allocate.ts` with the minimal implementation**

```ts
import type { Regime } from './types';

export function regimeFor(cbrPct: number): Regime {
  if (cbrPct >= 15) return 'high';
  if (cbrPct >= 10) return 'moderate';
  return 'low';
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Recommended commit**

```bash
git add src/lib/calc/allocate.ts tests/calc/allocate.test.ts
git commit -m "feat(allocate): regime selection by CBR rate"
```

---

### Task 6: `allocate()` — auto-allocation math

**Files:**
- Modify: `src/lib/calc/allocate.ts`
- Modify: `tests/calc/allocate.test.ts`

- [ ] **Step 1: Append failing tests**

Add to `tests/calc/allocate.test.ts`:
```ts
import { allocate } from '../../src/lib/calc/allocate';
import type { Inputs } from '../../src/lib/calc/types';

function baseInputs(overrides: Partial<Inputs> = {}): Inputs {
  return {
    returnDate: '2026-05-01',
    voyageDate: '2026-08-01',
    salaryLumpSumUsd: 0,
    assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
    rubPerUsd: 90,
    monthlyFamilyRub: 100_000,
    goals: [],
    freeCashRub: 1_000_000,
    horizonDate: '2027-05-01',  // ~ 365 days from 2026-05-01
    cbrKeyRatePct: 16,
    cbrRateUpdatedAt: '2026-05-01',
    layerOverride: {},
    includeExpectedYield: false,
    ...overrides,
  };
}

describe('allocate — auto-allocation', () => {
  const today = new Date('2026-05-01T00:00:00Z');

  it('A gets monthlyFamilyRub when no goals in next 30 days', () => {
    const r = allocate(baseInputs({ freeCashRub: 1_000_000, monthlyFamilyRub: 100_000 }), today);
    expect(r.layers.A.amountRub).toBe(100_000);
    expect(r.layers.B.amountRub).toBe(0);
    expect(r.layers.C.amountRub).toBe(900_000);
  });

  it('A also includes enabled goals dated within 30 days', () => {
    const r = allocate(baseInputs({
      monthlyFamilyRub: 100_000,
      goals: [{ id: 'g1', name: 'Visa', amountRub: 50_000, mode: 'lump', date: '2026-05-15', enabled: true }],
    }), today);
    expect(r.layers.A.amountRub).toBe(150_000);
    expect(r.layers.C.amountRub).toBe(850_000);
  });

  it('B includes goals dated 31–180 days out', () => {
    const r = allocate(baseInputs({
      goals: [
        { id: 'g1', name: 'Repairs', amountRub: 300_000, mode: 'lump', date: '2026-08-15', enabled: true },
        { id: 'g2', name: 'Way later', amountRub: 999_000, mode: 'lump', date: '2027-03-01', enabled: true },
      ],
    }), today);
    expect(r.layers.B.amountRub).toBe(300_000);
  });

  it('disabled goals are ignored in auto-allocation', () => {
    const r = allocate(baseInputs({
      goals: [{ id: 'g1', name: 'X', amountRub: 50_000, mode: 'lump', date: '2026-05-10', enabled: false }],
    }), today);
    expect(r.layers.A.amountRub).toBe(100_000); // monthly only
  });

  it('shrinks A and B proportionally if A+B > free cash', () => {
    const r = allocate(baseInputs({
      freeCashRub: 100_000,
      monthlyFamilyRub: 200_000,
      goals: [{ id: 'g1', name: 'Big', amountRub: 100_000, mode: 'lump', date: '2026-06-15', enabled: true }],
    }), today);
    // A_auto = 200k, B_auto = 100k, total = 300k > free 100k
    // A = 200k * 100k / 300k ≈ 66666.67
    // B = 100k * 100k / 300k ≈ 33333.33
    expect(r.layers.A.amountRub).toBeCloseTo(66_666.67, 1);
    expect(r.layers.B.amountRub).toBeCloseTo(33_333.33, 1);
    expect(r.layers.C.amountRub).toBe(0);
  });

  it('respects layerOverride per layer; unset keys fall back to auto', () => {
    const r = allocate(baseInputs({
      freeCashRub: 1_000_000,
      monthlyFamilyRub: 100_000,
      layerOverride: { A: 250_000 },  // override A only
    }), today);
    expect(r.layers.A.amountRub).toBe(250_000);
    // B falls back to 0 (no goals), C falls back to auto = max(0, 1_000_000 - A_auto - B_auto)
    // but A is overridden — note that the auto formula for C still uses A_auto, not the override
    expect(r.layers.C.amountRub).toBe(900_000);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail (`allocate is not a function`)**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: FAIL with `allocate is not exported from allocate.ts`.

- [ ] **Step 3: Extend `src/lib/calc/allocate.ts`**

Append to the file:
```ts
import type {
  Inputs,
  AllocationResult,
  LayerInfo,
  LayerKey,
  InstrumentClass,
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

function emptyLayer(amount: number, time: number): LayerInfo {
  return {
    amountRub: amount,
    timeDays: time,
    candidates: [],
    incomeRangeRub: { low: 0, high: 0 },
    incomeMidRub: 0,
  };
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

  return {
    regime,
    horizonDays,
    layers: {
      A: emptyLayer(amounts.A, tA),
      B: emptyLayer(amounts.B, tB),
      C: emptyLayer(amounts.C, tC),
    },
    taxThresholdRub: 0,        // filled in by Task 8
    asvWarningLayers: [],      // filled in by Task 8
  };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: PASS (all auto-allocation tests + the 3 regime tests).

- [ ] **Step 5: Recommended commit**

```bash
git add src/lib/calc/allocate.ts tests/calc/allocate.test.ts
git commit -m "feat(allocate): auto-allocation across A/B/C with overrides"
```

---

### Task 7: `allocate()` — candidates and yield ranges

**Files:**
- Modify: `src/lib/calc/allocate.ts`
- Modify: `tests/calc/allocate.test.ts`

- [ ] **Step 1: Append failing tests**

Add to `tests/calc/allocate.test.ts`:
```ts
describe('allocate — candidates and yield range', () => {
  const today = new Date('2026-05-01T00:00:00Z');

  it('filters candidates by layer ∩ regime (high regime, layer A)', () => {
    const r = allocate(baseInputs({ cbrKeyRatePct: 16 }), today);
    const ids = r.layers.A.candidates.map(c => c.id);
    // High regime, layer A: savings_account, term_deposit, mm_fund
    expect(ids).toContain('savings_account');
    expect(ids).toContain('term_deposit');
    expect(ids).toContain('mm_fund');
    // OFZ-PD belongs to layer B/C only — must not appear in A
    expect(ids).not.toContain('ofz_pd');
  });

  it('low regime hides high-only classes', () => {
    const r = allocate(baseInputs({ cbrKeyRatePct: 5 }), today);
    const idsC = r.layers.C.candidates.map(c => c.id);
    expect(idsC).not.toContain('ofz_pd');       // high-only
    expect(idsC).not.toContain('term_deposit'); // high+moderate only
    expect(idsC).toContain('ofz_pk');
  });

  it('Layer A income range scales with amount, rate range, and time-in-layer', () => {
    // Layer A candidates at CBR=16: savings_account (13..15), term_deposit (15.5..17.5), mm_fund (15..15.5)
    // allRateLow = 13, allRateHigh = 17.5
    // amount = 100k, tA = min(30, 365) = 30 days
    const r = allocate(baseInputs({ cbrKeyRatePct: 16, freeCashRub: 100_000, monthlyFamilyRub: 100_000 }), today);
    expect(r.layers.A.amountRub).toBe(100_000);
    expect(r.layers.A.timeDays).toBe(30);
    const expLow  = 100_000 * (13 / 100) * (30 / 365);
    const expHigh = 100_000 * (17.5 / 100) * (30 / 365);
    expect(r.layers.A.incomeRangeRub.low).toBeCloseTo(expLow, 2);
    expect(r.layers.A.incomeRangeRub.high).toBeCloseTo(expHigh, 2);
    expect(r.layers.A.incomeMidRub).toBeCloseTo((expLow + expHigh) / 2, 2);
  });

  it('returns zero income when amount is zero', () => {
    const r = allocate(baseInputs({ freeCashRub: 0, monthlyFamilyRub: 0 }), today);
    expect(r.layers.A.incomeRangeRub).toEqual({ low: 0, high: 0 });
    expect(r.layers.A.incomeMidRub).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: FAIL — `candidates: []` and zero income everywhere.

- [ ] **Step 3: Replace the `allocate` function**

In `src/lib/calc/allocate.ts`, replace the existing `allocate` (and helper `emptyLayer`) with:

```ts
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

  return {
    regime,
    horizonDays,
    layers: {
      A: layerInfo(amounts.A, tA, candA, inputs.cbrKeyRatePct),
      B: layerInfo(amounts.B, tB, candB, inputs.cbrKeyRatePct),
      C: layerInfo(amounts.C, tC, candC, inputs.cbrKeyRatePct),
    },
    taxThresholdRub: 0,        // filled in by Task 8
    asvWarningLayers: [],      // filled in by Task 8
  };
}
```

Also delete the unused `emptyLayer` helper.

- [ ] **Step 4: Run all allocate tests; both old and new must pass**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: PASS (all regime, auto-allocation, candidates, and yield-range tests).

- [ ] **Step 5: Recommended commit**

```bash
git add src/lib/calc/allocate.ts tests/calc/allocate.test.ts
git commit -m "feat(allocate): candidates and per-layer yield ranges"
```

---

### Task 8: `allocate()` — horizon edges, tax threshold, АСВ warning

**Files:**
- Modify: `src/lib/calc/allocate.ts`
- Modify: `tests/calc/allocate.test.ts`

- [ ] **Step 1: Append failing tests**

Add to `tests/calc/allocate.test.ts`:
```ts
describe('allocate — horizon edges', () => {
  const today = new Date('2026-05-01T00:00:00Z');

  it('horizonDays = 0 when horizon == today; all incomes 0', () => {
    const r = allocate(baseInputs({ horizonDate: '2026-05-01' }), today);
    expect(r.horizonDays).toBe(0);
    expect(r.layers.A.incomeMidRub).toBe(0);
    expect(r.layers.B.incomeMidRub).toBe(0);
    expect(r.layers.C.incomeMidRub).toBe(0);
  });

  it('horizon < 30d: only Layer A has nonzero time; B and C income are 0', () => {
    const r = allocate(baseInputs({ horizonDate: '2026-05-20' }), today);
    expect(r.layers.A.timeDays).toBe(19);
    expect(r.layers.B.timeDays).toBe(0);
    expect(r.layers.C.timeDays).toBe(0);
    expect(r.layers.B.incomeMidRub).toBe(0);
    expect(r.layers.C.incomeMidRub).toBe(0);
  });

  it('horizon < 180d: Layer C income is 0', () => {
    // 2026-05-01 + 90d = 2026-07-30
    const r = allocate(baseInputs({ horizonDate: '2026-07-30' }), today);
    expect(r.layers.C.timeDays).toBe(0);
    expect(r.layers.C.incomeMidRub).toBe(0);
  });
});

describe('allocate — tax threshold and АСВ warning', () => {
  const today = new Date('2026-05-01T00:00:00Z');

  it('taxThreshold = cbrPct/100 × 1_000_000', () => {
    expect(allocate(baseInputs({ cbrKeyRatePct: 16 }), today).taxThresholdRub).toBe(160_000);
    expect(allocate(baseInputs({ cbrKeyRatePct: 8.5 }), today).taxThresholdRub).toBe(85_000);
  });

  it('АСВ warning fires when a layer with deposit-eligible candidates exceeds 1.4M ₽', () => {
    const r = allocate(baseInputs({
      freeCashRub: 3_000_000,
      monthlyFamilyRub: 0,
      layerOverride: { A: 1_500_000 },  // Layer A has savings_account + term_deposit (both deposits)
      cbrKeyRatePct: 16,
    }), today);
    expect(r.asvWarningLayers).toContain('A');
  });

  it('АСВ warning does not fire when no deposit-eligible candidates in the layer', () => {
    // Layer C at low regime: candidates = mm_fund, ofz_pk, ofz_in, replacement_bond, cny_bond, gold
    // None are deposits.
    const r = allocate(baseInputs({
      freeCashRub: 5_000_000,
      monthlyFamilyRub: 0,
      layerOverride: { C: 5_000_000 },
      cbrKeyRatePct: 5,
    }), today);
    expect(r.asvWarningLayers).not.toContain('C');
  });

  it('АСВ warning does not fire below 1.4M ₽', () => {
    const r = allocate(baseInputs({
      freeCashRub: 1_400_000,
      monthlyFamilyRub: 1_400_000,
      cbrKeyRatePct: 16,
    }), today);
    expect(r.asvWarningLayers).not.toContain('A');
  });
});
```

- [ ] **Step 2: Run; expect failures only on tax threshold and АСВ warning**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: horizon-edge tests likely PASS already; tax/АСВ tests FAIL.

- [ ] **Step 3: Wire up `taxThresholdRub` and `asvWarningLayers`**

In `src/lib/calc/allocate.ts`, replace the final `return { ... }` in `allocate` with:

```ts
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
```

- [ ] **Step 4: Run tests, confirm all pass**

Run: `npm test -- tests/calc/allocate.test.ts`
Expected: PASS (all groups).

- [ ] **Step 5: Recommended commit**

```bash
git add src/lib/calc/allocate.ts tests/calc/allocate.test.ts
git commit -m "feat(allocate): tax threshold and АСВ warning"
```

---

## Phase 3 — Persistence migration

### Task 9: Migration v1 → v2 — tests

**Files:**
- Modify: `tests/state/persistence.test.ts`

- [ ] **Step 1: Read the existing file to learn its style**

Run: `cat tests/state/persistence.test.ts`

- [ ] **Step 2: Add migration tests at the bottom of `tests/state/persistence.test.ts`**

```ts
import { importJson } from '../../src/lib/state/persistence';

describe('migrate v1 → v2', () => {
  it('seeds freeCashRub from sum of investment amounts and drops investments', () => {
    const v1 = {
      schemaVersion: 1,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'Old', createdAt: '2026-01-01', updatedAt: '2026-01-01',
          inputs: {
            returnDate: '2026-04-01', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 50_000 },
            rubPerUsd: 90, monthlyFamilyRub: 80_000, goals: [],
            investments: [
              { id: 'i1', kind: 'ofz', name: 'OFZ', amountRub: 500_000, annualRatePct: 12, reinvest: true },
              { id: 'i2', kind: 'vkladRub', name: 'Vklad', amountRub: 300_000, annualRatePct: 10, reinvest: false },
            ],
          },
        },
      },
      ui: { language: 'ru', theme: 'dark', openSections: {} },
    };
    const v2 = importJson(JSON.stringify(v1));
    expect(v2.schemaVersion).toBe(2);
    const inp = v2.scenarios.s1.inputs as any;
    expect(inp.investments).toBeUndefined();
    expect(inp.freeCashRub).toBe(800_000);
    expect(inp.horizonDate).toBe('2026-08-01'); // defaults to voyageDate
    expect(inp.cbrKeyRatePct).toBe(16);
    expect(typeof inp.cbrRateUpdatedAt).toBe('string');
    expect(inp.layerOverride).toEqual({});
    expect(inp.includeExpectedYield).toBe(false);
  });

  it('accepts a v2 blob unchanged', () => {
    const v2 = {
      schemaVersion: 2,
      activeScenarioId: 's1',
      scenarios: {
        s1: {
          id: 's1', name: 'New', createdAt: '2026-05-01', updatedAt: '2026-05-01',
          inputs: {
            returnDate: '2026-05-01', voyageDate: '2026-08-01',
            salaryLumpSumUsd: 0,
            assets: { usdBank: 0, usdCash: 0, rubBank: 0 },
            rubPerUsd: 90, monthlyFamilyRub: 0, goals: [],
            freeCashRub: 123, horizonDate: '2026-08-01',
            cbrKeyRatePct: 12, cbrRateUpdatedAt: '2026-05-01',
            layerOverride: { A: 50 }, includeExpectedYield: true,
          },
        },
      },
      ui: { language: 'en', theme: 'light', openSections: {} },
    };
    const out = importJson(JSON.stringify(v2));
    expect(out.schemaVersion).toBe(2);
    expect((out.scenarios.s1.inputs as any).freeCashRub).toBe(123);
  });

  it('rejects unknown schemaVersion', () => {
    const bad = JSON.stringify({ schemaVersion: 9, activeScenarioId: 's', scenarios: {}, ui: {} });
    expect(() => importJson(bad)).toThrow();
  });
});
```

- [ ] **Step 3: Run the tests; expect failures referring to v1 not being accepted**

Run: `npm test -- tests/state/persistence.test.ts`
Expected: FAIL — current `migrate()` rejects schemaVersion !== 1; will also reject 2.

- [ ] **Step 4: Recommended commit**

```bash
git add tests/state/persistence.test.ts
git commit -m "test(persistence): v1→v2 migration test cases"
```

---

### Task 10: Migration v1 → v2 — implementation

**Files:**
- Modify: `src/lib/state/persistence.ts`

- [ ] **Step 1: Replace `migrate()` in `src/lib/state/persistence.ts`**

Find:
```ts
function migrate(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid state');
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion !== 1) throw new Error(`Unsupported schemaVersion: ${String(s.schemaVersion)}`);
  if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
    throw new Error('Invalid state shape');
  }
  return s as unknown as AppState;
}
```

Replace with:
```ts
type V1Investment = { id: string; kind: string; name: string; amountRub: number; annualRatePct: number; reinvest: boolean };
type V1Inputs = {
  returnDate: string;
  voyageDate: string;
  salaryLumpSumUsd: number;
  assets: { usdBank: number; usdCash: number; rubBank: number };
  rubPerUsd: number;
  monthlyFamilyRub: number;
  goals: unknown[];
  investments?: V1Investment[];
};
type V1State = {
  schemaVersion: 1;
  activeScenarioId: string;
  scenarios: Record<string, { id: string; name: string; createdAt: string; updatedAt: string; inputs: V1Inputs }>;
  ui: { language: string; theme: string; openSections: Record<string, boolean> };
};

function migrateV1ToV2(raw: V1State): AppState {
  const today = todayISO();
  const scenarios: AppState['scenarios'] = {};
  for (const sid of Object.keys(raw.scenarios)) {
    const old = raw.scenarios[sid];
    const oi = old.inputs;
    const seededFreeCash = (oi.investments ?? []).reduce(
      (s, i) => s + (typeof i.amountRub === 'number' ? i.amountRub : 0), 0,
    );
    scenarios[sid] = {
      id: old.id,
      name: old.name,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      inputs: {
        returnDate:       oi.returnDate,
        voyageDate:       oi.voyageDate,
        salaryLumpSumUsd: oi.salaryLumpSumUsd,
        assets:           oi.assets,
        rubPerUsd:        oi.rubPerUsd,
        monthlyFamilyRub: oi.monthlyFamilyRub,
        goals:            oi.goals as AppState['scenarios'][string]['inputs']['goals'],
        freeCashRub:      seededFreeCash,
        horizonDate:      oi.voyageDate,
        cbrKeyRatePct:    16.0,
        cbrRateUpdatedAt: today,
        layerOverride:    {},
        includeExpectedYield: false,
      },
    };
  }
  return {
    schemaVersion: 2,
    activeScenarioId: raw.activeScenarioId,
    scenarios,
    ui: raw.ui as AppState['ui'],
  };
}

function migrate(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid state');
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion === 1) {
    return migrateV1ToV2(s as unknown as V1State);
  }
  if (s.schemaVersion !== 2) throw new Error(`Unsupported schemaVersion: ${String(s.schemaVersion)}`);
  if (typeof s.activeScenarioId !== 'string' || typeof s.scenarios !== 'object' || s.scenarios === null) {
    throw new Error('Invalid state shape');
  }
  return s as unknown as AppState;
}
```

- [ ] **Step 2: Run the migration tests**

Run: `npm test -- tests/state/persistence.test.ts`
Expected: all PASS (including the older v1 tests already in the file, since `migrate()` now also accepts v2).

- [ ] **Step 3: Recommended commit**

```bash
git add src/lib/state/persistence.ts
git commit -m "feat(persistence): migrate v1→v2 (drop investments, seed freeCash)"
```

---

## Phase 4 — Engine cleanup

### Task 11: Remove `investments` from `simulate()` + update engine tests

**Files:**
- Modify: `src/lib/calc/engine.ts`
- Modify: `tests/calc/engine.test.ts`

- [ ] **Step 1: Replace `src/lib/calc/engine.ts`**

```ts
import type { Inputs, SimulationResult, DayPoint, AssetMix, GoalEvent } from './types';

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
    return {
      days: [],
      balanceAtVoyage: totalRub(inputs.assets, inputs.rubPerUsd),
      runsOutOn: null,
      daysOfRunway: 0,
      totalSpentRub: 0,
    };
  }

  const assets: AssetMix = { ...inputs.assets };
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

  return {
    days,
    balanceAtVoyage: days[days.length - 1].totalRub,
    runsOutOn,
    daysOfRunway,
    totalSpentRub: totalSpent,
  };
}
```

- [ ] **Step 2: Rewrite `tests/calc/engine.test.ts`**

Replace its contents with:
```ts
import { describe, it, expect } from 'vitest';
import { simulate } from '../../src/lib/calc/engine';
import type { Inputs } from '../../src/lib/calc/types';

const emptyInputs = (): Inputs => ({
  returnDate: '2026-05-01',
  voyageDate: '2026-05-03',
  salaryLumpSumUsd: 0,
  assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
  rubPerUsd: 90,
  monthlyFamilyRub: 0,
  goals: [],
  freeCashRub: 0,
  horizonDate: '2026-05-03',
  cbrKeyRatePct: 16,
  cbrRateUpdatedAt: '2026-05-01',
  layerOverride: {},
  includeExpectedYield: false,
});

describe('simulate — monthly expenses', () => {
  it('drains rubBank by daily prorated amount', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-31',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      monthlyFamilyRub: 30_000,
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.totalSpentRub).toBeCloseTo(30_554, 0);
    expect(result.balanceAtVoyage).toBeCloseTo(1_000_000 - 30_554, 0);
  });
});

describe('simulate — lump goals', () => {
  it('subtracts the goal amount on the exact date and records the event', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      goals: [{
        id: 'g1', name: 'Car', amountRub: 500_000,
        mode: 'lump', date: '2026-05-05', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    const dayBefore = result.days.find(d => d.date === '2026-05-04')!;
    const dayOf = result.days.find(d => d.date === '2026-05-05')!;
    expect(dayBefore.totalRub).toBe(1_000_000);
    expect(dayOf.totalRub).toBe(500_000);
    expect(dayOf.events).toHaveLength(1);
    expect(dayOf.events[0].amountRub).toBe(500_000);
  });

  it('ignores disabled lump goal', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      goals: [{
        id: 'g1', name: 'Car', amountRub: 500_000,
        mode: 'lump', date: '2026-05-05', enabled: false,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.balanceAtVoyage).toBe(1_000_000);
  });
});

describe('simulate — baseline', () => {
  it('returns days[] from today to voyageDate inclusive', () => {
    const today = new Date('2026-05-01');
    const result = simulate(emptyInputs(), today);
    expect(result.days.length).toBe(3);
    expect(result.days[0].date).toBe('2026-05-01');
    expect(result.days[2].date).toBe('2026-05-03');
  });

  it('with no spending preserves starting balance', () => {
    const today = new Date('2026-05-01');
    const result = simulate(emptyInputs(), today);
    expect(result.balanceAtVoyage).toBe(100_000);
    expect(result.runsOutOn).toBeNull();
    expect(result.totalSpentRub).toBe(0);
  });
});

describe('simulate — spread goals', () => {
  it('spreads amount evenly across the range, total within 1 RUB', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      goals: [{
        id: 'g1', name: 'Repairs', amountRub: 100_000,
        mode: 'spread', date: '2026-05-03', endDate: '2026-05-07', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.totalSpentRub).toBeCloseTo(100_000, 0);
    expect(result.balanceAtVoyage).toBeCloseTo(900_000, 0);
  });
});

describe('simulate — drain order', () => {
  it('drains RUB bank first, then USD bank, then USD cash', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-04',
      assets: { usdBank: 100, usdCash: 200, rubBank: 500 },
      rubPerUsd: 100,
      goals: [{
        id: 'g1', name: 'Big buy', amountRub: 10_000,
        mode: 'lump', date: '2026-05-03', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    const after = result.days.find(d => d.date === '2026-05-03')!;
    expect(after.assetsRub.rubBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdBank).toBeCloseTo(5, 4);
    expect(after.assetsRub.usdCash).toBeCloseTo(200, 4);
  });

  it('cascades to USD cash when USD bank runs out', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-04',
      assets: { usdBank: 50, usdCash: 100, rubBank: 100 },
      rubPerUsd: 100,
      goals: [{
        id: 'g1', name: 'Spend',
        amountRub: 100 + 50 * 100 + 30 * 100,
        mode: 'lump', date: '2026-05-02', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    const after = result.days.find(d => d.date === '2026-05-02')!;
    expect(after.assetsRub.rubBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdBank).toBeCloseTo(0, 4);
    expect(after.assetsRub.usdCash).toBeCloseTo(70, 4);
  });
});

describe('simulate — edge cases', () => {
  it('voyage in the past returns empty days and current total', () => {
    const inputs: Inputs = { ...emptyInputs(),
      returnDate: '2026-01-01',
      voyageDate: '2026-04-01',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.days).toHaveLength(0);
    expect(result.balanceAtVoyage).toBe(100_000);
    expect(result.runsOutOn).toBeNull();
  });

  it('ignores goal outside leave window', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
      goals: [{
        id: 'g1', name: 'Way later', amountRub: 999_000,
        mode: 'lump', date: '2027-01-01', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.balanceAtVoyage).toBe(1_000_000);
  });

  it('ignores savings-framework fields (they do not affect cash drain)', () => {
    const base = simulate(emptyInputs(), new Date('2026-05-01'));
    const withSavingsNoise = simulate({
      ...emptyInputs(),
      freeCashRub: 999_999_999,
      cbrKeyRatePct: 25,
      horizonDate: '2099-01-01',
      layerOverride: { A: 1_000_000, B: 1_000_000, C: 1_000_000 },
      includeExpectedYield: true,
    }, new Date('2026-05-01'));
    expect(withSavingsNoise.balanceAtVoyage).toBe(base.balanceAtVoyage);
    expect(withSavingsNoise.totalSpentRub).toBe(base.totalSpentRub);
  });
});

describe('simulate — runsOutOn and daysOfRunway', () => {
  it('reports daysOfRunway = totalDays - 1 when money survives the whole window', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-10',
      assets: { usdBank: 0, usdCash: 0, rubBank: 1_000_000 },
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.runsOutOn).toBeNull();
    expect(result.daysOfRunway).toBe(9);
  });

  it('detects runsOutOn on a specific day when assets are insufficient', () => {
    const inputs: Inputs = { ...emptyInputs(),
      voyageDate: '2026-05-31',
      assets: { usdBank: 0, usdCash: 0, rubBank: 100_000 },
      goals: [{
        id: 'g1', name: 'Big', amountRub: 200_000,
        mode: 'lump', date: '2026-05-15', enabled: true,
      }],
    };
    const result = simulate(inputs, new Date('2026-05-01'));
    expect(result.runsOutOn).toBe('2026-05-15');
    expect(result.daysOfRunway).toBe(14);
  });
});
```

- [ ] **Step 3: Run engine tests; confirm green**

Run: `npm test -- tests/calc/engine.test.ts`
Expected: PASS (all blocks). The old "investments reinvest" / "investments payout" tests are gone.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: every existing test passes (allocate, engine, persistence, format).

- [ ] **Step 5: Recommended commit**

```bash
git add src/lib/calc/engine.ts tests/calc/engine.test.ts
git commit -m "refactor(engine): drop investment compounding (yield moved to allocate)"
```

---

## Phase 5 — Combined result

### Task 12: `combineResult()` — pure helper test + implementation

**Files:**
- Create: `tests/state/derived.test.ts`
- Modify: `src/lib/state/derived.ts`

- [ ] **Step 1: Write `tests/state/derived.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { combineResult } from '../../src/lib/state/derived';
import type { SimulationResult, AllocationResult } from '../../src/lib/calc/types';

function fakeSim(balance: number): SimulationResult {
  return {
    days: [],
    balanceAtVoyage: balance,
    runsOutOn: null,
    daysOfRunway: 0,
    totalSpentRub: 0,
  };
}

function fakeAlloc(midA: number, midB: number, midC: number): AllocationResult {
  const mk = (m: number) => ({
    amountRub: 0,
    timeDays: 0,
    candidates: [],
    incomeRangeRub: { low: 0, high: 0 },
    incomeMidRub: m,
  });
  return {
    regime: 'moderate',
    horizonDays: 0,
    layers: { A: mk(midA), B: mk(midB), C: mk(midC) },
    taxThresholdRub: 0,
    asvWarningLayers: [],
  };
}

describe('combineResult', () => {
  it('with includeExpectedYield=false, balanceAtVoyage equals sim balance', () => {
    const r = combineResult(fakeSim(500_000), fakeAlloc(100, 200, 300), false);
    expect(r.balanceAtVoyage).toBe(500_000);
    expect(r.expectedYieldMid).toBe(600);
  });

  it('with includeExpectedYield=true, balanceAtVoyage adds the midpoint sum', () => {
    const r = combineResult(fakeSim(500_000), fakeAlloc(100, 200, 300), true);
    expect(r.balanceAtVoyage).toBe(500_600);
    expect(r.expectedYieldMid).toBe(600);
  });
});
```

- [ ] **Step 2: Replace `src/lib/state/derived.ts`**

```ts
import { simulate } from '../calc/engine';
import { allocate } from '../calc/allocate';
import type { SimulationResult, AllocationResult, CombinedResult } from '../calc/types';
import { activeInputs } from './scenarios.svelte';

export function combineResult(
  sim: SimulationResult,
  alloc: AllocationResult,
  includeExpectedYield: boolean,
): CombinedResult {
  const expectedYieldMid =
    alloc.layers.A.incomeMidRub +
    alloc.layers.B.incomeMidRub +
    alloc.layers.C.incomeMidRub;
  const balanceAtVoyage = includeExpectedYield
    ? sim.balanceAtVoyage + expectedYieldMid
    : sim.balanceAtVoyage;
  return { sim, alloc, balanceAtVoyage, expectedYieldMid };
}

export function currentResult(): CombinedResult {
  const inputs = activeInputs();
  const today = new Date();
  const sim = simulate(inputs, today);
  const alloc = allocate(inputs, today);
  return combineResult(sim, alloc, inputs.includeExpectedYield);
}
```

- [ ] **Step 3: Run the new tests**

Run: `npm test -- tests/state/derived.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Run full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Recommended commit**

```bash
git add src/lib/state/derived.ts tests/state/derived.test.ts
git commit -m "feat(derived): combineResult and currentResult merge sim + alloc"
```

---

## Phase 6 — Consumer migrations

### Task 13: Update ResultsHeader for the new result shape

**Files:**
- Modify: `src/components/ResultsHeader.svelte`

- [ ] **Step 1: Replace `src/components/ResultsHeader.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs } from '../lib/state/scenarios.svelte';
  import { currentResult } from '../lib/state/derived';
  import { formatRub, formatUsd, formatDate } from '../lib/format';
  import { tweenedNumber } from '../lib/motion';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  const balance = tweenedNumber(0);
  $effect(() => { balance.set(result.balanceAtVoyage); });

  const usdEquiv = $derived(result.balanceAtVoyage / inputs.rubPerUsd);
  const burnPerDay = $derived(
    result.sim.days.length > 1
      ? (result.sim.days[0].totalRub - result.sim.balanceAtVoyage) / Math.max(1, result.sim.daysOfRunway)
      : 0
  );
</script>

<section class="sticky-results">
  <div class="frame-top" aria-hidden="true"></div>

  <div class="grid">
    <div class="kpi-block">
      <div class="kpi-label">
        <span class="dot" aria-hidden="true"></span>
        {$_('results.leftOnVoyage')} · {formatDate(inputs.voyageDate, app.ui.language)}
      </div>
      <div class="kpi-value number">
        {formatRub($balance, app.ui.language)}<span class="cursor" aria-hidden="true"></span>
      </div>
      <div class="kpi-sub">
        ≈ {formatUsd(usdEquiv, app.ui.language)} @ {inputs.rubPerUsd} ₽/$
        <span class="sep">·</span>
        {#if result.sim.runsOutOn}
          <span class="danger">{$_('results.runsOut').toLowerCase()}: {formatDate(result.sim.runsOutOn, app.ui.language)}</span>
        {:else}
          <span class="ok">{$_('results.ok').toLowerCase()}</span>
        {/if}
      </div>
    </div>

    <div class="stats">
      <div class="stat-row">
        <span class="stat-key">{$_('results.runway')}</span>
        <span class="stat-dots"></span>
        <span class="number">{$_('results.daysUnit', { values: { n: result.sim.daysOfRunway } })}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">{$_('results.burnPerDay')}</span>
        <span class="stat-dots"></span>
        <span class="number">{formatRub(burnPerDay, app.ui.language)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">{$_('results.yield')}</span>
        <span class="stat-dots"></span>
        <span class="number ok">+ {formatRub(result.expectedYieldMid, app.ui.language)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">{$_('results.spent')}</span>
        <span class="stat-dots"></span>
        <span class="number">{formatRub(result.sim.totalSpentRub, app.ui.language)}</span>
      </div>
    </div>
  </div>

  <div class="frame-bot" aria-hidden="true"></div>
</section>

<style>
  /* unchanged from previous version — copy the existing <style> block verbatim */
  .sticky-results {
    position: sticky;
    top: 0;
    z-index: 5;
    margin-top: var(--gap-5);
    background: var(--surface-2);
    border: 1px solid var(--amber);
    padding: var(--gap-4) var(--gap-5);
    box-shadow: 0 1px 0 var(--amber-soft);
  }
  .frame-top, .frame-bot {
    height: 1px;
    margin: 0 -1px;
    background: repeating-linear-gradient(90deg, var(--amber) 0 6px, transparent 6px 10px);
    opacity: 0.5;
  }
  .frame-top { margin-bottom: var(--gap-4); }
  .frame-bot { margin-top: var(--gap-4); }
  .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--gap-6); }
  @media (max-width: 620px) { .grid { grid-template-columns: 1fr; gap: var(--gap-4); } }
  .kpi-label { font-size: var(--t-mini); color: var(--muted); letter-spacing: 0.20em; text-transform: uppercase; display: flex; align-items: center; gap: var(--gap-2); }
  .dot { width: 6px; height: 6px; background: var(--amber); border-radius: 50%; box-shadow: 0 0 8px var(--amber); animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .kpi-value { font-size: var(--t-3xl); line-height: 1; font-weight: 700; letter-spacing: -0.02em; color: var(--amber); margin: var(--gap-2) 0 var(--gap-2); }
  .cursor { display: inline-block; width: 0.55em; height: 1em; background: var(--amber); margin-left: 0.18em; vertical-align: -0.15em; animation: blink 1.2s steps(2) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .kpi-sub { font-size: var(--t-small); color: var(--muted); letter-spacing: 0.02em; }
  .kpi-sub .sep { margin: 0 var(--gap-2); color: var(--label); }
  .ok { color: var(--ok); }
  .danger { color: var(--danger); }
  .stats { display: flex; flex-direction: column; gap: var(--gap-2); align-self: center; }
  .stat-row { display: grid; grid-template-columns: auto 1fr auto; align-items: baseline; gap: var(--gap-2); font-size: var(--t-small); }
  .stat-key { color: var(--muted); text-transform: uppercase; letter-spacing: 0.14em; font-size: var(--t-mini); }
  .stat-dots { border-bottom: 1px dotted var(--border-3); height: 1em; }
</style>
```

- [ ] **Step 2: Recommended commit**

```bash
git add src/components/ResultsHeader.svelte
git commit -m "refactor(ResultsHeader): consume CombinedResult shape"
```

---

### Task 14: Update BalanceChart for the new shape

**Files:**
- Modify: `src/components/BalanceChart.svelte`

- [ ] **Step 1: In `src/components/BalanceChart.svelte`, change two lines inside `buildOrUpdate()`**

Find:
```ts
    const r = currentResult();
    const c = colors();
    const data = {
      labels: r.days.map(d => d.date),
      datasets: [{
        data: r.days.map(d => d.totalRub),
```

Replace with:
```ts
    const r = currentResult();
    const c = colors();
    const data = {
      labels: r.sim.days.map(d => d.date),
      datasets: [{
        data: r.sim.days.map(d => d.totalRub),
```

- [ ] **Step 2: Recommended commit**

```bash
git add src/components/BalanceChart.svelte
git commit -m "refactor(BalanceChart): read sim.days via CombinedResult"
```

---

### Task 15: Update BreakdownSection for the new shape

**Files:**
- Modify: `src/components/sections/BreakdownSection.svelte`

- [ ] **Step 1: In `src/components/sections/BreakdownSection.svelte`, change one line**

Find:
```ts
  const result = $derived(currentResult());

  type MonthRow = { ym: string; open: number; close: number; spent: number; goalsRub: number };
  const rows = $derived.by(() => {
    const byMonth: Record<string, DayPoint[]> = {};
    for (const d of result.days) {
```

Replace with:
```ts
  const result = $derived(currentResult());

  type MonthRow = { ym: string; open: number; close: number; spent: number; goalsRub: number };
  const rows = $derived.by(() => {
    const byMonth: Record<string, DayPoint[]> = {};
    for (const d of result.sim.days) {
```

- [ ] **Step 2: Run typecheck — should now be much cleaner**

Run: `npm run typecheck`
Expected: errors only in `InvestmentsSection.svelte`, `PrintView.svelte`, `App.svelte`, and possibly some unused imports. Those are handled in subsequent tasks.

- [ ] **Step 3: Recommended commit**

```bash
git add src/components/sections/BreakdownSection.svelte
git commit -m "refactor(BreakdownSection): read sim.days via CombinedResult"
```

---

## Phase 7 — New UI components

### Task 16: ClassCard.svelte

**Files:**
- Create: `src/components/sections/savings/ClassCard.svelte`

- [ ] **Step 1: Write the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app } from '../../../lib/state/scenarios.svelte';
  import type { InstrumentClass } from '../../../lib/calc/types';

  type Props = {
    cls: InstrumentClass;
    cbrPct: number;
  };
  let { cls, cbrPct }: Props = $props();

  const lo = $derived(cbrPct + cls.cbrOffset.low);
  const hi = $derived(cbrPct + cls.cbrOffset.high);

  function fmtPct(n: number): string {
    return (Math.round(n * 10) / 10).toFixed(1);
  }
</script>

<div class="class-card">
  <div class="head">
    <span class="name">{$_(`savings.classes.${cls.id}.name`)}</span>
    <span class="yield number">
      {#if Math.abs(lo - hi) < 0.05}
        {fmtPct(lo)}%
      {:else}
        {fmtPct(lo)}–{fmtPct(hi)}%
      {/if}
      <span class="pa">p.a.</span>
    </span>
  </div>
  <div class="badges">
    <span class="badge">{$_(`savings.liquidity.${cls.liquidity}`)}</span>
    <span class="badge">{$_(`savings.currency.${cls.currency}`)}</span>
    {#if cls.isDeposit}<span class="badge deposit">АСВ</span>{/if}
  </div>
  <div class="risk">
    <span class="risk-key">{$_('savings.classCard.risk')}:</span>
    <span class="risk-text">{$_(`savings.classes.${cls.id}.riskNote`)}</span>
  </div>
</div>

<style>
  .class-card {
    border: 1px solid var(--border-2);
    padding: var(--gap-2) var(--gap-3);
    background: var(--surface-1);
    display: flex;
    flex-direction: column;
    gap: var(--gap-1);
  }
  .head { display: flex; justify-content: space-between; gap: var(--gap-2); align-items: baseline; }
  .name { font-size: var(--t-small); color: var(--fg); letter-spacing: 0.04em; }
  .yield { font-size: var(--t-small); color: var(--amber); white-space: nowrap; }
  .pa { color: var(--muted); font-size: var(--t-mini); letter-spacing: 0.14em; margin-left: 2px; }
  .badges { display: flex; gap: var(--gap-1); flex-wrap: wrap; }
  .badge {
    font-size: var(--t-mini);
    color: var(--muted);
    border: 1px solid var(--border-3);
    padding: 0 6px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .badge.deposit { color: var(--amber); border-color: var(--amber); }
  .risk { font-size: var(--t-mini); color: var(--muted); line-height: 1.4; }
  .risk-key { letter-spacing: 0.14em; text-transform: uppercase; margin-right: 4px; }
</style>
```

- [ ] **Step 2: Recommended commit**

```bash
git add src/components/sections/savings/ClassCard.svelte
git commit -m "feat(ui): ClassCard renders one instrument class"
```

---

### Task 17: LayerCard.svelte

**Files:**
- Create: `src/components/sections/savings/LayerCard.svelte`

- [ ] **Step 1: Write the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';
  import type { LayerKey } from '../../../lib/calc/types';
  import ClassCard from './ClassCard.svelte';
  import AsvWarning from './AsvWarning.svelte';

  type Props = { layer: LayerKey };
  let { layer }: Props = $props();

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());
  const info   = $derived(result.alloc.layers[layer]);
  const overridden = $derived(inputs.layerOverride[layer] !== undefined);
  const asvFired = $derived(result.alloc.asvWarningLayers.includes(layer));

  function onAmount(e: Event) {
    const target = e.target as HTMLInputElement;
    const raw = target.value.replace(/\s/g, '');
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.layerOverride = { ...inputs.layerOverride, [layer]: n };
      persistSoon();
    }
  }

  function resetToAuto() {
    const next = { ...inputs.layerOverride };
    delete next[layer];
    inputs.layerOverride = next;
    persistSoon();
  }
</script>

<section class="layer-card">
  <header class="layer-head">
    <span class="layer-name">{$_(`savings.layer.${layer}.name`)}</span>
    <span class="layer-window">{$_(`savings.layer.${layer}.window`)}</span>
  </header>

  <div class="amount-row">
    <label class="amount-label">
      <span class="amount-key">{$_('savings.layerCard.amount')}</span>
      <input
        class="input"
        type="number"
        inputmode="decimal"
        min="0"
        step="any"
        value={info.amountRub === 0 ? '' : info.amountRub}
        oninput={onAmount}
      />
    </label>
    {#if overridden}
      <button class="btn icon" type="button" onclick={resetToAuto}>{$_('savings.layerCard.resetToAuto')}</button>
    {/if}
  </div>

  {#if info.candidates.length === 0}
    <p class="empty">{$_('savings.layerCard.noCandidates')}</p>
  {:else}
    <div class="class-grid">
      {#each info.candidates as cls (cls.id)}
        <ClassCard {cls} cbrPct={inputs.cbrKeyRatePct} />
      {/each}
    </div>
  {/if}

  <div class="income">
    <span class="income-key">{$_('savings.layerCard.expectedIncome')}</span>
    <span class="income-val number">
      {formatRub(info.incomeRangeRub.low, app.ui.language)} – {formatRub(info.incomeRangeRub.high, app.ui.language)}
    </span>
  </div>

  {#if asvFired}
    <AsvWarning />
  {/if}
</section>

<style>
  .layer-card {
    border: 1px solid var(--border-2);
    padding: var(--gap-3) var(--gap-4);
    background: var(--surface-1);
    display: flex;
    flex-direction: column;
    gap: var(--gap-3);
  }
  .layer-head { display: flex; justify-content: space-between; align-items: baseline; }
  .layer-name { color: var(--amber); letter-spacing: 0.14em; text-transform: uppercase; font-size: var(--t-small); }
  .layer-window { color: var(--muted); letter-spacing: 0.14em; text-transform: uppercase; font-size: var(--t-mini); }
  .amount-row { display: flex; align-items: end; gap: var(--gap-2); }
  .amount-label { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .amount-key { font-size: var(--t-mini); color: var(--muted); letter-spacing: 0.14em; text-transform: uppercase; }
  .empty { color: var(--muted); font-size: var(--t-small); }
  .class-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap-2); }
  @media (max-width: 700px) { .class-grid { grid-template-columns: 1fr; } }
  .income { display: flex; justify-content: space-between; align-items: baseline; padding-top: var(--gap-2); border-top: 1px dashed var(--border); }
  .income-key { font-size: var(--t-mini); color: var(--muted); letter-spacing: 0.14em; text-transform: uppercase; }
  .income-val { color: var(--amber); }
</style>
```

- [ ] **Step 2: Recommended commit**

```bash
git add src/components/sections/savings/LayerCard.svelte
git commit -m "feat(ui): LayerCard with override input and class grid"
```

---

### Task 18: SavingsInputsCard.svelte

**Files:**
- Create: `src/components/sections/savings/SavingsInputsCard.svelte`

- [ ] **Step 1: Write the file**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeInputs, persistSoon } from '../../../lib/state/scenarios.svelte';
  import CollapsibleCard from '../../controls/CollapsibleCard.svelte';
  import CurrencyInput from '../../controls/CurrencyInput.svelte';
  import DateInput from '../../controls/DateInput.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatDate } from '../../../lib/format';
  import { app } from '../../../lib/state/scenarios.svelte';

  const inputs = $derived(activeInputs());
  const result = $derived(currentResult());

  function onFreeCash(n: number) { inputs.freeCashRub = n; persistSoon(); }
  function onCbr(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    if (!Number.isNaN(n) && n >= 0) {
      inputs.cbrKeyRatePct = n;
      inputs.cbrRateUpdatedAt = new Date().toISOString().slice(0, 10);
      persistSoon();
    }
  }
  function onHorizon(iso: string) { inputs.horizonDate = iso; persistSoon(); }
  function onYield(e: Event) {
    inputs.includeExpectedYield = (e.target as HTMLInputElement).checked;
    persistSoon();
  }
</script>

<CollapsibleCard title={$_('savings.inputs.title')}>
  <CurrencyInput
    label={$_('savings.inputs.freeCash')}
    value={inputs.freeCashRub}
    onChange={onFreeCash}
  />

  <label class="field">
    <span>
      <span class="field-key">{$_('savings.inputs.cbrRate')}</span>
      <span class="field-hint" title={$_('savings.inputs.cbrTooltip')}>
        ⓘ {$_('savings.inputs.cbrUpdated')}: {formatDate(inputs.cbrRateUpdatedAt, app.ui.language)}
      </span>
    </span>
    <input
      class="input"
      type="number"
      inputmode="decimal"
      min="0"
      max="30"
      step="0.1"
      value={inputs.cbrKeyRatePct}
      oninput={onCbr}
    />
  </label>

  <p class="regime-tag">{$_(`savings.regime.${result.alloc.regime}`)}</p>

  <DateInput
    label={$_('savings.inputs.horizon')}
    value={inputs.horizonDate}
    onChange={onHorizon}
  />

  <label class="toggle">
    <input type="checkbox" checked={inputs.includeExpectedYield} onchange={onYield} />
    <span>{$_('savings.inputs.includeYield')}</span>
  </label>
</CollapsibleCard>

<style>
  .regime-tag {
    color: var(--amber);
    font-size: var(--t-mini);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: var(--gap-1) 0 0;
  }
  .toggle {
    display: flex; gap: var(--gap-2); align-items: center;
    color: var(--muted); font-size: var(--t-small);
    margin-top: var(--gap-2);
  }
  .toggle input { accent-color: var(--amber); }
</style>
```

- [ ] **Step 2: Recommended commit**

```bash
git add src/components/sections/savings/SavingsInputsCard.svelte
git commit -m "feat(ui): SavingsInputsCard (free cash, CBR, horizon, yield toggle)"
```

---

### Task 19: TaxBanner, AsvWarning, SavingsDisclaimer

**Files:**
- Create: `src/components/sections/savings/TaxBanner.svelte`
- Create: `src/components/sections/savings/AsvWarning.svelte`
- Create: `src/components/sections/savings/SavingsDisclaimer.svelte`

- [ ] **Step 1: Write `TaxBanner.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app } from '../../../lib/state/scenarios.svelte';
  import { currentResult } from '../../../lib/state/derived';
  import { formatRub } from '../../../lib/format';

  const result = $derived(currentResult());
</script>

<aside class="banner">
  {$_('savings.taxBanner', { values: { amount: formatRub(result.alloc.taxThresholdRub, app.ui.language) } })}
</aside>

<style>
  .banner {
    border: 1px dashed var(--border-2);
    padding: var(--gap-2) var(--gap-3);
    font-size: var(--t-mini);
    color: var(--muted);
    letter-spacing: 0.02em;
  }
</style>
```

- [ ] **Step 2: Write `AsvWarning.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
</script>

<div class="warn">
  ⚠ {$_('savings.asvWarning')}
</div>

<style>
  .warn {
    border: 1px solid var(--danger);
    background: rgba(255, 90, 90, 0.06);
    color: var(--danger);
    padding: var(--gap-1) var(--gap-2);
    font-size: var(--t-mini);
    letter-spacing: 0.06em;
  }
</style>
```

- [ ] **Step 3: Write `SavingsDisclaimer.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
</script>

<footer class="disclaimer">
  {$_('savings.disclaimer')}
</footer>

<style>
  .disclaimer {
    color: var(--muted);
    font-size: var(--t-mini);
    line-height: 1.5;
    padding: var(--gap-2) 0;
    border-top: 1px dashed var(--border);
    letter-spacing: 0.02em;
  }
</style>
```

- [ ] **Step 4: Recommended commit**

```bash
git add src/components/sections/savings/TaxBanner.svelte src/components/sections/savings/AsvWarning.svelte src/components/sections/savings/SavingsDisclaimer.svelte
git commit -m "feat(ui): TaxBanner, AsvWarning, SavingsDisclaimer"
```

---

## Phase 8 — Layout restructure and PrintView

### Task 20: Restructure App.svelte and delete InvestmentsSection

**Files:**
- Modify: `src/App.svelte`
- Delete: `src/components/sections/InvestmentsSection.svelte`

- [ ] **Step 1: Replace `src/App.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

  import Atmosphere from './components/Atmosphere.svelte';
  import ScenarioPicker from './components/ScenarioPicker.svelte';
  import LangToggle from './components/controls/LangToggle.svelte';
  import ThemeToggle from './components/controls/ThemeToggle.svelte';
  import ResultsHeader from './components/ResultsHeader.svelte';
  import BalanceChart from './components/BalanceChart.svelte';
  import ContextSection from './components/sections/ContextSection.svelte';
  import AssetsSection from './components/sections/AssetsSection.svelte';
  import ExpensesSection from './components/sections/ExpensesSection.svelte';
  import GoalsSection from './components/sections/GoalsSection.svelte';
  import BreakdownSection from './components/sections/BreakdownSection.svelte';
  import LayerCard from './components/sections/savings/LayerCard.svelte';
  import SavingsInputsCard from './components/sections/savings/SavingsInputsCard.svelte';
  import TaxBanner from './components/sections/savings/TaxBanner.svelte';
  import SavingsDisclaimer from './components/sections/savings/SavingsDisclaimer.svelte';
  import PrintView from './components/PrintView.svelte';

  let clock = $state('');
  function updateClock() {
    const d = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = months[d.getMonth()];
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    clock = `${dd}.${mm}.${yyyy} / ${hh}:${mi}`;
  }

  onMount(() => {
    updateClock();
    const id = setInterval(updateClock, 30_000);
    return () => clearInterval(id);
  });

  function onPrint() { window.print(); }
</script>

<Atmosphere />

<div class="app-shell">
  <header class="header">
    <span class="brand">
      <span class="brand-amber">FAMILYCALC</span>
      <span class="brand-sep">::</span>
      <span class="brand-sub">{$_('app.title')}</span>
    </span>
    <span class="header-clock">{clock}</span>
  </header>

  <div class="header-controls">
    <ScenarioPicker />
    <LangToggle />
    <ThemeToggle />
    <button class="btn icon" type="button" onclick={onPrint} title={$_('header.print')}>PRINT</button>
  </div>

  <ResultsHeader />
  <BalanceChart />

  <div class="ornament">─── ─── ───</div>

  <main class="layout">
    <section class="layers">
      <LayerCard layer="A" />
      <LayerCard layer="B" />
      <LayerCard layer="C" />
      <TaxBanner />
      <SavingsDisclaimer />
    </section>
    <aside class="sidebar">
      <ContextSection />
      <AssetsSection />
      <ExpensesSection />
      <GoalsSection />
      <SavingsInputsCard />
    </aside>
  </main>

  <BreakdownSection />

  <div class="ornament">─── FIN ───</div>
</div>

<PrintView />

<style>
  .header-controls {
    display: flex;
    gap: var(--gap-2);
    align-items: center;
    flex-wrap: wrap;
    padding: var(--gap-3) 0;
    border-bottom: 1px solid var(--border);
  }
  .layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: var(--gap-5);
    margin-top: var(--gap-4);
  }
  .layers, .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--gap-4);
  }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 2: Delete the old section file**

Run: `rm src/components/sections/InvestmentsSection.svelte`

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors except the PrintView block (still references `inputs.investments`). Fixed in Task 21.

- [ ] **Step 4: Recommended commit**

```bash
git add -A src/App.svelte src/components/sections/InvestmentsSection.svelte
git commit -m "feat(layout): two-column hero layout; delete InvestmentsSection"
```

---

### Task 21: Update PrintView

**Files:**
- Modify: `src/components/PrintView.svelte`

- [ ] **Step 1: Replace `src/components/PrintView.svelte`**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { app, activeScenario, activeInputs } from '../lib/state/scenarios.svelte';
  import { currentResult } from '../lib/state/derived';
  import { formatRub, formatUsd, formatDate } from '../lib/format';
  import type { LayerKey } from '../lib/calc/types';

  const lang = $derived(app.ui.language);
  const inputs = $derived(activeInputs());
  const sc = $derived(activeScenario());
  const r = $derived(currentResult());
  const totalAssetsRub = $derived(
    inputs.assets.rubBank + inputs.assets.usdBank * inputs.rubPerUsd + inputs.assets.usdCash * inputs.rubPerUsd
  );

  const layerKeys: LayerKey[] = ['A', 'B', 'C'];
</script>

<div class="print-only print-view">
  <h1>{$_('pdf.title')}</h1>
  <div class="meta">
    {$_('pdf.scenario')}: <b>{sc.name}</b> · {$_('pdf.preparedOn')} {formatDate(new Date().toISOString().slice(0,10), lang)}
  </div>

  <section>
    <h2>{$_('results.leftOnVoyage')}</h2>
    <p class="big">{formatRub(r.balanceAtVoyage, lang)} <span class="muted">(≈ {formatUsd(r.balanceAtVoyage / inputs.rubPerUsd, lang)})</span></p>
    <p>{$_('results.runway')}: {$_('results.daysUnit', { values: { n: r.sim.daysOfRunway } })}</p>
    <p>
      {$_('results.runsOut')}:
      {#if r.sim.runsOutOn}<b>{formatDate(r.sim.runsOutOn, lang)}</b>{:else}{$_('results.ok')}{/if}
    </p>
  </section>

  <section>
    <h2>{$_('context.title')}</h2>
    <p>{$_('context.returnDate')}: {formatDate(inputs.returnDate, lang)}</p>
    <p>{$_('context.voyageDate')}: {formatDate(inputs.voyageDate, lang)}</p>
    <p>{$_('context.lumpSum')}: {formatUsd(inputs.salaryLumpSumUsd, lang)}</p>
    <p>{$_('context.rate')}: {inputs.rubPerUsd}</p>
  </section>

  <section>
    <h2>{$_('assets.title')}</h2>
    <p>{$_('assets.usdBank')}: {formatUsd(inputs.assets.usdBank, lang)} ({formatRub(inputs.assets.usdBank * inputs.rubPerUsd, lang)})</p>
    <p>{$_('assets.usdCash')}: {formatUsd(inputs.assets.usdCash, lang)} ({formatRub(inputs.assets.usdCash * inputs.rubPerUsd, lang)})</p>
    <p>{$_('assets.rubBank')}: {formatRub(inputs.assets.rubBank, lang)}</p>
    <p><b>{$_('assets.totalRub')}: {formatRub(totalAssetsRub, lang)}</b></p>
  </section>

  <section>
    <h2>{$_('expenses.title')}</h2>
    <p>{$_('expenses.monthly')}: {formatRub(inputs.monthlyFamilyRub, lang)}</p>
  </section>

  {#if inputs.goals.length > 0}
    <section>
      <h2>{$_('goals.title')}</h2>
      <ul>
        {#each inputs.goals as g}
          <li>
            {g.name}: {formatRub(g.amountRub, lang)} —
            {g.mode === 'lump' ? formatDate(g.date, lang) : `${formatDate(g.date, lang)} → ${formatDate(g.endDate ?? g.date, lang)}`}
            {#if !g.enabled}<span class="muted">(off)</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section>
    <h2>{$_('pdf.savings')}</h2>
    <p>{$_('savings.inputs.cbrRate')}: {inputs.cbrKeyRatePct}% — {$_(`savings.regime.${r.alloc.regime}`)}</p>
    <p>{$_('savings.inputs.freeCash')}: {formatRub(inputs.freeCashRub, lang)}</p>
    <p>{$_('savings.inputs.horizon')}: {formatDate(inputs.horizonDate, lang)}</p>
    <ul>
      {#each layerKeys as k}
        {@const info = r.alloc.layers[k]}
        <li>
          {$_(`savings.layer.${k}.name`)} · {$_(`savings.layer.${k}.window`)}:
          {formatRub(info.amountRub, lang)} →
          {$_('savings.layerCard.expectedIncome')}: {formatRub(info.incomeRangeRub.low, lang)} – {formatRub(info.incomeRangeRub.high, lang)}
        </li>
      {/each}
    </ul>
    <p class="muted">{$_('savings.disclaimer')}</p>
  </section>
</div>

<style>
  .print-view {
    padding: 0;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    color: #1a1815;
    background: #f5f1e8;
    font-size: 11pt;
    line-height: 1.5;
    font-feature-settings: 'tnum';
  }
  .print-view h1 {
    font-size: 20pt;
    margin: 0 0 6px;
    letter-spacing: 0.04em;
    border-bottom: 2px solid #1a1815;
    padding-bottom: 6px;
  }
  .print-view h2 {
    font-size: 11pt;
    margin: 18px 0 6px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .print-view h2::before { content: '> '; color: #b8651d; }
  .print-view section { page-break-inside: avoid; margin-bottom: 10px; }
  .print-view p { margin: 3px 0; font-size: 11pt; }
  .print-view .big {
    font-size: 28pt;
    font-weight: 700;
    color: #b8651d;
    letter-spacing: -0.02em;
    margin: 4px 0;
  }
  .print-view .meta { font-size: 10pt; color: #6e6655; margin-bottom: 12px; letter-spacing: 0.14em; text-transform: uppercase; }
  .print-view .muted { color: #6e6655; }
  .print-view ul { margin: 0; padding-left: 18px; list-style: none; }
  .print-view li::before { content: '· '; color: #b8651d; }
</style>
```

- [ ] **Step 2: Run typecheck (must be clean)**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all green.

- [ ] **Step 4: Run a production build (CLAUDE.md requires this after rune changes)**

Run: `npm run build`
Expected: build completes; `dist/` produced; no Svelte compiler errors.

- [ ] **Step 5: Recommended commit**

```bash
git add src/components/PrintView.svelte
git commit -m "feat(print): savings distribution block; drop investments block"
```

---

## Phase 9 — Manual verification

### Task 22: Browser smoke test

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts at `http://localhost:5173`. Leave it running.

- [ ] **Step 2: Open the app, walk through the golden path**

In a browser:
1. Confirm the layout has two columns (Layer A/B/C on the left, sidebar with `Context / Assets / Expenses / Goals / Savings parameters` on the right) above 900px viewport width.
2. Resize the window below 900px → sidebar drops below the layer column.
3. With `Free cash = 0` and `Monthly expenses = 0`, all layer amounts read `0` and class candidates render but yield ranges are `0 – 0`.

- [ ] **Step 3: CBR threshold crossings**

Set `Free cash = 1 000 000`, `Monthly expenses = 100 000`:
1. Set CBR to `16`. Confirm "Ставка ≥ 15%: фиксируем длинные" regime tag; Layer C shows `ОФЗ-ПД`, `ОФЗ-ИН`, `Корп. облигации первого эшелона`, `Золото`.
2. Set CBR to `12`. Confirm regime switches to "Ставка 10–15%"; Layer C now shows `ОФЗ-ПК`, `ОФЗ-ИН`, `Корп. облигации`, `Замещающие`, `Юаневые`, `Золото` (no `ОФЗ-ПД`).
3. Set CBR to `9`. Confirm regime "Ставка < 10%"; Layer C drops `Корп. облигации`.

- [ ] **Step 4: Horizon and layer math**

1. Set horizon date to today + 2 weeks. Layer B and C show `0 – 0` expected income.
2. Set horizon date to today + 4 months. Layer C shows `0 – 0`; Layer B has a nonzero range.
3. Set horizon date to today + 12 months. All three layers have nonzero ranges.

- [ ] **Step 5: АСВ warning**

1. Set Layer A override to `2 000 000`. Confirm the red `⚠ Превышен лимит АСВ…` warning appears inside the Layer A card.
2. Click `Сбросить` next to Layer A amount. Warning disappears; amount returns to auto.

- [ ] **Step 6: Yield toggle**

1. Note the headline balance.
2. Toggle "Учитывать ожидаемую доходность…" ON. Balance jumps up by approximately the sum of layer midpoint incomes.
3. Toggle OFF. Balance returns.

- [ ] **Step 7: Print preview**

Click `PRINT`. In the print preview:
1. Layout is paper-terminal (cream background, dark text) regardless of UI theme.
2. The new `Распределение сбережений` block lists CBR, free cash, horizon, all three layers with amounts and expected income, and the disclaimer.

- [ ] **Step 8: RU/EN switch**

Toggle language. All chrome, layer headers, regime tags, class names, banners, and disclaimer translate without missing keys.

- [ ] **Step 9: Persistence**

1. Refresh the page → state survives via localStorage.
2. Export JSON, clear `localStorage`, re-import → state restores; new fields present.
3. In DevTools, manually craft a v1 blob in localStorage (`familycalc.state.v1`) with `schemaVersion: 1`, one scenario, and a small `investments` array. Refresh. Confirm `Свободные средства` field shows the summed amount; investments are gone.

- [ ] **Step 10: Recommended final commit (no code changes — just close out the feature)**

If everything passes:
```bash
git add -A
git status   # should be clean if all prior commits landed
```

If anything failed, file a bug, fix it in a new task, and re-run from Step 1.

---

## Self-review checklist (run after writing the plan, before handing off)

- [ ] **Spec coverage** — every section in `2026-05-15-savings-decision-framework-design.md` mapped to at least one task. Acceptance criteria #1–#10 all covered by the verification steps in Task 22.
- [ ] **Placeholder scan** — no `TBD`, `TODO`, `implement later`, `add appropriate X`, `similar to Task N`, `write tests for the above` anywhere in this plan.
- [ ] **Type consistency** — `Inputs`, `LayerInfo`, `AllocationResult`, `CombinedResult`, `combineResult()`, `allocate()`, `regimeFor()` all named identically in every task they appear in.
- [ ] **Tests precede implementations** — Phase 2 (allocate), Phase 3 (migration), Phase 5 (combineResult) all follow test-first ordering.

---

**Plan complete.** Saved to `docs/superpowers/plans/2026-05-15-savings-decision-framework.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
