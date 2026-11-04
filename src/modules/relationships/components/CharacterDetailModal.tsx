import React, { useState, useMemo } from 'react';
import {
  MessageCircle,
  Sparkles,
  Gift,
  DollarSign,
  Heart,
  Flame,
  Wine,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { DualMeterDisplay } from '../../romance/components/DualMeterDisplay';
import { ActionPickerModal, type ActionPickerItem } from '../../../components/ui/ActionPickerModal';
import { ActionOutcomeModal } from '../../../components/ui/ActionOutcomeModal';
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
  const [actionOutcome, setActionOutcome] = useState<SocialActionOutcome | null>(null);
  const [actionPicker, setActionPicker] = useState<{
    title: string;
    icon?: React.ReactNode;
    subtitle?: string;
    target?: PersonProfile;
    items: ActionPickerItem<any>[];
    onSelect: (item: any) => void;
  } | null>(null);
  const [isAskOutOpen, setIsAskOutOpen] = useState(false);

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
    const isPartnerTarget = character.partner?.id === target.id;
    const partnerCandidate = isPartnerTarget ? character.partner : null;
    const friend = (character.relationships || []).find((r) => r.id === target.id) || partnerCandidate;
    return friend
      ? {
          ...target,
          relationship: friend.relationship,
          age: friend.age,
          gender: friend.gender,
          romanceUnlocked: isPartnerTarget || friend.romanceUnlocked,
          romanceMeter: friend.romanceMeter,
          romanticStage: friend.romanticStage || (isPartnerTarget ? 'dating' : undefined),
          isAlive: true,
        }
      : target;
  }, [character, target]);

  // If liveTarget is an adult friend, get their full PersonProfile for romance interactions
  const friendTarget: PersonProfile | undefined = useMemo(() => {
    if (!liveTarget || liveTarget.type !== 'friend') return undefined;
    if (character.partner && character.partner.id === liveTarget.id) {
      return character.partner;
    }
    return (character.relationships || []).find((r) => r.id === liveTarget.id);
  }, [character, liveTarget]);

  if (!liveTarget) return null;

  const isPartner = character.partner?.id === liveTarget.id;

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
    setActionOutcome(outcome);
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
    setActionOutcome({
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
    const flirtCount = currentActions.filter((a) => a === 'romance_flirt').length;
    const newActions = flirtCount < 2 ? [...currentActions, 'romance_flirt'] : currentActions;
    const updatedChar: CharacterProfile = {
      ...character,
      relationships: updatedRel,
      partner: character.partner?.id === updatedTarget.id ? updatedTarget : character.partner,
      yearlySocialActions: {
        ...(character.yearlySocialActions || {}),
        [updatedTarget.id]: newActions,
      },
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };
    onUpdateCharacter(updatedChar);
    setActionOutcome({
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
    const dateCount = currentActions.filter((a) => a === 'romance_date').length;
    const newActions = dateCount < 2 ? [...currentActions, 'romance_date'] : currentActions;
    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      relationships: updatedRel,
      partner: character.partner?.id === updatedTarget.id ? updatedTarget : character.partner,
      yearlySocialActions: {
        ...(character.yearlySocialActions || {}),
        [updatedTarget.id]: newActions,
      },
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };
    onUpdateCharacter(updatedChar);
    setActionOutcome({
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
    setActionOutcome({
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

  // Picker Openers
  const handleOpenSpendTimePicker = () => {
    setActionPicker({
      title: `Hang Out with ${liveTarget.name}`,
      icon: '🍕',
      subtitle: 'Choose an activity to do together:',
      target: friendTarget,
      items: hangoutOptions.map((opt) => ({
        id: opt.id,
        title: opt.title,
        description: opt.description,
        emoji: opt.icon,
        data: opt.id,
      })),
      onSelect: (optId) => handleAction('spend_time', undefined, optId),
    });
  };

  const handleOpenChatPicker = () => {
    setActionPicker({
      title: `Chat with ${liveTarget.name}`,
      icon: '💬',
      subtitle: 'Pick a dialogue topic to discuss:',
      target: friendTarget,
      items: CHAT_OPTIONS.map((opt) => ({
        id: opt.id,
        title: opt.title,
        description: opt.description,
        emoji: opt.icon,
        data: opt.id,
      })),
      onSelect: (optId) => handleAction('conversation', undefined, optId),
    });
  };

  const handleOpenComplimentPicker = () => {
    setActionPicker({
      title: `Compliment ${liveTarget.name}`,
      icon: '✨',
      subtitle: 'Choose your flattery style:',
      target: friendTarget,
      items: COMPLIMENT_OPTIONS.map((opt) => ({
        id: opt.id,
        title: opt.title,
        description: opt.description,
        emoji: opt.icon,
        data: opt.id,
      })),
      onSelect: (optId) => handleAction('compliment', undefined, optId),
    });
  };

  const handleOpenInsultPicker = () => {
    setActionPicker({
      title: `Roast ${liveTarget.name}`,
      icon: '🔥',
      subtitle: 'Pick an insult or roast to provoke:',
      target: friendTarget,
      items: INSULT_OPTIONS.map((opt) => ({
        id: opt.id,
        title: opt.title,
        description: opt.description,
        emoji: opt.icon,
        data: opt.id,
      })),
      onSelect: (optId) => handleAction('insult', undefined, optId),
    });
  };

  const handleOpenGiftPicker = () => {
    setActionPicker({
      title: `Give Gift to ${liveTarget.name}`,
      icon: '🎁',
      subtitle: 'Select a present from the gift catalog:',
      target: friendTarget,
      items: GIFT_CATALOG.map((g) => ({
        id: g.id,
        title: g.name,
        description: g.description,
        emoji: g.icon,
        cost: g.cost,
        disabled: character.cash < g.cost,
        disabledReason: "Can't afford",
        data: g,
      })),
      onSelect: (g) => handleAction('give_gift', g),
    });
  };

  const handleOpenFlirtPicker = () => {
    if (!friendTarget) return;
    setActionPicker({
      title: `Flirt with ${friendTarget.firstName}`,
      icon: '✨',
      subtitle: 'Choose your flirting style and test your chemistry:',
      target: friendTarget,
      items: FLIRT_OPTIONS.map((f) => ({
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
      })),
      onSelect: (f) => handleFlirt(f),
    });
  };

  const handleOpenDatePicker = () => {
    if (!friendTarget) return;
    const currentRomance = friendTarget.romanceMeter ?? 0;
    setActionPicker({
      title: `Plan Date with ${friendTarget.firstName}`,
      icon: '🍷',
      subtitle: 'Select a romantic setting to spend quality time together:',
      target: friendTarget,
      items: DATE_VENUES.map((v) => {
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
      }),
      onSelect: (v) => handleDate(v),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setActionOutcome(null);
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
                onClick={handleOpenSpendTimePicker}
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
                  {spentTimeDone ? 'Already hung out this year' : 'Choose activity & bond'}
                </div>
              </button>

              {/* 2. Conversation */}
              <button
                type="button"
                onClick={handleOpenChatPicker}
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
                  {chatDone ? 'Already chatted this year' : 'Pick dialogue topic'}
                </div>
              </button>

              {/* 3. Compliment */}
              <button
                type="button"
                onClick={handleOpenComplimentPicker}
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
                  {complimentDone ? 'Already complimented' : 'Select flattery style'}
                </div>
              </button>

              {/* 4. Insult */}
              <button
                type="button"
                onClick={handleOpenInsultPicker}
                className="p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all bg-white hover:bg-rose-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a] active:translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-rose-950">Insult</div>
                  <Flame className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  Select roast & provoke
                </div>
              </button>

              {/* 5. Give Gift */}
              <button
                type="button"
                onClick={handleOpenGiftPicker}
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

            {/* Spark Romance Banner */}
            {liveTarget.type === 'friend' && character.age >= 16 && liveTarget.relationship >= 50 && !liveTarget.romanceUnlocked && !isPartner && (
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
              const pFlirtCount = pYearlyActions.filter((a) => a === 'romance_flirt').length;
              const pDateCount = pYearlyActions.filter((a) => a === 'romance_date').length;
              const pFlirtMaxed = pFlirtCount >= 2;
              const pDateMaxed = pDateCount >= 2;

              return (
                <div className="flex flex-col gap-2 pt-2 border-t-2 border-rose-200 mt-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-rose-900 px-0.5">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      <span>Romance Actions</span>
                    </span>
                    <span className="font-mono text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
                      2x per action
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={pFlirtMaxed}
                      onClick={handleOpenFlirtPicker}
                      className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all shadow-[1.5px_2px_0_#0f172a] flex items-center justify-between ${
                        pFlirtMaxed
                          ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                          : 'bg-white hover:bg-rose-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-950">
                          {pFlirtMaxed ? 'Flirt (2/2 Done)' : pFlirtCount === 1 ? 'Flirt (1/2)' : 'Flirt (0/2)'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">Test chemistry</span>
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </button>

                    <button
                      type="button"
                      disabled={pDateMaxed}
                      onClick={handleOpenDatePicker}
                      className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all shadow-[1.5px_2px_0_#0f172a] flex items-center justify-between ${
                        pDateMaxed
                          ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                          : 'bg-white hover:bg-rose-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-950">
                          {pDateMaxed ? 'Date (2/2 Done)' : pDateCount === 1 ? 'Plan Date (1/2)' : 'Plan Date (0/2)'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">Choose venue</span>
                      </div>
                      <Wine className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>

                  {/* Milestone button: Ask Out (only if not yet an official couple) */}
                  {!isPartner && liveTarget.romanticStage !== 'dating' && liveTarget.romanticStage !== 'engaged' && liveTarget.romanticStage !== 'married' && (() => {
                    const romanceVal = liveTarget.romanceMeter ?? 0;
                    const canAskOut = romanceVal >= 30 && liveTarget.relationship >= 45;
                    return (
                      <button
                        type="button"
                        onClick={() => setIsAskOutOpen(true)}
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
                            Requires 30% Love (Now: {romanceVal}%) & 45% Rel (Now: {Math.round(liveTarget.relationship)}%)
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Official Partner Badge */}
                  {isPartner && (
                    <div className="w-full p-2.5 rounded-2xl border-2 border-slate-900 bg-rose-100/90 font-black text-xs shadow-[1.5px_1.5px_0_#0f172a] flex items-center justify-center gap-2 text-rose-950 flex-wrap">
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500 shrink-0" />
                      <span>Official Romantic Partner ({liveTarget.role || 'Partner'})</span>
                      {friendTarget?.partnerStats?.isPregnant && (
                        <span className="bg-amber-200 text-amber-900 border border-amber-400 px-2 py-0.5 rounded-full text-[10px]">
                          🤰 Expecting Baby
                        </span>
                      )}
                    </div>
                  )}
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
              setActionOutcome(null);
              onClose();
            }}
          >
            Close
          </CartoonButton>
        </div>
      </div>

      {/* Universal Action Picker for Hangouts, Chat, Compliment, Insult, Gift, Flirt, Date */}
      {actionPicker && (
        <ActionPickerModal
          isOpen={true}
          onClose={() => setActionPicker(null)}
          title={actionPicker.title}
          icon={actionPicker.icon}
          subtitle={actionPicker.subtitle}
          target={actionPicker.target}
          items={actionPicker.items}
          onSelect={(item) => {
            const cb = actionPicker.onSelect;
            setActionPicker(null);
            cb(item);
          }}
        />
      )}

      {/* Milestone: Ask Out Confirmation */}
      {isAskOutOpen && friendTarget && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setIsAskOutOpen(false)}
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
          onConfirm={() => {
            setIsAskOutOpen(false);
            handleAskOut();
          }}
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

      {/* Universal Action Outcome Notice */}
      {actionOutcome && (
        <ActionOutcomeModal
          isOpen={Boolean(actionOutcome)}
          onClose={() => setActionOutcome(null)}
          title={actionOutcome.headline}
          icon={actionOutcome.success ? '✨' : '💥'}
          partnerName={actionOutcome.targetName}
          message={actionOutcome.narrative}
          statEffects={actionOutcome.statEffects}
          customDeltas={
            actionOutcome.relationshipDelta !== 0
              ? [
                  {
                    label: 'Relationship',
                    delta:
                      actionOutcome.relationshipDelta > 0
                        ? `+${actionOutcome.relationshipDelta}%`
                        : `${actionOutcome.relationshipDelta}%`,
                    color: actionOutcome.relationshipDelta > 0 ? 'emerald' : 'rose',
                  },
                ]
              : undefined
          }
          continueVariant={actionOutcome.success ? 'emerald' : 'slate'}
          continueLabel="Continue"
        />
      )}
    </Modal>
  );
};
