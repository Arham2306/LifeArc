import React, { useState } from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import type { CharacterProfile } from '../../../types/game';
import { PROPERTY_CATALOG } from '../data/propertyCatalog';
import {
  PROPERTY_PORTFOLIO_CAP,
  calculatePlayerNetWorth,
  isValidOwnedProperty,
  purchaseProperty,
  sellProperty,
  validProperties,
} from '../services/assetService';
import type { OwnedProperty } from '../types';

interface AssetsScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onBackToMenu: () => void;
}

function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export const AssetsScreen: React.FC<AssetsScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [saleTarget, setSaleTarget] = useState<OwnedProperty | null>(null);
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

  const buy = (catalogId: string, financing: 'cash' | 'mortgage') => {
    const result = purchaseProperty(character, catalogId, financing);
    if (!result.ok) {
      setNotice(result.reason ?? 'That purchase did not go through.');
      return;
    }
    setNotice(null);
    setSaleTarget(null);
    onUpdateCharacter(result.character);
  };

  const confirmSale = () => {
    if (!saleTarget) return;
    const result = sellProperty(character, saleTarget.id);
    if (!result.ok) {
      setNotice(result.reason ?? 'That sale did not go through.');
      return;
    }
    setNotice(null);
    setSaleTarget(null);
    onUpdateCharacter(result.character);
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

      {notice && (
        <div className="rounded-xl border-2 border-rose-700 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-900">
          {notice}
        </div>
      )}

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
          owned.map((property) => (
            <div
              key={property.id}
              className="rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[2px_2px_0_#0f172a] flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5" />
                    <span className="text-xs font-black text-slate-950">{property.name}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {property.city} • bought at age {property.purchaseAge}
                  </div>
                </div>
                <Badge variant="sky" size="xs">
                  {property.mortgage && property.mortgage.principal > 0 ? 'Mortgage' : 'Owned outright'}
                </Badge>
              </div>
              <div className="text-[10px] font-bold text-slate-600">
                Value {money(property.marketValue)}
                {property.mortgage
                  ? ` • Principal ${money(property.mortgage.principal)}`
                  : ''}
              </div>
              {saleTarget?.id === property.id ? (
                <div className="flex gap-2">
                  <CartoonButton size="sm" variant="rose" onClick={confirmSale}>
                    Confirm sale
                  </CartoonButton>
                  <CartoonButton size="sm" variant="white" onClick={() => setSaleTarget(null)}>
                    Cancel
                  </CartoonButton>
                </div>
              ) : (
                <CartoonButton size="sm" variant="white" onClick={() => setSaleTarget(property)}>
                  Sell
                </CartoonButton>
              )}
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-black text-slate-950">Listings</h2>
        {PROPERTY_CATALOG.map((listing) => {
          const down = Math.round(listing.purchasePrice * 0.2);
          return (
            <div
              key={listing.id}
              className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-slate-950">{listing.name}</div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {listing.city} • upkeep {money(listing.annualMaintenance)} / year
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-slate-950">
                  {money(listing.purchasePrice)}
                </span>
              </div>
              <div className="flex gap-2">
                <CartoonButton size="sm" variant="emerald" onClick={() => buy(listing.id, 'cash')}>
                  Cash
                </CartoonButton>
                <CartoonButton size="sm" variant="sky" onClick={() => buy(listing.id, 'mortgage')}>
                  Mortgage ({money(down)} down)
                </CartoonButton>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
