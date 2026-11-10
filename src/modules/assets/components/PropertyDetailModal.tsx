import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Modal } from '../../../components/ui/Modal';
import {
  PROPERTY_APPRECIATION_RATE,
  PROPERTY_SALE_FEE_RATE,
} from '../services/assetService';
import type { OwnedProperty, PropertyListing, PropertyType } from '../types';
import { PropertyArtwork } from './PropertyArtwork';
import {
  ageUpMortgageObligations,
  mortgageDownPayment,
  openingMortgage,
} from './mortgageObligations';

const TYPE_LABEL: Record<PropertyType, string> = {
  studio: 'Studio',
  condo: 'Condo',
  house: 'House',
  luxury_house: 'Luxury house',
};

function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

interface PropertyDetailModalProps {
  listing: PropertyListing | null;
  owned: OwnedProperty | null;
  imageSrc: string | null;
  cash: number;
  error: string | null;
  actionsDisabled: boolean;
  confirmingSale: boolean;
  onClose: () => void;
  onPurchase: (financing: 'cash' | 'mortgage') => void;
  onStartSale: () => void;
  onCancelSale: () => void;
  onConfirmSale: () => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  listing,
  owned,
  imageSrc,
  cash,
  error,
  actionsDisabled,
  confirmingSale,
  onClose,
  onPurchase,
  onStartSale,
  onCancelSale,
  onConfirmSale,
}) => {
  if (!listing) return null;
  const name = owned?.name ?? listing.name;
  const city = owned?.city ?? listing.city;
  const typeLabel = TYPE_LABEL[owned?.type ?? listing.type];
  const mortgage = owned?.mortgage ?? null;
  const obligations = ageUpMortgageObligations(mortgage ?? openingMortgage(listing.purchasePrice));
  const downPayment = mortgageDownPayment(listing.purchasePrice);
  const appreciation = Math.round(PROPERTY_APPRECIATION_RATE * 100);
  const saleFee = Math.round(PROPERTY_SALE_FEE_RATE * 100);

  const actions = owned ? (
    confirmingSale ? (
      <>
        <CartoonButton variant="rose" fullWidth disabled={actionsDisabled} onClick={onConfirmSale}>
          Confirm sale
        </CartoonButton>
        <CartoonButton variant="white" fullWidth disabled={actionsDisabled} onClick={onCancelSale}>
          Cancel
        </CartoonButton>
      </>
    ) : (
      <CartoonButton variant="white" fullWidth disabled={actionsDisabled} onClick={onStartSale}>
        Sell
      </CartoonButton>
    )
  ) : (
    <>
      <CartoonButton variant="emerald" fullWidth disabled={actionsDisabled} onClick={() => onPurchase('cash')}>
        Buy with cash
      </CartoonButton>
      <CartoonButton variant="sky" fullWidth disabled={actionsDisabled} onClick={() => onPurchase('mortgage')}>
        Buy with mortgage
      </CartoonButton>
    </>
  );

  return (
    <Modal isOpen title={name} onClose={onClose} maxWidth="lg" actions={
      <>
        {actions}
        <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
      </>
    }>
      <PropertyArtwork src={imageSrc} name={name} className="h-40 w-full rounded-2xl border-2 border-slate-900" />
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-slate-500">{city}</span>
        <Badge variant="sky" size="xs">{typeLabel}</Badge>
      </div>

      {owned ? (
        <dl className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
          <div>
            <dt>Purchase price</dt>
            <dd className="font-mono text-slate-950">{money(owned.purchasePrice)}</dd>
          </div>
          <div>
            <dt>Bought at age</dt>
            <dd className="font-mono text-slate-950">{owned.purchaseAge}</dd>
          </div>
          <div>
            <dt>Current value</dt>
            <dd className="font-mono text-slate-950">{money(owned.marketValue)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className="text-slate-950">{mortgage && mortgage.principal > 0 ? 'Mortgage' : 'Owned outright'}</dd>
          </div>
          {mortgage ? (
            <div>
              <dt>Mortgage principal</dt>
              <dd className="font-mono text-slate-950">{money(mortgage.principal)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Annual upkeep</dt>
            <dd className="font-mono text-slate-950">{money(listing.annualMaintenance)}</dd>
          </div>
        </dl>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs font-black text-slate-950">
            <span>Purchase price</span>
            <span className="font-mono">{money(listing.purchasePrice)}</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Due today</p>
          <div className="rounded-xl border-2 border-slate-200 p-2.5 text-[11px] font-bold text-slate-700 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Cash purchase</span>
              <span className="font-mono text-slate-950">{money(listing.purchasePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mortgage down payment</span>
              <span className="font-mono text-slate-950">{money(downPayment)}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500">
              The down payment is the only mortgage money due now. You have {money(cash)} cash.
            </p>
          </div>
        </>
      )}

      {!owned || (mortgage && mortgage.principal > 0) ? (
        <>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Each year afterward</p>
          <div className="rounded-xl border-2 border-slate-200 p-2.5 text-[11px] font-bold text-slate-700 flex flex-col gap-1">
            {!owned || mortgage ? (
              <>
                <div className="flex justify-between">
                  <span>Mortgage interest</span>
                  <span className="font-mono text-slate-950">{money(obligations.annualInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled principal</span>
                  <span className="font-mono text-slate-950">{money(obligations.annualPrincipal)}</span>
                </div>
              </>
            ) : null}
            <div className="flex justify-between">
              <span>Upkeep</span>
              <span className="font-mono text-slate-950">{money(listing.annualMaintenance)}</span>
            </div>
            {!owned ? (
              <p className="text-[10px] font-bold text-slate-500">
                Interest and principal are later mortgage obligations, not part of today's down payment. A cash purchase has no mortgage, but it still pays upkeep each year.
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-[11px] font-bold text-slate-600">
          No mortgage interest or principal is due. Upkeep remains {money(listing.annualMaintenance)} each year.
        </p>
      )}

      <p className="text-[10px] font-bold text-slate-500">
        Market value rises about {appreciation}% each Age Up. Selling costs {saleFee}% of the current market value and pays off any remaining principal.
      </p>
      {error ? (
        <div className="rounded-xl border-2 border-rose-700 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-900">
          {error}
        </div>
      ) : null}
    </Modal>
  );
};
