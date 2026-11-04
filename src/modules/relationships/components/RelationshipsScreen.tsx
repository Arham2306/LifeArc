import React, { useState } from 'react';
import { ArrowLeft, UserPlus, ChevronRight, Heart } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type { CharacterProfile, PersonProfile, SiblingProfile } from '../../../types/game';
import { CharacterDetailModal } from './CharacterDetailModal';
import { FindFriendModal } from './FindFriendModal';
import type { TargetPersonRef } from '../services/relationshipService';
import { ARCHETYPE_LABELS } from '../services/cohortService';

interface RelationshipsScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onBackToMenu: () => void;
}

export const RelationshipsScreen: React.FC<RelationshipsScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<TargetPersonRef | null>(null);
  const [isFindFriendOpen, setIsFindFriendOpen] = useState(false);

  const { father, mother } = character.parents;
  const siblings = character.siblings || [];
  const friends = character.relationships || [];

  // Check if a person profile represents an active romantic partner/dating/spouse
  const isPartnerProfile = (p: PersonProfile) =>
    p.romanticStage === 'dating' ||
    p.romanticStage === 'engaged' ||
    p.romanticStage === 'married' ||
    p.relationshipType === 'dating' ||
    p.relationshipType === 'partner' ||
    p.relationshipType === 'spouse' ||
    ['Girlfriend', 'Boyfriend', 'Fiancé', 'Fiancée', 'Wife', 'Husband', 'Partner'].includes(p.role);

  // Resolve active partner: check character.partner first, fallback to relationships match
  const partner =
    character.partner ||
    friends.find(isPartnerProfile) ||
    null;

  // Ensure friends list includes partner if partner exists
  const allRelationships = React.useMemo(() => {
    if (partner && !friends.some((f) => f.id === partner.id)) {
      return [partner, ...friends];
    }
    return friends;
  }, [friends, partner]);

  // Self-healing synchronization: if character.partner was missing or relationships out of sync, sync it
  React.useEffect(() => {
    if (!character.partner && partner) {
      onUpdateCharacter({
        ...character,
        partner,
        relationships: allRelationships,
      });
    }
  }, [character, partner, allRelationships, onUpdateCharacter]);

  // Categorize relationships
  const romanticProspects = allRelationships.filter(
    (f) =>
      (!partner || f.id !== partner.id) &&
      (f.romanticStage === 'flirting' || f.relationshipType === 'crush' || (f.romanceUnlocked && (f.romanceMeter ?? 0) > 0))
  );

  const closeFriends = allRelationships.filter(
    (f) =>
      (!partner || f.id !== partner.id) &&
      !romanticProspects.some((p) => p.id === f.id) &&
      (f.relationship >= 60 || f.cohortType === 'friend' || f.cohortType === 'best_friend')
  );

  const cohortPeers = allRelationships.filter(
    (f) =>
      (!partner || f.id !== partner.id) &&
      !romanticProspects.some((p) => p.id === f.id) &&
      f.relationship < 60 &&
      f.cohortType !== 'friend' &&
      f.cohortType !== 'best_friend'
  );

  const handleOpenParent = (role: 'father' | 'mother') => {
    const parent = role === 'father' ? father : mother;
    setSelectedTarget({
      id: parent.id,
      name: `${parent.firstName} ${parent.lastName}`,
      role: role === 'father' ? 'Father' : 'Mother',
      type: 'parent',
      relationship: parent.relationship,
      generosity: parent.generosity,
      wealth: character.parents.wealth,
      isAlive: parent.isAlive,
      age: parent.age,
    });
  };

  const handleOpenSibling = (sibling: SiblingProfile) => {
    const orderLabel =
      sibling.birthOrder === 'twin'
        ? 'Twin ' + (sibling.role === 'brother' ? 'Brother' : 'Sister')
        : sibling.birthOrder === 'older'
        ? 'Older ' + (sibling.role === 'brother' ? 'Brother' : 'Sister')
        : 'Younger ' + (sibling.role === 'brother' ? 'Brother' : 'Sister');

    setSelectedTarget({
      id: sibling.id,
      name: `${sibling.firstName} ${sibling.lastName}`,
      role: orderLabel,
      type: 'sibling',
      relationship: sibling.relationship,
      isAlive: sibling.isAlive,
      age: sibling.age,
    });
  };

  const handleOpenFriend = (friend: PersonProfile) => {
    const isPartner = partner?.id === friend.id || isPartnerProfile(friend);
    setSelectedTarget({
      id: friend.id,
      name: `${friend.firstName} ${friend.lastName}`,
      role: friend.role,
      type: 'friend',
      relationship: friend.relationship,
      isAlive: true,
      age: friend.age,
      gender: friend.gender,
      romanceUnlocked: isPartner || friend.romanceUnlocked,
      romanceMeter: friend.romanceMeter,
      romanticStage: friend.romanticStage || (isPartner ? 'dating' : undefined),
    });
  };

  const getStageTag = (stageMet: string) => {
    switch (stageMet) {
      case 'childhood':
      case 'middle_school':
      case 'high_school':
        return { label: 'School Friend', variant: 'amber' as const };
      case 'university':
        return { label: 'University', variant: 'sky' as const };
      default:
        return { label: 'Workplace / Adult', variant: 'emerald' as const };
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 bg-white min-h-[480px]">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
          <span>Menu</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-slate-800">Relationships</span>
        </div>
      </div>

      {/* Meet New People Action Banner */}
      <div className="rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-amber-400 to-amber-300 p-3.5 flex items-center justify-between shadow-[2px_3px_0_#0f172a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1.5px_1.5px_0_#0f172a]">
            👋
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-950">
              Expand Your Circle
            </span>
            <span className="text-[10px] font-bold text-slate-800">
              {character.age < 18
                ? 'Make new school friends & study partners'
                : 'Mingle with coworkers and community members'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFindFriendOpen(true)}
          className="px-3 py-2 rounded-xl border-2 border-slate-900 bg-white hover:bg-emerald-50 text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] flex items-center gap-1 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
          <span>Meet People</span>
        </button>
      </div>

      {/* SECTION 1: ROMANTIC PARTNER */}
      {partner && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Romantic Partner</span>
            </span>
            <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300 uppercase">
              {partner.romanticStage || 'Partner'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenFriend(partner)}
            className="w-full p-3.5 rounded-2xl border-2 border-slate-900 bg-rose-50/90 hover:bg-rose-100 text-left transition-all shadow-[2px_2.5px_0_#0f172a] flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl border-2 border-slate-900 bg-rose-200 flex items-center justify-center text-2xl shadow-[1px_1px_0_#0f172a]">
                {partner.avatarEmoji || (partner.gender === 'female' ? '👩' : '👨')}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-black text-slate-950 group-hover:text-rose-950">
                    {partner.firstName} {partner.lastName}
                  </span>
                  <Badge variant="rose" size="xs">
                    {partner.role || 'Partner'}
                  </Badge>
                  {partner.partnerStats?.isPregnant && (
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-200 border border-amber-400 px-1.5 py-0.5 rounded-full">
                      🤰 Expecting Baby
                    </span>
                  )}
                  {partner.partnerStats?.yearsTogether ? (
                    <span className="text-[9px] font-bold text-rose-800 bg-rose-200/70 border border-rose-300 px-1.5 py-0.5 rounded-full">
                      {partner.partnerStats.yearsTogether} {partner.partnerStats.yearsTogether === 1 ? 'yr' : 'yrs'} together
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  Age {partner.age} • {partner.partnerStats?.occupation || partner.role || 'Employed'}
                </span>
                <div className="flex flex-col gap-1 w-44 pt-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-600">
                    <span>Relationship</span>
                    <span className="font-mono text-emerald-700">{Math.round(partner.relationship)}%</span>
                  </div>
                  <ProgressBar value={partner.relationship} color="emerald" size="xs" />

                  {partner.romanceMeter !== undefined && (
                    <>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 pt-0.5">
                        <span>Love Meter</span>
                        <span className="font-mono text-rose-600">{partner.romanceMeter}%</span>
                      </div>
                      <ProgressBar value={partner.romanceMeter} color="rose" size="xs" />
                    </>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 stroke-[3] text-slate-400 group-hover:text-rose-900 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      )}

      {/* SECTION 2: ROMANTIC PROSPECTS & CRUSHES */}
      {romanticProspects.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-pink-700 flex items-center gap-1.5">
              <span>💘</span>
              <span>Dating Prospects & Crushes</span>
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              {romanticProspects.length} {romanticProspects.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {romanticProspects.map((prospect) => (
              <button
                key={prospect.id}
                type="button"
                onClick={() => handleOpenFriend(prospect)}
                className="w-full p-3 rounded-2xl border-2 border-slate-900 bg-pink-50/50 hover:bg-pink-100/60 text-left transition-all shadow-[2px_2px_0_#0f172a] flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-pink-100 flex items-center justify-center text-lg shadow-[1px_1px_0_#0f172a]">
                    {prospect.avatarEmoji || (prospect.gender === 'female' ? '👩' : '👨')}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-950 group-hover:text-pink-950">
                        {prospect.firstName} {prospect.lastName}
                      </span>
                      <Badge variant="rose" size="xs">
                        {prospect.role || 'Crush'}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      Age {prospect.age} • Chemistry: {prospect.romanceMeter ?? 0}%
                    </span>
                    <div className="w-32 pt-1">
                      <ProgressBar value={prospect.relationship} color="emerald" size="xs" />
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 stroke-[3] text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: IMMEDIATE FAMILY */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>👨‍👩‍👧‍👦</span>
            <span>Immediate Family</span>
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            {2 + siblings.length} {2 + siblings.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Mother Card */}
          <button
            type="button"
            onClick={() => handleOpenParent('mother')}
            className="w-full p-3 rounded-2xl border-2 border-slate-900 bg-white hover:bg-amber-50/60 text-left transition-all shadow-[2px_2px_0_#0f172a] flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-rose-100 flex items-center justify-center text-lg shadow-[1px_1px_0_#0f172a]">
                {mother.isAlive ? '👩' : '🕊️'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-950 group-hover:text-amber-950">
                    {mother.firstName} {mother.lastName}
                  </span>
                  <Badge variant={mother.isAlive ? 'rose' : 'slate'} size="xs">
                    Mother
                  </Badge>
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {mother.isAlive
                    ? `Age ${mother.age} • ${mother.occupation}`
                    : `Passed away at age ${mother.age}`}
                </span>
                {mother.isAlive && (
                  <div className="w-32 pt-1">
                    <ProgressBar value={mother.relationship} color="emerald" size="xs" />
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 stroke-[3] text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Father Card */}
          <button
            type="button"
            onClick={() => handleOpenParent('father')}
            className="w-full p-3 rounded-2xl border-2 border-slate-900 bg-white hover:bg-amber-50/60 text-left transition-all shadow-[2px_2px_0_#0f172a] flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-sky-100 flex items-center justify-center text-lg shadow-[1px_1px_0_#0f172a]">
                {father.isAlive ? '👨' : '🕊️'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-950 group-hover:text-amber-950">
                    {father.firstName} {father.lastName}
                  </span>
                  <Badge variant={father.isAlive ? 'sky' : 'slate'} size="xs">
                    Father
                  </Badge>
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {father.isAlive
                    ? `Age ${father.age} • ${father.occupation}`
                    : `Passed away at age ${father.age}`}
                </span>
                {father.isAlive && (
                  <div className="w-32 pt-1">
                    <ProgressBar value={father.relationship} color="emerald" size="xs" />
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 stroke-[3] text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Sibling Cards */}
          {siblings.map((sibling) => {
            const roleBadge =
              sibling.birthOrder === 'twin'
                ? 'Twin'
                : sibling.birthOrder === 'older'
                ? 'Older ' + (sibling.role === 'brother' ? 'Brother' : 'Sister')
                : 'Younger ' + (sibling.role === 'brother' ? 'Brother' : 'Sister');

            return (
              <button
                key={sibling.id}
                type="button"
                onClick={() => handleOpenSibling(sibling)}
                className="w-full p-3 rounded-2xl border-2 border-slate-900 bg-white hover:bg-amber-50/60 text-left transition-all shadow-[2px_2px_0_#0f172a] flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-amber-100 flex items-center justify-center text-lg shadow-[1px_1px_0_#0f172a]">
                    {sibling.role === 'brother' ? '👦' : '👧'}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-950 group-hover:text-amber-950">
                        {sibling.firstName} {sibling.lastName}
                      </span>
                      <Badge variant="amber" size="xs">
                        {roleBadge}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      Age {sibling.age} • {sibling.occupation}
                    </span>
                    <div className="w-32 pt-1">
                      <ProgressBar value={sibling.relationship} color="emerald" size="xs" />
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 stroke-[3] text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: CLOSE FRIENDS */}
      {closeFriends.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>⭐</span>
              <span>Close Friends</span>
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              {closeFriends.length} {closeFriends.length === 1 ? 'friend' : 'friends'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {closeFriends.map((friend) => {
              const tag = getStageTag(friend.stageMet);
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => handleOpenFriend(friend)}
                  className="w-full p-3 rounded-2xl border-2 border-slate-900 bg-white hover:bg-emerald-50/60 text-left transition-all shadow-[2px_2px_0_#0f172a] flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-emerald-100 flex items-center justify-center text-lg shadow-[1px_1px_0_#0f172a]">
                      {friend.avatarEmoji || (friend.gender === 'male' ? '👦' : '👧')}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-950 group-hover:text-emerald-950">
                          {friend.firstName} {friend.lastName}
                        </span>
                        <Badge variant={tag.variant} size="xs">
                          {friend.cohortType === 'best_friend' ? 'Best Friend' : tag.label}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Age {friend.age} • {friend.role}
                      </span>
                      <div className="w-32 pt-1">
                        <ProgressBar value={friend.relationship} color="emerald" size="xs" />
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 stroke-[3] text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: ACTIVE COHORT (Classmates / Coworkers) */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>{character.age < 18 ? '🎒' : '💼'}</span>
            <span>{character.age < 18 ? 'School Classmates' : 'Coworkers & Peers'}</span>
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            {cohortPeers.length} {cohortPeers.length === 1 ? 'peer' : 'peers'}
          </span>
        </div>

        {cohortPeers.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center flex flex-col items-center gap-1.5 bg-slate-50/50">
            <span className="text-2xl">👥</span>
            <span className="text-xs font-black text-slate-700">No active cohort peers</span>
            <p className="text-[10px] font-bold text-slate-500 max-w-xs">
              Peers are automatically introduced when you attend school or begin a job.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cohortPeers.map((peer) => {
              const archetype = peer.personalityArchetype
                ? ARCHETYPE_LABELS[peer.personalityArchetype]
                : null;
              const isDriftingRisk = peer.relationship < 40;

              return (
                <button
                  key={peer.id}
                  type="button"
                  onClick={() => handleOpenFriend(peer)}
                  className="w-full p-3 rounded-2xl border-2 border-slate-900 bg-white hover:bg-amber-50/60 text-left transition-all shadow-[2px_2px_0_#0f172a] flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-amber-100 flex items-center justify-center text-lg shadow-[1px_1px_0_#0f172a]">
                      {peer.avatarEmoji || (peer.gender === 'male' ? '👦' : '👧')}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-950 group-hover:text-amber-950">
                          {peer.firstName} {peer.lastName}
                        </span>
                        {archetype && (
                          <span className="text-[9px] font-black bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded-full text-slate-700">
                            {archetype.emoji} {archetype.label}
                          </span>
                        )}
                        {isDriftingRisk && (
                          <span className="text-[9px] font-black bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            🍃 Drifting Risk
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Age {peer.age} • {peer.role}
                      </span>
                      <div className="w-32 pt-1">
                        <ProgressBar
                          value={peer.relationship}
                          color={isDriftingRisk ? 'amber' : 'emerald'}
                          size="xs"
                        />
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 stroke-[3] text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CharacterDetailModal
        isOpen={Boolean(selectedTarget)}
        onClose={() => setSelectedTarget(null)}
        character={character}
        target={selectedTarget}
        onUpdateCharacter={onUpdateCharacter}
      />

      <FindFriendModal
        isOpen={isFindFriendOpen}
        onClose={() => setIsFindFriendOpen(false)}
        character={character}
        onUpdateCharacter={onUpdateCharacter}
      />
    </div>
  );
};
