import type { CharacterProfile, LifeEvent } from '../../../types/game';
import { createId } from '../../../utils/id';
import { getPropertyListing } from '../data/propertyCatalog';
import type { OwnedProperty, PlayerAssetPortfolio, PropertyMortgage, PropertyType } from '../types';

export const PROPERTY_PURCHASE_AGE = 18;
export const PROPERTY_PORTFOLIO_CAP = 4;
export const PROPERTY_DOWN_PAYMENT_RATE = 0.2;
export const PROPERTY_APPRECIATION_RATE = 0.03;
export const MORTGAGE_ANNUAL_INTEREST_RATE = 0.04;
export const PROPERTY_SALE_FEE_RATE = 0.03;
const PROPERTY_TYPES: readonly PropertyType[] = ['studio', 'condo', 'house', 'luxury_house'];

export interface AssetTransactionResult {
  character: CharacterProfile;
  ok: boolean;
  reason?: string;
  realizedProfit?: number;
}

export interface PropertyYearProgress {
  properties: unknown[];
  cashSpent: number;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rawProperties(character: CharacterProfile): unknown[] {
  const properties = character.assets?.properties;
  return Array.isArray(properties) ? properties : [];
}

export function isValidMortgage(value: unknown): value is PropertyMortgage {
  if (!isPlainRecord(value)) return false;
  if (!finiteNumber(value.originalPrincipal) || value.originalPrincipal < 0) return false;
  if (!finiteNumber(value.principal) || value.principal < 0) return false;
  if (!finiteNumber(value.annualInterestRate) || value.annualInterestRate < 0) return false;
  if (!finiteNumber(value.annualPrincipalPayment) || value.annualPrincipalPayment < 0) return false;
  return true;
}

export function isValidOwnedProperty(value: unknown): value is OwnedProperty {
  if (!isPlainRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id.trim() === '') return false;
  if (typeof value.catalogId !== 'string') return false;
  const listing = getPropertyListing(value.catalogId);
  if (!listing) return false;
  if (value.type !== listing.type || !PROPERTY_TYPES.includes(value.type as PropertyType)) return false;
  if (typeof value.name !== 'string' || value.name.trim() === '') return false;
  if (typeof value.city !== 'string' || value.city.trim() === '') return false;
  if (!finiteNumber(value.purchasePrice) || value.purchasePrice < 0) return false;
  if (!finiteNumber(value.purchaseAge) || value.purchaseAge < 0) return false;
  if (!finiteNumber(value.marketValue) || value.marketValue < 0) return false;
  if (value.mortgage !== null && !isValidMortgage(value.mortgage)) return false;
  return true;
}

export function validProperties(character: CharacterProfile): OwnedProperty[] {
  return rawProperties(character).filter(isValidOwnedProperty);
}

function studentDebtOf(character: CharacterProfile): number {
  const debt = character.education?.studentDebt;
  if (!finiteNumber(debt) || debt <= 0) return 0;
  return debt;
}

export function calculatePlayerNetWorth(character: CharacterProfile): number {
  const cash = finiteNumber(character.cash) ? character.cash : 0;
  const bankBalance = finiteNumber(character.bankBalance) ? character.bankBalance : 0;
  let marketValue = 0;
  let mortgagePrincipal = 0;
  for (const property of validProperties(character)) {
    marketValue += property.marketValue;
    if (property.mortgage) mortgagePrincipal += property.mortgage.principal;
  }
  return cash + bankBalance + marketValue - mortgagePrincipal - studentDebtOf(character);
}

export function stampPlayerNetWorth<T extends CharacterProfile>(character: T): T {
  return { ...character, netWorth: calculatePlayerNetWorth(character) };
}

function portfolioWith(properties: unknown[]): PlayerAssetPortfolio {
  return { properties };
}

function journal(character: CharacterProfile, title: string, message: string): LifeEvent {
  return {
    id: createId(),
    age: character.age,
    year: character.birthYear + character.age,
    title,
    message,
    category: 'money',
    icon: '🏠',
  };
}

function fail(character: CharacterProfile, reason: string): AssetTransactionResult {
  return { character, ok: false, reason };
}

export function scheduledAnnualPrincipal(originalPrincipal: number): number {
  return Math.ceil(originalPrincipal / 30);
}

export function purchaseProperty(
  character: CharacterProfile,
  catalogId: string,
  financing: 'cash' | 'mortgage'
): AssetTransactionResult {
  if (!finiteNumber(character.age) || character.age < PROPERTY_PURCHASE_AGE) {
    return fail(character, 'Property purchases unlock at age 18.');
  }
  const listing = getPropertyListing(catalogId);
  if (!listing) return fail(character, 'That listing is no longer available.');
  if (validProperties(character).length >= PROPERTY_PORTFOLIO_CAP) {
    return fail(character, 'You already own 4 properties.');
  }

  const cash = finiteNumber(character.cash) ? character.cash : 0;
  const downPayment = Math.round(listing.purchasePrice * PROPERTY_DOWN_PAYMENT_RATE);
  const cashDue = financing === 'cash' ? listing.purchasePrice : downPayment;
  if (cash < cashDue) return fail(character, 'You do not have enough cash for this purchase.');

  const mortgage: PropertyMortgage | null =
    financing === 'mortgage'
      ? {
          originalPrincipal: listing.purchasePrice - downPayment,
          principal: listing.purchasePrice - downPayment,
          annualInterestRate: MORTGAGE_ANNUAL_INTEREST_RATE,
          annualPrincipalPayment: scheduledAnnualPrincipal(listing.purchasePrice - downPayment),
        }
      : null;

  const property: OwnedProperty = {
    id: createId(),
    catalogId: listing.id,
    type: listing.type,
    name: listing.name,
    city: listing.city,
    purchasePrice: listing.purchasePrice,
    purchaseAge: character.age,
    marketValue: listing.purchasePrice,
    mortgage,
  };

  const message =
    financing === 'cash'
      ? `You bought ${listing.name} in ${listing.city} for $${listing.purchasePrice.toLocaleString()} in cash.`
      : `You bought ${listing.name} in ${listing.city} for $${listing.purchasePrice.toLocaleString()} with $${downPayment.toLocaleString()} down.`;

  return {
    ok: true,
    character: stampPlayerNetWorth({
      ...character,
      cash: cash - cashDue,
      assets: portfolioWith([...rawProperties(character), property]),
      timeline: [...(character.timeline ?? []), journal(character, `Bought ${listing.name}`, message)],
    }),
  };
}

export function sellProperty(character: CharacterProfile, propertyId: string): AssetTransactionResult {
  const properties = rawProperties(character);
  const index = properties.findIndex(
    (entry) => isValidOwnedProperty(entry) && entry.id === propertyId
  );
  if (index < 0) return fail(character, 'You do not own that property.');

  const property = properties[index] as OwnedProperty;
  const sellingFee = Math.round(property.marketValue * PROPERTY_SALE_FEE_RATE);
  const mortgagePrincipal = property.mortgage?.principal ?? 0;
  const cashProceeds = property.marketValue - sellingFee - mortgagePrincipal;
  if (cashProceeds < 0) {
    return fail(character, 'The sale proceeds would not cover the mortgage.');
  }

  const realizedProfit = property.marketValue - sellingFee - property.purchasePrice;
  const nextProperties = properties.slice();
  nextProperties.splice(index, 1);
  const cash = finiteNumber(character.cash) ? character.cash : 0;
  const profitText =
    realizedProfit >= 0
      ? `a gain of $${realizedProfit.toLocaleString()}`
      : `a loss of $${Math.abs(realizedProfit).toLocaleString()}`;

  return {
    ok: true,
    realizedProfit,
    character: stampPlayerNetWorth({
      ...character,
      cash: cash + cashProceeds,
      assets: portfolioWith(nextProperties),
      timeline: [
        ...(character.timeline ?? []),
        journal(
          character,
          `Sold ${property.name}`,
          `You sold ${property.name} for $${property.marketValue.toLocaleString()} before a $${sellingFee.toLocaleString()} fee. After settling the mortgage, you received $${cashProceeds.toLocaleString()} (${profitText} against the purchase price).`
        ),
      ],
    }),
  };
}

function payFromPool(pool: number, due: number): { pool: number; paid: number } {
  const payable = Math.max(0, due);
  const paid = Math.min(pool, payable);
  return { pool: pool - paid, paid };
}

/**
 * Appreciates valid homes and settles interest, maintenance, then principal.
 * Does not change `character.cash`. The caller applies `cashSpent` once.
 */
export function progressPropertiesForYear(
  character: CharacterProfile,
  incomingCash: number
): PropertyYearProgress {
  const stored = character.assets?.properties;
  if (!Array.isArray(stored)) {
    return { properties: [], cashSpent: 0 };
  }

  const cashOnHand = finiteNumber(character.cash) ? Math.max(0, character.cash) : 0;
  const incoming = finiteNumber(incomingCash) ? Math.max(0, incomingCash) : 0;
  let pool = cashOnHand + incoming;

  const next = stored.map((entry) => {
    if (!isValidOwnedProperty(entry)) return entry;
    return {
      ...entry,
      marketValue: Math.round(entry.marketValue * (1 + PROPERTY_APPRECIATION_RATE)),
      mortgage: entry.mortgage ? { ...entry.mortgage } : null,
    };
  });

  for (const entry of next) {
    if (!isValidOwnedProperty(entry) || !entry.mortgage || entry.mortgage.principal <= 0) continue;
    const due = Math.round(entry.mortgage.principal * entry.mortgage.annualInterestRate);
    const payment = payFromPool(pool, due);
    pool = payment.pool;
    const unpaid = due - payment.paid;
    if (unpaid > 0) entry.mortgage.principal += unpaid;
  }

  for (const entry of next) {
    if (!isValidOwnedProperty(entry)) continue;
    const due = getPropertyListing(entry.catalogId)?.annualMaintenance ?? 0;
    const payment = payFromPool(pool, due);
    pool = payment.pool;
  }

  for (const entry of next) {
    if (!isValidOwnedProperty(entry) || !entry.mortgage || entry.mortgage.principal <= 0) continue;
    const due = Math.min(entry.mortgage.principal, entry.mortgage.annualPrincipalPayment);
    const payment = payFromPool(pool, due);
    pool = payment.pool;
    entry.mortgage.principal -= payment.paid;
  }

  return { properties: next, cashSpent: cashOnHand + incoming - pool };
}
