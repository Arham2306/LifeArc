import React from 'react'
import type { CharacterProfile } from '../../types/game'
import { Modal } from '../ui/Modal'
import { CartoonButton } from '../ui/CartoonButton'
import { Badge } from '../ui/Badge'

interface DeathModalProps {
  character: CharacterProfile;
  isOpen: boolean;
  onStartNewLife: () => void;
  onClose: () => void;
}

export const DeathModal: React.FC<DeathModalProps> = ({
  character,
  isOpen,
  onStartNewLife,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rest in Peace"
      icon="🪦"
      actions={
        <>
          <CartoonButton variant="emerald" size="md" fullWidth onClick={onStartNewLife}>
            Start a New Life
          </CartoonButton>
          <CartoonButton variant="white" size="md" fullWidth onClick={onClose}>
            View Final Life Journal
          </CartoonButton>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-2 py-1">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 border-[2.5px] border-slate-900 flex items-center justify-center text-3xl shadow-[2px_3px_0_#0f172a]">
          🕊️
        </div>
        <h4 className="font-black text-base text-slate-950">
          {character.firstName} {character.lastName}
        </h4>
        <Badge variant="slate" size="xs">
          Lived to Age {character.age}
        </Badge>
        <p className="text-xs font-bold text-slate-600 mt-1">
          {character.causeOfDeath || 'Passed away peacefully.'}
        </p>
        <p className="text-[11px] font-bold text-slate-500">
          Born in {character.city}, {character.country} to {character.parents.father.firstName} and{' '}
          {character.parents.mother.firstName} {character.lastName}.
        </p>
      </div>
    </Modal>
  );
};

