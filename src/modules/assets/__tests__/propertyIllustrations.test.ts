import type { CharacterProfile } from '../../../types/game';
import { PROPERTY_CATALOG, getPropertyListing } from '../data/propertyCatalog';
import { PROPERTY_ILLUSTRATION_IDS, propertyIllustrationId } from '../data/illustrationIds';
import {
  progressPropertiesForYear,
  purchaseProperty,
  scheduledAnnualPrincipal,
  validProperties,
} from '../services/assetService';
import { ageUpMortgageObligations, openingMortgage } from '../components/mortgageObligations';
import { createTransactionGuard } from '../components/transactionGuard';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

console.log('--- ASSETS UI ILLUSTRATIONS AND DISPLAY ---');

{
  const catalogIds = PROPERTY_CATALOG.map((listing) => listing.id);
  assert(
    catalogIds.length === PROPERTY_ILLUSTRATION_IDS.length,
    'every listing has one illustration id'
  );
  for (const id of catalogIds) {
    assert(propertyIllustrationId(id) === id, `${id} resolves to an illustration`);
  }
  for (const id of PROPERTY_ILLUSTRATION_IDS) {
    assert(catalogIds.includes(id), `${id} is a real catalog listing`);
  }
  assert(propertyIllustrationId('not_a_home') === null, 'an unknown catalog id has no illustration');
}

{
  const guard = createTransactionGuard();
  assert(guard.begin() === true, 'the first purchase or sale begins');
  assert(guard.begin() === false, 'a second click does not start another transaction');
  guard.succeed();
  assert(guard.begin() === false, 'a successful transaction stays consumed');
  guard.reset();
  assert(guard.begin() === true, 'closing or changing the selection allows a new transaction');
  guard.fail();
  assert(guard.isConsumed() === false, 'a failure clears the mark');
  assert(guard.begin() === true, 'a failure allows an intentional retry');
}

{
  const listing = getPropertyListing('studio_austin_loft');
  if (!listing) throw new Error('the studio listing exists');
  const opening = openingMortgage(listing.purchasePrice);
  assert(
    opening.annualPrincipalPayment === scheduledAnnualPrincipal(opening.originalPrincipal),
    'a new mortgage stores the schedule from the original principal'
  );
  const reduced = { ...opening, principal: 100 };
  const due = ageUpMortgageObligations(reduced);
  assert(
    due.annualPrincipal === Math.min(100, opening.annualPrincipalPayment),
    'principal due is capped at the remaining balance'
  );
  assert(
    due.annualPrincipal !== scheduledAnnualPrincipal(100),
    'the remaining balance is not turned into a new 30-year schedule'
  );
  assert(
    due.annualInterest === Math.round(100 * reduced.annualInterestRate),
    'interest uses the current principal and the saved rate'
  );

  const buyer = {
    age: 30,
    cash: 200000,
    bankBalance: 0,
    birthYear: 1990,
    timeline: [],
    education: { studentDebt: 0 },
    assets: { properties: [] },
  } as unknown as CharacterProfile;
  const bought = purchaseProperty(buyer, 'studio_austin_loft', 'mortgage');
  const deed = validProperties(bought.character)[0];
  const obligations = ageUpMortgageObligations(deed.mortgage!);
  const year = progressPropertiesForYear({ ...bought.character, cash: 1000000 }, 0);
  const maintenance = getPropertyListing(deed.catalogId)!.annualMaintenance;
  assert(
    year.cashSpent === obligations.annualInterest + maintenance + obligations.annualPrincipal,
    'the details match the interest, upkeep, and principal Age Up would charge'
  );
}

console.log('✅ Assets UI illustration and display tests passed');
