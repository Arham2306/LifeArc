import React from 'react';
import { Sparkles, Users } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type { ChildProfile } from '../../../types/game';

interface ChildDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: ChildProfile;
  playerCash: number;
  onSpendTime: () => void;
  onPraise: () => void;
  onGiveAllowance: (amount: number) => void;
  onPayTuition: () => void;
}

export const ChildDetailModal: React.FC<ChildDetailModalProps> = ({
  isOpen,
  onClose,
  child,
  playerCash,
  onSpendTime,
  onPraise,
  onGiveAllowance,
  onPayTuition,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${child.firstName} ${child.lastName}`}
      icon="👶"
    >
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-bold text-slate-500">
          {child.age} yrs old • {child.occupation} {child.isAdopted ? '(Adopted)' : ''}
        </span>

        {/* Child Vitals & Stats */}
        <div className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-800">
            <span>Relationship with You</span>
            <span className="font-mono text-emerald-700">{Math.round(child.relationship)}%</span>
          </div>
          <ProgressBar value={child.relationship} color="emerald" size="sm" />

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500">Smarts</span>
              <span className="text-xs font-black text-sky-800">{child.smarts}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500">Happiness</span>
              <span className="text-xs font-black text-amber-800">{child.happiness}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500">Health</span>
              <span className="text-xs font-black text-emerald-800">{child.health}%</span>
            </div>
          </div>
        </div>

        {/* Parenting Actions */}
        <div className="flex flex-col gap-2">
          <CartoonButton
            variant="white"
            size="sm"
            className="w-full flex items-center justify-center gap-2"
            onClick={onSpendTime}
          >
            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Spend Quality Time Together</span>
          </CartoonButton>

          <CartoonButton
            variant="white"
            size="sm"
            className="w-full flex items-center justify-center gap-2"
            onClick={onPraise}
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Praise & Encourage Child</span>
          </CartoonButton>

          <div className="grid grid-cols-2 gap-2">
            <CartoonButton
              variant="white"
              size="sm"
              disabled={playerCash < 25}
              onClick={() => onGiveAllowance(25)}
            >
              Give $25 Allowance
            </CartoonButton>
            <CartoonButton
              variant="white"
              size="sm"
              disabled={playerCash < 100}
              onClick={() => onGiveAllowance(100)}
            >
              Give $100 Allowance
            </CartoonButton>
          </div>

          {child.age >= 18 && (
            <CartoonButton
              variant="rose"
              size="sm"
              disabled={playerCash < 15000}
              onClick={onPayTuition}
            >
              Pay College Tuition ($15,000)
            </CartoonButton>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Done
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
