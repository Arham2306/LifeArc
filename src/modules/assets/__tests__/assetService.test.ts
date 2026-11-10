import type { CharacterProfile, PersonProfile } from '../../../types/game';
import { createInitialEducation, enrollInProfessionalSchool, enrollInUniversity } from '../../education/services/educationService';
import { createInitialCareerState, performRetire, performSocializeWithCoworkers } from '../../career/services/careerService';
import { ageUpCharacter } from '../../aging/services/agingService';
import { applyEffects } from '../../character/services/statService';
import {
  exitBusiness,
  foundBusiness,
  injectCapitalIntoBusiness,
  payOffLoanEarly,
} from '../../business/services/businessService';
import { executeSocialAction } from '../../relationships/services/relationshipService';
import { GIFT_CATALOG } from '../../relationships/data/socialInteractions';
import { divorceService } from '../../romance/services/divorceService';
import { getPropertyListing } from '../data/propertyCatalog';
import {
  calculatePlayerNetWorth,
  isValidMortgage,
  isValidOwnedProperty,
  progressPropertiesForYear,
  purchaseProperty,
  scheduledAnnualPrincipal,
  sellProperty,
  stampPlayerNetWorth,
  validProperties,
} from '../services/assetService';
import type { OwnedProperty, PropertyMortgage } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function character(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char_assets',
    firstName: 'Mina',
    lastName: 'Cole',
    gender: 'female',
    age: 30,
    birthYear: 1996,
    city: 'Austin',
    country: 'United States',
    isAlive: true,
    stats: { health: 80, happiness: 80, smarts: 80, looks: 70, karma: 70 },
    cash: 100000,
    bankBalance: 0,
    netWorth: 100000,
    occupation: 'Unemployed',
    parents: {
      father: {
        id: 'dad',
        role: 'father',
        firstName: 'Owen',
        lastName: 'Cole',
        age: 55,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mom',
        role: 'mother',
        firstName: 'Irene',
        lastName: 'Cole',
        age: 53,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      wealth: 'comfortable',
    },
    relationships: [],
    education: {
      ...createInitialEducation(),
      grades: 80,
      diplomas: ['High School Diploma'],
    },
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

function mortgage(partial: Partial<PropertyMortgage> = {}): PropertyMortgage {
  return {
    originalPrincipal: 49600,
    principal: 49600,
    annualInterestRate: 0.04,
    annualPrincipalPayment: scheduledAnnualPrincipal(49600),
    ...partial,
  };
}

function home(partial: Partial<OwnedProperty> = {}): OwnedProperty {
  const listing = getPropertyListing(partial.catalogId ?? 'studio_austin_loft')!;
  return {
    id: partial.id ?? 'home-1',
    catalogId: listing.id,
    type: listing.type,
    name: listing.name,
    city: listing.city,
    purchasePrice: listing.purchasePrice,
    purchaseAge: 30,
    marketValue: listing.purchasePrice,
    mortgage: null,
    ...partial,
  };
}

function expectWorth(person: CharacterProfile, label: string) {
  assert(person.netWorth === calculatePlayerNetWorth(person), `${label} stored net worth matches the formula`);
}

const spouse: PersonProfile = {
  id: 'spouse',
  firstName: 'Alex',
  lastName: 'Lee',
  gender: 'male',
  age: 32,
  role: 'Husband',
  relationshipType: 'spouse',
  relationship: 90,
  originStory: 'Met at work',
  stageMet: 'adulthood',
  romanticStage: 'married',
  partnerStats: {
    craziness: 10,
    generosity: 50,
    looks: 60,
    smarts: 60,
    fertility: 0,
    annualIncome: 42000,
    occupation: 'Teacher',
  },
};

console.log('--- MODULE 8.1 RESIDENTIAL PROPERTY ---');

{
  const buyer = character({ cash: 62000, bankBalance: 500 });
  const bought = purchaseProperty(buyer, 'studio_austin_loft', 'cash');
  assert(bought.ok, 'cash purchase succeeds');
  assert(bought.character.cash === 0, 'cash purchase spends the full price');
  assert(validProperties(bought.character)[0].mortgage === null, 'cash purchase has no mortgage');
  expectWorth(bought.character, 'cash purchase');
  assert(bought.character.netWorth === 500 + 62000, 'cash purchase keeps equity in net worth');
}

{
  const buyer = character({ cash: 12400, bankBalance: 0 });
  const bought = purchaseProperty(buyer, 'studio_austin_loft', 'mortgage');
  const deed = validProperties(bought.character)[0];
  assert(bought.ok && bought.character.cash === 0, 'mortgage purchase spends the 20% down payment');
  assert(deed.mortgage?.originalPrincipal === 49600, 'mortgage principal is price minus down payment');
  assert(deed.mortgage?.principal === 49600, 'opening principal equals the original principal');
  assert(deed.mortgage?.annualPrincipalPayment === Math.ceil(49600 / 30), 'annual principal is the 30-year ceiling');
  expectWorth(bought.character, 'mortgage purchase');
  assert(bought.character.netWorth === 62000 - 49600, 'mortgage equity is the down payment');
}

{
  const minor = character({ age: 17, cash: 200000 });
  const unknown = purchaseProperty(character(), 'not_a_listing', 'cash');
  const broke = purchaseProperty(character({ cash: 100 }), 'studio_austin_loft', 'cash');
  const capped = character({
    assets: { properties: [home({ id: 'a' }), home({ id: 'b' }), home({ id: 'c' }), home({ id: 'd' })] },
  });
  const tooMany = purchaseProperty(capped, 'studio_chicago_walkup', 'cash');
  assert(purchaseProperty(minor, 'studio_austin_loft', 'cash').character === minor, 'under-18 purchase returns the same character');
  assert(unknown.character === character() || unknown.ok === false, 'unknown listing is rejected');
  const fresh = character();
  assert(purchaseProperty(fresh, 'missing', 'mortgage').character === fresh, 'unknown listing returns the same character');
  assert(broke.character === character({ cash: 100 }) || !broke.ok, 'insufficient cash is rejected');
  const poor = character({ cash: 100 });
  assert(purchaseProperty(poor, 'studio_austin_loft', 'cash').character === poor, 'insufficient cash returns the same character');
  assert(tooMany.character === capped, 'a fifth valid home is rejected without copying the character');
  assert(purchaseProperty(minor, 'studio_austin_loft', 'cash').ok === false, 'under-18 purchase reports failure');
}

{
  const owned = home({ id: 'sale-1', marketValue: 80000 });
  const seller = character({
    cash: 1000,
    assets: { properties: [owned] },
  });
  const sold = sellProperty(seller, 'sale-1');
  assert(sold.ok, 'sale succeeds');
  assert(sold.realizedProfit === 80000 - 2400 - 62000, 'realized profit ignores the mortgage');
  assert(sold.character.cash === 1000 + (80000 - 2400), 'cash proceeds are market value minus the fee');
  expectWorth(sold.character, 'cash sale');

  const mortgaged = home({
    id: 'sale-2',
    marketValue: 80000,
    mortgage: mortgage({ principal: 10000 }),
  });
  const loanSale = sellProperty(character({ cash: 0, assets: { properties: [mortgaged] } }), 'sale-2');
  assert(loanSale.realizedProfit === 15600, 'mortgage payoff is not part of realized profit');
  assert(loanSale.character.cash === 80000 - 2400 - 10000, 'cash proceeds pay off the remaining principal');
  expectWorth(loanSale.character, 'mortgage sale');

  const underwater = home({
    id: 'sale-3',
    marketValue: 1000,
    mortgage: mortgage({ principal: 50000 }),
  });
  const holder = character({ assets: { properties: [underwater] } });
  const blocked = sellProperty(holder, 'sale-3');
  assert(blocked.character === holder && !blocked.ok, 'negative proceeds leave the character unchanged');
}

{
  assert(!isValidMortgage({ ...mortgage(), principal: -1 }), 'negative principal is invalid');
  assert(!isValidMortgage({ ...mortgage(), originalPrincipal: Number.NaN }), 'non-finite original principal is invalid');
  assert(!isValidMortgage({ ...mortgage(), annualInterestRate: -0.01 }), 'negative interest is invalid');
  assert(!isValidMortgage({ ...mortgage(), annualPrincipalPayment: Number.POSITIVE_INFINITY }), 'non-finite principal payment is invalid');
  assert(isValidMortgage(mortgage({ principal: 60000, originalPrincipal: 49600 })), 'capitalized interest may exceed the original principal');
  const bad = { ...home(), mortgage: { ...mortgage(), principal: -5 } };
  assert(!isValidOwnedProperty(bad), 'a property with an invalid mortgage is ignored');
  const owed = character({
    cash: 1000,
    bankBalance: 250,
    assets: { properties: [bad, home({ marketValue: 70000, mortgage: mortgage({ principal: 60000, originalPrincipal: 49600 }) })] },
  });
  assert(validProperties(owed).length === 1, 'only the valid property counts');
  assert(calculatePlayerNetWorth(owed) === 1000 + 250 + 70000 - 60000, 'invalid property equity is excluded');
}

{
  const indebted = character({ cash: 1000, bankBalance: 500, education: { ...createInitialEducation(), studentDebt: 2000 } });
  assert(calculatePlayerNetWorth(indebted) === -500, 'student debt is subtracted and net worth may be negative');
  const negativeDebt = character({
    cash: 1000,
    bankBalance: 500,
    education: { ...createInitialEducation(), studentDebt: -100 },
  });
  assert(calculatePlayerNetWorth(negativeDebt) === 1500, 'negative student debt counts as zero');
  const brokenDebt = character({
    cash: 1000,
    bankBalance: 500,
    education: { ...createInitialEducation(), studentDebt: Number.NaN },
  });
  assert(calculatePlayerNetWorth(brokenDebt) === 1500, 'non-finite student debt counts as zero');
  const clear = character({ cash: 40, bankBalance: 10 });
  assert(calculatePlayerNetWorth(clear) === 50, 'a debt-free character with no property is cash plus bank balance');
}

{
  const founded = foundBusiness(character({ cash: 100000 }), {
    templateId: 'biz_coffee_shop',
    customName: 'Mina Coffee',
    icon: '☕',
    fundingMethod: 'bootstrapped',
  });
  assert(founded.character.business!.valuation > 0, 'the company has a valuation');
  assert(founded.character.business!.treasury > 0, 'the company has a treasury');
  expectWorth(founded.character, 'business founding');
  assert(
    founded.character.netWorth === founded.character.cash + founded.character.bankBalance,
    'business equity, treasury, and debt are excluded from player net worth'
  );

  const injected = injectCapitalIntoBusiness(founded.character.business!, founded.character, 5000);
  expectWorth(injected.character, 'capital injection');
  assert(
    injected.character.netWorth === injected.character.cash,
    'the valuation increase from a capital injection is still excluded'
  );

  const loaned = foundBusiness(character({ cash: 100000 }), {
    templateId: 'biz_coffee_shop',
    customName: 'Loan Coffee',
    icon: '☕',
    fundingMethod: 'bank_loan',
  });
  const paid = payOffLoanEarly(loaned.character.business!, loaned.character, 1000, 'personal');
  assert(paid.success, 'personal loan payoff succeeds');
  expectWorth(paid.character, 'personal loan payoff');
  assert(paid.character.netWorth === paid.character.cash, 'paying a business loan does not add company debt back into net worth');
  const fromTreasury = payOffLoanEarly(paid.business, paid.character, 1000, 'treasury');
  assert(fromTreasury.character.cash === paid.character.cash, 'treasury payoff does not change personal cash');
  expectWorth(fromTreasury.character, 'treasury loan payoff');

  const company = { ...founded.character.business!, valuation: 100000, treasury: 10000, outstandingLoan: 0, equityPct: 100 };
  const owner = { ...founded.character, business: company, cash: 5000, netWorth: 0 };
  const acquired = exitBusiness(company, owner, 'acquisition');
  expectWorth(acquired.character, 'acquisition');
  assert(acquired.character.business === null, 'acquisition closes the company');
  assert(acquired.character.netWorth === 5000 + acquired.payoutAmount, 'acquisition cash is included and equity is not counted twice');

  const offered = exitBusiness(company, owner, 'ipo');
  expectWorth(offered.character, 'ipo');
  assert((offered.character.business?.valuation ?? 0) > 100000, 'the public valuation rose');
  assert(offered.character.netWorth === 5000 + offered.payoutAmount, 'the higher public valuation stays out of player net worth');

  const closed = exitBusiness(company, owner, 'liquidation');
  expectWorth(closed.character, 'liquidation');
  assert(closed.character.netWorth === 5000 + closed.payoutAmount, 'liquidation proceeds are cash, not leftover company equity');
}

{
  const social = performSocializeWithCoworkers(
    character({
      cash: 1000,
      career: {
        ...createInitialCareerState(),
        currentJob: {
          jobId: 'ft_software_engineer',
          title: 'Engineer',
          companyName: 'Apex',
          field: 'technology',
          type: 'full_time',
          salary: 50000,
          yearsInJob: 2,
          performance: 80,
          hiredAge: 24,
          icon: '💻',
        },
      },
    })
  );
  assert(social.isSuccess, 'coworker socializing succeeds');
  assert(social.character.cash === 965, 'coworker socializing spends $35');
  expectWorth(social.character, 'coworker socializing');

  const retired = performRetire(
    character({
      age: 60,
      cash: 1000,
      career: {
        ...createInitialCareerState(),
        currentJob: {
          jobId: 'ft_software_engineer',
          title: 'Engineer',
          companyName: 'Apex',
          field: 'technology',
          type: 'full_time',
          salary: 50000,
          yearsInJob: 20,
          performance: 80,
          hiredAge: 40,
          icon: '💻',
        },
      },
    })
  );
  assert(retired.isSuccess, 'retirement succeeds');
  assert(retired.character.cash === 1000 + 20000, 'retirement pays 40% of salary');
  expectWorth(retired.character, 'retirement');

  const gifted = executeSocialAction(
    character({ cash: 200 }),
    {
      id: 'mom',
      name: 'Irene',
      role: 'Mother',
      type: 'parent',
      relationship: 80,
      isAlive: true,
      age: 53,
    },
    'give_gift',
    GIFT_CATALOG.find((gift) => gift.id === 'gift_artisan_chocolates')
  );
  const giftCost = GIFT_CATALOG.find((gift) => gift.id === 'gift_artisan_chocolates')!.cost;
  assert(gifted.character.cash === 200 - giftCost, 'the gift spends cash');
  expectWorth(gifted.character, 'gift');

  const divorced = divorceService.executeDivorce(
    character({ cash: 10000, partner: spouse }),
    { ...spouse, partnerStats: { ...spouse.partnerStats!, hasPrenup: true } },
    'public'
  );
  assert(divorced.updatedCharacter.cash === 9700, 'prenup divorce keeps cash minus the public attorney fee');
  expectWorth(divorced.updatedCharacter, 'divorce');

  const student = character({
    age: 18,
    cash: 4000,
    bankBalance: 100,
    stats: { health: 90, happiness: 80, smarts: 70, looks: 70, karma: 70 },
  });
  const university = enrollInUniversity(student, 'cs', 'student_loan');
  assert(university.enrolled, 'university enrollment succeeds');
  assert(university.character.education.studentDebt === 11500, 'university adds the first year of tuition to student debt');
  assert(university.character.cash === 4000, 'a student loan does not spend cash');
  expectWorth(university.character, 'university enrollment');
  assert(university.character.netWorth === 4000 + 100 - 11500, 'university debt is in the stamped net worth');

  const pilot = enrollInProfessionalSchool(
    character({
      age: 22,
      cash: 8000,
      bankBalance: 200,
      stats: { health: 90, happiness: 80, smarts: 70, looks: 70, karma: 70 },
    }),
    'flight_school',
    'student_loan'
  );
  assert(pilot.enrolled, 'flight school enrollment succeeds');
  assert(pilot.character.education.studentDebt === 16500, 'flight school adds its yearly tuition');
  expectWorth(pilot.character, 'flight school enrollment');
  assert(pilot.character.netWorth === 8000 + 200 - 16500, 'professional-school debt is in the stamped net worth');
}

{
  const worker = character({
    age: 30,
    cash: 5000,
    bankBalance: 100,
    assets: { properties: [home({ id: 'studio' })] },
    partner: spouse,
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'ft_software_engineer',
        title: 'Engineer',
        companyName: 'Apex',
        field: 'technology',
        type: 'full_time',
        salary: 50000,
        yearsInJob: 2,
        performance: 90,
        hiredAge: 26,
        icon: '💻',
      },
    },
  });
  const aged = ageUpCharacter(worker);
  assert(aged.cash === 51200, 'salary, spouse contribution, and maintenance are applied once');
  assert(validProperties(aged)[0].marketValue === Math.round(62000 * 1.03), 'the studio appreciates exactly 3%');
  expectWorth(aged, 'age up with salary and spouse');

  const founder = foundBusiness(
    character({
      age: 30,
      cash: 80000,
      assets: { properties: [home({ id: 'studio-biz' })] },
      partner: spouse,
      career: {
        ...createInitialCareerState(),
        currentJob: {
          jobId: 'ft_software_engineer',
          title: 'Engineer',
          companyName: 'Apex',
          field: 'technology',
          type: 'full_time',
          salary: 50000,
          yearsInJob: 2,
          performance: 90,
          hiredAge: 26,
          icon: '💻',
        },
      },
    }),
    {
      templateId: 'biz_coffee_shop',
      customName: 'Age Up Coffee',
      icon: '☕',
      fundingMethod: 'bootstrapped',
    }
  );
  const withSalary = {
    ...founder.character,
    business: { ...founder.character.business!, ownerSalary: 5000, dividendRatePct: 0 },
  };
  const agedOwner = ageUpCharacter(withSalary);
  const payout = agedOwner.business?.lastFiscalReport?.totalPayoutToPlayer ?? -1;
  assert(payout >= 0, 'the fiscal report records the player payout');
  assert(
    agedOwner.cash === withSalary.cash + 39000 + 8400 + payout - 1200,
    'business payout joins salary and the spouse contribution, and maintenance is charged once'
  );
  expectWorth(agedOwner, 'age up with a business');
}

{
  const first = home({
    id: 'first',
    mortgage: mortgage({ originalPrincipal: 30000, principal: 10000, annualPrincipalPayment: 1000 }),
  });
  const second = home({
    id: 'second',
    catalogId: 'studio_chicago_walkup',
    mortgage: mortgage({ originalPrincipal: 30000, principal: 10000, annualPrincipalPayment: 1000 }),
  });
  const interestOnly = character({ cash: 400, assets: { properties: [first, second] } });
  const interestPass = progressPropertiesForYear(interestOnly, 0);
  const afterInterest = interestPass.properties.filter(isValidOwnedProperty);
  assert(interestOnly.cash === 400, 'property progression does not mutate cash');
  assert(afterInterest[0].mortgage!.principal === 10000, 'the first mortgage interest is paid before the second is capitalized');
  assert(afterInterest[1].mortgage!.principal === 10400, 'unpaid interest on the later mortgage is capitalized');
  assert(interestPass.cashSpent === 400, 'the whole pool went to interest');

  const maintenancePool = character({ cash: 1300, assets: { properties: [first, second] } });
  const maintenancePass = progressPropertiesForYear(maintenancePool, 0);
  const afterMaintenance = maintenancePass.properties.filter(isValidOwnedProperty);
  assert(afterMaintenance[0].mortgage!.principal === 10000, 'maintenance is paid before principal');
  assert(afterMaintenance[1].mortgage!.principal === 10000, 'the second principal waits behind maintenance');
  assert(maintenancePass.cashSpent === 1300, 'interest and partial maintenance consume the pool');

  const principalPool = character({ cash: 3600, assets: { properties: [first, second] } });
  const principalPass = progressPropertiesForYear(principalPool, 0);
  const afterPrincipal = principalPass.properties.filter(isValidOwnedProperty);
  assert(afterPrincipal[0].mortgage!.principal === 9900, 'principal is paid only after every home is maintained');
  assert(afterPrincipal[1].mortgage!.principal === 10000, 'the second principal is not paid ahead of the first');
}

{
  const short = character({
    cash: 10,
    assets: {
      properties: [
        home({
          id: 'short',
          mortgage: mortgage({ principal: 1000, originalPrincipal: 1000, annualPrincipalPayment: 100 }),
        }),
      ],
    },
  });
  const progressed = progressPropertiesForYear(short, 0);
  const deed = progressed.properties.filter(isValidOwnedProperty)[0];
  assert(deed.mortgage!.principal === 1030, 'the unpaid part of the interest is added to principal');
  assert(deed.mortgage!.annualPrincipalPayment === 100, 'a skipped principal payment does not become a new loan');
  assert(!('maintenanceArrears' in deed), 'skipped maintenance is not stored as arrears');
  assert(progressed.cashSpent === 10, 'only the cash on hand is spent');

  const aged = ageUpCharacter(character({ cash: 100, assets: { properties: [home({ id: 'tight' })] } }));
  assert(aged.cash === 0, 'age up never leaves cash negative when maintenance exceeds cash');
  expectWorth(aged, 'short maintenance age up');
}

{
  const austin = home({ id: 'austin' });
  const chicago = home({ id: 'chicago', catalogId: 'studio_chicago_walkup' });
  const aged = ageUpCharacter(character({ cash: 100000, assets: { properties: [austin, chicago] } }));
  assert(validProperties(aged)[0].marketValue === 63860, 'the Austin studio appreciates once');
  assert(validProperties(aged)[1].marketValue === 87550, 'the Chicago studio appreciates once');
  assert(aged.cash === 100000 - 1200 - 1500, 'both maintenance bills are paid once');
}

{
  let holder = character({
    cash: 1000000,
    assets: {
      properties: [
        home({
          id: 'term',
          marketValue: 31,
          purchasePrice: 31,
          mortgage: mortgage({
            originalPrincipal: 31,
            principal: 31,
            annualInterestRate: 0,
            annualPrincipalPayment: Math.ceil(31 / 30),
          }),
        }),
      ],
    },
  });
  let years = 0;
  for (let year = 0; year < 30; year += 1) {
    const step = progressPropertiesForYear(holder, 0);
    const deed = step.properties.filter(isValidOwnedProperty)[0];
    assert(deed.mortgage!.principal >= 0, 'principal never goes negative');
    if (deed.mortgage!.principal === 0 && years === 0) years = year + 1;
    holder = { ...holder, cash: holder.cash - step.cashSpent, assets: { properties: step.properties } };
  }
  assert(years > 0 && years <= 30, 'the ceiling schedule finishes within 30 payments');
  assert(validProperties(holder)[0].mortgage!.principal === 0, 'thirty scheduled payments leave no residual balance');

  const opened = purchaseProperty(character({ cash: 12400 }), 'studio_austin_loft', 'mortgage');
  assert(
    validProperties(opened.character)[0].mortgage!.annualPrincipalPayment === Math.ceil(49600 / 30),
    'a new mortgage stores the 30-year ceiling'
  );
}

{
  const broken = { id: 'not-a-deed', marketValue: 'later' };
  const keeper = character({ cash: 200000, assets: { properties: [broken, home({ id: 'keep' })] } });
  const bought = purchaseProperty(keeper, 'condo_houston_bay', 'cash');
  assert(bought.character.assets!.properties[0] === broken, 'a purchase keeps the malformed record');
  const sold = sellProperty(bought.character, 'keep');
  assert(sold.character.assets!.properties[0] === broken, 'a sale keeps the malformed record');
  assert(sold.character.assets!.properties.some((entry) => isValidOwnedProperty(entry) && entry.catalogId === 'condo_houston_bay'), 'the valid purchase remains');
  const aged = ageUpCharacter(character({ cash: 500000, assets: { properties: [broken] } }));
  assert(aged.assets!.properties[0] === broken, 'age up keeps the malformed record');
  assert(calculatePlayerNetWorth(aged) === aged.cash + aged.bankBalance, 'the malformed record is excluded from net worth');
}

{
  const legacy = character();
  delete (legacy as { assets?: unknown }).assets;
  assert(calculatePlayerNetWorth(legacy) === legacy.cash + legacy.bankBalance, 'a character without assets still has a net worth');
  const aged = ageUpCharacter(legacy);
  assert(aged.assets === undefined, 'aging a character without assets does not create a portfolio');
  const stamped = stampPlayerNetWorth(legacy);
  expectWorth(stamped, 'legacy stamp');
  const bought = purchaseProperty(legacy, 'studio_austin_loft', 'cash');
  assert(Array.isArray(bought.character.assets?.properties), 'the first purchase creates the portfolio');
  expectWorth(bought.character, 'legacy purchase');
}

{
  const broken = { id: 'bad', marketValue: 999999 };
  const owner = character({
    cash: 100000,
    assets: { properties: [broken, home({ id: 'once' })] },
  });
  const yearOne = ageUpCharacter(owner);
  const yearOneValue = validProperties(yearOne)[0].marketValue;
  const twoSteps = Math.round(Math.round(62000 * 1.03) * 1.03);
  assert(yearOneValue === 63860, 'one Age Up applies exactly one 3% appreciation');
  assert(yearOneValue !== twoSteps, 'one Age Up does not apply a second appreciation');
  assert(yearOne.cash === 98800, 'one Age Up charges maintenance once');
  assert(yearOne.assets!.properties[0] === broken, 'a malformed record is not appreciated');

  const yearTwo = ageUpCharacter(yearOne);
  assert(
    validProperties(yearTwo)[0].marketValue === Math.round(63860 * 1.03),
    'a second Age Up applies exactly one more 3% step'
  );
  assert(yearTwo.cash === 97600, 'the second Age Up charges maintenance once');
  assert(yearTwo.assets!.properties[0] === broken, 'a malformed record survives both Age Ups');

  const eventCash = applyEffects(yearTwo, { cash: 25 }).character;
  assert(
    validProperties(eventCash)[0].marketValue === validProperties(yearTwo)[0].marketValue,
    'an event cash effect does not progress property'
  );
  assert(eventCash.cash === yearTwo.cash + 25, 'the event changes cash without a second property pass');

  const crowded = character({
    cash: 200000,
    assets: { properties: [broken, { nope: true }, { mortgage: 'later' }, []] },
  });
  const bought = purchaseProperty(crowded, 'studio_austin_loft', 'cash');
  assert(bought.ok, 'malformed records do not count toward the portfolio cap');
  assert(bought.character.assets!.properties[0] === broken, 'the purchase leaves the malformed record in place');
}

console.log('✅ Module 8.1 residential property tests passed');
