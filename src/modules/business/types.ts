import type { LifeEvent } from '../../types/game';

export type BusinessSector =
  | 'food_hospitality'
  | 'services'
  | 'retail_commerce'
  | 'media_creative'
  | 'software_tech'
  | 'industrial_logistics'
  | 'deep_tech_pharma';

export type PricingStrategy = 'budget' | 'standard' | 'premium';
export type MarketingLevel = 'organic' | 'moderate' | 'aggressive';
export type PayrollTier = 'frugal' | 'standard' | 'generous';
export type RnDInvestment = 'minimal' | 'balanced' | 'breakthrough';
export type EconomicClimate = 'boom' | 'stable' | 'recession';
export type FundingMethod = 'bootstrapped' | 'bank_loan' | 'angel_investors';

export interface BusinessTemplate {
  id: string;
  title: string;
  sector: BusinessSector;
  icon: string;
  minAge: number;
  minSeedCapital: number;
  recommendedDegrees?: string[];
  recommendedDisciplines?: string[];
  baseAnnualRevenue: number;
  baseMarginPct: number;
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  description: string;
  suggestedLogos: string[];
  nameTemplates: string[];
}

export interface BusinessActionCooldowns {
  retreatYear?: number;
  bonusYear?: number;
  viralAdYear?: number;
  sponsorshipYear?: number;
}

export type ExecutiveActionType =
  | 'hire_workers'
  | 'downsize_workers'
  | 'company_retreat'
  | 'staff_bonus'
  | 'viral_blitz'
  | 'community_sponsorship'
  | 'upgrade_equipment'
  | 'operations_audit'
  | 'open_branch'
  | 'pay_loan_early'
  | 'rebrand'
  | 'set_owner_salary';

export interface ActiveBusinessProfile {
  id: string;
  templateId: string;
  name: string;
  slogan?: string;
  sector: BusinessSector;
  icon: string;
  foundedYear: number;
  foundedAge: number;
  equityPct: number;              // 0 - 100 (player's ownership stake)
  treasury: number;               // Company liquid cash reserves ($)
  valuation: number;              // Estimated enterprise market value ($)

  // Operational Levers
  pricing: PricingStrategy;
  marketing: MarketingLevel;
  payroll: PayrollTier;
  rnd: RnDInvestment;
  ownerSalary: number;            // Fixed annual salary drawn by player ($)
  dividendRatePct: number;        // % of annual net profits paid out (0 - 50%)

  // Company Vitality Gauges
  morale: number;                 // 0 - 100
  brandReputation: number;        // 0 - 100
  qualityScore: number;           // 0 - 100
  employeeCount: number;

  // Operations & Expansion Scale
  locationsCount: number;         // Default 1. Scales base revenue by +40% per branch
  equipmentTier: number;          // 0 = Standard, 1 = Upgraded, 2 = State-of-the-Art
  hasAuditCompleted: boolean;     // One-time efficiency audit (+3% margin)
  actionCooldowns: BusinessActionCooldowns;

  // Debt & Loans
  outstandingLoan: number;        // Commercial bank loan balance ($)
  annualLoanPayment: number;      // Annual debt service ($)

  // Lifetime Telemetry
  yearsInOperation: number;
  lifetimeRevenue: number;
  lifetimeProfit: number;
  isPubliclyTraded: boolean;
  tickerSymbol?: string;
  lastFiscalReport?: BusinessFiscalReport;
}

export interface AngelPitchQuestion {
  question: string;
  options: {
    label: string;
    description: string;
    equityImpact: number; // e.g. -5 (dilution), 0, +5
    score: number;        // 1 to 5
    feedback: string;
  }[];
}

export interface FundingEligibility {
  canBootstrapped: boolean;
  canBankLoan: boolean;
  bankLoanDownPayment: number;
  bankLoanAmount: number;
  annualLoanPayment: number;
  canPitchAngels: boolean;
  angelValuation: number;
  angelOfferedEquityPct: number;
  reason?: string;
}

export interface BusinessFiscalReport {
  grossRevenue: number;
  cogs: number;
  payrollExpense: number;
  marketingExpense: number;
  rndExpense: number;
  facilityExpense: number;
  loanPayment: number;
  operatingExpenses: number;
  preTaxProfit: number;
  taxesPaid: number;
  netProfit: number;
  ownerDividendPaid: number;
  ownerSalaryPaid: number;
  totalPayoutToPlayer: number;
  netTreasuryAddition: number;
  endingTreasury: number;
  endingValuation: number;
  climate: EconomicClimate;
  climateMultiplier: number;
}

export interface BusinessAnnualProgressResult {
  business: ActiveBusinessProfile | null;
  netPayoutToPlayer: number;       // Cash transferred to character.cash ($)
  events: LifeEvent[];
  annualReport: BusinessFiscalReport;
}

export interface BusinessAcquisitionOffer {
  buyerName: string;
  valuationMultiple: number;
  grossOfferAmount: number;
  playerEquityPayout: number;
  capitalGainsTax: number;
  netCashToPlayer: number;
}
