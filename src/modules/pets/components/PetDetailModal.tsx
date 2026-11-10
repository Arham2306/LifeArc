import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Badge } from '../../../components/ui/Badge';
import { getPetListing } from '../data/petCatalog';
import { petIllustration } from '../data/petIllustrations';
import { VET_PRICE } from '../services/petService';
import type { PetRecord } from '../types';
import { PetArtwork } from './PetArtwork';
import { money, petYears, spendableCash } from './petDisplay';

interface PetDetailModalProps {
  pet: PetRecord;
  age: number;
  cash: number;
  error: string | null;
  onClose: () => void;
  onFeed: () => void;
  onPlay: () => void;
  onVet: () => void;
  onAskRehome: () => void;
}

export const PetDetailModal: React.FC<PetDetailModalProps> = ({
  pet,
  age,
  cash,
  error,
  onClose,
  onFeed,
  onPlay,
  onVet,
  onAskRehome,
}) => {
  const listing = getPetListing(pet.species);
  const onHand = spendableCash(cash);
  const foodPrice = listing?.foodPrice ?? 0;
  const fed = pet.lastFedAge === age;
  const played = pet.lastPlayedAge === age;
  const feedReason = fed
    ? 'You already fed them this year.'
    : onHand < foodPrice
      ? `Not enough cash. Food costs ${money(foodPrice)}. You have ${money(onHand)}.`
      : null;
  const playReason = played ? 'You already played with them this year.' : null;
  const eligible = !!listing && (pet.petAge >= listing.frailAge || pet.health < 50);
  const vetReason = pet.lastVetAge === age
    ? 'Already seen the vet this year.'
    : !eligible
      ? 'Vet care becomes available when your pet is older or needs medical attention.'
      : onHand < VET_PRICE
        ? `Vet care costs ${money(VET_PRICE)}. You have ${money(onHand)}. You are ${money(VET_PRICE - onHand)} short.`
        : null;

  return (
    <Modal
      isOpen
      title={pet.name}
      onClose={onClose}
      actions={
        <>
          <CartoonButton variant="rose" fullWidth onClick={onAskRehome}>
            Rehome
          </CartoonButton>
          <CartoonButton variant="slate" fullWidth onClick={onClose}>
            Close
          </CartoonButton>
        </>
      }
    >
      <PetArtwork
        src={petIllustration(pet.species)}
        name={pet.name}
        className="h-28 w-full rounded-2xl border-2 border-slate-900"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="emerald" size="xs">Living</Badge>
        <Badge variant="sky" size="xs">{listing?.name ?? 'Pet'}</Badge>
        <Badge variant="slate" size="xs">{petYears(pet.petAge)}</Badge>
      </div>
      <Meter label="Health" value={pet.health} color={pet.health < 50 ? 'rose' : 'emerald'} />
      <Meter label="Attachment" value={pet.attachment} color="amber" />
      <p className="break-words text-[13px] font-bold leading-relaxed text-slate-700">{pet.lastMoment}</p>

      <section className="flex flex-col gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black text-slate-950">Feed</h3>
          <span className="font-mono text-xs font-black text-slate-950">{money(foodPrice)}</span>
        </div>
        <p className="text-[11px] font-bold leading-relaxed text-slate-600">
          Health +8. Attachment +2. Once this year.
        </p>
        <p className="text-[12px] font-bold leading-relaxed text-slate-800">
          Feed now for health and attachment benefits. If you skip it, Age Up can still purchase the same food when you have enough cash, but without these bonuses.
        </p>
        <CartoonButton variant="emerald" fullWidth disabled={feedReason !== null} onClick={onFeed}>
          Feed for {money(foodPrice)}
        </CartoonButton>
        {feedReason ? <p className="text-[12px] font-black text-rose-800">{feedReason}</p> : null}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border-2 border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black text-slate-950">Play</h3>
          <span className="text-xs font-black text-emerald-800">Free</span>
        </div>
        <p className="text-[11px] font-bold leading-relaxed text-slate-600">
          {listing ? `${listing.playActivity}. ` : ''}Attachment rises. Happiness +2. Once this year.
        </p>
        <CartoonButton variant="sky" fullWidth disabled={playReason !== null} onClick={onPlay}>
          Play
        </CartoonButton>
        {playReason ? <p className="text-[12px] font-black text-rose-800">{playReason}</p> : null}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border-2 border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black text-slate-950">Vet</h3>
          <span className="font-mono text-xs font-black text-slate-950">{money(VET_PRICE)}</span>
        </div>
        <p className="text-[11px] font-bold leading-relaxed text-slate-600">
          Opens at pet age {listing?.frailAge ?? '—'}, or when health is below 50. Health becomes 80. Attachment +2. Once this year.
        </p>
        <CartoonButton variant="amber" fullWidth disabled={vetReason !== null} onClick={onVet}>
          Vet for {money(VET_PRICE)}
        </CartoonButton>
        {vetReason ? <p className="text-[12px] font-black text-rose-800">{vetReason}</p> : null}
      </section>
      {error ? <p className="text-[12px] font-black text-rose-800">{error}</p> : null}
    </Modal>
  );
};

const Meter: React.FC<{ label: string; value: number; color: 'emerald' | 'amber' | 'rose' }> = ({
  label,
  value,
  color,
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
    <ProgressBar value={value} color={color} size="sm" />
  </div>
);
