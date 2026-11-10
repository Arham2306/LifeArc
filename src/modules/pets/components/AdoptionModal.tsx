import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { CartoonInput } from '../../../components/ui/CartoonInput';
import { getPetListing } from '../data/petCatalog';
import { petIllustration } from '../data/petIllustrations';
import { SPECIES_BLURB, TEMPERAMENT_CHOICES } from '../data/speciesCopy';
import type { PetTemperament } from '../types';
import { PetArtwork } from './PetArtwork';
import { money, spendableCash } from './petDisplay';

interface AdoptionModalProps {
  speciesId: string;
  cash: number;
  householdFull: boolean;
  underAge: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (name: string, temperament: PetTemperament) => void;
}

export const AdoptionModal: React.FC<AdoptionModalProps> = ({
  speciesId,
  cash,
  householdFull,
  underAge,
  error,
  onClose,
  onConfirm,
}) => {
  const listing = getPetListing(speciesId);
  const [name, setName] = useState('');
  const [temperament, setTemperament] = useState<PetTemperament | null>(null);
  if (!listing) return null;

  const onHand = spendableCash(cash);
  const named = name.trim() !== '';
  let reason: string | null = null;
  if (underAge) reason = 'You can adopt a pet from age 16.';
  else if (householdFull) reason = 'Your home already has two pets.';
  else if (!named) reason = 'Give your pet a name.';
  else if (!temperament) reason = 'Choose a temperament.';
  else if (onHand < listing.adoptionPrice) reason = 'You do not have enough cash.';

  return (
    <Modal
      isOpen
      title={`Bring home a ${listing.name.toLowerCase()}`}
      onClose={onClose}
      actions={
        <>
          <CartoonButton
            variant="emerald"
            fullWidth
            disabled={reason !== null}
            onClick={() => {
              if (!temperament || reason) return;
              onConfirm(name, temperament);
            }}
          >
            Adopt for {money(listing.adoptionPrice)}
          </CartoonButton>
          <CartoonButton variant="slate" fullWidth onClick={onClose}>
            Cancel
          </CartoonButton>
        </>
      }
    >
      <PetArtwork
        src={petIllustration(listing.id)}
        name={listing.name}
        className="h-32 w-full rounded-2xl border-2 border-slate-900"
      />
      <p className="text-[13px] font-bold leading-relaxed text-slate-700">{SPECIES_BLURB[listing.id]}</p>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-black text-slate-700">
        <Fact label="Adoption" value={money(listing.adoptionPrice)} />
        <Fact label="Food each year" value={money(listing.foodPrice)} />
        <Fact label="Lifespan" value={`${listing.lifespan} years`} />
        <Fact label="Frail age" value={`${listing.frailAge}`} />
      </div>
      <CartoonInput
        label="Name"
        value={name}
        maxLength={24}
        onChange={(event) => setName(event.target.value)}
        placeholder="A name they will keep"
      />
      <div className="flex flex-col gap-1.5">
        <span className="px-1 text-xs font-black text-slate-700">Temperament</span>
        <div className="grid grid-cols-1 gap-1.5">
          {TEMPERAMENT_CHOICES.map((choice) => {
            const selected = temperament === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => setTemperament(choice.id)}
                className={`rounded-xl border-2 px-3 py-2 text-left cursor-pointer ${
                  selected ? 'border-slate-900 bg-amber-100' : 'border-slate-300 bg-white'
                }`}
              >
                <span className="block text-xs font-black text-slate-950">{choice.label}</span>
                <span className="block text-[11px] font-bold text-slate-500">{choice.blurb}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[12px] font-bold text-slate-600">
        You have {money(onHand)} cash. Adoption is paid once, from cash. Food is a separate cost each year.
      </p>
      {reason ? <p className="text-[12px] font-black text-rose-800">{reason}</p> : null}
      {error ? <p className="text-[12px] font-black text-rose-800">{error}</p> : null}
    </Modal>
  );
};

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className="font-mono text-xs text-slate-950">{value}</div>
  </div>
);
