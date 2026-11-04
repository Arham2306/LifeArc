import React, { useState } from 'react';
import {
  MessageCircle,
  Sparkles,
  Gift,
  DollarSign,
  Heart,
  Flame,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type { CharacterProfile } from '../../../types/game';
import type { GiftOption, SocialActionOutcome, SocialActionType } from '../types';
import { GIFT_CATALOG } from '../data/socialInteractions';
import {
  executeSocialAction,
  hasPerformedActionThisYear,
  type TargetPersonRef,
} from '../services/relationshipService';

interface CharacterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterProfile;
  target: TargetPersonRef | null;
  onUpdateCharacter: (updated: CharacterProfile) => void;
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  isOpen,
  onClose,
  character,
  target,
  onUpdateCharacter,
}) => {
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<SocialActionOutcome | null>(null);

  if (!target) return null;

  const handleAction = (actionType: SocialActionType, gift?: GiftOption) => {
    const { character: updated, outcome } = executeSocialAction(
      character,
      target,
      actionType,
      gift
    );
    onUpdateCharacter(updated);
    setLastOutcome(outcome);
    setShowGiftPicker(false);
  };

  const isDeceased = !target.isAlive;
  const spentTimeDone = hasPerformedActionThisYear(character, target.id, 'spend_time');
  const chatDone = hasPerformedActionThisYear(character, target.id, 'conversation');
  const complimentDone = hasPerformedActionThisYear(character, target.id, 'compliment');
  const giftDone = hasPerformedActionThisYear(character, target.id, 'give_gift');
  const askMoneyDone = hasPerformedActionThisYear(character, target.id, 'ask_money');

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setLastOutcome(null);
        setShowGiftPicker(false);
        onClose();
      }}
      title={target.name}
      icon="👤"
    >
      <div className="flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto pr-0.5">
        {/* Profile Card Header */}
        <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3.5 flex flex-col gap-2.5 shadow-[2px_2px_0_#0f172a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl border-2 border-slate-900 bg-white flex items-center justify-center text-2xl shadow-[1.5px_1.5px_0_#0f172a]">
                {isDeceased ? '🪦' : target.type === 'parent' ? '👨‍👩‍👧' : '🧑'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-slate-950">{target.name}</h3>
                  {isDeceased && (
                    <Badge variant="rose" size="xs">
                      Deceased
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-600">
                  {target.role} • Age {target.age}
                </span>
              </div>
            </div>

            <Badge variant="slate" size="xs">
              {target.type.toUpperCase()}
            </Badge>
          </div>

          {/* Relationship Gauge */}
          <div className="flex flex-col gap-1 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between text-[11px] font-black">
              <span className="text-slate-600 flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                <span>Relationship</span>
              </span>
              <span className="text-slate-950 font-mono">{target.relationship}%</span>
            </div>
            <ProgressBar value={target.relationship} color="emerald" size="sm" />
          </div>

          {/* Generosity Gauge (if parent) */}
          {target.generosity !== undefined && !isDeceased && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="text-slate-600 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-amber-500" />
                  <span>Generosity</span>
                </span>
                <span className="text-slate-950 font-mono">{target.generosity}%</span>
              </div>
              <ProgressBar value={target.generosity} color="amber" size="xs" />
            </div>
          )}
        </div>

        {/* Outcome Alert Toast */}
        {lastOutcome && (
          <div
            className={`rounded-2xl border-2 border-slate-900 p-3 flex flex-col gap-1 shadow-[2px_2px_0_#0f172a] ${
              lastOutcome.success ? 'bg-emerald-50' : 'bg-rose-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                {lastOutcome.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                )}
                <span>{lastOutcome.headline}</span>
              </span>
              {lastOutcome.relationshipDelta !== 0 && (
                <span
                  className={`text-xs font-black ${
                    lastOutcome.relationshipDelta > 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {lastOutcome.relationshipDelta > 0 ? '+' : ''}
                  {lastOutcome.relationshipDelta}% Rel
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
              {lastOutcome.narrative}
            </p>
          </div>
        )}

        {/* Action Selection */}
        {!isDeceased ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider px-0.5">
              Available Actions
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* 1. Spend Time */}
              <button
                type="button"
                onClick={() => handleAction('spend_time')}
                disabled={spentTimeDone}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  spentTimeDone
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : 'bg-white hover:bg-amber-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Spend Time</div>
                  <span className="text-sm">⏳</span>
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {spentTimeDone ? 'Already hung out this year' : 'Hang out & build bond'}
                </div>
              </button>

              {/* 2. Conversation */}
              <button
                type="button"
                onClick={() => handleAction('conversation')}
                disabled={chatDone}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  chatDone
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : 'bg-white hover:bg-sky-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Chat</div>
                  <MessageCircle className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {chatDone ? 'Already chatted this year' : 'Deep dialogue & gossip'}
                </div>
              </button>

              {/* 3. Compliment */}
              <button
                type="button"
                onClick={() => handleAction('compliment')}
                disabled={complimentDone}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  complimentDone
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : 'bg-white hover:bg-emerald-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Compliment</div>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {complimentDone ? 'Already complimented' : 'Warm praise & flattery'}
                </div>
              </button>

              {/* 4. Insult */}
              <button
                type="button"
                onClick={() => handleAction('insult')}
                className="p-2.5 rounded-2xl border-2 border-slate-900 text-left bg-white hover:bg-rose-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-rose-950">Insult</div>
                  <Flame className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  Pick a fight (-Rel, -Karma)
                </div>
              </button>

              {/* 5. Give Gift */}
              <button
                type="button"
                onClick={() => setShowGiftPicker(!showGiftPicker)}
                disabled={giftDone}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  giftDone
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : 'bg-white hover:bg-purple-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Give Gift</div>
                  <Gift className="w-3.5 h-3.5 text-purple-600 stroke-[2.5]" />
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {giftDone ? 'Gift sent this year' : 'Surprise with a present'}
                </div>
              </button>

              {/* 6. Ask for Money */}
              <button
                type="button"
                onClick={() => handleAction('ask_money')}
                disabled={askMoneyDone || (target.type !== 'parent' && target.relationship < 80)}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  askMoneyDone || (target.type !== 'parent' && target.relationship < 80)
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : 'bg-white hover:bg-emerald-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Ask for Money</div>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {askMoneyDone
                    ? 'Already asked this year'
                    : target.type === 'parent'
                    ? 'Request allowance/cash'
                    : 'Requires 80%+ bond'}
                </div>
              </button>
            </div>

            {/* Gift Picker Drawer */}
            {showGiftPicker && !giftDone && (
              <div className="rounded-2xl border-2 border-slate-900 bg-purple-50/70 p-3 flex flex-col gap-2 mt-1">
                <span className="text-xs font-black text-purple-950">
                  Select a Gift to Present:
                </span>
                <div className="flex flex-col gap-1.5">
                  {GIFT_CATALOG.map((g) => {
                    const canAfford = character.cash >= g.cost;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleAction('give_gift', g)}
                        disabled={!canAfford}
                        className={`p-2 rounded-xl border border-slate-900 text-left flex items-center justify-between transition-all ${
                          canAfford
                            ? 'bg-white hover:bg-purple-100 cursor-pointer shadow-[1px_1.5px_0_#0f172a]'
                            : 'bg-slate-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{g.icon}</span>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900">{g.name}</span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {g.description}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-purple-900 font-mono">
                          {g.cost === 0 ? 'FREE' : `$${g.cost.toLocaleString()}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-100 border-2 border-slate-300 text-center flex flex-col items-center gap-1.5">
            <span className="text-2xl">🕊️</span>
            <span className="text-xs font-black text-slate-700">Resting in Peace</span>
            <p className="text-[11px] font-bold text-slate-500">
              {target.name} lived a full life. You hold cherished memories together.
            </p>
          </div>
        )}

        <div className="pt-2">
          <CartoonButton
            variant="slate"
            size="md"
            fullWidth
            onClick={() => {
              setLastOutcome(null);
              setShowGiftPicker(false);
              onClose();
            }}
          >
            Close
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
