import {
  MORTGAGE_ANNUAL_INTEREST_RATE,
  PROPERTY_DOWN_PAYMENT_RATE,
  scheduledAnnualPrincipal,
} from '../services/assetService';
import type { PropertyMortgage } from '../types';

/** Down payment stored by `purchaseProperty`. */
export function mortgageDownPayment(purchasePrice: number): number {
  return Math.round(purchasePrice * PROPERTY_DOWN_PAYMENT_RATE);
}

/**
 * The mortgage `purchaseProperty` writes at origination.
 * `scheduledAnnualPrincipal` receives the original principal, not a later balance.
 */
export function openingMortgage(purchasePrice: number): PropertyMortgage {
  const originalPrincipal = purchasePrice - mortgageDownPayment(purchasePrice);
  return {
    originalPrincipal,
    principal: originalPrincipal,
    annualInterestRate: MORTGAGE_ANNUAL_INTEREST_RATE,
    annualPrincipalPayment: scheduledAnnualPrincipal(originalPrincipal),
  };
}

/**
 * Interest and principal `progressPropertiesForYear` charges when the pool covers both.
 * Interest uses the current principal and the saved rate.
 * Principal is the saved annual amount, capped at the remaining principal.
 */
export function ageUpMortgageObligations(mortgage: PropertyMortgage): {
  annualInterest: number;
  annualPrincipal: number;
} {
  return {
    annualInterest: Math.round(mortgage.principal * mortgage.annualInterestRate),
    annualPrincipal: Math.min(mortgage.principal, mortgage.annualPrincipalPayment),
  };
}
