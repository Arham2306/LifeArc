import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, PawPrint } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { ActionOutcomeModal, type CustomStatDelta } from '../../../components/ui/ActionOutcomeModal';
import type { CharacterProfile, StatEffects } from '../../../types/game';
import { PET_CATALOG, getPetListing } from '../data/petCatalog';
import { petIllustration } from '../data/petIllustrations';
import { SPECIES_BLURB } from '../data/speciesCopy';
import {
  LIVING_PET_CAP,
  PET_ADOPT_AGE,
  adoptPet,
  feedPet,
  isValidPet,
  livingPets,
  playWithPet,
  rehomePet,
  validPets,
  visitVet,
} from '../services/petService';
import type { PetRecord, PetTemperament } from '../types';
import { AdoptionModal } from './AdoptionModal';
import { PetArtwork } from './PetArtwork';
import { PetDetailModal } from './PetDetailModal';
import { money, petYears, spendableCash } from './petDisplay';

interface PetsScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onBackToMenu: () => void;
}

interface Outcome {
  title: string;
  message: string;
  statEffects?: StatEffects;
  customDeltas?: CustomStatDelta[];
}

export const PetsScreen: React.FC<PetsScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
}) => {
  const [shelterOpen, setShelterOpen] = useState(false);
  const [openPetId, setOpenPetId] = useState<string | null>(null);
  const [adoptSpecies, setAdoptSpecies] = useState<string | null>(null);
  const [rehomeOpen, setRehomeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    lock.current = false;
  }, [character]);

  const living = livingPets(character);
  const remembered = validPets(character).filter((pet) => pet.status !== 'living');
  const householdFull = living.length >= LIVING_PET_CAP;
  const underAge = character.age < PET_ADOPT_AGE;
  const stored = character.pets?.animals;
  const malformedCount = Array.isArray(stored) ? stored.filter((entry) => !isValidPet(entry)).length : 0;
  const selected = living.find((pet) => pet.id === openPetId) ?? null;
  const quiet = living.length === 0 && remembered.length === 0;

  const run = (
    task: () => { ok: boolean; character: CharacterProfile; reason?: string },
    onSuccess: (next: CharacterProfile) => void,
  ) => {
    if (lock.current) return;
    lock.current = true;
    const result = task();
    if (!result.ok) {
      lock.current = false;
      setError(result.reason ?? 'That did not go through.');
      return;
    }
    setError(null);
    onUpdateCharacter(result.character);
    onSuccess(result.character);
  };

  const statChanges = (before: CharacterProfile, after: CharacterProfile): StatEffects => {
    const effects: StatEffects = {};
    if (after.cash !== before.cash) effects.cash = after.cash - before.cash;
    if (after.stats.happiness !== before.stats.happiness) {
      effects.happiness = after.stats.happiness - before.stats.happiness;
    }
    return effects;
  };

  const careDeltas = (before: PetRecord, after: PetRecord | undefined): CustomStatDelta[] => {
    if (!after) return [];
    const rows: CustomStatDelta[] = [];
    if (after.health !== before.health) {
      rows.push({
        label: 'Health',
        delta: after.health - before.health,
        color: after.health >= before.health ? 'emerald' : 'rose',
      });
    }
    if (after.attachment !== before.attachment) {
      rows.push({
        label: 'Attachment',
        delta: after.attachment - before.attachment,
        color: after.attachment >= before.attachment ? 'amber' : 'rose',
      });
    }
    return rows;
  };

  return (
    <div className="p-4 flex flex-col gap-4 bg-white min-h-[480px]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={shelterOpen ? () => setShelterOpen(false) : onBackToMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
          <span>{shelterOpen ? 'Pets' : 'Menu'}</span>
        </button>
        <span className="text-xs font-black text-slate-800">{shelterOpen ? 'Shelter' : 'Pets'}</span>
      </div>

      <div className="rounded-2xl border-2 border-slate-900 bg-amber-50 p-3.5 shadow-[2px_3px_0_#0f172a] flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wide text-amber-900">Cash to spend</div>
          <div className="text-lg font-black font-mono text-slate-950">{money(spendableCash(character.cash))}</div>
        </div>
        <p className="max-w-[11rem] text-right text-[10px] font-bold leading-snug text-amber-950/80">
          Two living companions. Food is paid from cash, not the bank.
        </p>
      </div>

      {malformedCount > 0 ? (
        <p className="text-[10px] font-bold text-amber-800">
          {malformedCount} saved record{malformedCount === 1 ? '' : 's'} could not be read and
          {malformedCount === 1 ? ' was' : ' were'} left unchanged.
        </p>
      ) : null}

      {shelterOpen ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-black text-slate-950">At the shelter</h2>
          {householdFull ? (
            <p className="text-[12px] font-black text-rose-800">Your home already has two pets.</p>
          ) : null}
          {PET_CATALOG.map((listing) => (
            <button
              key={listing.id}
              type="button"
              onClick={() => {
                setError(null);
                setAdoptSpecies(listing.id);
              }}
              className="w-full text-left rounded-2xl border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a] overflow-hidden flex cursor-pointer hover:bg-amber-50/70 transition-colors"
            >
              <PetArtwork
                src={petIllustration(listing.id)}
                name={listing.name}
                loading="lazy"
                className="w-28 h-[4.75rem] flex-shrink-0 border-r-2 border-slate-900"
              />
              <div className="flex-1 min-w-0 p-2.5 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-black text-slate-950">{listing.name}</span>
                  <span className="font-mono text-xs font-black text-slate-950">{money(listing.adoptionPrice)}</span>
                </div>
                <p className="text-[10px] font-bold leading-snug text-slate-500">{SPECIES_BLURB[listing.id]}</p>
                <p className="text-[10px] font-black text-slate-400">
                  Food {money(listing.foodPrice)} · {listing.lifespan} years · frail at {listing.frailAge}
                </p>
              </div>
            </button>
          ))}
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-black text-slate-950">Living companions</h2>
              <span className="text-[10px] font-black text-slate-400">{living.length}/{LIVING_PET_CAP}</span>
            </div>
            {living.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-amber-50/50 px-3 py-4">
                <p className="text-[13px] font-black text-slate-800">
                  {quiet ? 'The house is quiet. The shelter is open.' : 'No one is waiting at home right now.'}
                </p>
              </div>
            ) : (
              living.map((pet) => {
                const listing = getPetListing(pet.species);
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => {
                      setError(null);
                      setOpenPetId(pet.id);
                    }}
                    className="w-full text-left rounded-2xl border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a] overflow-hidden flex cursor-pointer hover:bg-amber-50/70 transition-colors"
                  >
                    <PetArtwork
                      src={petIllustration(pet.species)}
                      name={pet.name}
                      loading="lazy"
                      className="w-28 h-[5.5rem] flex-shrink-0 border-r-2 border-slate-900"
                    />
                    <div className="flex-1 min-w-0 p-2.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-slate-950">{pet.name}</span>
                        <Badge variant="emerald" size="xs">Living</Badge>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {listing?.name ?? 'Pet'} · {petYears(pet.petAge)}
                      </span>
                      <span className="text-[10px] font-black text-slate-600">
                        Health {pet.health} · Attachment {pet.attachment}
                      </span>
                      <span className="line-clamp-2 break-words text-[10px] font-bold leading-snug text-slate-500">
                        {pet.lastMoment}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
            <CartoonButton
              variant="amber"
              fullWidth
              disabled={householdFull || underAge}
              onClick={() => setShelterOpen(true)}
              icon={<PawPrint className="h-4 w-4" />}
            >
              Visit the shelter
            </CartoonButton>
            {householdFull ? (
              <p className="text-[12px] font-black text-rose-800">Your home already has two pets.</p>
            ) : null}
            {underAge ? (
              <p className="text-[12px] font-black text-rose-800">You can adopt a pet from age 16.</p>
            ) : null}
          </section>

          {remembered.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-black text-slate-950">Remembered</h2>
              {remembered.map((pet) => {
                const listing = getPetListing(pet.species);
                const memorial = pet.status === 'memorial';
                return (
                  <article
                    key={pet.id}
                    className={`rounded-2xl border-2 overflow-hidden flex ${
                      memorial ? 'border-rose-900/40 bg-rose-50/40' : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <PetArtwork
                      src={petIllustration(pet.species)}
                      name={pet.name}
                      muted
                      loading="lazy"
                      className="w-24 h-[5.25rem] flex-shrink-0 border-r-2 border-slate-200"
                    />
                    <div className="flex-1 min-w-0 p-2.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-slate-800">{pet.name}</span>
                        <Badge variant={memorial ? 'rose' : 'slate'} size="xs">
                          {memorial ? 'Memorial' : 'Rehomed'}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {listing?.name ?? 'Pet'} · final age {pet.petAge}
                      </span>
                      <span className="line-clamp-3 break-words text-[10px] font-bold leading-snug text-slate-600">
                        {pet.closingLine}
                      </span>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}
        </>
      )}

      {selected ? (
        <PetDetailModal
          pet={selected}
          age={character.age}
          cash={character.cash}
          error={rehomeOpen ? null : error}
          onClose={() => {
            setOpenPetId(null);
            setError(null);
          }}
          onFeed={() => {
            const before = selected;
            run(() => feedPet(character, before.id), (next) => {
              const after = validPets(next).find((pet) => pet.id === before.id);
              setOutcome({
                title: `Fed ${before.name}`,
                message: after?.lastMoment ?? before.lastMoment,
                statEffects: statChanges(character, next),
                customDeltas: careDeltas(before, after),
              });
            });
          }}
          onPlay={() => {
            const before = selected;
            run(() => playWithPet(character, before.id), (next) => {
              const after = validPets(next).find((pet) => pet.id === before.id);
              setOutcome({
                title: `Played with ${before.name}`,
                message: after?.lastMoment ?? before.lastMoment,
                statEffects: statChanges(character, next),
                customDeltas: careDeltas(before, after),
              });
            });
          }}
          onVet={() => {
            const before = selected;
            run(() => visitVet(character, before.id), (next) => {
              const after = validPets(next).find((pet) => pet.id === before.id);
              setOutcome({
                title: `Vet visit for ${before.name}`,
                message: after?.lastMoment ?? before.lastMoment,
                statEffects: statChanges(character, next),
                customDeltas: careDeltas(before, after),
              });
            });
          }}
          onAskRehome={() => {
            setError(null);
            setRehomeOpen(true);
          }}
        />
      ) : null}

      {adoptSpecies ? (
        <AdoptionModal
          key={adoptSpecies}
          speciesId={adoptSpecies}
          cash={character.cash}
          householdFull={householdFull}
          underAge={underAge}
          error={error}
          onClose={() => {
            setAdoptSpecies(null);
            setError(null);
          }}
          onConfirm={(name, temperament: PetTemperament) => {
            const previous = new Set(living.map((pet) => pet.id));
            run(() => adoptPet(character, adoptSpecies, temperament, name), (next) => {
              const created = livingPets(next).find((pet) => !previous.has(pet.id));
              setAdoptSpecies(null);
              setShelterOpen(false);
              setOutcome({
                title: created ? `${created.name} came home` : 'Adoption',
                message: created?.lastMoment ?? 'You brought them home from the shelter.',
                statEffects: statChanges(character, next),
              });
            });
          }}
        />
      ) : null}

      {selected && rehomeOpen ? (
        <ConfirmModal
          isOpen
          title={`Find ${selected.name} another home`}
          message={`${selected.name} will leave the household. They stay in Remembered, with the memory you have now.`}
          warningCallout={{
            title: 'This happens once',
            message: 'Your happiness decreases by 6. The living spot opens, and they cannot come back.',
            variant: 'rose',
          }}
          confirmLabel="Rehome"
          confirmVariant="rose"
          cancelLabel="Cancel"
          onClose={() => setRehomeOpen(false)}
          onConfirm={() => {
            const before = selected;
            setRehomeOpen(false);
            run(() => rehomePet(character, before.id), (next) => {
              const entry = next.timeline[next.timeline.length - 1];
              setOpenPetId(null);
              setOutcome({
                title: `Found ${before.name} another home`,
                message: entry?.category === 'relationship' ? entry.message : `You found ${before.name} another home.`,
                statEffects: statChanges(character, next),
              });
            });
          }}
        />
      ) : null}

      {outcome ? (
        <ActionOutcomeModal
          isOpen
          title={outcome.title}
          message={outcome.message}
          statEffects={outcome.statEffects}
          customDeltas={outcome.customDeltas}
          onClose={() => setOutcome(null)}
        />
      ) : null}
    </div>
  );
};
