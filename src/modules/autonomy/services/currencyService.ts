import type { FamilyWealth } from '../../../types/game';
import type { NpcFinanceState } from '../types';

export interface CountryEconomicProfile {
  country: string;
  currency: string;
  /** Units of this currency equal to 1.00 USD. */
  usdExchangeRate: number;
  /** Purchasing power parity (PPP) cost-of-living multiplier relative to US baseline (1.0). */
  pppCostMultiplier: number;
  /** Effective baseline income tax rate (0 - 1). */
  effectiveTaxRate: number;
  /** Whether higher education is predominantly public/low-debt or loan-backed. */
  tuitionLoanRegime: 'loan_backed' | 'subsidized_public';
}

const DEFAULT_ECONOMIC_PROFILE: CountryEconomicProfile = {
  country: 'United States',
  currency: 'USD',
  usdExchangeRate: 1.0,
  pppCostMultiplier: 1.0,
  effectiveTaxRate: 0.22,
  tuitionLoanRegime: 'loan_backed',
};

/**
 * Canonical exchange rates pegged to 1.00 USD for deterministic cross-currency conversion.
 */
export const CURRENCY_USD_RATES: Record<string, number> = {
  USD: 1.0,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 150.0,
  PKR: 278.0,
  INR: 83.5,
  BRL: 5.05,
  KRW: 1350.0,
  CNY: 7.24,
  TRY: 32.5,
  SAR: 3.75,
  AED: 3.67,
  MXN: 17.1,
  RUB: 92.0,
  IDR: 15800.0,
  EGP: 47.5,
  NGN: 1450.0,
  ZAR: 18.6,
  ARS: 890.0,
  CHF: 0.89,
  SGD: 1.35,
  NZD: 1.65,
};

export const COUNTRY_ECONOMIC_PROFILES: Record<string, CountryEconomicProfile> = {
  'United States': {
    country: 'United States',
    currency: 'USD',
    usdExchangeRate: CURRENCY_USD_RATES.USD,
    pppCostMultiplier: 1.0,
    effectiveTaxRate: 0.22,
    tuitionLoanRegime: 'loan_backed',
  },
  'United Kingdom': {
    country: 'United Kingdom',
    currency: 'GBP',
    usdExchangeRate: CURRENCY_USD_RATES.GBP,
    pppCostMultiplier: 0.95,
    effectiveTaxRate: 0.25,
    tuitionLoanRegime: 'loan_backed',
  },
  Pakistan: {
    country: 'Pakistan',
    currency: 'PKR',
    usdExchangeRate: CURRENCY_USD_RATES.PKR,
    pppCostMultiplier: 0.26,
    effectiveTaxRate: 0.14,
    tuitionLoanRegime: 'subsidized_public',
  },
  Canada: {
    country: 'Canada',
    currency: 'CAD',
    usdExchangeRate: CURRENCY_USD_RATES.CAD,
    pppCostMultiplier: 0.92,
    effectiveTaxRate: 0.24,
    tuitionLoanRegime: 'loan_backed',
  },
  Australia: {
    country: 'Australia',
    currency: 'AUD',
    usdExchangeRate: CURRENCY_USD_RATES.AUD,
    pppCostMultiplier: 0.96,
    effectiveTaxRate: 0.25,
    tuitionLoanRegime: 'loan_backed',
  },
  Japan: {
    country: 'Japan',
    currency: 'JPY',
    usdExchangeRate: CURRENCY_USD_RATES.JPY,
    pppCostMultiplier: 0.82,
    effectiveTaxRate: 0.23,
    tuitionLoanRegime: 'subsidized_public',
  },
  Germany: {
    country: 'Germany',
    currency: 'EUR',
    usdExchangeRate: CURRENCY_USD_RATES.EUR,
    pppCostMultiplier: 0.88,
    effectiveTaxRate: 0.28,
    tuitionLoanRegime: 'subsidized_public',
  },
  France: {
    country: 'France',
    currency: 'EUR',
    usdExchangeRate: CURRENCY_USD_RATES.EUR,
    pppCostMultiplier: 0.89,
    effectiveTaxRate: 0.27,
    tuitionLoanRegime: 'subsidized_public',
  },
  Italy: {
    country: 'Italy',
    currency: 'EUR',
    usdExchangeRate: CURRENCY_USD_RATES.EUR,
    pppCostMultiplier: 0.80,
    effectiveTaxRate: 0.26,
    tuitionLoanRegime: 'subsidized_public',
  },
  Spain: {
    country: 'Spain',
    currency: 'EUR',
    usdExchangeRate: CURRENCY_USD_RATES.EUR,
    pppCostMultiplier: 0.78,
    effectiveTaxRate: 0.24,
    tuitionLoanRegime: 'subsidized_public',
  },
  Brazil: {
    country: 'Brazil',
    currency: 'BRL',
    usdExchangeRate: CURRENCY_USD_RATES.BRL,
    pppCostMultiplier: 0.45,
    effectiveTaxRate: 0.18,
    tuitionLoanRegime: 'subsidized_public',
  },
  India: {
    country: 'India',
    currency: 'INR',
    usdExchangeRate: CURRENCY_USD_RATES.INR,
    pppCostMultiplier: 0.30,
    effectiveTaxRate: 0.16,
    tuitionLoanRegime: 'subsidized_public',
  },
  'South Korea': {
    country: 'South Korea',
    currency: 'KRW',
    usdExchangeRate: CURRENCY_USD_RATES.KRW,
    pppCostMultiplier: 0.80,
    effectiveTaxRate: 0.21,
    tuitionLoanRegime: 'loan_backed',
  },
  China: {
    country: 'China',
    currency: 'CNY',
    usdExchangeRate: CURRENCY_USD_RATES.CNY,
    pppCostMultiplier: 0.52,
    effectiveTaxRate: 0.19,
    tuitionLoanRegime: 'subsidized_public',
  },
  Turkey: {
    country: 'Turkey',
    currency: 'TRY',
    usdExchangeRate: CURRENCY_USD_RATES.TRY,
    pppCostMultiplier: 0.42,
    effectiveTaxRate: 0.18,
    tuitionLoanRegime: 'subsidized_public',
  },
  'Saudi Arabia': {
    country: 'Saudi Arabia',
    currency: 'SAR',
    usdExchangeRate: CURRENCY_USD_RATES.SAR,
    pppCostMultiplier: 0.72,
    effectiveTaxRate: 0.05,
    tuitionLoanRegime: 'subsidized_public',
  },
  'United Arab Emirates': {
    country: 'United Arab Emirates',
    currency: 'AED',
    usdExchangeRate: CURRENCY_USD_RATES.AED,
    pppCostMultiplier: 0.85,
    effectiveTaxRate: 0.05,
    tuitionLoanRegime: 'loan_backed',
  },
  Mexico: {
    country: 'Mexico',
    currency: 'MXN',
    usdExchangeRate: CURRENCY_USD_RATES.MXN,
    pppCostMultiplier: 0.50,
    effectiveTaxRate: 0.18,
    tuitionLoanRegime: 'subsidized_public',
  },
  Russia: {
    country: 'Russia',
    currency: 'RUB',
    usdExchangeRate: CURRENCY_USD_RATES.RUB,
    pppCostMultiplier: 0.44,
    effectiveTaxRate: 0.13,
    tuitionLoanRegime: 'subsidized_public',
  },
  Indonesia: {
    country: 'Indonesia',
    currency: 'IDR',
    usdExchangeRate: CURRENCY_USD_RATES.IDR,
    pppCostMultiplier: 0.36,
    effectiveTaxRate: 0.15,
    tuitionLoanRegime: 'subsidized_public',
  },
  Egypt: {
    country: 'Egypt',
    currency: 'EGP',
    usdExchangeRate: CURRENCY_USD_RATES.EGP,
    pppCostMultiplier: 0.30,
    effectiveTaxRate: 0.15,
    tuitionLoanRegime: 'subsidized_public',
  },
  Nigeria: {
    country: 'Nigeria',
    currency: 'NGN',
    usdExchangeRate: CURRENCY_USD_RATES.NGN,
    pppCostMultiplier: 0.28,
    effectiveTaxRate: 0.14,
    tuitionLoanRegime: 'subsidized_public',
  },
  'South Africa': {
    country: 'South Africa',
    currency: 'ZAR',
    usdExchangeRate: CURRENCY_USD_RATES.ZAR,
    pppCostMultiplier: 0.48,
    effectiveTaxRate: 0.20,
    tuitionLoanRegime: 'loan_backed',
  },
  Argentina: {
    country: 'Argentina',
    currency: 'ARS',
    usdExchangeRate: CURRENCY_USD_RATES.ARS,
    pppCostMultiplier: 0.38,
    effectiveTaxRate: 0.18,
    tuitionLoanRegime: 'subsidized_public',
  },
};

/**
 * Resolves the economic profile for a country, falling back to USD baseline if unknown.
 */
export function getCountryEconomicProfile(countryName?: string): CountryEconomicProfile {
  if (!countryName) return DEFAULT_ECONOMIC_PROFILE;
  const trimmed = countryName.trim();
  if (COUNTRY_ECONOMIC_PROFILES[trimmed]) {
    return COUNTRY_ECONOMIC_PROFILES[trimmed];
  }
  return {
    ...DEFAULT_ECONOMIC_PROFILE,
    country: trimmed,
  };
}

/**
 * Resolves the ISO currency code for a given country name.
 */
export function getCurrencyForCountry(countryName?: string): string {
  return getCountryEconomicProfile(countryName).currency;
}

/**
 * Returns the exchange rate multiplier to convert 1 unit of `fromCurrency` into `toCurrency`.
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  const fromCode = (fromCurrency || 'USD').toUpperCase();
  const toCode = (toCurrency || 'USD').toUpperCase();
  if (fromCode === toCode) return 1.0;

  const fromPerUsd = CURRENCY_USD_RATES[fromCode] ?? 1.0;
  const toPerUsd = CURRENCY_USD_RATES[toCode] ?? 1.0;
  return toPerUsd / fromPerUsd;
}

/**
 * Safeguard #4: Converts a monetary value from `fromCurrency` to `toCurrency` via the canonical USD peg.
 * Never transfers raw monetary values across differing currencies without conversion.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): { convertedAmount: number; exchangeRateApplied: number } {
  if (!Number.isFinite(amount)) {
    return { convertedAmount: 0, exchangeRateApplied: 1.0 };
  }
  const rate = getExchangeRate(fromCurrency, toCurrency);
  if (rate === 1.0) {
    return { convertedAmount: Math.round(amount), exchangeRateApplied: 1.0 };
  }
  return {
    convertedAmount: Math.round(amount * rate),
    exchangeRateApplied: rate,
  };
}

/**
 * Computes canonical Net Worth strictly from single-source-of-truth assets minus liabilities:
 * Net Worth = (cash + savings + realEstateValue + businessEquity) - (studentDebt + mortgageBalance + otherLiabilities)
 */
export function calculateCanonicalNetWorth(
  finances: Pick<
    NpcFinanceState,
    | 'cash'
    | 'savings'
    | 'realEstateValue'
    | 'businessEquity'
    | 'studentDebt'
    | 'mortgageBalance'
    | 'otherLiabilities'
  >
): number {
  const totalAssets =
    Math.round(finances.cash) +
    Math.round(finances.savings) +
    Math.round(finances.realEstateValue) +
    Math.round(finances.businessEquity);
  const totalLiabilities =
    Math.round(finances.studentDebt) +
    Math.round(finances.mortgageBalance) +
    Math.round(finances.otherLiabilities);
  return totalAssets - totalLiabilities;
}

/**
 * Transfers funds between `cash` and `savings` as a zero-sum asset reallocation.
 * Positive `amountFromCashToSavings` moves cash -> savings; negative moves savings -> cash.
 * Guaranteed to never artificially inflate or deflate Net Worth.
 */
export function transferBetweenCashAndSavings(
  finances: NpcFinanceState,
  amountFromCashToSavings: number
): NpcFinanceState {
  if (!Number.isFinite(amountFromCashToSavings) || amountFromCashToSavings === 0) {
    return {
      ...finances,
      netWorth: calculateCanonicalNetWorth(finances),
    };
  }

  const roundedTransfer = Math.round(amountFromCashToSavings);
  let actualDelta = 0;

  if (roundedTransfer > 0) {
    actualDelta = Math.min(Math.max(0, finances.cash), roundedTransfer);
  } else {
    actualDelta = -Math.min(Math.max(0, finances.savings), Math.abs(roundedTransfer));
  }

  const updated: NpcFinanceState = {
    ...finances,
    cash: finances.cash - actualDelta,
    savings: finances.savings + actualDelta,
    netWorth: 0,
  };
  updated.netWorth = calculateCanonicalNetWorth(updated);
  return updated;
}

/**
 * Estimates initial NPC finances based on age, occupation, family wealth tier, and country PPP.
 */
export function createInitialNpcFinances(params: {
  country: string;
  age: number;
  occupation: string;
  wealthTier?: FamilyWealth;
  explicitAnnualIncome?: number;
  studentDebt?: number;
}): NpcFinanceState {
  const econ = getCountryEconomicProfile(params.country);
  const currency = econ.currency;
  const initialStudentDebt = Math.max(0, Math.round(params.studentDebt ?? 0));

  if (params.age < 18 || params.occupation.includes('Student') || params.occupation === 'Infant' || params.occupation === 'Toddler') {
    const childFinances: NpcFinanceState = {
      currency,
      cash: 0,
      savings: 0,
      realEstateValue: 0,
      businessEquity: 0,
      studentDebt: initialStudentDebt,
      mortgageBalance: 0,
      otherLiabilities: 0,
      annualIncome: 0,
      annualExpenses: 0,
      netWorth: 0,
    };
    childFinances.netWorth = calculateCanonicalNetWorth(childFinances);
    return childFinances;
  }

  let baseUsdIncome = 42000;
  if (params.wealthTier === 'struggling') baseUsdIncome = 24000;
  else if (params.wealthTier === 'modest') baseUsdIncome = 45000;
  else if (params.wealthTier === 'comfortable') baseUsdIncome = 82000;
  else if (params.wealthTier === 'wealthy') baseUsdIncome = 175000;

  const annualIncome =
    params.explicitAnnualIncome !== undefined && params.explicitAnnualIncome > 0
      ? Math.round(params.explicitAnnualIncome)
      : Math.round(baseUsdIncome * econ.pppCostMultiplier);

  const annualExpenses = Math.round(annualIncome * 0.65);
  const workingYears = Math.max(0, params.age - 22);
  const accumulatedSavings = Math.round(Math.max(0, (annualIncome - annualExpenses) * workingYears * 0.35));
  const liquidCash = Math.round(annualIncome * 0.15);

  const finances: NpcFinanceState = {
    currency,
    cash: liquidCash,
    savings: accumulatedSavings,
    realEstateValue: 0,
    businessEquity: 0,
    studentDebt: initialStudentDebt,
    mortgageBalance: 0,
    otherLiabilities: 0,
    annualIncome,
    annualExpenses,
    netWorth: 0,
  };
  finances.netWorth = calculateCanonicalNetWorth(finances);
  return finances;
}
