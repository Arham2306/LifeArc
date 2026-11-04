import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import type { CharacterProfile, PersonProfile } from '../../../types/game';
import { findNewFriend } from '../services/relationshipService';

interface FindFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
}

export const FindFriendModal: React.FC<FindFriendModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
}) => {
  const [discoveredFriend, setDiscoveredFriend] = useState<PersonProfile | null>(null);

  const getContextDescription = () => {
    if (character.age < 6) {
      return {
        venue: 'Playground & Daycare',
        desc: 'Meet other toddlers on the playground swings and sandbox.',
        buttonLabel: 'Play Together',
      };
    }
    if (character.age <= 17) {
      return {
        venue: 'School Grounds & Cafeteria',
        desc: 'Mingle with fellow students during lunch break or after-school clubs.',
        buttonLabel: 'Chat with Classmates',
      };
    }
    if (character.education.currentStage === 'university') {
      return {
        venue: 'University Campus & Library',
        desc: 'Form study groups or chat with fellow undergraduates in the student union.',
        buttonLabel: 'Mingle on Campus',
      };
    }
    if (character.career.currentJob) {
      return {
        venue: `Office & Breakroom at ${character.career.currentJob.companyName}`,
        desc: 'Grab a coffee and chat with coworkers across departments.',
        buttonLabel: 'Socialize at Work',
      };
    }
    return {
      venue: 'Local Community & Gym',
      desc: 'Strike up a friendly conversation at a neighborhood cafe or fitness center.',
      buttonLabel: 'Say Hello to Someone',
    };
  };

  const context = getContextDescription();

  const handleMingle = () => {
    const { character: updated, friend } = findNewFriend(character);
    onUpdateCharacter(updated);
    setDiscoveredFriend(friend);
  };

  const handleClose = () => {
    setDiscoveredFriend(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Meet New People"
      icon="🤝"
    >
      <div className="flex flex-col gap-3.5">
        {!discoveredFriend ? (
          <>
            <div className="rounded-2xl border-2 border-slate-900 bg-amber-50 p-4 flex flex-col gap-2 shadow-[2px_2px_0_#0f172a]">
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <span className="text-xs font-black text-slate-950">{context.venue}</span>
              </div>
              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                {context.desc}
              </p>
            </div>

            <p className="text-xs font-bold text-slate-500 text-center px-2">
              Expanding your social network brings new opportunities, loyalty, and joyful memories!
            </p>

            <CartoonButton
              variant="emerald"
              size="lg"
              fullWidth
              onClick={handleMingle}
              icon={<UserPlus className="w-5 h-5 stroke-[2.5]" />}
            >
              {context.buttonLabel}
            </CartoonButton>
          </>
        ) : (
          <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-2xl border-2 border-slate-900 bg-emerald-50 p-4 flex flex-col gap-3 shadow-[2px_2px_0_#0f172a]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl border-2 border-slate-900 bg-white flex items-center justify-center text-2xl shadow-[1.5px_1.5px_0_#0f172a]">
                  {discoveredFriend.avatarEmoji || '🧑'}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-slate-950">
                      {discoveredFriend.firstName} {discoveredFriend.lastName}
                    </h3>
                    <Badge variant="emerald" size="xs">
                      New Friend!
                    </Badge>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {discoveredFriend.role} • Age {discoveredFriend.age}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-900 text-xs font-bold text-slate-700 leading-relaxed shadow-inner">
                {discoveredFriend.originStory}
              </div>

              <div className="flex items-center justify-between text-xs font-black text-emerald-900 pt-1">
                <span>Initial Connection:</span>
                <span className="font-mono">{discoveredFriend.relationship}%</span>
              </div>
            </div>

            <CartoonButton variant="sky" size="md" fullWidth onClick={handleClose}>
              Awesome! Add to Friends
            </CartoonButton>
          </div>
        )}
      </div>
    </Modal>
  );
};
