import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Gamepad2, Music2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import type { CharacterProfile } from '../../../types/game';
import { POSSESSION_CATALOG, getPossessionListing } from '../data/possessionCatalog';
import { lifestyleIllustration } from '../data/lifestyleIllustrations';
import {
  HOBBY_LEVEL_CAP,
  buyPossession,
  isValidPossession,
  playGame,
  practiceMusic,
  readBook,
  replaceEquipment,
  resaleValue,
  sellDurable,
  validHobbies,
  validPossessions,
} from '../services/lifestyleService';
import type { CatalogGroup, HobbyId, OwnedPossession, PossessionListing } from '../types';
import { LifestyleArtwork } from './LifestyleArtwork';
import { LifestyleDetailModal } from './LifestyleDetailModal';
import { createTransactionGuard } from './transactionGuard';

interface LifestyleScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onBackToMenu: () => void;
}

type LifestyleSelection =
  | { kind: 'listing'; catalogId: string }
  | { kind: 'owned'; possessionId: string }
  | { kind: 'activity'; possessionId: string }
  | null;

const MARKET_CATEGORIES: {
  id: CatalogGroup;
  label: string;
  blurb: string;
  previewId: string;
  iconBg: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'reading',
    label: 'Books',
    blurb: 'Stories and guides you can finish',
    previewId: 'book_short_stories',
    iconBg: 'bg-emerald-300',
    icon: <BookOpen className="w-4 h-4 stroke-[2.5]" />,
  },
  {
    id: 'electronics',
    label: 'Electronics',
    blurb: 'Computers for play',
    previewId: 'computer_home',
    iconBg: 'bg-sky-300',
    icon: <Gamepad2 className="w-4 h-4 stroke-[2.5]" />,
  },
  {
    id: 'music',
    label: 'Music',
    blurb: 'Keyboards and pianos',
    previewId: 'instrument_piano',
    iconBg: 'bg-amber-300',
    icon: <Music2 className="w-4 h-4 stroke-[2.5]" />,
  },
];

function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export const LifestyleScreen: React.FC<LifestyleScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
}) => {
  const guardRef = useRef(createTransactionGuard());
  const [selection, setSelection] = useState<LifestyleSelection>(null);
  const [marketGroup, setMarketGroup] = useState<CatalogGroup | null>(null);
  const owned = validPossessions(character);
  const hobbies = validHobbies(character);
  const stored = character.lifestyle?.possessions;
  const malformedCount = Array.isArray(stored)
    ? stored.filter((entry) => !isValidPossession(entry)).length
    : 0;

  const selectionKey = selection === null
    ? ''
    : selection.kind === 'listing'
      ? `listing:${selection.catalogId}`
      : `${selection.kind}:${selection.possessionId}`;

  useEffect(() => {
    guardRef.current.reset();
  }, [selectionKey]);

  const selectedOwned = selection && selection.kind !== 'listing'
    ? owned.find((item) => item.id === selection.possessionId) ?? null
    : null;
  const selectedListing = selection?.kind === 'listing'
    ? getPossessionListing(selection.catalogId)
    : selectedOwned
      ? getPossessionListing(selectedOwned.catalogId)
      : null;

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
        <span className="text-xs font-black text-slate-800">Lifestyle</span>
      </div>

      <div className="rounded-2xl border-2 border-slate-900 bg-amber-50 p-3.5 shadow-[2px_3px_0_#0f172a] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wide text-amber-900">Cash to spend</div>
          <div className="text-lg font-black font-mono text-slate-950">{money(character.cash)}</div>
        </div>
        <p className="max-w-[11rem] text-right text-[10px] font-bold leading-snug text-amber-950/80">
          Books, games, and music. These stay off your net worth.
        </p>
      </div>

      {malformedCount > 0 ? (
        <p className="text-[10px] font-bold text-amber-800">
          {malformedCount} saved record{malformedCount === 1 ? '' : 's'} could not be read and
          {malformedCount === 1 ? ' was' : ' were'} left unchanged.
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-black text-slate-950">Marketplace</h2>
        {marketGroup === null ? (
          <div className="flex flex-col gap-2">
            {MARKET_CATEGORIES.map((category) => {
              const listings = POSSESSION_CATALOG.filter((listing) => listing.group === category.id);
              const ownedCount = listings.filter((listing) => owned.some((item) => item.catalogId === listing.id)).length;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setMarketGroup(category.id)}
                  className="w-full text-left rounded-2xl border-2 border-slate-900 bg-white shadow-[2px_2.5px_0_#0f172a] overflow-hidden flex cursor-pointer hover:bg-amber-50/70 transition-colors"
                >
                  <LifestyleArtwork
                    src={lifestyleIllustration(category.previewId)}
                    name={category.label}
                    loading="lazy"
                    className="w-24 h-[4.5rem] flex-shrink-0 border-r-2 border-slate-900"
                  />
                  <div className="flex-1 min-w-0 p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-black text-slate-950">
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-900 ${category.iconBg}`}>
                          {category.icon}
                        </span>
                        {category.label}
                      </span>
                      <span className="mt-1 block text-[11px] font-bold text-slate-500">{category.blurb}</span>
                      <span className="mt-1 block text-[10px] font-black text-slate-400">
                        {listings.length} {listings.length === 1 ? 'item' : 'items'}
                        {ownedCount > 0 ? ` · ${ownedCount} owned` : ''}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 stroke-[3] text-slate-900" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <CategoryListings
            group={marketGroup}
            owned={owned}
            cash={character.cash}
            onBack={() => setMarketGroup(null)}
            onOpen={(catalogId) => setSelection({ kind: 'listing', catalogId })}
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-black text-slate-950">My possessions</h2>
        {owned.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-300 px-3 py-4 text-[11px] font-bold text-slate-500">
            Your shelf is empty. A book, a computer, or an instrument will wait here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {owned.map((item) => {
              const listing = getPossessionListing(item.catalogId);
              if (!listing) return null;
              return (
                <ShopCard
                  key={item.id}
                  listing={listing}
                  owned
                  affordable
                  status={item.status === 'read' ? 'Finished' : item.kind === 'durable' ? `Resale ${money(resaleValue(item.purchasePrice))}` : 'Unread'}
                  onOpen={() => setSelection({ kind: 'owned', possessionId: item.id })}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-black text-slate-950">Activities</h2>
        <ActivityList
          character={character}
          owned={owned}
          onOpen={(possessionId) => setSelection({ kind: 'activity', possessionId })}
        />
      </section>

      {selection ? (
        <LifestyleSession
          key={selectionKey}
          selection={selection}
          listing={selectedListing}
          owned={selectedOwned}
          character={character}
          hobbies={hobbies}
          ownedItems={owned}
          guardRef={guardRef}
          onUpdateCharacter={onUpdateCharacter}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </div>
  );
};

const CategoryListings: React.FC<{
  group: CatalogGroup;
  owned: OwnedPossession[];
  cash: number;
  onBack: () => void;
  onOpen: (catalogId: string) => void;
}> = ({ group, owned, cash, onBack, onOpen }) => {
  const category = MARKET_CATEGORIES.find((entry) => entry.id === group);
  const listings = POSSESSION_CATALOG.filter((listing) => listing.group === group);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
          <span>Categories</span>
        </button>
        <span className="text-xs font-black text-slate-800">{category?.label}</span>
      </div>
      {listings.map((listing) => {
        const already = owned.some((item) => item.catalogId === listing.id);
        const starter = listing.replaces
          ? owned.find((item) => item.catalogId === listing.replaces && item.status === 'owned')
          : undefined;
        const due = starter ? listing.price - resaleValue(starter.purchasePrice) : listing.price;
        return (
          <ShopCard
            key={listing.id}
            listing={listing}
            owned={already}
            affordable={cash >= due}
            onOpen={() => onOpen(listing.id)}
          />
        );
      })}
    </div>
  );
};

const ShopCard: React.FC<{
  listing: PossessionListing;
  owned: boolean;
  affordable: boolean;
  status?: string;
  onOpen: () => void;
}> = ({ listing, owned, affordable, status, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-full text-left rounded-2xl border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a] overflow-hidden flex cursor-pointer hover:bg-amber-50/70 transition-colors"
  >
    <LifestyleArtwork
      src={lifestyleIllustration(listing.id)}
      name={listing.name}
      loading="lazy"
      className="w-28 h-[4.75rem] flex-shrink-0 border-r-2 border-slate-900"
    />
    <div className="flex-1 min-w-0 p-2.5 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-black text-slate-950 leading-tight">{listing.name}</span>
        <span className={`text-xs font-black font-mono flex-shrink-0 ${affordable || owned ? 'text-slate-950' : 'text-rose-700'}`}>
          {status ?? money(listing.price)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {listing.tier ? (
          <Badge variant={listing.tier === 'upgrade' ? 'amber' : 'sky'} size="xs">
            {listing.tier === 'upgrade' ? 'Upgrade' : 'Starter'}
          </Badge>
        ) : (
          <Badge variant="emerald" size="xs">Book</Badge>
        )}
        {owned && !status ? <Badge variant="slate" size="xs">Owned</Badge> : null}
      </div>
      <span className="text-[10px] font-bold text-slate-500 line-clamp-2">{listing.purpose}</span>
    </div>
  </button>
);

const ActivityList: React.FC<{
  character: CharacterProfile;
  owned: OwnedPossession[];
  onOpen: (possessionId: string) => void;
}> = ({ character, owned, onOpen }) => {
  const rows = owned.filter((item) => {
    const listing = getPossessionListing(item.catalogId);
    if (!listing) return false;
    if (listing.kind === 'consumable') return item.status === 'owned';
    return item.status === 'owned';
  });
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-slate-300 bg-sky-50/40 px-3 py-4 text-[11px] font-bold text-slate-500">
        Activities appear when you own something you can use.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {rows.map((item) => {
        const listing = getPossessionListing(item.catalogId);
        if (!listing) return null;
        const hobby = listing.hobby
          ? validHobbies(character).find((entry) => entry.id === listing.hobby) ?? null
          : null;
        const used = hobby?.lastActionAge === character.age;
        const Icon = listing.hobby === 'gaming' ? Gamepad2 : listing.hobby === 'music' ? Music2 : BookOpen;
        const verb = listing.hobby === 'gaming' ? 'Play a game' : listing.hobby === 'music' ? 'Practice' : `Read ${listing.name}`;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="text-left rounded-2xl border-2 border-slate-900 bg-sky-50 shadow-[2px_2px_0_#0f172a] overflow-hidden cursor-pointer hover:bg-sky-100/80 transition-colors"
          >
            <LifestyleArtwork
              src={lifestyleIllustration(listing.id)}
              name={listing.name}
              loading="lazy"
              className="h-28 w-full border-b-2 border-slate-900"
            />
            <div className="p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-950">
                  <Icon className="h-3.5 w-3.5" />
                  {verb}
                </span>
                <Badge variant={used ? 'slate' : 'emerald'} size="xs">{used ? 'Used this year' : 'Ready'}</Badge>
              </div>
              {hobby ? (
                <div className="flex items-center gap-1" aria-label={`Level ${hobby.level} of ${HOBBY_LEVEL_CAP}`}>
                  {Array.from({ length: HOBBY_LEVEL_CAP }, (_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 w-5 rounded-full border border-slate-900 ${index < hobby.level ? 'bg-sky-500' : 'bg-white'}`}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-bold text-slate-500">Not started</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

const LifestyleSession: React.FC<{
  selection: Exclude<LifestyleSelection, null>;
  listing: PossessionListing | null;
  owned: OwnedPossession | null;
  character: CharacterProfile;
  hobbies: ReturnType<typeof validHobbies>;
  ownedItems: OwnedPossession[];
  guardRef: React.RefObject<ReturnType<typeof createTransactionGuard>>;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onClose: () => void;
}> = ({ selection, listing, owned, character, hobbies, ownedItems, guardRef, onUpdateCharacter, onClose }) => {
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const [confirmingSale, setConfirmingSale] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [scene, setScene] = useState<string | null>(null);

  const run = (action: () => ReturnType<typeof buyPossession>, keepOpen: boolean) => {
    if (!guardRef.current.begin()) return;
    setActionsDisabled(true);
    const result = action();
    if (!result.ok) {
      guardRef.current.fail();
      setActionsDisabled(false);
      setDetailError(result.reason ?? 'That did not go through.');
      return;
    }
    guardRef.current.succeed();
    onUpdateCharacter(result.character);
    if (keepOpen) {
      setScene(result.character.timeline.at(-1)?.message ?? null);
      setActionsDisabled(false);
      return;
    }
    onClose();
  };

  const starter = listing?.replaces
    ? ownedItems.find((item) => item.catalogId === listing.replaces && item.status === 'owned') ?? null
    : null;
  const hobbyId: HobbyId | null = listing?.hobby ?? null;
  const hobby = hobbyId ? hobbies.find((entry) => entry.id === hobbyId) ?? null : null;
  const usedThisYear = Boolean(hobby && hobby.lastActionAge === character.age && selection.kind !== 'listing');

  return (
    <LifestyleDetailModal
      listing={listing}
      owned={owned}
      imageSrc={listing ? lifestyleIllustration(listing.id) : null}
      cash={character.cash}
      starter={starter}
      hobby={hobby}
      error={detailError}
      scene={scene}
      actionsDisabled={actionsDisabled}
      confirmingSale={confirmingSale}
      usedThisYear={usedThisYear}
      alreadyOwned={Boolean(listing && ownedItems.some((item) => item.catalogId === listing.id))}
      mode={selection.kind}
      onClose={onClose}
      onBuy={() => run(() => buyPossession(character, listing?.id ?? ''), false)}
      onReplace={() => run(() => replaceEquipment(character, listing?.id ?? ''), false)}
      onStartSale={() => setConfirmingSale(true)}
      onCancelSale={() => setConfirmingSale(false)}
      onConfirmSale={() => owned && run(() => sellDurable(character, owned.id), false)}
      onRead={() => owned && run(() => readBook(character, owned.id), true)}
      onPlay={() => run(() => playGame(character), true)}
      onPractice={() => run(() => practiceMusic(character), true)}
    />
  );
};
