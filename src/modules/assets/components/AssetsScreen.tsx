import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import type { CharacterProfile } from '../../../types/game';
import { PROPERTY_CATALOG, getPropertyListing } from '../data/propertyCatalog';
import { propertyIllustration } from '../data/propertyIllustrations';
import {
  PROPERTY_PORTFOLIO_CAP,
  calculatePlayerNetWorth,
  isValidOwnedProperty,
  purchaseProperty,
  sellProperty,
  validProperties,
} from '../services/assetService';
import type { OwnedProperty, PropertyType } from '../types';
import { PropertyArtwork } from './PropertyArtwork';
import { PropertyDetailModal } from './PropertyDetailModal';
import { PropertyListingCard } from './PropertyListingCard';
import { createTransactionGuard } from './transactionGuard';

interface AssetsScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onBackToMenu: () => void;
}

type AssetSelection =
  | { kind: 'listing'; catalogId: string }
  | { kind: 'owned'; propertyId: string }
  | null;

const TYPE_LABEL: Record<PropertyType, string> = {
  studio: 'Studio',
  condo: 'Condo',
  house: 'House',
  luxury_house: 'Luxury house',
};

const TYPE_ORDER: PropertyType[] = ['studio', 'condo', 'house', 'luxury_house'];

function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export const AssetsScreen: React.FC<AssetsScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
}) => {
  const guardRef = useRef(createTransactionGuard());
  const [selection, setSelection] = useState<AssetSelection>(null);

  const selectionKey = selection === null
    ? ''
    : selection.kind === 'listing'
      ? `listing:${selection.catalogId}`
      : `owned:${selection.propertyId}`;

  useEffect(() => {
    guardRef.current.reset();
  }, [selectionKey]);

  const owned = validProperties(character);
  const stored = character.assets?.properties;
  const malformedCount = Array.isArray(stored)
    ? stored.filter((entry) => !isValidOwnedProperty(entry)).length
    : 0;
  const propertyValue = owned.reduce((sum, property) => sum + property.marketValue, 0);
  const mortgageBalance = owned.reduce(
    (sum, property) => sum + (property.mortgage?.principal ?? 0),
    0
  );

  const selectedOwned = selection?.kind === 'owned'
    ? owned.find((property) => property.id === selection.propertyId) ?? null
    : null;
  const selectedListing = selection?.kind === 'listing'
    ? getPropertyListing(selection.catalogId) ?? null
    : selectedOwned
      ? getPropertyListing(selectedOwned.catalogId) ?? null
      : null;

  const openSelection = (next: AssetSelection) => {
    setSelection(next);
  };

  return (
    <div className="p-4 flex flex-col gap-4 bg-white min-h-[480px]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
          <span>Menu</span>
        </button>
        <span className="text-xs font-black text-slate-800">Assets</span>
      </div>

      <div className="rounded-2xl border-2 border-slate-900 bg-sky-50 p-3.5 shadow-[2px_3px_0_#0f172a] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wide text-sky-900">Net worth</span>
          <span className="text-sm font-black font-mono text-emerald-800">
            {money(calculatePlayerNetWorth(character))}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-600">
          <div>
            <div>Cash</div>
            <div className="font-mono text-slate-950">{money(character.cash)}</div>
          </div>
          <div>
            <div>Property</div>
            <div className="font-mono text-slate-950">{money(propertyValue)}</div>
          </div>
          <div>
            <div>Mortgage</div>
            <div className="font-mono text-slate-950">{money(mortgageBalance)}</div>
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-500">
          {owned.length} of {PROPERTY_PORTFOLIO_CAP} homes
          {character.bankBalance ? ` • Bank ${money(character.bankBalance)}` : ''}
          {character.education.studentDebt > 0
            ? ` • Student debt ${money(character.education.studentDebt)}`
            : ''}
        </div>
      </div>

      {malformedCount > 0 && (
        <p className="text-[10px] font-bold text-amber-800">
          {malformedCount} saved record{malformedCount === 1 ? '' : 's'} could not be read and
          {malformedCount === 1 ? ' was' : ' were'} left unchanged.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-black text-slate-950">Your homes</h2>
        {owned.length === 0 ? (
          <p className="text-[11px] font-bold text-slate-500">You do not own a home yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {owned.map((property) => (
              <OwnedHomeCard
                key={property.id}
                property={property}
                onOpen={() => openSelection({ kind: 'owned', propertyId: property.id })}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black text-slate-950">Listings</h2>
        {TYPE_ORDER.map((type) => {
          const listings = PROPERTY_CATALOG.filter((listing) => listing.type === type);
          if (listings.length === 0) return null;
          return (
            <div key={type} className="flex flex-col gap-2">
              <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-500">{TYPE_LABEL[type]}</h3>
              {listings.map((listing) => (
                <PropertyListingCard
                  key={listing.id}
                  name={listing.name}
                  city={listing.city}
                  typeLabel={TYPE_LABEL[listing.type]}
                  price={money(listing.purchasePrice)}
                  upkeep={money(listing.annualMaintenance)}
                  imageSrc={propertyIllustration(listing.id)}
                  onOpen={() => openSelection({ kind: 'listing', catalogId: listing.id })}
                />
              ))}
            </div>
          );
        })}
      </section>

      {selection ? (
        <AssetDetailSession
          key={selectionKey}
          selection={selection}
          listing={selectedListing}
          owned={selectedOwned}
          character={character}
          guardRef={guardRef}
          onUpdateCharacter={onUpdateCharacter}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </div>
  );
};

const AssetDetailSession: React.FC<{
  selection: Exclude<AssetSelection, null>;
  listing: ReturnType<typeof getPropertyListing> | null;
  owned: OwnedProperty | null;
  character: CharacterProfile;
  guardRef: React.RefObject<ReturnType<typeof createTransactionGuard>>;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onClose: () => void;
}> = ({ selection, listing, owned, character, guardRef, onUpdateCharacter, onClose }) => {
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const [confirmingSale, setConfirmingSale] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const buy = (financing: 'cash' | 'mortgage') => {
    if (selection.kind !== 'listing') return;
    if (!guardRef.current.begin()) return;
    setActionsDisabled(true);
    const result = purchaseProperty(character, selection.catalogId, financing);
    if (!result.ok) {
      guardRef.current.fail();
      setActionsDisabled(false);
      setDetailError(result.reason ?? 'That purchase did not go through.');
      return;
    }
    guardRef.current.succeed();
    onUpdateCharacter(result.character);
    onClose();
  };

  const confirmSale = () => {
    if (selection.kind !== 'owned') return;
    if (!guardRef.current.begin()) return;
    setActionsDisabled(true);
    const result = sellProperty(character, selection.propertyId);
    if (!result.ok) {
      guardRef.current.fail();
      setActionsDisabled(false);
      setDetailError(result.reason ?? 'That sale did not go through.');
      return;
    }
    guardRef.current.succeed();
    onUpdateCharacter(result.character);
    onClose();
  };

  return (
    <PropertyDetailModal
      listing={listing ?? null}
      owned={owned}
      imageSrc={listing ? propertyIllustration(listing.id) : null}
      cash={character.cash}
      error={detailError}
      actionsDisabled={actionsDisabled}
      confirmingSale={confirmingSale}
      onClose={onClose}
      onPurchase={buy}
      onStartSale={() => setConfirmingSale(true)}
      onCancelSale={() => setConfirmingSale(false)}
      onConfirmSale={confirmSale}
    />
  );
};

const OwnedHomeCard: React.FC<{ property: OwnedProperty; onOpen: () => void }> = ({ property, onOpen }) => {
  const mortgaged = property.mortgage !== null && property.mortgage.principal > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-2xl border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a] overflow-hidden cursor-pointer hover:bg-sky-50/60"
    >
      <PropertyArtwork
        src={propertyIllustration(property.catalogId)}
        name={property.name}
        className="h-20 w-full border-b-2 border-slate-900"
      />
      <div className="p-2 flex flex-col gap-1">
        <span className="text-[11px] font-black text-slate-950 leading-tight">{property.name}</span>
        <span className="text-[10px] font-bold text-slate-500">{property.city}</span>
        <span className="text-[10px] font-mono font-bold text-slate-950">{money(property.marketValue)}</span>
        <Badge variant={mortgaged ? 'sky' : 'emerald'} size="xs">
          {mortgaged ? 'Mortgage' : 'Owned outright'}
        </Badge>
      </div>
    </button>
  );
};
