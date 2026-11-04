import {
  BUSINESS_TEMPLATES,
  getBusinessTemplateById,
  generateSuggestedBusinessName,
} from '../data/businessCatalog';
import {
  evaluateFundingEligibility,
  foundBusiness,
  updateBusinessLevers,
  progressBusinessForYear,
  injectCapitalIntoBusiness,
  exitBusiness,
  executeBusinessAction,
  payOffLoanEarly,
  rebrandBusiness,
} from '../services/businessService';
import type { CharacterProfile } from '../../../types/game';
import { createInitialEducation } from '../../education/services/educationService';
import { createInitialCareerState } from '../../career/services/careerService';
import { ageUpCharacter } from '../../aging/services/agingService';
import { getEligibleEvents, resolveEventChoice } from '../../events/services/eventService';
import { BUSINESS_EVENTS } from '../../events/data/businessEvents';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function createMockCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_test',
    firstName: 'Devon',
    lastName: 'Vanguard',
    gender: 'male',
    age: 26,
    birthYear: 2000,
    city: 'Seattle',
    country: 'United States',
    isAlive: true,
    stats: {
      health: 85,
      happiness: 85,
      smarts: 88,
      looks: 80,
      karma: 90,
    },
    cash: 250000,
    bankBalance: 0,
    netWorth: 250000,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad_1',
        role: 'father',
        firstName: 'Robert',
        lastName: 'Vanguard',
        age: 56,
        occupation: 'Engineer',
        isAlive: true,
        relationship: 90,
        generosity: 80,
      },
      mother: {
        id: 'mom_1',
        role: 'mother',
        firstName: 'Sarah',
        lastName: 'Vanguard',
        age: 54,
        occupation: 'Architect',
        isAlive: true,
        relationship: 90,
        generosity: 80,
      },
      wealth: 'comfortable',
    },
    relationships: [],
    education: {
      ...createInitialEducation(),
      diplomas: ['High School Diploma', 'B.S. in Computer Science'],
    },
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

console.log('--- STARTING MODULE 5: BUSINESS & ENTREPRENEURSHIP SIMULATION TESTS ---');

// 1. Catalog Verification
{
  assert(BUSINESS_TEMPLATES.length === 12, 'Expected 12 business templates');
  const coffeeShop = getBusinessTemplateById('biz_coffee_shop')!;
  const saas = getBusinessTemplateById('biz_saas_platform')!;
  const biotech = getBusinessTemplateById('biz_biotech_pharma')!;

  assert(coffeeShop.minSeedCapital === 20000, 'Coffee shop seed capital is $20k');
  assert(saas.sector === 'software_tech', 'SaaS is software_tech');
  assert(biotech.minSeedCapital === 750000, 'Biotech seed capital is $750k');
  console.log(`✅ Business Catalog: All 12 business models registered across 4 capital tiers`);
}

// 2. Custom Naming Suite & Randomizer
{
  const saas = getBusinessTemplateById('biz_saas_platform')!;
  const name1 = generateSuggestedBusinessName('Seattle', 'Vanguard', saas);
  const name2 = generateSuggestedBusinessName('Chicago', 'Rivera', saas);
  assert(name1.length > 3, 'Generated name is valid string');
  assert(name2.length > 3, 'Generated name 2 is valid string');
  console.log(`✅ Business Naming: Suggested name generated: "${name1}"`);
}

// 3. Funding Eligibility
{
  const wealthyChar = createMockCharacter({ cash: 300000 });
  const brokeChar = createMockCharacter({ cash: 5000 });
  const saas = getBusinessTemplateById('biz_saas_platform')!; // requires $180,000

  const wealthyFunding = evaluateFundingEligibility(wealthyChar, saas);
  assert(wealthyFunding.canBootstrapped === true, 'Wealthy character can self-fund SaaS');
  assert(wealthyFunding.canBankLoan === true, 'Wealthy character can get bank loan');

  const brokeFunding = evaluateFundingEligibility(brokeChar, saas);
  assert(brokeFunding.canBootstrapped === false, 'Broke character cannot self-fund $180k');
  assert(brokeFunding.canBankLoan === false, 'Broke character cannot afford $45k down payment');
  assert(brokeFunding.canPitchAngels === true, 'High smarts CS graduate can pitch angels for $0 cash!');
  console.log(`✅ Funding Eligibility: Evaluates Bootstrapping, Commercial Loans, and Angel Pitch readiness`);
}

// 4. Custom Business Incorporation Flow
{
  const char = createMockCharacter({ cash: 250000 });
  const customCompanyName = 'QuantumScale AI Solutions';
  const customSlogan = 'Autonomous Intelligence at Scale';
  const customIcon = '⚡';

  const { character: foundedChar, business } = foundBusiness(char, {
    templateId: 'biz_saas_platform',
    customName: customCompanyName,
    icon: customIcon,
    slogan: customSlogan,
    fundingMethod: 'bootstrapped',
  });

  assert(business.name === customCompanyName, 'Custom business name preserved');
  assert(business.icon === customIcon, 'Custom icon preserved');
  assert(business.slogan === customSlogan, 'Custom slogan preserved');
  assert(business.equityPct === 100, 'Bootstrapped founder retains 100% equity');
  assert(business.treasury === 180000, 'Treasury holds $180,000 seed capital');
  assert(foundedChar.cash === 70000, 'Personal wallet deducted $180,000 (250k - 180k = 70k)');
  assert(
    foundedChar.occupation === `Founder & CEO (${customCompanyName})`,
    'Occupation promoted to Founder & CEO'
  );
  console.log(`✅ Incorporation: Successfully registered "${business.name}" with $180,000 seed treasury and 100% equity`);
}

// 5. Angel Funding & Equity Dilution
{
  const brokeChar = createMockCharacter({ cash: 10000 });
  const { character: angelChar, business } = foundBusiness(brokeChar, {
    templateId: 'biz_saas_platform',
    customName: 'NeuroSync Labs',
    icon: '🧠',
    fundingMethod: 'angel_investors',
    angelEquityDilutionPct: 75, // 25% dilution
  });

  assert(business.equityPct === 75, 'Founder retains 75% equity after angel syndicate');
  assert(angelChar.cash === 10000, 'Zero cash deducted from personal wallet');
  assert(business.treasury === 180000, 'Company treasury holds full $180k seed investment');
  console.log(`✅ Angel Financing: Founded "${business.name}" with $0 personal cash and 75% equity`);
}

// 6. Strategic Levers Adjustment
{
  const char = createMockCharacter({ cash: 200000 });
  const { business } = foundBusiness(char, {
    templateId: 'biz_coffee_shop',
    customName: 'Velvet Bean Roastery',
    icon: '☕',
    fundingMethod: 'bootstrapped',
  });

  const updatedBiz = updateBusinessLevers(business, {
    pricing: 'premium',
    marketing: 'aggressive',
    payroll: 'generous',
    rnd: 'breakthrough',
    dividendRatePct: 35,
    ownerSalary: 60000,
  });

  assert(updatedBiz.pricing === 'premium', 'Pricing updated to premium');
  assert(updatedBiz.marketing === 'aggressive', 'Marketing updated to aggressive');
  assert(updatedBiz.payroll === 'generous', 'Payroll updated to generous');
  assert(updatedBiz.dividendRatePct === 35, 'Dividend updated to 35%');
  assert(updatedBiz.ownerSalary === 60000, 'Owner salary updated to $60,000');
  console.log(`✅ Operational Levers: Pricing, marketing, payroll, R&D, and dividend rate updated`);
}

// 7. Annual Fiscal Simulation & Dividend Payout
{
  const char = createMockCharacter({ cash: 200000 });
  const { character: foundedChar, business } = foundBusiness(char, {
    templateId: 'biz_saas_platform',
    customName: 'CloudMatrix Technologies',
    icon: '💻',
    fundingMethod: 'bootstrapped',
  });

  const configuredBiz = updateBusinessLevers(business, {
    pricing: 'standard',
    dividendRatePct: 25,
    ownerSalary: 50000,
  });

  const result = progressBusinessForYear(configuredBiz, foundedChar, 27);
  assert(result.business !== null, 'Business survived year');
  assert(result.business!.yearsInOperation === 1, 'Years in operation incremented to 1');
  assert(result.annualReport.grossRevenue > 100000, 'Generated substantial gross revenue');
  assert(result.annualReport.operatingExpenses > 0, 'Operating expenses calculated');
  assert(result.netPayoutToPlayer > 0, 'Owner received salary / dividend payout');
  console.log(
    `✅ Fiscal Year Simulation: Generated $${result.annualReport.grossRevenue.toLocaleString()} revenue with $${result.annualReport.netProfit.toLocaleString()} net profit. Transferred $${result.netPayoutToPlayer.toLocaleString()} to owner!`
  );
}

// 7b. Frugal / Lowest Operational Levers Profitability Test
{
  const char = createMockCharacter({ cash: 50000 });
  const { character: foundedChar, business } = foundBusiness(char, {
    templateId: 'biz_coffee_shop',
    customName: 'Budget Brews Cafe',
    icon: '☕',
    fundingMethod: 'bootstrapped',
  });

  // Set all operational levers to the lowest/frugal options
  const frugalBiz = updateBusinessLevers(business, {
    pricing: 'budget',
    marketing: 'organic',
    payroll: 'frugal',
    rnd: 'minimal',
    ownerSalary: 0,
    dividendRatePct: 20,
  });

  const result = progressBusinessForYear(frugalBiz, foundedChar, 25);
  assert(result.business !== null, 'Business survived');
  assert(result.annualReport.netProfit > 15000, 'Lowest/frugal configuration reliably produces healthy net profit');
  const marginPct = Math.round((result.annualReport.netProfit / result.annualReport.grossRevenue) * 100);
  assert(marginPct >= 20, 'Frugal configuration achieves >= 20% net margin');
  console.log(
    `✅ Frugal / Lowest Levers Test: Budget + Organic + Frugal + Minimal generated $${result.annualReport.grossRevenue.toLocaleString()} revenue with +$${result.annualReport.netProfit.toLocaleString()} NET PROFIT (${marginPct}% Net Margin)!`
  );
}

// 8. Capital Injection
{
  const char = createMockCharacter({ cash: 50000 });
  const { character: foundedChar, business } = foundBusiness(char, {
    templateId: 'biz_coffee_shop',
    customName: 'Metro Roast',
    icon: '☕',
    fundingMethod: 'bootstrapped',
  });

  const initialTreasury = business.treasury;
  const { business: injectedBiz, character: injectedChar } = injectCapitalIntoBusiness(
    business,
    foundedChar,
    20000
  );

  assert(injectedBiz.treasury === initialTreasury + 20000, 'Treasury increased by $20,000');
  assert(injectedChar.cash === 10000, 'Personal wallet decreased by $20,000 (30k - 20k = 10k)');
  console.log(`✅ Capital Injection: Successfully transferred $20,000 personal cash into corporate treasury`);
}

// 9. Corporate Exit Strategies (Acquisition & IPO)
{
  const char = createMockCharacter({ cash: 50000 });
  const { character: foundedChar, business } = foundBusiness(char, {
    templateId: 'biz_saas_platform',
    customName: 'Apex Cloud Systems',
    icon: '☁️',
    fundingMethod: 'bootstrapped',
  });

  business.valuation = 4000000;
  business.yearsInOperation = 4;

  // Private Acquisition
  const acqResult = exitBusiness(business, foundedChar, 'acquisition');
  assert(acqResult.payoutAmount > 2000000, 'Acquisition net payout is over $2,000,000');
  assert(acqResult.character.business === null, 'Business cleared after acquisition');
  assert(acqResult.character.occupation === 'Retired Entrepreneur', 'Occupation updated to Retired Entrepreneur');
  console.log(`✅ Private Acquisition: Sold company for $4,000,000 valuation, pocketing $${acqResult.payoutAmount.toLocaleString()} cash!`);

  // IPO
  const ipoChar = createMockCharacter({ cash: 50000 });
  const { character: ipoSetupChar, business: bigBiz } = foundBusiness(ipoChar, {
    templateId: 'biz_saas_platform',
    customName: 'NovaCloud Global',
    icon: '🌐',
    fundingMethod: 'bootstrapped',
  });
  bigBiz.valuation = 8000000;
  bigBiz.yearsInOperation = 4;

  const ipoResult = exitBusiness(bigBiz, ipoSetupChar, 'ipo');
  assert(ipoResult.payoutAmount > 1000000, 'Cashed out substantial pre-IPO shares');
  assert(ipoResult.character.business?.isPubliclyTraded === true, 'Company is now publicly traded');
  assert(ipoResult.character.business?.tickerSymbol?.length === 4, 'Assigned 4-letter stock ticker');
  console.log(`✅ Initial Public Offering (IPO): Company rang NYSE bell as $${ipoResult.character.business?.tickerSymbol}! Retained majority stake and cashed out $${ipoResult.payoutAmount.toLocaleString()}!`);
}

// 10. Age Up with Active Business & Event Lifecycle
{
  const char = createMockCharacter({ cash: 100000, age: 25 });
  const { character: businessFounder } = foundBusiness(char, {
    templateId: 'biz_coffee_shop',
    customName: 'Downtown Brews',
    icon: '☕',
    fundingMethod: 'bootstrapped',
  });

  assert(businessFounder.business !== null, 'Character has active business');

  // Perform full annual age-up
  const aged = ageUpCharacter(businessFounder);
  assert(aged.age === 26, 'Character aged up to 26');
  assert(aged.business?.lastFiscalReport !== undefined, 'Annual fiscal report generated on age-up');
  assert(aged.business?.lastFiscalReport?.grossRevenue! > 0, 'Fiscal report contains revenue data');

  // Verify that eligible life events can still roll for this business owner
  const eligibleEvents = getEligibleEvents(aged);
  assert(eligibleEvents.length > 0, 'Business owners still have eligible life events for the year');
  console.log(`✅ Age-Up Lifecycle: Fiscal report generated ($${aged.business?.lastFiscalReport?.grossRevenue.toLocaleString()}) while maintaining ${eligibleEvents.length} eligible life events!`);
}

// 11. Executive Actions: Workforce Management (Hire, Downsize, Retreat, Bonus)
{
  const char = createMockCharacter({ cash: 300000 });
  const { character: bizChar, business } = foundBusiness(char, {
    templateId: 'biz_saas_platform',
    customName: 'CloudSphere AI',
    icon: '⚡',
    fundingMethod: 'bootstrapped',
  });

  const initialEmployees = business.employeeCount;

  // Hire 3 workers
  const hireRes = executeBusinessAction(business, bizChar, 'hire_workers', { count: 3 });
  assert(hireRes.success === true, 'Hire action succeeded');
  assert(hireRes.business.employeeCount === initialEmployees + 3, 'Employee count increased by 3');

  // Downsize 1 worker
  const downsizeRes = executeBusinessAction(hireRes.business, hireRes.character, 'downsize_workers', { count: 1 });
  assert(downsizeRes.success === true, 'Downsize action succeeded');
  assert(downsizeRes.business.employeeCount === initialEmployees + 2, 'Employee count reduced by 1');

  // Company Retreat
  const retreatRes = executeBusinessAction(downsizeRes.business, downsizeRes.character, 'company_retreat');
  assert(retreatRes.success === true, 'Company retreat succeeded');
  assert(retreatRes.business.morale > downsizeRes.business.morale, 'Morale boosted by retreat');

  // Staff Bonus
  const bonusRes = executeBusinessAction(retreatRes.business, retreatRes.character, 'staff_bonus');
  assert(bonusRes.success === true, 'Staff bonus succeeded');
  assert(bonusRes.business.morale > retreatRes.business.morale, 'Morale boosted by annual staff bonus');

  console.log(`✅ Executive Actions: Workforce hired, downsized, held retreat, and paid bonuses successfully!`);
}

// 12. Executive Actions: Growth & PR (Viral Blitz, Philanthropy, Rebrand)
{
  const char = createMockCharacter({ cash: 300000 });
  const { character: bizChar, business } = foundBusiness(char, {
    templateId: 'biz_coffee_shop',
    customName: 'Morning Roast',
    icon: '☕',
    fundingMethod: 'bootstrapped',
  });

  // Viral Blitz
  const viralRes = executeBusinessAction(business, bizChar, 'viral_blitz');
  assert(viralRes.success === true, 'Viral blitz succeeded');
  assert(viralRes.business.brandReputation > business.brandReputation, 'Brand jumped after viral campaign');

  // Community Sponsorship
  const prevKarma = viralRes.character.stats.karma;
  const sponsorRes = executeBusinessAction(viralRes.business, viralRes.character, 'community_sponsorship');
  assert(sponsorRes.success === true, 'Community sponsorship succeeded');
  assert(sponsorRes.character.stats.karma === Math.min(100, prevKarma + 8), 'Karma increased by +8');

  // Rebrand
  const rebrandRes = rebrandBusiness(
    sponsorRes.business,
    sponsorRes.character,
    'Artisan Bean Labs',
    '🍵',
    'Crafted with Passion'
  );
  assert(rebrandRes.success === true, 'Rebrand succeeded');
  assert(rebrandRes.business.name === 'Artisan Bean Labs', 'Name updated to Artisan Bean Labs');
  assert(rebrandRes.business.icon === '🍵', 'Icon updated to 🍵');
  assert(rebrandRes.business.slogan === 'Crafted with Passion', 'Slogan updated');
  assert(
    rebrandRes.character.occupation === 'Founder & CEO (Artisan Bean Labs)',
    'Character occupation reflects rebranded company name'
  );

  console.log(`✅ Executive Actions: Growth blitz, community philanthropy, and corporate rebranding verified!`);
}

// 13. Executive Actions: Operations & Upgrades (Equipment, Audit, Multi-Branch Expansion)
{
  const char = createMockCharacter({ cash: 400000 });
  const { character: bizChar, business } = foundBusiness(char, {
    templateId: 'biz_saas_platform',
    customName: 'Vanguard Systems',
    icon: '💻',
    fundingMethod: 'bootstrapped',
  });

  // Upgrade Equipment
  assert(business.equipmentTier === 0, 'Starts at Tier 0');
  const equipRes = executeBusinessAction(business, bizChar, 'upgrade_equipment');
  assert(equipRes.success === true, 'Equipment upgrade succeeded');
  assert(equipRes.business.equipmentTier === 1, 'Promoted to Tier 1');
  assert(equipRes.business.qualityScore > business.qualityScore, 'Quality score improved');

  // Operations Audit
  assert(business.hasAuditCompleted === false, 'Audit not completed initially');
  const auditRes = executeBusinessAction(equipRes.business, equipRes.character, 'operations_audit');
  assert(auditRes.success === true, 'Operations audit succeeded');
  assert(auditRes.business.hasAuditCompleted === true, 'Audit status recorded');

  // Attempting second audit should be blocked
  const auditRes2 = executeBusinessAction(auditRes.business, auditRes.character, 'operations_audit');
  assert(auditRes2.success === false, 'Duplicate audit rejected');

  // Multi-Branch Expansion (requires >= 1 year in operation)
  auditRes.business.yearsInOperation = 1;
  const branchRes = executeBusinessAction(auditRes.business, auditRes.character, 'open_branch');
  assert(branchRes.success === true, 'Opened second branch');
  assert(branchRes.business.locationsCount === 2, 'Locations count is now 2');

  console.log(`✅ Executive Actions: Equipment upgraded to Tier 1, audit completed, and second branch launched!`);
}

// 14. Executive Actions: Early Loan Payoff & Custom CEO Salary
{
  const char = createMockCharacter({ cash: 200000 });
  // Found with Bank Loan
  const { character: loanChar, business } = foundBusiness(char, {
    templateId: 'biz_coffee_shop', // $20k seed -> $5k down, $15k loan
    customName: 'Loan Cafe',
    icon: '☕',
    fundingMethod: 'bank_loan',
  });

  assert(business.outstandingLoan === 15000, 'Initial loan balance is $15,000');
  assert(business.annualLoanPayment > 0, 'Annual loan payment is active');

  // Partial payoff from corporate treasury
  const partialPay = payOffLoanEarly(business, loanChar, 5000, 'treasury');
  assert(partialPay.success === true, 'Partial payoff from treasury succeeded');
  assert(partialPay.business.outstandingLoan === 10000, 'Remaining loan balance is $10,000');

  // Full payoff from personal cash
  const fullPay = payOffLoanEarly(partialPay.business, partialPay.character, 10000, 'personal');
  assert(fullPay.success === true, 'Full payoff from personal cash succeeded');
  assert(fullPay.business.outstandingLoan === 0, 'Business is now 100% debt free');
  assert(fullPay.business.annualLoanPayment === 0, 'Annual loan payment eliminated to $0');

  // Set Owner Salary
  const salRes = executeBusinessAction(fullPay.business, fullPay.character, 'set_owner_salary', { newSalary: 75000 });
  assert(salRes.success === true, 'Salary update succeeded');
  assert(salRes.business.ownerSalary === 75000, 'Owner salary updated to $75,000');

  console.log(`✅ Executive Actions: Bank loan paid off early (debt-free) and custom CEO salary set!`);
}

// 15. Cooldown Enforcement and Annual Reset on Age-Up
{
  const char = createMockCharacter({ cash: 300000, age: 28 });
  const { character: bizChar, business } = foundBusiness(char, {
    templateId: 'biz_saas_platform',
    customName: 'ScaleSync',
    icon: '🚀',
    fundingMethod: 'bootstrapped',
  });

  // Execute retreat
  const ret1 = executeBusinessAction(business, bizChar, 'company_retreat');
  assert(ret1.success === true, 'First retreat succeeded');

  // Second retreat in same fiscal year should be blocked
  const ret2 = executeBusinessAction(ret1.business, ret1.character, 'company_retreat');
  assert(ret2.success === false, 'Second retreat blocked by cooldown');

  // Age up character
  const agedChar = ageUpCharacter(ret1.character);
  assert(agedChar.business !== null, 'Business still active');

  // After age up, cooldown is reset and retreat can be held again
  const ret3 = executeBusinessAction(agedChar.business!, agedChar, 'company_retreat');
  assert(ret3.success === true, 'Retreat allowed again in new fiscal year');

  console.log(`✅ Cooldown System: Annual cooldowns enforced during the year and reset upon Age-Up!`);
}

// 16. Interactive Business Events System
{
  const char = createMockCharacter({ cash: 200000, age: 29 });
  const { character: bizChar } = foundBusiness(char, {
    templateId: 'biz_saas_platform',
    customName: 'AeroCloud Analytics',
    icon: '☁️',
    fundingMethod: 'bootstrapped',
  });

  // Verify business events are present in catalog
  assert(BUSINESS_EVENTS.length >= 10, 'Expected at least 10 interactive business events');

  // Verify business events are eligible when owning a business
  const eligible = getEligibleEvents(bizChar);
  const eligibleBizEvents = eligible.filter((e) => e.category === 'business');
  assert(eligibleBizEvents.length > 0, 'Business events are eligible for business owner');

  // Non-business character should NOT get business events
  const regularChar = createMockCharacter({ cash: 200000, age: 29 });
  const regularEligible = getEligibleEvents(regularChar);
  const regularBizEvents = regularEligible.filter((e) => e.category === 'business');
  assert(regularBizEvents.length === 0, 'Non-business character gets 0 business events');

  // Test event choice resolution with business stat deltas
  const testEvent = BUSINESS_EVENTS.find((e) => e.id === 'biz_raw_materials_dilemma')!;
  assert(testEvent !== undefined, 'Found test event');

  const initialBrand = bizChar.business!.brandReputation;
  const initialQuality = bizChar.business!.qualityScore;

  // Choose "refuse_discount" (boosts brand and quality)
  const choice = testEvent.choices[0];
  const resolution = resolveEventChoice(bizChar, testEvent, choice);

  assert(resolution.character.business !== null, 'Business remains attached');
  assert(
    resolution.character.business!.brandReputation > initialBrand,
    'Brand reputation increased after choice'
  );
  assert(
    resolution.character.business!.qualityScore > initialQuality,
    'Quality score increased after choice'
  );
  assert(
    resolution.applied.businessBrand !== undefined,
    'Applied businessBrand stat delta recorded'
  );

  console.log(`✅ Business Events: Filtered properly, choice resolved, and business stats updated!`);
}

console.log('--- ALL MODULE 5 BUSINESS SIMULATION TESTS PASSED PERFECTLY! ---');
