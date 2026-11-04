import React, { useState } from 'react';
import { ArrowLeft, UserPlus, ChevronRight } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type { CharacterProfile, PersonProfile, SiblingProfile } from '../../../types/game';
import { CharacterDetailModal } from './CharacterDetailModal';
import { FindFriendModal } from './FindFriendModal';
import type { TargetPersonRef } from '../services/relationshipService';

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
    setSelectedTarget({
      id: friend.id,
      name: `${friend.firstName} ${friend.lastName}`,
      role: friend.role,
      type: 'friend',
      relationship: friend.relationship,
      isAlive: true,
      age: friend.age,
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
          <Badge variant="emerald" size="xs">
            {1 + (father.isAlive ? 1 : 0) + siblings.length + friends.length} Active
          </Badge>
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

      {/* SECTION 1: FAMILY */}
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

      {/* SECTION 2: FRIENDS & COLLEAGUES */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>🤝</span>
            <span>Friends & Colleagues</span>
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
          </span>
        </div>

        {friends.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center flex flex-col items-center gap-2 bg-slate-50/50">
            <span className="text-3xl">👥</span>
            <span className="text-xs font-black text-slate-700">No close friends yet</span>
            <p className="text-[11px] font-bold text-slate-500 max-w-xs">
              Social connections boost happiness and provide support. Tap "Meet People" above to expand your social circle!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((friend) => {
              const tag = getStageTag(friend.stageMet);
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => handleOpenFriend(friend)}
                  className="w-full p-3 rounded-2xl border-2 border-slate-900 bg-white hover:bg-amber-50/60 text-left transition-all shadow-[2px_2px_0_#0f172a] flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-emerald-100 flex items-center justify-center text-lg shadow-[1px_1px_0_#0f172a]">
                      {friend.avatarEmoji || (friend.gender === 'male' ? '👦' : '👧')}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-950 group-hover:text-amber-950">
                          {friend.firstName} {friend.lastName}
                        </span>
                        <Badge variant={tag.variant} size="xs">
                          {tag.label}
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
