import type { NpcLifeEvent, NpcProfile } from '../types';
import {
  calculateCanonicalNetWorth,
  getCountryEconomicProfile,
  transferBetweenCashAndSavings,
} from './currencyService';
import { createDeduplicatedLifeEvent } from './migrationService';
import { calculateFinancialPrudenceScore } from './personalityService';
import type { SeededPRNG } from './seededPrngService';

export interface NpcFinanceYearResult {
  updatedNpc: NpcProfile;
  lifeEvents: NpcLifeEvent[];
}

/**
 * Advances an NPC's personal finances by one simulation year.
 * - Uses country-aware currency, PPP living cost multipliers, and effective tax rates.
 * - Enforces a single financial source of truth in `npc.finances`.
 * - Ensures all transfers between `cash` and `savings` are strictly net-worth neutral.
 * - Handles debt amortization (`studentDebt`, `mortgageBalance`, `otherLiabilities`) and property acquisition.
 * Pure function: never mutates the input NPC or any player state.
 */
export function progressNpcFinancesForYear(
  npc: NpcProfile,
  currentYear: number,
  prng: SeededPRNG
): NpcFinanceYearResult {
  if (!npc.isAlive) {
    return { updatedNpc: npc, lifeEvents: [] };
  }

  const econ = getCountryEconomicProfile(npc.location.country);
  const lifeEvents: NpcLifeEvent[] = [];
  let finances = {
    ...npc.finances,
    currency: econ.currency,
  };

  // 1. Minors (< 18) are financially supported by their household
  if (npc.age < 18) {
    finances.annualIncome = 0;
    finances.annualExpenses = 0;
    finances.netWorth = calculateCanonicalNetWorth(finances);
    return {
      updatedNpc: { ...npc, finances },
      lifeEvents,
    };
  }

  // 2. Full-time higher education students without full-time salary
  const isHigherEdStudent =
    npc.education.currentStage === 'university' ||
    npc.education.currentStage === 'professional';

  const grossIncome = npc.career.isRetired
    ? Math.max(0, npc.career.pensionAnnual)
    : Math.max(0, npc.career.salary);
  finances.annualIncome = grossIncome;

  if (isHigherEdStudent && grossIncome <= 0) {
    finances.annualExpenses = 0;
    finances.netWorth = calculateCanonicalNetWorth(finances);
    return {
      updatedNpc: { ...npc, finances },
      lifeEvents,
    };
  }

  // 3. Calculate Net Take-Home Income & Personality-Driven Living Expenses
  const netIncome = Math.round(grossIncome * (1 - econ.effectiveTaxRate));
  const prudence = calculateFinancialPrudenceScore(npc);

  // Spending ratio ranges from ~0.48 (highly prudent) to ~0.82 (high materialism / low prudence)
  const spendingRatio = Math.max(0.46, Math.min(0.84, 0.82 - (prudence / 100) * 0.34));
  const localFloorExpense = Math.round(
    9000 * econ.pppCostMultiplier * econ.usdExchangeRate
  );
  const annualExpenses =
    grossIncome > 0
      ? Math.max(localFloorExpense, Math.round(netIncome * spendingRatio))
      : Math.round(localFloorExpense * 0.55);

  finances.annualExpenses = annualExpenses;

  // 4. Savings Interest Yield (3.5%) & Real Estate Market Appreciation (2% - 5%)
  if (finances.savings > 0) {
    const interestEarned = Math.round(finances.savings * 0.035);
    finances.savings += interestEarned;
  }
  if (finances.realEstateValue > 0) {
    const appreciationRate = prng.nextInt(2, 5) / 100;
    finances.realEstateValue = Math.round(
      finances.realEstateValue * (1 + appreciationRate)
    );
  }

  // 5. Apply Annual Operating Cash Flow (Net Income - Annual Expenses)
  finances.cash += netIncome - annualExpenses;

  // If cash dipped negative, cover from savings first (zero-sum transfer), or record liability
  if (finances.cash < 0) {
    const deficit = Math.abs(finances.cash);
    if (finances.savings > 0) {
      finances = transferBetweenCashAndSavings(finances, -deficit);
    }
    if (finances.cash < 0) {
      const remainingDeficit = Math.abs(finances.cash);
      finances.cash = 0;
      finances.otherLiabilities += remainingDeficit;
    }
  }

  // 6. Amortize Liabilities (Student Debt, Mortgage, Other Liabilities) from available Cash
  const hasPayOffDebtGoal = npc.goals.some(
    (g) =>
      !g.isCompleted &&
      !g.isAbandoned &&
      g.templateId === 'pay_off_student_debt'
  );

  if (finances.studentDebt > 0 && finances.cash > 0) {
    const standardPayment = Math.max(
      Math.round(finances.studentDebt * 0.15),
      Math.round(2800 * econ.pppCostMultiplier * econ.usdExchangeRate)
    );
    const accelMultiplier = hasPayOffDebtGoal ? 1.8 : prudence >= 70 ? 1.5 : 1.0;
    const maxAffordable = Math.round(
      finances.cash * (hasPayOffDebtGoal || prudence >= 70 ? 0.55 : 0.3)
    );
    const payment = Math.min(
      finances.studentDebt,
      Math.max(0, Math.min(Math.round(standardPayment * accelMultiplier), maxAffordable))
    );
    finances.cash -= payment;
    finances.studentDebt -= payment;
  }

  if (finances.mortgageBalance > 0 && finances.cash > 0) {
    const scheduledPrincipal = Math.max(
      Math.round(finances.mortgageBalance * 0.06),
      Math.round(3600 * econ.pppCostMultiplier * econ.usdExchangeRate)
    );
    const payment = Math.min(
      finances.mortgageBalance,
      Math.min(scheduledPrincipal, Math.round(finances.cash * 0.4))
    );
    finances.cash -= payment;
    finances.mortgageBalance -= payment;
  }

  if (finances.otherLiabilities > 0 && finances.cash > 0) {
    const payment = Math.min(
      finances.otherLiabilities,
      Math.round(finances.cash * 0.35)
    );
    finances.cash -= payment;
    finances.otherLiabilities -= payment;
  }

  // 7. Evaluate First Home / Real Estate Purchase for Qualified Adults (Age 24+)
  const localStarterHomePrice = Math.round(
    180000 * econ.pppCostMultiplier * econ.usdExchangeRate
  );
  const requiredDownPayment = Math.round(localStarterHomePrice * 0.2);
  const totalLiquid = finances.cash + finances.savings;
  const hasPropertyGoal = npc.goals.some(
    (g) => !g.isCompleted && !g.isAbandoned && g.templateId === 'purchase_property'
  );

  if (
    npc.age >= 24 &&
    finances.realEstateValue <= 0 &&
    grossIncome > 0 &&
    totalLiquid >= Math.round(requiredDownPayment * 1.35) &&
    (hasPropertyGoal || prudence >= 58 || prng.chance(0.45))
  ) {
    // Mobilize savings into cash if needed (strictly net-worth-neutral transfer)
    if (finances.cash < requiredDownPayment) {
      const neededFromSavings = requiredDownPayment - finances.cash;
      finances = transferBetweenCashAndSavings(finances, -neededFromSavings);
    }

    if (finances.cash >= requiredDownPayment) {
      const mortgagePrincipal = localStarterHomePrice - requiredDownPayment;
      finances.cash -= requiredDownPayment;
      finances.realEstateValue += localStarterHomePrice;
      finances.mortgageBalance += mortgagePrincipal;

      lifeEvents.push(
        createDeduplicatedLifeEvent({
          npcId: npc.id,
          year: currentYear,
          age: npc.age,
          type: 'major_purchase',
          title: 'Purchased a Home',
          description: `${npc.firstName} purchased a residence in ${npc.location.city} valued at ${localStarterHomePrice.toLocaleString()} ${finances.currency}.`,
          referenceId: `home_${currentYear}`,
        })
      );
    }
  }

  // 8. Rebalance Excess Liquid Cash into Savings (Zero-Sum Net-Worth-Neutral Transfer)
  const operatingCashBuffer = Math.max(
    Math.round(annualExpenses * 0.25),
    Math.round(3000 * econ.pppCostMultiplier * econ.usdExchangeRate)
  );
  if (finances.cash > operatingCashBuffer) {
    const surplusCash = finances.cash - operatingCashBuffer;
    const sweepRatio = Math.min(0.85, 0.4 + (prudence / 100) * 0.45);
    const amountToSave = Math.round(surplusCash * sweepRatio);
    if (amountToSave > 0) {
      finances = transferBetweenCashAndSavings(finances, amountToSave);
    }
  }

  finances.netWorth = calculateCanonicalNetWorth(finances);

  return {
    updatedNpc: {
      ...npc,
      finances,
    },
    lifeEvents,
  };
}
