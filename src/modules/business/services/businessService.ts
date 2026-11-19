import type { CharacterProfile, LifeEvent } from '../../../types/game';
import type {
  ActiveBusinessProfile,
  BusinessAnnualProgressResult,
  BusinessFiscalReport,
  BusinessSector,
  BusinessTemplate,
  EconomicClimate,
  ExecutiveActionType,
  FundingEligibility,
  FundingMethod,
} from '../types';
import { getBusinessTemplateById } from '../data/businessCatalog';
import { createId } from '../../../utils/id';
import { stampPlayerNetWorth } from '../../assets/services/assetService';
import {
  evaluateBusinessConsequence,
  resolveBusinessManagementCapability,
  type BusinessConsequenceDecision,
} from '../../crime/data/crimeConsequences';
import {
  evaluateFinancingEligibility,
  isCurrentlyIncarcerated,
} from '../../crime/services/crimeSelectors';
import type {
  CrimeExposureLevel,
  CrimeOutcomeStatus,
  PendingCourtCase,
} from '../../crime/types';
import { randomInt } from '../../../utils/random';

export const ANNUAL_LOAN_INTEREST_RATE = 0.075;
export const APPOINT_MANAGER_TREASURY_COST = 12000;

const clamp = (val: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(val)));

// Sector valuation multiples on annual gross revenue
const SECTOR_VALUATION_MULTIPLES: Record<BusinessSector, number> = {
  food_hospitality: 1.2,
  services: 1.5,
  retail_commerce: 1.4,
  media_creative: 1.8,
  software_tech: 4.5,
  industrial_logistics: 1.6,
  deep_tech_pharma: 5.5,
};

// Sector baseline Cost of Goods Sold (COGS) rates as a fraction of gross revenue
const SECTOR_COGS_RATE: Record<BusinessSector, number> = {
  software_tech: 0.14,
  media_creative: 0.16,
  services: 0.18,
  deep_tech_pharma: 0.22,
  food_hospitality: 0.28,
  retail_commerce: 0.34,
  industrial_logistics: 0.36,
};

export interface FoundBusinessParams {
  templateId: string;
  customName: string;
  icon: string;
  slogan?: string;
  fundingMethod: FundingMethod;
  angelEquityDilutionPct?: number; // e.g. 25% given to angels -> player keeps 75%
  customInvestmentAmount?: number; // Custom seed capital chosen via investment slider
}

/** Evaluates the player's qualification and pricing for all 3 funding routes. */
export function evaluateFundingEligibility(
  character: CharacterProfile,
  template: BusinessTemplate
): FundingEligibility {
  const bankLoanDownPayment = Math.round(template.minSeedCapital * 0.25);
  const bankLoanAmount = template.minSeedCapital - bankLoanDownPayment;
  // Standard 10-year amortized annual payment (~14.5% of principal per year)
  const annualLoanPayment = Math.round(bankLoanAmount * 0.145);

  if (isCurrentlyIncarcerated(character)) {
    return {
      canBootstrapped: false,
      canBankLoan: false,
      bankLoanDownPayment,
      bankLoanAmount,
      annualLoanPayment,
      canPitchAngels: false,
      angelValuation: 0,
      angelOfferedEquityPct: 0,
      reason: 'Cannot incorporate or fund a business while incarcerated.',
    };
  }

  const cash = character.cash || 0;
  const netWorth = cash + (character.bankBalance || 0);
  const smarts = character.stats.smarts;

  // 1. Bootstrapped
  const canBootstrapped = cash >= template.minSeedCapital;

  // 2. Commercial Bank Loan (25% down, 10-year term at 7.5% annual interest)
  const loanUnderwriting = evaluateFinancingEligibility(
    character,
    'commercial_loan',
    bankLoanAmount,
  );
  const hasDownPaymentAndNetWorth =
    cash >= bankLoanDownPayment && netWorth >= bankLoanDownPayment * 1.5;
  const canBankLoan = hasDownPaymentAndNetWorth && loanUnderwriting.eligible;

  // 3. Angel Investors Pitch
  const diplomas = character.education?.diplomas || [];
  const hasMatchingDegree = template.recommendedDegrees
    ? template.recommendedDegrees.some((d) => diplomas.includes(d))
    : false;
  const hasBusinessDegree = diplomas.some(
    (d) => d.includes('Business') || d.includes('M.B.A.') || d.includes('Finance')
  );
  const angelUnderwriting = evaluateFinancingEligibility(character, 'angel_equity');
  const canPitchAngels =
    (smarts >= 55 || hasMatchingDegree || hasBusinessDegree) && angelUnderwriting.eligible;

  // Angel valuation bonus: better smarts & degrees = less equity given away
  let baselineInvestorTake = 30; // 30% to investors, 70% to player
  if (smarts >= 85) baselineInvestorTake -= 5;
  if (hasMatchingDegree) baselineInvestorTake -= 5;
  if (hasBusinessDegree) baselineInvestorTake -= 4;
  baselineInvestorTake = Math.max(15, Math.min(45, baselineInvestorTake));

  const angelOfferedEquityPct = 100 - baselineInvestorTake;
  const angelValuation = Math.round(template.minSeedCapital / (baselineInvestorTake / 100));

  let reason = '';
  if (!canBootstrapped && !canBankLoan && !canPitchAngels) {
    if (!loanUnderwriting.eligible && loanUnderwriting.reason) {
      reason = loanUnderwriting.reason;
    } else if (!angelUnderwriting.eligible && angelUnderwriting.reason) {
      reason = angelUnderwriting.reason;
    } else {
      reason = `Requires at least $${bankLoanDownPayment.toLocaleString()} cash down payment or higher Smarts to pitch investors.`;
    }
  }

  return {
    canBootstrapped,
    canBankLoan,
    bankLoanDownPayment,
    bankLoanAmount,
    annualLoanPayment,
    canPitchAngels,
    angelValuation,
    angelOfferedEquityPct,
    reason,
  };
}

/**
 * Founds a new business entity:
 * - Deducts cash investment from player's wallet
 * - Initializes corporate treasury and capital structure
 * - Promotes character occupation to "Founder & CEO ({customName})"
 * - Logs milestone life event
 */
export function foundBusiness(
  character: CharacterProfile,
  params: FoundBusinessParams
): { character: CharacterProfile; business: ActiveBusinessProfile } {
  if (isCurrentlyIncarcerated(character)) {
    throw new Error('Cannot found a business while incarcerated.');
  }
  const template = getBusinessTemplateById(params.templateId);
  if (!template) {
    throw new Error(`Business template ${params.templateId} not found.`);
  }

  const { age, birthYear } = character;
  const seedCapital =
    params.customInvestmentAmount && params.customInvestmentAmount >= template.minSeedCapital
      ? Math.round(params.customInvestmentAmount)
      : template.minSeedCapital;

  let playerCashPaid = 0;
  let outstandingLoan = 0;
  let annualLoanPayment = 0;
  let equityPct = 100;

  if (params.fundingMethod === 'bootstrapped') {
    playerCashPaid = seedCapital;
    equityPct = 100;
  } else if (params.fundingMethod === 'bank_loan') {
    playerCashPaid = Math.round(seedCapital * 0.25);
    outstandingLoan = seedCapital - playerCashPaid;
    annualLoanPayment = Math.round(outstandingLoan * 0.145);
    equityPct = 100;
  } else if (params.fundingMethod === 'angel_investors') {
    playerCashPaid = 0; // funded entirely by venture/angel syndicates
    equityPct = params.angelEquityDilutionPct || 70;
  }

  const initialValuation = Math.round(
    seedCapital * (SECTOR_VALUATION_MULTIPLES[template.sector] * 0.8)
  );

  const initialEmployees =
    seedCapital < 50000
      ? 3
      : seedCapital < 100000
      ? 6
      : seedCapital < 300000
      ? 12
      : 24;

  const business: ActiveBusinessProfile = {
    id: createId(),
    templateId: template.id,
    name: params.customName.trim() || template.title,
    slogan: params.slogan?.trim() || undefined,
    sector: template.sector,
    icon: params.icon || template.icon,
    foundedYear: birthYear + age,
    foundedAge: age,
    equityPct,
    treasury: seedCapital,
    valuation: initialValuation,

    // Default Operational Levers
    pricing: 'standard',
    marketing: 'moderate',
    payroll: 'standard',
    rnd: 'balanced',
    ownerSalary: 0,
    dividendRatePct: 20,

    // Vitality Gauges
    morale: 80,
    brandReputation: 60,
    qualityScore: 70,
    employeeCount: initialEmployees,

    // Operations & Expansion Scale
    locationsCount: 1,
    equipmentTier: 0,
    hasAuditCompleted: false,
    actionCooldowns: {},

    // Loans
    outstandingLoan,
    annualLoanPayment,
    loanGuaranteeType:
      params.fundingMethod === 'bank_loan' ? 'personally_guaranteed' : 'corporate_only',

    // Explicit Management & Continuity Metadata
    managementCapability: 'owner_operated',
    operationalStatus: 'active',
    absenteeLossYears: 0,

    // Telemetry
    yearsInOperation: 0,
    lifetimeRevenue: 0,
    lifetimeProfit: 0,
    isPubliclyTraded: false,
  };

  const remainingCash = Math.max(0, character.cash - playerCashPaid);

  const foundEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Founded ${business.name}`,
    message: `You officially registered ${business.name} in the ${template.title} sector! With $${template.minSeedCapital.toLocaleString()} in initial seed treasury, you are now the Founder & CEO with ${equityPct}% equity.`,
    category: 'business',
    icon: business.icon,
  };

  const updatedCharacter = stampPlayerNetWorth({
    ...character,
    cash: remainingCash,
    occupation: `Founder & CEO (${business.name})`,
    business,
    timeline: [...character.timeline, foundEvent],
  });

  return { character: updatedCharacter, business };
}

/** Updates operational levers inside an active business. */
export function updateBusinessLevers(
  business: ActiveBusinessProfile,
  updates: Partial<
    Pick<
      ActiveBusinessProfile,
      'pricing' | 'marketing' | 'payroll' | 'rnd' | 'ownerSalary' | 'dividendRatePct' | 'slogan'
    >
  >
): ActiveBusinessProfile {
  return {
    ...business,
    ...updates,
    dividendRatePct:
      updates.dividendRatePct !== undefined
        ? clamp(updates.dividendRatePct, 0, 50)
        : business.dividendRatePct,
    ownerSalary:
      updates.ownerSalary !== undefined
        ? Math.max(0, Math.round(updates.ownerSalary))
        : business.ownerSalary,
  };
}

/**
 * Simulates 1 fiscal year of business operations during Age Up:
 * - Macroeconomic climate roll (Boom, Stable, Recession)
 * - Computes gross revenue, COGS, payroll, marketing, R&D, loan debt service, and corporate income taxes
 * - Accrues net profits into the corporate treasury
 * - Pays owner salary & dividends directly into the character's personal wallet
 * - Amortizes commercial debt and recalculates corporate valuation
 */
export function progressBusinessForYear(
  business: ActiveBusinessProfile,
  character: CharacterProfile,
  nextAge: number
): BusinessAnnualProgressResult {
  const template = getBusinessTemplateById(business.templateId);
  const nextYear = character.birthYear + nextAge;
  const events: LifeEvent[] = [];

  const incarcerated = isCurrentlyIncarcerated(character);
  const capability = resolveBusinessManagementCapability(business);
  const isDelegatedIncarcerated = incarcerated && capability === 'delegated_management';
  const isPausedIncarcerated =
    incarcerated &&
    (capability !== 'delegated_management' || business.operationalStatus === 'paused_incarceration');

  if (isPausedIncarcerationMode(isPausedIncarcerated, isDelegatedIncarcerated)) {
    const openingPrincipal = Math.max(0, business.outstandingLoan);
    const interestDue =
      openingPrincipal > 0 ? Math.round(openingPrincipal * ANNUAL_LOAN_INTEREST_RATE) : 0;
    const scheduledInstallment =
      openingPrincipal > 0
        ? Math.min(openingPrincipal + interestDue, business.annualLoanPayment)
        : 0;
    const availableTreasury = Math.max(0, business.treasury);
    const debtCashPaid = Math.min(availableTreasury, scheduledInstallment);
    const interestPaid = Math.min(interestDue, debtCashPaid);
    const unpaidInterest = interestDue - interestPaid;
    const principalRepaid = Math.min(openingPrincipal, debtCashPaid - interestPaid);
    const closingPrincipal = openingPrincipal - principalRepaid + unpaidInterest;
    const nextAnnualLoanPayment = closingPrincipal === 0 ? 0 : business.annualLoanPayment;

    const preTaxProfit = -interestDue;
    const taxesPaid = 0;
    const netProfit = preTaxProfit - taxesPaid;
    const netTreasuryAddition = netProfit + unpaidInterest - principalRepaid;
    const endingTreasury = business.treasury + netTreasuryAddition;

    const pausedReport: BusinessFiscalReport = {
      grossRevenue: 0,
      cogs: 0,
      payrollExpense: 0,
      marketingExpense: 0,
      rndExpense: 0,
      facilityExpense: 0,
      managementExpense: 0,
      loanPayment: debtCashPaid,
      loanInterestExpense: interestDue,
      loanPrincipalPaid: principalRepaid,
      loanUnpaidInterestCapitalized: unpaidInterest,
      operatingExpenses: 0,
      preTaxProfit,
      taxesPaid,
      netProfit,
      ownerDividendPaid: 0,
      externalShareholderDividendPaid: 0,
      ownerSalaryPaid: 0,
      totalPayoutToPlayer: 0,
      netTreasuryAddition,
      endingTreasury,
      endingValuation: business.valuation,
      climate: 'stable',
      climateMultiplier: 1.0,
    };

    const collapsed =
      endingTreasury < -business.valuation * 0.5 ||
      (closingPrincipal > 0 && closingPrincipal > business.valuation * 1.5);

    if (collapsed) {
      const salvagePayout = calculateBusinessLiquidationProceeds({
        ...business,
        treasury: endingTreasury,
        outstandingLoan: closingPrincipal,
      });
      return {
        business: null,
        netPayoutToPlayer: salvagePayout,
        events: [
          {
            id: createId(),
            age: nextAge,
            year: nextYear,
            title: `${business.name} Forced Liquidation`,
            message: `${business.name} collapsed into forced liquidation under unserviced debt while operations were paused during your incarceration.`,
            category: 'misfortune',
            icon: '🚨',
          },
        ],
        annualReport: pausedReport,
      };
    }

    return {
      business: {
        ...business,
        treasury: endingTreasury,
        outstandingLoan: closingPrincipal,
        annualLoanPayment: nextAnnualLoanPayment,
        managementCapability: capability,
        operationalStatus: 'paused_incarceration',
        actionCooldowns: {},
        lastFiscalReport: undefined,
      },
      netPayoutToPlayer: 0,
      events: [
        {
          id: createId(),
          age: nextAge,
          year: nextYear,
          title: 'Business Operations Paused',
          message:
            openingPrincipal > 0
              ? `Operations and owner payouts at ${business.name} remained paused while you were incarcerated. Corporate treasury paid $${debtCashPaid.toLocaleString()} toward loan obligations ($${closingPrincipal.toLocaleString()} balance remaining).`
              : `Personal income and owner payouts from ${business.name} were suspended while you remained incarcerated.`,
          category: 'business',
          icon: '🏢',
        },
      ],
      annualReport: pausedReport,
    };
  }

  // 1. Macroeconomic Climate Roll
  const climateRoll = randomInt(1, 100);
  let climate: EconomicClimate = 'stable';
  let climateMultiplier = 1.0;

  if (climateRoll <= 20) {
    climate = 'boom';
    climateMultiplier = 1.25;
  } else if (climateRoll >= 85) {
    climate = 'recession';
    climateMultiplier = 0.80;
  }

  // 2. Operational Lever Multipliers
  // Pricing
  let pricingVolumeMult = 1.0;
  let pricingCogsOffset = 0.0;
  if (business.pricing === 'budget') {
    pricingVolumeMult = 1.25;
    pricingCogsOffset = 0.03; // Slight margin decrease from discount pricing
  } else if (business.pricing === 'premium') {
    const brandBoost = business.brandReputation >= 75 ? 0.95 : 0.82;
    pricingVolumeMult = brandBoost;
    pricingCogsOffset = -0.05; // Margin expansion from premium markup
  }

  // Marketing
  let marketingSpendPct = 0.04;
  let marketingDemandMult = 1.14;
  let brandDelta = 3;
  if (business.marketing === 'organic') {
    marketingSpendPct = 0;
    marketingDemandMult = 0.96;
    brandDelta = -1;
  } else if (business.marketing === 'aggressive') {
    marketingSpendPct = climate === 'recession' ? 0.09 : 0.08;
    marketingDemandMult = climate === 'recession' ? 1.15 : 1.28;
    brandDelta = 7;
  }

  // Payroll & Workforce
  const targetPayrollPct =
    business.sector === 'software_tech' || business.sector === 'media_creative'
      ? 0.26
      : 0.22;

  let payrollCostMult = 1.0;
  let moraleDelta = 1;
  if (business.payroll === 'frugal') {
    payrollCostMult = 0.78; // Saves 22% on payroll
    moraleDelta = -4;
  } else if (business.payroll === 'generous') {
    payrollCostMult = 1.22;
    moraleDelta = 8;
  }

  // R&D / Innovation
  let rndSpendPct = 0.03;
  let qualityDelta = 3;
  if (business.rnd === 'minimal') {
    rndSpendPct = 0.01;
    qualityDelta = -1;
  } else if (business.rnd === 'breakthrough') {
    rndSpendPct = 0.07;
    qualityDelta = 8;
  }

  // Absentee founder drift when running under delegated management during prison
  const absenteeGaugeDrag = isDelegatedIncarcerated ? -5 : 0;
  const nextMorale = clamp(business.morale + moraleDelta + absenteeGaugeDrag + randomInt(-2, 3));
  const nextBrand = clamp(business.brandReputation + brandDelta + randomInt(-2, 3));
  const nextQuality = clamp(business.qualityScore + qualityDelta + absenteeGaugeDrag + randomInt(-2, 3));

  // Morale & Quality feedback into customer volume
  const qualityFactor = 0.75 + (nextQuality / 100) * 0.40;
  const moraleFactor = 0.80 + (nextMorale / 100) * 0.30;

  // Founder Acumen bonus from degrees and intellect
  const diplomas = character.education?.diplomas || [];
  const hasMatchingDegree = template?.recommendedDegrees
    ? template.recommendedDegrees.some((d) => diplomas.includes(d))
    : false;
  const hasBusinessDegree = diplomas.some(
    (d) => d.includes('Business') || d.includes('M.B.A.') || d.includes('Finance')
  );

  let founderAcumenMultiplier = 1.0;
  if (hasMatchingDegree || hasBusinessDegree) {
    founderAcumenMultiplier += 0.08;
  }
  if (character.stats.smarts >= 75) {
    founderAcumenMultiplier += 0.05;
  }

  // 3. Gross Revenue & Expense Calculation
  const locationsMultiplier = 1 + (Math.max(1, business.locationsCount || 1) - 1) * 0.40;
  const baseRevenue = template
    ? Math.round(template.baseAnnualRevenue * (1 + business.yearsInOperation * 0.08) * locationsMultiplier)
    : 150000;

  const absenteeDemandMult = isDelegatedIncarcerated ? 0.85 : 1.0;
  const totalDemandMultiplier =
    climateMultiplier *
    pricingVolumeMult *
    marketingDemandMult *
    qualityFactor *
    moraleFactor *
    founderAcumenMultiplier *
    absenteeDemandMult;

  const grossRevenue = Math.max(
    10000,
    Math.round(baseRevenue * totalDemandMultiplier) + randomInt(-3000, 3000)
  );

  // Cost of Goods Sold (COGS)
  const baseCogsRate = SECTOR_COGS_RATE[business.sector] || 0.25;
  const auditDiscount = business.hasAuditCompleted ? 0.03 : 0;
  const equipmentDiscount = (business.equipmentTier || 0) * 0.02;
  const effectiveCogsRate = Math.max(
    0.06,
    Math.min(0.55, baseCogsRate + pricingCogsOffset - auditDiscount - equipmentDiscount)
  );
  const cogs = Math.round(grossRevenue * effectiveCogsRate);

  // Operating Expenses (excluding loan principal repayment)
  const facilityRate =
    business.sector === 'software_tech' || business.sector === 'media_creative'
      ? 0.025
      : business.sector === 'deep_tech_pharma'
      ? 0.05
      : 0.06;
  const facilityExpense = Math.round(grossRevenue * facilityRate);
  const marketingExpense = Math.round(grossRevenue * marketingSpendPct);
  const rndExpense = Math.round(grossRevenue * rndSpendPct);
  const payrollExpense = Math.round(grossRevenue * targetPayrollPct * payrollCostMult);
  const managementExpense = isDelegatedIncarcerated ? Math.round(grossRevenue * 0.05) : 0;

  // Unified 7.5% Loan Accounting: Interest Expense vs. Principal Repayment
  const openingPrincipal = Math.max(0, business.outstandingLoan);
  const interestDue =
    openingPrincipal > 0 ? Math.round(openingPrincipal * ANNUAL_LOAN_INTEREST_RATE) : 0;
  const scheduledInstallment =
    openingPrincipal > 0
      ? Math.min(openingPrincipal + interestDue, business.annualLoanPayment)
      : 0;
  const loanPayment = scheduledInstallment;
  const interestPaid = Math.min(interestDue, loanPayment);
  const unpaidInterest = interestDue - interestPaid;
  const principalRepaid = Math.min(openingPrincipal, loanPayment - interestPaid);
  const nextLoanBalance = openingPrincipal - principalRepaid + unpaidInterest;
  const nextAnnualLoanPayment = nextLoanBalance === 0 ? 0 : business.annualLoanPayment;

  const operatingExpenses =
    cogs + payrollExpense + facilityExpense + marketingExpense + rndExpense + managementExpense;

  const preTaxProfit = grossRevenue - operatingExpenses - interestDue;
  const taxesPaid = preTaxProfit > 0 ? Math.round(preTaxProfit * 0.21) : 0;
  const netProfit = preTaxProfit - taxesPaid;

  // 4. Owner Payouts (Salary + Shareholder Dividends)
  const postPrincipalAvailableCash =
    business.treasury + netProfit + unpaidInterest - principalRepaid;

  let ownerSalaryPaid = 0;
  if (!isDelegatedIncarcerated && business.ownerSalary > 0) {
    ownerSalaryPaid = Math.min(
      business.ownerSalary,
      Math.max(
        0,
        business.treasury + Math.max(0, netProfit + unpaidInterest - principalRepaid),
      )
    );
  }

  const candidateDividendPool =
    netProfit > 0 && business.dividendRatePct > 0
      ? Math.round(netProfit * (business.dividendRatePct / 100))
      : 0;
  const incarcerationReserveFloor = Math.max(5000, Math.round(business.valuation * 0.10));
  const totalDividendPool = isDelegatedIncarcerated
    ? candidateDividendPool > 0 &&
      postPrincipalAvailableCash - candidateDividendPool >= incarcerationReserveFloor
      ? candidateDividendPool
      : 0
    : candidateDividendPool;

  const ownerDividendPaid = Math.round(totalDividendPool * (business.equityPct / 100));
  const externalShareholderDividendPaid = totalDividendPool - ownerDividendPaid;
  const totalPayoutToPlayer = ownerSalaryPaid + ownerDividendPaid;

  // 5. Corporate Treasury Balance (universal double-entry reconciliation)
  const netTreasuryAddition =
    netProfit + unpaidInterest - principalRepaid - ownerSalaryPaid - totalDividendPool;
  const endingTreasury = business.treasury + netTreasuryAddition;

  // 6. Valuation Model
  const sectorMultiple = SECTOR_VALUATION_MULTIPLES[business.sector] || 1.5;
  const multipleAdjuster = (nextBrand + nextQuality) / 140; // 0.8 - 1.4x
  const enterpriseValue = Math.round(grossRevenue * sectorMultiple * multipleAdjuster);
  const endingValuation = Math.max(
    15000,
    Math.round(enterpriseValue + Math.max(0, endingTreasury) - nextLoanBalance)
  );

  // Absentee loss counter & delegated collapse check
  const nextAbsenteeLossYears = isDelegatedIncarcerated
    ? netProfit < 0 || endingTreasury < 0
      ? (business.absenteeLossYears ?? 0) + 1
      : 0
    : 0;

  const fiscalReport: BusinessFiscalReport = {
    grossRevenue,
    cogs,
    payrollExpense,
    marketingExpense,
    rndExpense,
    facilityExpense,
    managementExpense,
    loanPayment,
    loanInterestExpense: interestDue,
    loanPrincipalPaid: principalRepaid,
    loanUnpaidInterestCapitalized: unpaidInterest,
    operatingExpenses,
    preTaxProfit,
    taxesPaid,
    netProfit,
    ownerDividendPaid,
    externalShareholderDividendPaid,
    ownerSalaryPaid,
    totalPayoutToPlayer,
    netTreasuryAddition,
    endingTreasury,
    endingValuation,
    climate,
    climateMultiplier,
  };

  if (isDelegatedIncarcerated) {
    const collapsed =
      endingTreasury < -endingValuation * 0.5 ||
      (nextAbsenteeLossYears >= 2 && endingTreasury <= 0) ||
      nextMorale < 15 ||
      (nextLoanBalance > 0 && nextLoanBalance > endingValuation * 1.5);

    if (collapsed) {
      const salvagePayout = calculateBusinessLiquidationProceeds({
        ...business,
        treasury: endingTreasury,
        valuation: endingValuation,
        outstandingLoan: nextLoanBalance,
      });
      return {
        business: null,
        netPayoutToPlayer: salvagePayout,
        events: [
          {
            id: createId(),
            age: nextAge,
            year: nextYear,
            title: `${business.name} Collapsed During Incarceration`,
            message: `${business.name} suffered operational collapse under absentee management and was liquidated.`,
            category: 'misfortune',
            icon: '🚨',
          },
        ],
        annualReport: fiscalReport,
      };
    }

    events.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: `${business.name} Delegated Operations`,
      message: `${business.name} operated under delegated management while you were incarcerated (Net Profit: $${netProfit.toLocaleString()}, Passive Dividend: $${ownerDividendPaid.toLocaleString()}).`,
      category: 'business',
      icon: '🏢',
    });
  } else {
    // 7. Events & Milestones (free-world operation)
    if (climate === 'boom') {
      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: 'Economic Market Boom!',
        message: `Consumer confidence surged across the nation! Surging footfall boosted ${business.name}'s annual sales by +32%.`,
        category: 'business',
        icon: '🚀',
      });
    } else if (climate === 'recession') {
      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: 'Economic Downturn',
        message: `A nationwide recession tightened consumer wallets, dragging ${business.name}'s revenue down by -28%.`,
        category: 'business',
        icon: '📉',
      });
    }

    if (endingTreasury < 0) {
      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: 'Insolvency Warning!',
        message: `${business.name} operated at a cash deficit, leaving the corporate treasury at -$${Math.abs(endingTreasury).toLocaleString()}. You must inject personal cash or adjust pricing to avoid bankruptcy.`,
        category: 'misfortune',
        icon: '🚨',
      });
    } else if (totalPayoutToPlayer >= 50000) {
      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: 'Corporate Dividend & Salary Payout',
        message: `You withdrew $${totalPayoutToPlayer.toLocaleString()} from ${business.name} ($${ownerSalaryPaid.toLocaleString()} CEO Salary + $${ownerDividendPaid.toLocaleString()} Shareholder Dividend).`,
        category: 'money',
        icon: '💵',
      });
    }
  }

  const updatedBusiness: ActiveBusinessProfile = {
    ...business,
    yearsInOperation: business.yearsInOperation + 1,
    treasury: endingTreasury,
    valuation: endingValuation,
    morale: nextMorale,
    brandReputation: nextBrand,
    qualityScore: nextQuality,
    outstandingLoan: nextLoanBalance,
    annualLoanPayment: nextAnnualLoanPayment,
    operationalStatus: 'active',
    absenteeLossYears: nextAbsenteeLossYears,
    lifetimeRevenue: business.lifetimeRevenue + grossRevenue,
    lifetimeProfit: business.lifetimeProfit + netProfit,
    lastFiscalReport: isDelegatedIncarcerated ? undefined : fiscalReport,
    locationsCount: business.locationsCount || 1,
    equipmentTier: business.equipmentTier || 0,
    hasAuditCompleted: business.hasAuditCompleted || false,
    actionCooldowns: {}, // Reset once-per-year action cooldowns for the new year
  };

  return {
    business: updatedBusiness,
    netPayoutToPlayer: totalPayoutToPlayer,
    events,
    annualReport: fiscalReport,
  };
}

function isPausedIncarcerationMode(
  isPausedIncarcerated: boolean,
  isDelegatedIncarcerated: boolean,
): boolean {
  return isPausedIncarcerated && !isDelegatedIncarcerated;
}

/** Injects cash from the player's personal wallet into the business treasury. */
export function injectCapitalIntoBusiness(
  business: ActiveBusinessProfile,
  character: CharacterProfile,
  amount: number
): { business: ActiveBusinessProfile; character: CharacterProfile } {
  if (isCurrentlyIncarcerated(character)) {
    return { business, character };
  }
  const actualAmount = Math.min(character.cash, Math.max(1000, Math.round(amount)));
  if (actualAmount <= 0) return { business, character };

  const updatedTreasury = business.treasury + actualAmount;
  const updatedValuation = Math.round(business.valuation + actualAmount * 0.85);

  const updatedBusiness: ActiveBusinessProfile = {
    ...business,
    treasury: updatedTreasury,
    valuation: updatedValuation,
  };

  const updatedCharacter = stampPlayerNetWorth({
    ...character,
    cash: character.cash - actualAmount,
    business: updatedBusiness,
    timeline: [
      ...character.timeline,
      {
        id: createId(),
        age: character.age,
        year: character.birthYear + character.age,
        title: `Capital Injection into ${business.name}`,
        message: `You personally transferred $${actualAmount.toLocaleString()} from your wallet into ${business.name}'s corporate treasury.`,
        category: 'business',
        icon: '💼',
      },
    ],
  });

  return { business: updatedBusiness, character: updatedCharacter };
}

/** Processes a corporate exit: Private Acquisition, IPO, or Liquidation. */
export function exitBusiness(
  business: ActiveBusinessProfile,
  character: CharacterProfile,
  exitType: 'acquisition' | 'ipo' | 'liquidation'
): { character: CharacterProfile; payoutAmount: number; message: string } {
  const { age, birthYear } = character;
  let payoutAmount = 0;
  let message = '';

  if (exitType === 'acquisition') {
    // 1. Private Acquisition: Net buyout based on valuation * equityPct with 15% capital gains tax
    const grossPayout = Math.round(business.valuation * (business.equityPct / 100));
    const capitalGainsTax = Math.round(grossPayout * 0.15);
    payoutAmount = grossPayout - capitalGainsTax;
    message = `Congratulations! You finalized the sale of ${business.name} to a private equity firm for a valuation of $${business.valuation.toLocaleString()}! After capital gains taxes, you walked away with $${payoutAmount.toLocaleString()} in liquid cash.`;

    const exitEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: `Sold ${business.name}!`,
      message,
      category: 'money',
      icon: '🎉',
    };

    return {
      payoutAmount,
      message,
      character: stampPlayerNetWorth({
        ...character,
        cash: character.cash + payoutAmount,
        occupation: 'Retired Entrepreneur',
        business: null,
        timeline: [...character.timeline, exitEvent],
      }),
    };
  }

  if (exitType === 'ipo') {
    // 2. Initial Public Offering: founder sells 30% of their shares for instant cash, remains public CEO
    const sharesSoldPct = Math.min(30, business.equityPct * 0.4);
    const grossCashOut = Math.round(business.valuation * (sharesSoldPct / 100));
    const capitalGainsTax = Math.round(grossCashOut * 0.15);
    payoutAmount = grossCashOut - capitalGainsTax;
    const remainingEquity = Math.round(business.equityPct - sharesSoldPct);
    const ticker = (business.name.replace(/[^A-Za-z]/g, '').slice(0, 4) || 'POCK').toUpperCase();

    message = `🔔 ${business.name} officially rang the opening bell on the New York Stock Exchange under ticker symbol $${ticker}! You cashed out $${payoutAmount.toLocaleString()} while retaining ${remainingEquity}% public ownership!`;

    const ipoEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: `IPO: ${business.name} Went Public ($${ticker})!`,
      message,
      category: 'milestone',
      icon: '🔔',
    };

    const updatedBusiness: ActiveBusinessProfile = {
      ...business,
      isPubliclyTraded: true,
      tickerSymbol: ticker,
      equityPct: remainingEquity,
      valuation: Math.round(business.valuation * 1.25),
    };

    return {
      payoutAmount,
      message,
      character: stampPlayerNetWorth({
        ...character,
        cash: character.cash + payoutAmount,
        occupation: `Public CEO & Founder (${business.name})`,
        business: updatedBusiness,
        timeline: [...character.timeline, ipoEvent],
      }),
    };
  }

  // 3. Liquidation / Closure
  const liquidation = finalizeBusinessLiquidation(business, character, {
    forcedByImprisonment: false,
  });
  return {
    payoutAmount: liquidation.payoutAmount,
    message: liquidation.message,
    character: liquidation.character,
  };
}

/**
 * Shared salvage formula used by both voluntary liquidation and forced imprisonment closure.
 */
export function calculateBusinessLiquidationProceeds(business: ActiveBusinessProfile): number {
  const salvageValue = Math.max(
    0,
    Math.round(business.treasury + business.valuation * 0.2 - business.outstandingLoan)
  );
  return Math.round(salvageValue * (business.equityPct / 100));
}

function finalizeBusinessLiquidation(
  business: ActiveBusinessProfile,
  character: CharacterProfile,
  options: { forcedByImprisonment: boolean }
): { character: CharacterProfile; payoutAmount: number; message: string } {
  const { age, birthYear } = character;
  const payoutAmount = calculateBusinessLiquidationProceeds(business);
  const message = options.forcedByImprisonment
    ? `${business.name} was forced into liquidation upon your imprisonment, settling creditors and recovering $${payoutAmount.toLocaleString()} in salvage proceeds.`
    : `You liquidated ${business.name}, paying off outstanding creditors and retrieving $${payoutAmount.toLocaleString()} in remaining net assets.`;

  const liquidationEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: options.forcedByImprisonment
      ? `Business Closed: ${business.name}`
      : `Liquidated ${business.name}`,
    message,
    category: 'business',
    icon: options.forcedByImprisonment ? '⛓️' : '📦',
  };

  return {
    payoutAmount,
    message,
    character: stampPlayerNetWorth({
      ...character,
      cash: (character.cash || 0) + payoutAmount,
      occupation: options.forcedByImprisonment ? 'Incarcerated' : 'Unemployed',
      business: null,
      timeline: [...character.timeline, liquidationEvent],
    }),
  };
}

/**
 * Immediately closes and liquidates the character's active business upon imprisonment.
 * Returns the actual business name and salvage proceeds credited to personal cash.
 */
export function liquidateBusinessForImprisonment(character: CharacterProfile): {
  character: CharacterProfile;
  closed: boolean;
  closedBusinessName: string | null;
  payoutAmount: number;
} {
  const activeBusiness = character.business ?? null;
  if (!activeBusiness) {
    return {
      character,
      closed: false,
      closedBusinessName: null,
      payoutAmount: 0,
    };
  }

  const liquidation = finalizeBusinessLiquidation(activeBusiness, character, {
    forcedByImprisonment: true,
  });
  return {
    character: liquidation.character,
    closed: true,
    closedBusinessName: activeBusiness.name,
    payoutAmount: liquidation.payoutAmount,
  };
}

export interface BusinessActionParams {
  count?: number;
  amount?: number;
  newName?: string;
  newIcon?: string;
  newSlogan?: string;
  newSalary?: number;
}

export interface BusinessActionResult {
  business: ActiveBusinessProfile;
  character: CharacterProfile;
  success: boolean;
  message: string;
}

/** Executes an executive business action from the boardroom. */
export function executeBusinessAction(
  business: ActiveBusinessProfile,
  character: CharacterProfile,
  actionType: ExecutiveActionType,
  params: BusinessActionParams = {}
): BusinessActionResult {
  if (isCurrentlyIncarcerated(character)) {
    return {
      business,
      character,
      success: false,
      message: 'Executive business actions are unavailable while incarcerated.',
    };
  }
  const currentYear = character.birthYear + character.age;
  const cooldowns = business.actionCooldowns || {};

  // 1. Hire Workers
  if (actionType === 'hire_workers') {
    const count = Math.max(1, params.count || 1);
    const cost = 3500 * count;
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: `Corporate treasury needs $${cost.toLocaleString()} to onboard ${count} worker(s).`,
      };
    }
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      employeeCount: business.employeeCount + count,
      valuation: Math.round(business.valuation + count * 2000),
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: `Successfully onboarded ${count} new employee(s). Workforce expanded to ${updatedBiz.employeeCount}!`,
    };
  }

  // 2. Downsize Workers
  if (actionType === 'downsize_workers') {
    if (business.employeeCount <= 1) {
      return {
        business,
        character,
        success: false,
        message: 'You must maintain at least 1 employee to operate the company!',
      };
    }
    const count = Math.max(1, Math.min(business.employeeCount - 1, params.count || 1));
    const cost = 2000 * count; // Severance
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: `Corporate treasury needs $${cost.toLocaleString()} for severance packages.`,
      };
    }
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      employeeCount: business.employeeCount - count,
      morale: clamp(business.morale - 8),
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: `Downsized ${count} employee(s). Headcount reduced to ${updatedBiz.employeeCount}. Team morale temporarily dipped.`,
    };
  }

  // 3. Company Retreat
  if (actionType === 'company_retreat') {
    if (cooldowns.retreatYear === currentYear) {
      return {
        business,
        character,
        success: false,
        message: 'You already hosted a company retreat this fiscal year!',
      };
    }
    const cost = Math.max(3000, 1200 * business.employeeCount);
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: `Requires $${cost.toLocaleString()} in treasury to host a retreat for ${business.employeeCount} staff.`,
      };
    }
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      morale: clamp(business.morale + 18),
      qualityScore: clamp(business.qualityScore + 4),
      actionCooldowns: { ...cooldowns, retreatYear: currentYear },
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: `Hosted an unforgettable team retreat! Employees bonded and morale surged to ${updatedBiz.morale}%.`,
    };
  }

  // 4. Staff Spot Bonus
  if (actionType === 'staff_bonus') {
    if (cooldowns.bonusYear === currentYear) {
      return {
        business,
        character,
        success: false,
        message: 'You already distributed spot bonuses this fiscal year!',
      };
    }
    const cost = Math.max(4000, 1500 * business.employeeCount);
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: `Requires $${cost.toLocaleString()} in treasury to distribute bonuses.`,
      };
    }
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      morale: clamp(business.morale + 22),
      brandReputation: clamp(business.brandReputation + 3),
      actionCooldowns: { ...cooldowns, bonusYear: currentYear },
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: `Distributed generous spot bonuses! The team celebrated and morale climbed to ${updatedBiz.morale}%.`,
    };
  }

  // 5. Viral Ad Blitz
  if (actionType === 'viral_blitz') {
    if (cooldowns.viralAdYear === currentYear) {
      return {
        business,
        character,
        success: false,
        message: 'You already launched a viral marketing blitz this fiscal year!',
      };
    }
    const cost = Math.max(5000, Math.round((business.lastFiscalReport?.grossRevenue || 100000) * 0.05));
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: `Requires $${cost.toLocaleString()} in treasury for a viral blitz.`,
      };
    }
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      brandReputation: clamp(business.brandReputation + 14),
      actionCooldowns: { ...cooldowns, viralAdYear: currentYear },
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: `Launched a viral multi-platform marketing blitz! Brand reputation jumped to ${updatedBiz.brandReputation}%.`,
    };
  }

  // 6. Community Sponsorship
  if (actionType === 'community_sponsorship') {
    if (cooldowns.sponsorshipYear === currentYear) {
      return {
        business,
        character,
        success: false,
        message: 'You already sponsored a community initiative this fiscal year!',
      };
    }
    const cost = Math.max(4000, Math.round((business.lastFiscalReport?.grossRevenue || 100000) * 0.03));
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: `Requires $${cost.toLocaleString()} in treasury for sponsorship.`,
      };
    }
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      brandReputation: clamp(business.brandReputation + 6),
      actionCooldowns: { ...cooldowns, sponsorshipYear: currentYear },
    };
    const updatedChar: CharacterProfile = {
      ...character,
      business: updatedBiz,
      stats: {
        ...character.stats,
        karma: clamp(character.stats.karma + 8),
      },
    };
    return {
      business: updatedBiz,
      character: updatedChar,
      success: true,
      message: `Sponsored local community philanthropy! Brand reputation rose to ${updatedBiz.brandReputation}% and personal Karma increased by +8.`,
    };
  }

  // 7. Upgrade Equipment & Tech
  if (actionType === 'upgrade_equipment') {
    const currentTier = business.equipmentTier || 0;
    if (currentTier >= 2) {
      return {
        business,
        character,
        success: false,
        message: 'Equipment and technology are already at maximum state-of-the-art tier!',
      };
    }
    const cost = Math.max(10000, Math.round((business.lastFiscalReport?.grossRevenue || 120000) * 0.12));
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: `Requires $${cost.toLocaleString()} in treasury for equipment upgrade.`,
      };
    }
    const newTier = currentTier + 1;
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      equipmentTier: newTier,
      qualityScore: clamp(business.qualityScore + 12),
      valuation: Math.round(business.valuation * 1.15),
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: `Modernized commercial facilities to Tier ${newTier}! Quality reached ${updatedBiz.qualityScore}% and operating efficiency improved.`,
    };
  }

  // 8. Operations & Quality Audit
  if (actionType === 'operations_audit') {
    if (business.hasAuditCompleted) {
      return {
        business,
        character,
        success: false,
        message: 'You have already completed the one-time expert operations audit!',
      };
    }
    const cost = 8000;
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: 'Requires $8,000 in treasury for the operations audit.',
      };
    }
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      hasAuditCompleted: true,
      qualityScore: clamp(business.qualityScore + 6),
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: 'Expert operations audit complete! Eliminated supply waste, permanently improving annual profit margins.',
    };
  }

  // 9. Open New Branch / Location
  if (actionType === 'open_branch') {
    const currentLocs = business.locationsCount || 1;
    if (currentLocs >= 5) {
      return {
        business,
        character,
        success: false,
        message: 'You have reached the maximum of 5 regional branch locations!',
      };
    }
    if (business.yearsInOperation < 1) {
      return {
        business,
        character,
        success: false,
        message: 'Requires at least 1 full year in business before opening a second branch.',
      };
    }
    const template = getBusinessTemplateById(business.templateId);
    const cost = Math.round((template?.minSeedCapital || 50000) * 0.60);
    if (business.treasury < cost) {
      return {
        business,
        character,
        success: false,
        message: `Requires $${cost.toLocaleString()} in corporate treasury to open branch #${currentLocs + 1}.`,
      };
    }
    const addedStaff = Math.max(2, Math.round(business.employeeCount / currentLocs));
    const newLocs = currentLocs + 1;
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - cost,
      locationsCount: newLocs,
      employeeCount: business.employeeCount + addedStaff,
      valuation: Math.round(business.valuation * 1.30),
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: `Grand opening! Location #${newLocs} of ${business.name} is officially operational! Base revenue expanded by +40%.`,
    };
  }

  // 10. Set Owner Salary
  if (actionType === 'set_owner_salary') {
    const newSalary = Math.max(0, Math.round(params.newSalary || 0));
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      ownerSalary: newSalary,
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: newSalary > 0
        ? `Set executive CEO salary to $${newSalary.toLocaleString()}/yr.`
        : 'Reinvesting all earnings! Executive salary set to $0.',
    };
  }

  // 11. Appoint Operations Manager (Explicit Delegated Management Capability)
  if (actionType === 'appoint_manager') {
    if (resolveBusinessManagementCapability(business) === 'delegated_management') {
      return {
        business,
        character,
        success: false,
        message: 'You have already appointed delegated executive management for this company!',
      };
    }
    if (business.employeeCount < 2) {
      return {
        business,
        character,
        success: false,
        message: 'Requires at least 2 employees before appointing a dedicated operations manager.',
      };
    }
    if (business.treasury < APPOINT_MANAGER_TREASURY_COST) {
      return {
        business,
        character,
        success: false,
        message: `Requires $${APPOINT_MANAGER_TREASURY_COST.toLocaleString()} in corporate treasury to onboard an operations manager.`,
      };
    }
    const updatedBiz: ActiveBusinessProfile = {
      ...business,
      treasury: business.treasury - APPOINT_MANAGER_TREASURY_COST,
      managementCapability: 'delegated_management',
      operationalStatus: 'active',
      morale: clamp(business.morale + 5),
      qualityScore: clamp(business.qualityScore + 4),
    };
    return {
      business: updatedBiz,
      character: { ...character, business: updatedBiz },
      success: true,
      message: `Appointed a dedicated Operations Manager! ${business.name} now has explicit delegated management continuity.`,
    };
  }

  return { business, character, success: false, message: 'Unknown action.' };
}

/** Pays off commercial bank loan debt early from either treasury or personal cash. */
export function payOffLoanEarly(
  business: ActiveBusinessProfile,
  character: CharacterProfile,
  amount: number,
  source: 'treasury' | 'personal'
): BusinessActionResult {
  if (isCurrentlyIncarcerated(character)) {
    return {
      business,
      character,
      success: false,
      message: 'Early loan repayments are unavailable while incarcerated.',
    };
  }
  if (business.outstandingLoan <= 0) {
    return { business, character, success: false, message: 'Company is already debt-free!' };
  }

  const payoff = Math.min(business.outstandingLoan, Math.max(1000, Math.round(amount)));
  if (payoff <= 0) {
    return { business, character, success: false, message: 'Invalid repayment amount.' };
  }
  if (source === 'treasury') {
    if (business.treasury < payoff) {
      return {
        business,
        character,
        success: false,
        message: `Corporate treasury only has $${business.treasury.toLocaleString()}.`,
      };
    }
  } else {
    if (character.cash < payoff) {
      return {
        business,
        character,
        success: false,
        message: `Personal wallet only has $${character.cash.toLocaleString()}.`,
      };
    }
  }

  const nextLoan = business.outstandingLoan - payoff;
  const nextAnnualPayment = nextLoan > 0 ? Math.round(nextLoan * 0.145) : 0;
  const updatedTreasury = source === 'treasury' ? business.treasury - payoff : business.treasury;
  const nextCash = source === 'personal' ? character.cash - payoff : character.cash;

  const updatedBiz: ActiveBusinessProfile = {
    ...business,
    treasury: updatedTreasury,
    outstandingLoan: nextLoan,
    annualLoanPayment: nextAnnualPayment,
  };

  const updatedChar = stampPlayerNetWorth({
    ...character,
    cash: nextCash,
    business: updatedBiz,
  });

  const message = nextLoan === 0
    ? `Hooray! You paid off the entire bank loan! ${business.name} is now 100% debt-free with $0 annual debt service!`
    : `Paid $${payoff.toLocaleString()} toward the loan from ${source}. Remaining balance: $${nextLoan.toLocaleString()} ($${nextAnnualPayment.toLocaleString()}/yr payment).`;

  return { business: updatedBiz, character: updatedChar, success: true, message };
}

/** Rebrands the business with a new name, logo icon, and optional slogan. */
export function rebrandBusiness(
  business: ActiveBusinessProfile,
  character: CharacterProfile,
  newName: string,
  newIcon?: string,
  newSlogan?: string
): BusinessActionResult {
  if (isCurrentlyIncarcerated(character)) {
    return {
      business,
      character,
      success: false,
      message: 'Executive rebranding is unavailable while incarcerated.',
    };
  }
  const trimmed = newName.trim();
  if (!trimmed) {
    return { business, character, success: false, message: 'Please enter a valid business name.' };
  }
  const cost = 2500;
  if (business.treasury < cost) {
    return {
      business,
      character,
      success: false,
      message: 'Corporate treasury needs $2,500 for legal and trademark filing fees.',
    };
  }

  const updatedBiz: ActiveBusinessProfile = {
    ...business,
    name: trimmed,
    icon: newIcon || business.icon,
    slogan: newSlogan?.trim() || undefined,
    treasury: business.treasury - cost,
  };

  const updatedChar: CharacterProfile = {
    ...character,
    occupation: `Founder & CEO (${trimmed})`,
    business: updatedBiz,
  };

  return {
    business: updatedBiz,
    character: updatedChar,
    success: true,
    message: `Successfully rebranded company to ${trimmed}!`,
  };
}

export interface BusinessCrimeConsequenceResult {
  character: CharacterProfile;
  decision: BusinessConsequenceDecision;
  applied: boolean;
  closed: boolean;
  closedBusinessName: string | null;
  payoutAmount: number;
}

/**
 * Integrates Phase 1 `evaluateBusinessConsequence()` into active business state with strict
 * per-case idempotency: handles forced liquidation, caretaker pause (`legacy_unassigned`),
 * delegated management continuity (`delegated_management`), and non-custodial reputational scandal.
 */
export function applyBusinessCrimeConsequence(
  character: CharacterProfile,
  pendingCase: Pick<PendingCourtCase, 'id' | 'crimeId' | 'offenseClass' | 'title'>,
  outcome: CrimeOutcomeStatus,
  exposure: CrimeExposureLevel,
): BusinessCrimeConsequenceResult {
  const activeBusiness = character.business;
  const decision = evaluateBusinessConsequence(activeBusiness, pendingCase, outcome, exposure);

  if (!activeBusiness) {
    return {
      character,
      decision,
      applied: false,
      closed: false,
      closedBusinessName: null,
      payoutAmount: 0,
    };
  }

  if (activeBusiness.lastCrimeConsequenceCaseId === pendingCase.id) {
    return {
      character,
      decision,
      applied: false,
      closed: false,
      closedBusinessName: null,
      payoutAmount: 0,
    };
  }

  if (decision.action === 'none') {
    return {
      character: {
        ...character,
        business: {
          ...activeBusiness,
          lastCrimeConsequenceCaseId: pendingCase.id,
        },
      },
      decision,
      applied: false,
      closed: false,
      closedBusinessName: null,
      payoutAmount: 0,
    };
  }

  if (decision.action === 'liquidate') {
    const liquidated = liquidateBusinessForImprisonment(character);
    return {
      character: liquidated.character,
      decision,
      applied: liquidated.closed,
      closed: liquidated.closed,
      closedBusinessName: liquidated.closedBusinessName,
      payoutAmount: liquidated.payoutAmount,
    };
  }

  const nextBrand = clamp(activeBusiness.brandReputation + decision.brandDelta);
  const nextMorale = clamp(activeBusiness.morale + decision.moraleDelta);
  const currentCapability = resolveBusinessManagementCapability(activeBusiness);
  const managerResigned =
    currentCapability === 'delegated_management' && nextMorale < 15;
  const nextCapability = managerResigned ? 'management_unavailable' : currentCapability;
  const nextOperationalStatus =
    decision.action === 'pause_incarceration'
      ? 'paused_incarceration'
      : 'active';

  const eventId = `${pendingCase.id}-biz-consequence`;
  const eventTitle =
    decision.action === 'pause_incarceration'
      ? `${activeBusiness.name} Operations Paused`
      : decision.action === 'continue_delegated'
        ? `${activeBusiness.name} Delegated Management`
        : `${activeBusiness.name} Reputational Scandal`;
  const eventMessage =
    decision.reason ||
    `Criminal proceedings for ${pendingCase.title} impacted ${activeBusiness.name}.`;

  const updatedBusiness: ActiveBusinessProfile = {
    ...activeBusiness,
    brandReputation: nextBrand,
    morale: nextMorale,
    managementCapability: nextCapability,
    operationalStatus: nextOperationalStatus,
    lastCrimeConsequenceCaseId: pendingCase.id,
  };

  const nextTimeline = character.timeline.some((e) => e.id === eventId)
    ? character.timeline
    : [
        ...character.timeline,
        {
          id: eventId,
          age: character.age,
          year: character.birthYear + character.age,
          title: eventTitle,
          message: eventMessage,
          category: 'business' as const,
          icon: decision.action === 'scandal' ? '📉' : '🏢',
        },
      ];

  return {
    character: {
      ...character,
      business: updatedBusiness,
      timeline: nextTimeline,
    },
    decision,
    applied: true,
    closed: false,
    closedBusinessName: null,
    payoutAmount: 0,
  };
}
