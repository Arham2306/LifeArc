import React, { useState, useMemo } from 'react';
import {
  MessageCircle,
  Sparkles,
  Gift,
  DollarSign,
  Heart,
  Flame,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wine,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { DualMeterDisplay } from '../../romance/components/DualMeterDisplay';
import { ActionPickerModal } from '../../../components/ui/ActionPickerModal';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { FLIRT_OPTIONS, DATE_VENUES } from '../../romance/data/romanticInteractions';
import { romanceService } from '../../romance/services/romanceService';
import type { FlirtOption, DateVenue } from '../../romance/types';
import type { CharacterProfile, PersonProfile } from '../../../types/game';
import type { GiftOption, SocialActionOutcome, SocialActionType } from '../types';
import {
  CHAT_OPTIONS,
  COMPLIMENT_OPTIONS,
  GIFT_CATALOG,
  getHangoutOptions,
  INSULT_OPTIONS,
} from '../data/socialInteractions';
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
  const [activeDrawer, setActiveDrawer] = useState<SocialActionType | null>(null);
  const [lastOutcome, setLastOutcome] = useState<SocialActionOutcome | null>(null);
  const [romanceModal, setRomanceModal] = useState<'flirt' | 'date' | 'ask_out' | null>(null);

  // Derive target's live metrics in real-time from active character state
  const liveTarget: TargetPersonRef | null = useMemo(() => {
    if (!target) return null;
    if (target.type === 'parent') {
      const isFather = target.id === character.parents.father.id;
      const p = isFather ? character.parents.father : character.parents.mother;
      return {
        ...target,
        relationship: p.relationship,
        generosity: p.generosity,
        isAlive: p.isAlive,
        age: p.age,
      };
    }
    if (target.type === 'sibling') {
      const sib = (character.siblings || []).find((s) => s.id === target.id);
      return sib
        ? {
            ...target,
            relationship: sib.relationship,
            isAlive: sib.isAlive,
            age: sib.age,
          }
        : target;
    }
    const friend = (character.relationships || []).find((r) => r.id === target.id);
    return friend
      ? {
          ...target,
          relationship: friend.relationship,
          age: friend.age,
          gender: friend.gender,
          romanceUnlocked: friend.romanceUnlocked,
          romanceMeter: friend.romanceMeter,
          romanticStage: friend.romanticStage,
        }
      : target;
  }, [character, target]);

  const friendTarget: PersonProfile | undefined = useMemo(() => {
    if (liveTarget?.type !== 'friend') return undefined;
    return (character.relationships || []).find((r) => r.id === liveTarget.id);
  }, [character, liveTarget]);

  if (!liveTarget) return null;

  const stage =
    character.age <= 12 ? 'childhood' : character.age <= 17 ? 'teens' : 'adulthood';

  const handleAction = (
    actionType: SocialActionType,
    gift?: GiftOption,
    selectedOptionId?: string
  ) => {
    const { character: updated, outcome } = executeSocialAction(
      character,
      liveTarget,
      actionType,
      gift,
      selectedOptionId
    );
    onUpdateCharacter(updated);
    setLastOutcome(outcome);
    setActiveDrawer(null);
  };

  const handleSparkRomance = () => {
    if (!friendTarget || character.age < 16) return;
    const sparked = romanceService.sparkRomance(friendTarget, character.age);
    const updatedRel = (character.relationships || []).map((r) =>
      r.id === sparked.id ? sparked : r
    );
    onUpdateCharacter({
      ...character,
      relationships: updatedRel,
    });
    setLastOutcome({
      actionType: 'spend_time',
      targetName: friendTarget.firstName,
      success: true,
      headline: 'Romantic Chemistry Sparked! 💖',
      narrative: `You shared a lingering, electric moment with ${friendTarget.firstName}. Your Love / Romance meter is now unlocked!`,
      relationshipDelta: 5,
      statEffects: {},
    });
  };

  const handleFlirt = (flirt: FlirtOption) => {
    if (!friendTarget || character.age < 16) return;
    const { updatedTarget, result } = romanceService.executeFlirt(character, friendTarget, flirt);
    const updatedRel = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );
    const currentActions = character.yearlySocialActions?.[updatedTarget.id] || [];
    const updatedChar: CharacterProfile = {
      ...character,
      relationships: updatedRel,
      partner: character.partner?.id === updatedTarget.id ? updatedTarget : character.partner,
      yearlySocialActions: {
        ...(character.yearlySocialActions || {}),
        [updatedTarget.id]: [...currentActions, 'romance_flirt'],
      },
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };
    onUpdateCharacter(updatedChar);
    setRomanceModal(null);
    setLastOutcome({
      actionType: 'spend_time',
      targetName: friendTarget.firstName,
      success: result.success,
      headline: result.success ? 'Smooth Flirting! ✨' : 'Flirt Missed 🙈',
      narrative: result.message,
      relationshipDelta: result.relationshipDelta,
      statEffects: { happiness: result.happinessDelta },
    });
  };

  const handleDate = (venue: DateVenue) => {
    if (!friendTarget || character.age < 16) return;
    const { updatedTarget, result } = romanceService.executeDate(character, friendTarget, venue);
    if (!result.success && result.relationshipDelta === 0) {
      return;
    }
    const updatedRel = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );
    const currentActions = character.yearlySocialActions?.[updatedTarget.id] || [];
    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      relationships: updatedRel,
      partner: character.partner?.id === updatedTarget.id ? updatedTarget : character.partner,
      yearlySocialActions: {
        ...(character.yearlySocialActions || {}),
        [updatedTarget.id]: [...currentActions, 'romance_date'],
      },
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };
    onUpdateCharacter(updatedChar);
    setRomanceModal(null);
    setLastOutcome({
      actionType: 'spend_time',
      targetName: friendTarget.firstName,
      success: result.success,
      headline: result.success ? 'Romantic Date Success! 🥂' : 'Date Drama! 💥',
      narrative: result.message,
      relationshipDelta: result.relationshipDelta,
      statEffects: { happiness: result.happinessDelta, cash: result.cashDelta },
    });
  };

  const handleAskOut = () => {
    if (!friendTarget || character.age < 16) return;
    const { updatedTarget, result } = romanceService.executeAskOut(character, friendTarget);
    const updatedRel = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );
    const updatedChar: CharacterProfile = {
      ...character,
      relationships: updatedRel,
      partner: result.success ? updatedTarget : character.partner,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };
    onUpdateCharacter(updatedChar);
    setRomanceModal(null);
    setLastOutcome({
      actionType: 'spend_time',
      targetName: friendTarget.firstName,
      success: result.success,
      headline: result.success ? 'Official Couple! ❤️🎉' : 'Not Quite Yet... 💔',
      narrative: result.message,
      relationshipDelta: result.relationshipDelta,
      statEffects: { happiness: result.happinessDelta },
    });
  };

  const isDeceased = !liveTarget.isAlive;
  const spentTimeDone = hasPerformedActionThisYear(character, liveTarget.id, 'spend_time');
  const chatDone = hasPerformedActionThisYear(character, liveTarget.id, 'conversation');
  const complimentDone = hasPerformedActionThisYear(character, liveTarget.id, 'compliment');
  const giftDone = hasPerformedActionThisYear(character, liveTarget.id, 'give_gift');
  const askMoneyDone = hasPerformedActionThisYear(character, liveTarget.id, 'ask_money');

  const hangoutOptions = getHangoutOptions(stage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setLastOutcome(null);
        setActiveDrawer(null);
        onClose();
      }}
      title={liveTarget.name}
      icon="👤"
    >
      <div className="flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto pr-0.5">
        {/* Profile Card Header */}
        <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3.5 flex flex-col gap-2.5 shadow-[2px_2px_0_#0f172a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl border-2 border-slate-900 bg-white flex items-center justify-center text-2xl shadow-[1.5px_1.5px_0_#0f172a]">
                {isDeceased ? '🪦' : liveTarget.type === 'parent' ? '👨‍👩‍👧' : '🧑'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-slate-950">{liveTarget.name}</h3>
                  {isDeceased && (
                    <Badge variant="rose" size="xs">
                      Deceased
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-600">
                  {liveTarget.role} • Age {liveTarget.age}
                </span>
              </div>
            </div>

            <Badge variant="slate" size="xs">
              {liveTarget.type.toUpperCase()}
            </Badge>
          </div>

          {/* Real-Time Relationship Gauge & Romance Dual Meter */}
          {liveTarget.romanceUnlocked && character.age >= 16 ? (
            <DualMeterDisplay
              relationship={liveTarget.relationship}
              romanceMeter={liveTarget.romanceMeter ?? 0}
              romanceUnlocked={true}
            />
          ) : (
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="text-slate-600 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                  <span>Relationship</span>
                </span>
                <span className="text-slate-950 font-mono transition-all duration-300">
                  {liveTarget.relationship}%
                </span>
              </div>
              <ProgressBar value={liveTarget.relationship} color="emerald" size="sm" />
            </div>
          )}

          {/* Generosity Gauge (if parent) */}
          {liveTarget.generosity !== undefined && !isDeceased && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="text-slate-600 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-amber-500" />
                  <span>Generosity</span>
                </span>
                <span className="text-slate-950 font-mono">{liveTarget.generosity}%</span>
              </div>
              <ProgressBar value={liveTarget.generosity} color="amber" size="xs" />
            </div>
          )}
        </div>

        {/* Outcome Alert Toast */}
        {lastOutcome && (
          <div
            className={`rounded-2xl border-2 border-slate-900 p-3 flex flex-col gap-1 shadow-[2px_2px_0_#0f172a] animate-in fade-in duration-200 ${
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
                onClick={() =>
                  setActiveDrawer(activeDrawer === 'spend_time' ? null : 'spend_time')
                }
                disabled={spentTimeDone}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  spentTimeDone
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : activeDrawer === 'spend_time'
                    ? 'bg-amber-100 ring-2 ring-amber-500 shadow-[1.5px_2px_0_#0f172a]'
                    : 'bg-white hover:bg-amber-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Spend Time</div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">⏳</span>
                    {activeDrawer === 'spend_time' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {spentTimeDone ? 'Already hung out this year' : 'Choose activity & bond'}
                </div>
              </button>

              {/* 2. Conversation */}
              <button
                type="button"
                onClick={() =>
                  setActiveDrawer(activeDrawer === 'conversation' ? null : 'conversation')
                }
                disabled={chatDone}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  chatDone
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : activeDrawer === 'conversation'
                    ? 'bg-sky-100 ring-2 ring-sky-500 shadow-[1.5px_2px_0_#0f172a]'
                    : 'bg-white hover:bg-sky-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Chat</div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
                    {activeDrawer === 'conversation' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {chatDone ? 'Already chatted this year' : 'Pick dialogue topic'}
                </div>
              </button>

              {/* 3. Compliment */}
              <button
                type="button"
                onClick={() =>
                  setActiveDrawer(activeDrawer === 'compliment' ? null : 'compliment')
                }
                disabled={complimentDone}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  complimentDone
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : activeDrawer === 'compliment'
                    ? 'bg-emerald-100 ring-2 ring-emerald-500 shadow-[1.5px_2px_0_#0f172a]'
                    : 'bg-white hover:bg-emerald-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Compliment</div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                    {activeDrawer === 'compliment' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {complimentDone ? 'Already complimented' : 'Select flattery style'}
                </div>
              </button>

              {/* 4. Insult */}
              <button
                type="button"
                onClick={() =>
                  setActiveDrawer(activeDrawer === 'insult' ? null : 'insult')
                }
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  activeDrawer === 'insult'
                    ? 'bg-rose-100 ring-2 ring-rose-500 shadow-[1.5px_2px_0_#0f172a]'
                    : 'bg-white hover:bg-rose-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-rose-950">Insult</div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                    {activeDrawer === 'insult' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  Select roast & provoke
                </div>
              </button>

              {/* 5. Give Gift */}
              <button
                type="button"
                onClick={() =>
                  setActiveDrawer(activeDrawer === 'give_gift' ? null : 'give_gift')
                }
                disabled={giftDone}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  giftDone
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                    : activeDrawer === 'give_gift'
                    ? 'bg-purple-100 ring-2 ring-purple-500 shadow-[1.5px_2px_0_#0f172a]'
                    : 'bg-white hover:bg-purple-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-950">Give Gift</div>
                  <div className="flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-purple-600 stroke-[2.5]" />
                    {activeDrawer === 'give_gift' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {giftDone ? 'Gift sent this year' : 'Choose gift from catalog'}
                </div>
              </button>

              {/* 6. Ask for Money */}
              <button
                type="button"
                onClick={() => handleAction('ask_money')}
                disabled={askMoneyDone || (liveTarget.type !== 'parent' && liveTarget.relationship < 80)}
                className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                  askMoneyDone || (liveTarget.type !== 'parent' && liveTarget.relationship < 80)
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
                    : liveTarget.type === 'parent'
                    ? 'Request allowance/cash'
                    : 'Requires 80%+ bond'}
                </div>
              </button>
            </div>

            {/* EXPANDED INTERACTIVE OPTION DRAWERS */}

            {/* A. Spend Time Activity Picker */}
            {activeDrawer === 'spend_time' && !spentTimeDone && (
              <div className="rounded-2xl border-2 border-slate-900 bg-amber-50/90 p-3 flex flex-col gap-2 mt-1 shadow-[2px_2px_0_#0f172a] animate-in fade-in duration-150">
                <span className="text-xs font-black text-amber-950 flex items-center justify-between">
                  <span>Choose an Activity to Do Together:</span>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </span>
                <div className="flex flex-col gap-1.5">
                  {hangoutOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleAction('spend_time', undefined, opt.id)}
                      className="p-2 rounded-xl border border-slate-900 bg-white hover:bg-amber-100 text-left flex items-center gap-2.5 transition-all shadow-[1px_1.5px_0_#0f172a] cursor-pointer"
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-950">{opt.title}</span>
                        <span className="text-[10px] font-bold text-slate-600">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* B. Conversation Topic Picker */}
            {activeDrawer === 'conversation' && !chatDone && (
              <div className="rounded-2xl border-2 border-slate-900 bg-sky-50/90 p-3 flex flex-col gap-2 mt-1 shadow-[2px_2px_0_#0f172a] animate-in fade-in duration-150">
                <span className="text-xs font-black text-sky-950 flex items-center justify-between">
                  <span>Choose a Topic to Discuss:</span>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </span>
                <div className="flex flex-col gap-1.5">
                  {CHAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleAction('conversation', undefined, opt.id)}
                      className="p-2 rounded-xl border border-slate-900 bg-white hover:bg-sky-100 text-left flex items-center gap-2.5 transition-all shadow-[1px_1.5px_0_#0f172a] cursor-pointer"
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-950">{opt.title}</span>
                        <span className="text-[10px] font-bold text-slate-600">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* C. Compliment Style Picker */}
            {activeDrawer === 'compliment' && !complimentDone && (
              <div className="rounded-2xl border-2 border-slate-900 bg-emerald-50/90 p-3 flex flex-col gap-2 mt-1 shadow-[2px_2px_0_#0f172a] animate-in fade-in duration-150">
                <span className="text-xs font-black text-emerald-950 flex items-center justify-between">
                  <span>Choose a Compliment to Give:</span>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </span>
                <div className="flex flex-col gap-1.5">
                  {COMPLIMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleAction('compliment', undefined, opt.id)}
                      className="p-2 rounded-xl border border-slate-900 bg-white hover:bg-emerald-100 text-left flex items-center gap-2.5 transition-all shadow-[1px_1.5px_0_#0f172a] cursor-pointer"
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-950">{opt.title}</span>
                        <span className="text-[10px] font-bold text-slate-600">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* D. Insult / Roast Picker */}
            {activeDrawer === 'insult' && (
              <div className="rounded-2xl border-2 border-slate-900 bg-rose-50/90 p-3 flex flex-col gap-2 mt-1 shadow-[2px_2px_0_#0f172a] animate-in fade-in duration-150">
                <span className="text-xs font-black text-rose-950 flex items-center justify-between">
                  <span>Choose an Insult / Roast:</span>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </span>
                <div className="flex flex-col gap-1.5">
                  {INSULT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleAction('insult', undefined, opt.id)}
                      className="p-2 rounded-xl border border-slate-900 bg-white hover:bg-rose-100 text-left flex items-center gap-2.5 transition-all shadow-[1px_1.5px_0_#0f172a] cursor-pointer"
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-rose-950">{opt.title}</span>
                        <span className="text-[10px] font-bold text-slate-600">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* E. Gift Picker Drawer */}
            {activeDrawer === 'give_gift' && !giftDone && (
              <div className="rounded-2xl border-2 border-slate-900 bg-purple-50/90 p-3 flex flex-col gap-2 mt-1 shadow-[2px_2px_0_#0f172a] animate-in fade-in duration-150">
                <span className="text-xs font-black text-purple-950 flex items-center justify-between">
                  <span>Select a Gift to Present:</span>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
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
                        <div className="flex items-center gap-2.5">
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

            {/* Spark Romance Banner */}
            {liveTarget.type === 'friend' && character.age >= 16 && liveTarget.relationship >= 50 && !liveTarget.romanceUnlocked && (
              <div className="p-3 bg-rose-50 border-2 border-slate-900 rounded-2xl flex items-center justify-between shadow-[2px_2px_0_#0f172a] mt-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">💖</span>
                  <div>
                    <span className="text-xs font-black text-rose-950 block">Romantic Spark Available</span>
                    <span className="text-[10px] font-bold text-slate-600 block">Your bond is strong enough to explore romance!</span>
                  </div>
                </div>
                <CartoonButton variant="rose" size="sm" onClick={handleSparkRomance}>
                  Spark Romance ✨
                </CartoonButton>
              </div>
            )}

            {/* Romance Actions if unlocked */}
            {liveTarget.type === 'friend' && character.age >= 16 && liveTarget.romanceUnlocked && (() => {
              const pYearlyActions = character.yearlySocialActions?.[liveTarget.id] || [];
              const pRomanceActions = pYearlyActions.filter((a) => a.startsWith('romance_'));
              const pCount = pRomanceActions.length;
              const pLimit = pCount >= 2;
              const pFlirted = pRomanceActions.includes('romance_flirt');
              const pDated = pRomanceActions.includes('romance_date');

              return (
                <div className="flex flex-col gap-2 pt-2 border-t-2 border-rose-200 mt-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-rose-900 px-0.5">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      <span>Romance Actions</span>
                    </span>
                    <span
                      className={`font-mono ${
                        pLimit ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100'
                      } px-1.5 py-0.5 rounded text-[10px]`}
                    >
                      {pCount}/2 this year
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={pLimit || pFlirted}
                      onClick={() => setRomanceModal('flirt')}
                      className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all shadow-[1.5px_2px_0_#0f172a] flex items-center justify-between ${
                        pLimit || pFlirted
                          ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                          : 'bg-white hover:bg-rose-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-950">
                          {pFlirted ? 'Flirt (Done)' : 'Flirt'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">Test chemistry</span>
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </button>

                    <button
                      type="button"
                      disabled={pLimit || pDated}
                      onClick={() => setRomanceModal('date')}
                      className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all shadow-[1.5px_2px_0_#0f172a] flex items-center justify-between ${
                        pLimit || pDated
                          ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                          : 'bg-white hover:bg-rose-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-950">
                          {pDated ? 'Plan Date (Done)' : 'Plan Date'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">Choose venue</span>
                      </div>
                      <Wine className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>

                  {/* Milestone button: Ask Out */}
                  {liveTarget.romanticStage !== 'dating' && liveTarget.romanticStage !== 'engaged' && liveTarget.romanticStage !== 'married' && (() => {
                    const romanceVal = liveTarget.romanceMeter ?? 0;
                    const canAskOut = romanceVal >= 35 && liveTarget.relationship >= 50;
                    return (
                      <button
                        type="button"
                        onClick={() => setRomanceModal('ask_out')}
                        disabled={!canAskOut}
                        className={`w-full p-2.5 rounded-2xl border-2 border-slate-900 font-black text-xs shadow-[2px_2.5px_0_#0f172a] transition-all flex flex-col items-center justify-center gap-0.5 ${
                          canAskOut
                            ? 'bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white cursor-pointer active:translate-y-0.5'
                            : 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Heart className={`w-4 h-4 ${canAskOut ? 'fill-white' : 'fill-slate-400'}`} />
                          <span>Ask to Become Official Partners</span>
                        </div>
                        {!canAskOut && (
                          <span className="text-[10px] font-bold text-slate-500">
                            Requires 35% Love (Now: {romanceVal}%) & 50% Rel (Now: {Math.round(liveTarget.relationship)}%)
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-100 border-2 border-slate-300 text-center flex flex-col items-center gap-1.5">
            <span className="text-2xl">🕊️</span>
            <span className="text-xs font-black text-slate-700">Resting in Peace</span>
            <p className="text-[11px] font-bold text-slate-500">
              {liveTarget.name} lived a full life. You hold cherished memories together.
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
              setActiveDrawer(null);
              onClose();
            }}
          >
            Close
          </CartoonButton>
        </div>
      </div>

      {/* Romance Submodals using Universal Primitives */}
      {romanceModal === 'flirt' && friendTarget && (
        <ActionPickerModal
          isOpen={true}
          onClose={() => setRomanceModal(null)}
          title={`Flirt with ${friendTarget.firstName}`}
          icon={<Sparkles className="w-5 h-5 text-amber-500" />}
          subtitle="Pick a flirting technique to ignite romantic chemistry."
          target={friendTarget}
          items={FLIRT_OPTIONS.map((f) => ({
            id: f.id,
            title: f.label,
            subtitle: `"${f.dialogue}"`,
            badge: f.style,
            badgeColor: f.style === 'bold' ? 'rose' : f.style === 'playful' ? 'amber' : 'sky',
            statDeltas: [
              {
                label: 'Chemistry',
                delta: '+ Love',
                color: 'text-rose-600',
              },
            ],
            data: f,
          }))}
          onSelect={(f) => handleFlirt(f)}
        />
      )}

      {romanceModal === 'date' && friendTarget && (() => {
        const currentRomance = friendTarget.romanceMeter ?? 0;
        return (
          <ActionPickerModal
            isOpen={true}
            onClose={() => setRomanceModal(null)}
            title={`Plan Date with ${friendTarget.firstName}`}
            icon={<Wine className="w-5 h-5 text-rose-500" />}
            subtitle="Select a romantic setting to spend quality time together."
            target={friendTarget}
            items={DATE_VENUES.map((v) => {
              const canAfford = character.cash >= v.cost;
              const meetsRomance = currentRomance >= v.minRomance;
              const isAvailable = canAfford && meetsRomance;
              return {
                id: v.id,
                title: v.name,
                subtitle: v.vibe,
                description: v.description,
                emoji: v.emoji,
                cost: v.cost,
                disabled: !isAvailable,
                disabledReason: !meetsRomance
                  ? `Needs ${v.minRomance}% Romance`
                  : `Can't afford ($${v.cost.toLocaleString()})`,
                statDeltas: [
                  { label: 'Rel', delta: `+${v.relationshipBonus}%`, color: 'text-emerald-700' },
                  { label: 'Love', delta: `+${v.romanceBonus}%`, color: 'text-rose-600' },
                  { label: 'Happy', delta: `+${v.happinessBonus}%`, color: 'text-amber-700' },
                ],
                data: v,
              };
            })}
            onSelect={(v) => handleDate(v)}
          />
        );
      })()}

      {romanceModal === 'ask_out' && friendTarget && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setRomanceModal(null)}
          title={`Ask Out ${friendTarget.firstName}`}
          icon="❤️"
          message={`Are you ready to confess your feelings and ask ${friendTarget.firstName} to be your official partner?`}
          warningCallout={{
            title: 'Courting Milestone',
            bulletPoints: [
              'Changes your relationship status to official partners',
              'Takes 1 courtship turn this year',
              'Requires continuing commitment and mutual affection',
            ],
            variant: 'rose',
          }}
          confirmLabel="Ask Out Now! ❤️"
          confirmVariant="rose"
          disabled={
            (friendTarget.romanceMeter ?? 0) < 35 || friendTarget.relationship < 50
          }
          onConfirm={handleAskOut}
        >
          <DualMeterDisplay
            relationship={friendTarget.relationship}
            romanceMeter={friendTarget.romanceMeter ?? 0}
            romanceUnlocked={true}
          />
          <div className="text-[11px] font-bold text-slate-600 bg-white border border-slate-300 p-2.5 rounded-lg flex flex-col gap-1 mt-2">
            <div className="flex justify-between items-center">
              <span>Required Relationship:</span>
              <span className={friendTarget.relationship >= 50 ? 'text-emerald-700' : 'text-rose-600'}>
                {Math.round(friendTarget.relationship)}% / 50% min
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Required Romance:</span>
              <span className={(friendTarget.romanceMeter ?? 0) >= 35 ? 'text-emerald-700' : 'text-rose-600'}>
                {friendTarget.romanceMeter ?? 0}% / 35% min
              </span>
            </div>
          </div>
        </ConfirmModal>
      )}
    </Modal>
  );
};
