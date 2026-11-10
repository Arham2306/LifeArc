import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Modal } from '../../../components/ui/Modal';
import type { HobbyRecord, OwnedPossession, PossessionListing } from '../types';
import { resaleValue } from '../services/lifestyleService';
import { LifestyleArtwork } from './LifestyleArtwork';

function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

interface LifestyleDetailModalProps {
  listing: PossessionListing | null;
  owned: OwnedPossession | null;
  imageSrc: string | null;
  cash: number;
  starter: OwnedPossession | null;
  hobby: HobbyRecord | null;
  error: string | null;
  scene: string | null;
  actionsDisabled: boolean;
  confirmingSale: boolean;
  usedThisYear: boolean;
  alreadyOwned: boolean;
  mode: 'listing' | 'owned' | 'activity';
  onClose: () => void;
  onBuy: () => void;
  onReplace: () => void;
  onStartSale: () => void;
  onCancelSale: () => void;
  onConfirmSale: () => void;
  onRead: () => void;
  onPlay: () => void;
  onPractice: () => void;
}

export const LifestyleDetailModal: React.FC<LifestyleDetailModalProps> = ({
  listing,
  owned,
  imageSrc,
  cash,
  starter,
  hobby,
  error,
  scene,
  actionsDisabled,
  confirmingSale,
  usedThisYear,
  alreadyOwned,
  mode,
  onClose,
  onBuy,
  onReplace,
  onStartSale,
  onCancelSale,
  onConfirmSale,
  onRead,
  onPlay,
  onPractice,
}) => {
  if (!listing) return null;
  const credit = starter ? resaleValue(starter.purchasePrice) : 0;
  const netDue = listing.price - credit;
  const replacing = mode === 'listing' && listing.replaces !== null && starter !== null;
  const due = replacing ? netDue : listing.price;
  const cashOnHand = Number.isFinite(cash) && cash > 0 ? cash : 0;
  const unaffordable = cashOnHand < due;
  const purchaseDisabled = actionsDisabled || unaffordable;

  const activityLabel = listing.hobby === 'gaming'
    ? 'Play'
    : listing.hobby === 'music'
      ? 'Practice'
      : 'Read';

  const actions = scene ? (
    <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
  ) : confirmingSale ? (
    <>
      <CartoonButton variant="rose" fullWidth disabled={actionsDisabled} onClick={onConfirmSale}>
        Confirm sale for {money(resaleValue(owned?.purchasePrice ?? 0))}
      </CartoonButton>
      <CartoonButton variant="white" fullWidth disabled={actionsDisabled} onClick={onCancelSale}>
        Cancel
      </CartoonButton>
    </>
  ) : usedThisYear && listing.kind === 'durable' && mode !== 'listing' ? (
    <>
      <CartoonButton variant="white" fullWidth disabled={actionsDisabled} onClick={onStartSale}>
        Sell
      </CartoonButton>
      <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
    </>
  ) : mode === 'activity' || (mode === 'owned' && listing.kind === 'consumable' && owned?.status === 'owned') ? (
    <>
      <CartoonButton
        variant="emerald"
        fullWidth
        disabled={actionsDisabled}
        onClick={listing.kind === 'consumable' ? onRead : listing.hobby === 'music' ? onPractice : onPlay}
      >
        {activityLabel}
      </CartoonButton>
      <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
    </>
  ) : mode === 'owned' && listing.kind === 'durable' ? (
    <>
      <CartoonButton
        variant="emerald"
        fullWidth
        disabled={actionsDisabled}
        onClick={listing.hobby === 'music' ? onPractice : onPlay}
      >
        {activityLabel}
      </CartoonButton>
      <CartoonButton variant="white" fullWidth disabled={actionsDisabled} onClick={onStartSale}>
        Sell
      </CartoonButton>
      <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
    </>
  ) : mode === 'listing' && alreadyOwned ? (
    <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
  ) : mode === 'listing' && replacing ? (
    <>
      <CartoonButton variant="sky" fullWidth disabled={purchaseDisabled} onClick={onReplace}>
        Replace for {money(due)}
      </CartoonButton>
      <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
    </>
  ) : mode === 'listing' ? (
    <>
      <CartoonButton variant="emerald" fullWidth disabled={purchaseDisabled} onClick={onBuy}>
        Buy for {money(listing.price)}
      </CartoonButton>
      <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
    </>
  ) : (
    <CartoonButton variant="slate" fullWidth onClick={onClose}>Close</CartoonButton>
  );

  return (
    <Modal isOpen title={listing.name} onClose={onClose} maxWidth="lg" actions={actions}>
      <LifestyleArtwork
        src={imageSrc}
        name={listing.name}
        className="h-44 w-full rounded-2xl border-2 border-slate-900"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {listing.tier ? (
          <Badge variant={listing.tier === 'upgrade' ? 'amber' : 'sky'} size="xs">
            {listing.tier === 'upgrade' ? 'Upgrade' : 'Starter'}
          </Badge>
        ) : (
          <Badge variant="emerald" size="xs">Book</Badge>
        )}
        {owned?.status === 'read' ? <Badge variant="slate" size="xs">Finished</Badge> : null}
        {hobby ? <Badge variant="sky" size="xs">Level {hobby.level}</Badge> : null}
      </div>
      <p className="text-[13px] font-bold leading-relaxed text-slate-700">{listing.description}</p>
      <p className="text-[12px] font-bold leading-relaxed text-slate-500">{listing.purpose}</p>

      {alreadyOwned && mode === 'listing' ? (
        <p className="text-[12px] font-black text-slate-600">This is already on your shelf.</p>
      ) : null}
      {usedThisYear && !scene ? (
        <p className="text-[12px] font-black text-slate-500">Used this year. You can come back after you age up.</p>
      ) : null}
      {scene ? (
        <div className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-3 py-3 text-[13px] font-bold leading-relaxed text-emerald-950">
          {scene}
        </div>
      ) : null}

      {mode === 'listing' ? (
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-black text-slate-950">
            <span>{replacing ? 'Due today' : 'Price'}</span>
            <span className={`font-mono ${unaffordable ? 'text-rose-700' : 'text-slate-950'}`}>{money(due)}</span>
          </div>
          {replacing && starter ? (
            <>
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Upgrade price</span>
                <span className="font-mono">{money(listing.price)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Resale of what you own</span>
                <span className="font-mono">{money(credit)}</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500">Your hobby level stays the same.</p>
            </>
          ) : null}
          <p className="text-[11px] font-bold text-slate-500">You have {money(cashOnHand)} cash.</p>
          {unaffordable ? (
            <p className="text-[12px] font-black text-rose-800">
              Not enough cash for {money(due)}.
            </p>
          ) : null}
        </div>
      ) : owned ? (
        <dl className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
          <div>
            <dt>Bought at age</dt>
            <dd className="font-mono text-slate-950">{owned.purchaseAge}</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd className="font-mono text-slate-950">{money(owned.purchasePrice)}</dd>
          </div>
          {listing.kind === 'durable' ? (
            <div>
              <dt>Resale</dt>
              <dd className="font-mono text-slate-950">{money(resaleValue(owned.purchasePrice))}</dd>
            </div>
          ) : (
            <div>
              <dt>Status</dt>
              <dd className="text-slate-950">{owned.status === 'read' ? 'Finished' : 'Unread'}</dd>
            </div>
          )}
        </dl>
      ) : null}

      {error ? (
        <div className="rounded-xl border-2 border-rose-700 bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-900">
          {error}
        </div>
      ) : null}
    </Modal>
  );
};
