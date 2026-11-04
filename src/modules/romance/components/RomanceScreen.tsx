import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Users,
  Wine,
  MessageCircle,
  Gift,
  Flame,
  Church,
  Baby,
  UserX,
} from 'lucide-react';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { DualMeterDisplay } from './DualMeterDisplay';
import { ActionPickerModal, type ActionPickerItem } from '../../../components/ui/ActionPickerModal';
import { ActionOutcomeModal } from '../../../components/ui/ActionOutcomeModal';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { FLIRT_OPTIONS, DATE_VENUES, ROMANTIC_TALK_TOPICS, ROMANTIC_GIFTS } from '../data/romanticInteractions';
import { ProposalModal } from './ProposalModal';
import { WeddingPlannerModal } from './WeddingPlannerModal';
import { ChildDetailModal } from './ChildDetailModal';
import { DatingAppModal } from './DatingAppModal';
import { romanceService } from '../services/romanceService';
import { reproductionService } from '../services/reproductionService';
import { divorceService } from '../services/divorceService';
import { createId } from '../../../utils/id';
import { ShieldCheck, MessageCircleHeart } from 'lucide-react';
import type { CharacterProfile, PersonProfile, ChildProfile, LifeEvent } from '../../../types/game';
import type {
  FlirtOption,
  DateVenue,
  RomanticTalkOption,
  RomanticGift,
  EngagementRing,
  ProposalVenue,
  WeddingVenue,
  DatingCandidate,
} from '../types';

export interface RomanceReactionDeltas {
  romanceDelta?: number;
  relationshipDelta?: number;
  happinessDelta?: number;
  cashDelta?: number;
  isConception?: boolean;
  customBadge?: string;
}

interface RomanceScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (char: CharacterProfile) => void;
  onBackToMenu: () => void;
  onOpenRelationships: () => void;
}

export const RomanceScreen: React.FC<RomanceScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
  onOpenRelationships,
}) => {
  if (character.age < 16) {
    return (
      <div className="p-4 flex flex-col gap-4 bg-white min-h-[480px]">
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
          <button
            type="button"
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
            <span>Menu</span>
          </button>
          <span className="text-xs font-black text-slate-800">Romance & Dating</span>
        </div>

        <div className="p-6 rounded-2xl border-2 border-slate-900 bg-rose-50 text-center flex flex-col items-center gap-3 shadow-[2px_2.5px_0_#0f172a] my-auto">
          <span className="text-4xl">🔒</span>
          <h3 className="text-base font-black text-rose-950">Romance Unlocks at Age 16</h3>
          <p className="text-xs font-bold text-slate-600 max-w-xs leading-relaxed">
            Dating, partners, and romantic interactions are reserved for age 16 and older. Focus on school and friendships for now!
          </p>
          <CartoonButton variant="rose" onClick={onBackToMenu}>
            Back to Activities
          </CartoonButton>
        </div>
      </div>
    );
  }

  const [activeModal, setActiveModal] = useState<
    | null
    | 'dating_app'
    | 'proposal'
    | 'wedding'
    | 'child_detail'
  >(null);

  const [actionPicker, setActionPicker] = useState<{
    title: string;
    icon?: React.ReactNode;
    subtitle?: string;
    target?: PersonProfile;
    items: ActionPickerItem<any>[];
    onSelect: (item: any) => void;
  } | null>(null);

  const [askOutTarget, setAskOutTarget] = useState<PersonProfile | null>(null);

  const [activeTarget, setActiveTarget] = useState<PersonProfile | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [datingCandidates, setDatingCandidates] = useState<DatingCandidate[]>([]);
  const [datingPref, setDatingPref] = useState<'women' | 'men' | 'everyone'>(
    character.datingPreference || 'everyone'
  );
  const [reactionModal, setReactionModal] = useState<{
    title: string;
    icon?: string;
    partnerName?: string;
    avatarEmoji?: string;
    message: string;
    deltas?: RomanceReactionDeltas;
  } | null>(null);

  const partner = character.partner;

  /**
   * Helper to display outcome in ActionOutcomeModal popup AND log it into character.timeline
   */
  const triggerRomanceReaction = (
    baseChar: CharacterProfile,
    reaction: {
      title: string;
      icon?: string;
      partnerName?: string;
      avatarEmoji?: string;
      message: string;
      deltas?: RomanceReactionDeltas;
      skipJournal?: boolean;
      actionKey?: string;
      targetId?: string;
    }
  ) => {
    let finalChar = baseChar;

    if (reaction.actionKey && reaction.targetId) {
      const currentActions = finalChar.yearlySocialActions?.[reaction.targetId] || [];
      if (!currentActions.includes(reaction.actionKey)) {
        finalChar = {
          ...finalChar,
          yearlySocialActions: {
            ...(finalChar.yearlySocialActions || {}),
            [reaction.targetId]: [...currentActions, reaction.actionKey],
          },
        };
      }
    }

    if (!reaction.skipJournal) {
      const journalEntry: LifeEvent = {
        id: createId(),
        age: character.age,
        year: character.birthYear + character.age,
        title: reaction.title,
        message: reaction.message,
        category: 'relationship',
        icon: reaction.icon || '💖',
      };

      finalChar = {
        ...finalChar,
        timeline: [...(finalChar.timeline || []), journalEntry],
      };
    }

    onUpdateCharacter(finalChar);
    setReactionModal({
      title: reaction.title,
      icon: reaction.icon,
      partnerName: reaction.partnerName,
      avatarEmoji: reaction.avatarEmoji,
      message: reaction.message,
      deltas: reaction.deltas,
    });
  };

  // Open Dating App
  const handleOpenDatingApp = () => {
    const candidates = romanceService.generateDatingCandidates(character, 5, datingPref);
    setDatingCandidates(candidates);
    setActiveModal('dating_app');
  };

  // Match with candidate from Dating App
  const handleAskOutCandidate = (candidate: DatingCandidate) => {
    const newPerson: PersonProfile = {
      id: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      gender: candidate.gender,
      age: candidate.age,
      role: 'Dating Prospect',
      relationshipType: 'crush',
      relationship: 45,
      originStory: 'Matched on ArcDate dating app',
      stageMet: 'adulthood',
      avatarEmoji: candidate.avatarEmoji,
      romanceUnlocked: true,
      romanceMeter: 0,
      romanticStage: 'flirting',
      partnerStats: {
        craziness: candidate.craziness,
        generosity: candidate.generosity,
        looks: candidate.looks,
        smarts: candidate.smarts,
        fertility: candidate.fertility,
        occupation: candidate.occupation,
        annualIncome: candidate.annualIncome,
        yearsTogether: 0,
      },
    };

    const existingRel = character.relationships || [];
    const updatedChar: CharacterProfile = {
      ...character,
      relationships: [newPerson, ...existingRel],
    };

    setActiveModal(null);
    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    triggerRomanceReaction(updatedChar, {
      title: 'ArcDate Match',
      icon: '📱',
      partnerName: candidate.firstName,
      avatarEmoji: candidate.avatarEmoji,
      message: `You matched with ${candidateName} on ArcDate! You can now chat, flirt, and plan dates together. 📱✨`,
      deltas: {
        customBadge: 'New Match',
      },
    });
  };

  // Meet Someone In Real Life
  const handleMeetIRL = () => {
    if (character.cash < 40) {
      setReactionModal({
        title: 'Not Enough Cash',
        icon: '💵',
        message: 'You need at least $40 to go out socializing.',
      });
      return;
    }

    const candidate = romanceService.generateDatingCandidates(character, 1, datingPref)[0];
    const newPerson: PersonProfile = {
      id: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      gender: candidate.gender,
      age: candidate.age,
      role: 'Romantic Interest',
      relationshipType: 'crush',
      relationship: 40,
      originStory: 'Struck up a conversation at a downtown coffee lounge',
      stageMet: 'adulthood',
      avatarEmoji: candidate.avatarEmoji,
      romanceUnlocked: true,
      romanceMeter: 0,
      romanticStage: 'flirting',
      partnerStats: {
        craziness: candidate.craziness,
        generosity: candidate.generosity,
        looks: candidate.looks,
        smarts: candidate.smarts,
        fertility: candidate.fertility,
        occupation: candidate.occupation,
        annualIncome: candidate.annualIncome,
        yearsTogether: 0,
      },
    };

    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash - 40,
      relationships: [newPerson, ...(character.relationships || [])],
    };

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    triggerRomanceReaction(updatedChar, {
      title: 'Lounge Encounter',
      icon: '✨',
      partnerName: candidate.firstName,
      avatarEmoji: candidate.avatarEmoji,
      message: `You met ${candidateName} at a cozy lounge! You exchanged numbers and felt an initial spark. ✨`,
      deltas: {
        cashDelta: -40,
        customBadge: 'New Spark',
      },
    });
  };

  // Open Flirt Picker
  const handleOpenFlirtPicker = (targetPerson: PersonProfile) => {
    setActionPicker({
      title: `Flirt with ${targetPerson.firstName}`,
      icon: '✨',
      subtitle: 'Choose your flirting style and test your chemistry:',
      target: targetPerson,
      items: FLIRT_OPTIONS.map((flirt) => ({
        id: flirt.id,
        title: flirt.label,
        subtitle: `"${flirt.dialogue}"`,
        badge: flirt.style,
        badgeColor: flirt.style === 'bold' ? 'rose' : flirt.style === 'playful' ? 'amber' : 'sky',
        icon: <MessageCircleHeart className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />,
        data: flirt,
      })),
      onSelect: (flirt: FlirtOption) => {
        setActionPicker(null);
        handleExecuteFlirt(flirt, targetPerson);
      },
    });
  };

  // Open Date Picker
  const handleOpenDatePicker = (targetPerson: PersonProfile) => {
    const currentRomance = targetPerson.romanceMeter ?? 0;
    setActionPicker({
      title: `Plan a Date with ${targetPerson.firstName}`,
      icon: '🍷',
      subtitle: 'Select a date venue matching your chemistry and budget:',
      target: targetPerson,
      items: DATE_VENUES.map((venue) => {
        const canAfford = character.cash >= venue.cost;
        const meetsRomance = currentRomance >= venue.minRomance;
        const isAvailable = canAfford && meetsRomance;
        return {
          id: venue.id,
          title: venue.name,
          subtitle: venue.vibe,
          description: venue.description,
          emoji: venue.emoji,
          cost: venue.cost,
          disabled: !isAvailable,
          disabledReason: !meetsRomance
            ? `Needs ${venue.minRomance}% Romance`
            : `Can't afford ($${venue.cost.toLocaleString()})`,
          statDeltas: [
            { label: 'Rel', delta: `+${venue.relationshipBonus}%`, color: 'text-emerald-700' },
            { label: 'Love', delta: `+${venue.romanceBonus}%`, color: 'text-rose-600' },
            { label: 'Happy', delta: `+${venue.happinessBonus}%`, color: 'text-amber-700' },
          ],
          data: venue,
        };
      }),
      onSelect: (venue: DateVenue) => {
        setActionPicker(null);
        handleExecuteDate(venue, targetPerson);
      },
    });
  };

  // Open Deep Talk Picker
  const handleOpenTalkPicker = (targetPerson: PersonProfile) => {
    const currentRomance = targetPerson.romanceMeter ?? 0;
    setActionPicker({
      title: `Deep Talk with ${targetPerson.firstName}`,
      icon: '💬',
      subtitle: 'Pick a meaningful conversation topic to deepen your emotional bond:',
      target: targetPerson,
      items: ROMANTIC_TALK_TOPICS.map((topic) => {
        const isAvailable = currentRomance >= topic.minRomance;
        return {
          id: topic.id,
          title: topic.topic,
          description: topic.dialogue,
          icon: <MessageCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
          disabled: !isAvailable,
          disabledReason: !isAvailable ? `Needs ${topic.minRomance}% Love` : undefined,
          statDeltas: [
            {
              label: 'Bond & Romance',
              delta: '+',
              color: 'text-emerald-700',
              icon: <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />,
            },
          ],
          data: topic,
        };
      }),
      onSelect: (topic: RomanticTalkOption) => {
        setActionPicker(null);
        handleExecuteRomanticTalk(topic, targetPerson);
      },
    });
  };

  // Open Gift Picker
  const handleOpenGiftPicker = (targetPerson: PersonProfile) => {
    const currentRomance = targetPerson.romanceMeter ?? 0;
    setActionPicker({
      title: `Give Gift to ${targetPerson.firstName}`,
      icon: '🎁',
      subtitle: 'Choose a romantic present from thoughtful gestures to luxury surprises:',
      target: targetPerson,
      items: ROMANTIC_GIFTS.map((gift) => {
        const canAfford = character.cash >= gift.cost;
        const meetsRomance = currentRomance >= gift.minRomance;
        const isAvailable = canAfford && meetsRomance;
        return {
          id: gift.id,
          title: gift.name,
          subtitle: `"${gift.reaction}"`,
          emoji: gift.emoji,
          cost: gift.cost,
          disabled: !isAvailable,
          disabledReason: !meetsRomance
            ? `Needs ${gift.minRomance}% Love`
            : `Can't afford ($${gift.cost.toLocaleString()})`,
          statDeltas: [
            { label: 'Rel', delta: `+${gift.relationshipDelta}%`, color: 'text-emerald-700' },
            { label: 'Love', delta: `+${gift.romanceDelta}%`, color: 'text-rose-600' },
          ],
          data: gift,
        };
      }),
      onSelect: (gift: RomanticGift) => {
        setActionPicker(null);
        handleExecuteRomanticGift(gift, targetPerson);
      },
    });
  };

  // Open Intimacy Picker
  const handleOpenIntimacyPicker = (targetPerson: PersonProfile) => {
    setActionPicker({
      title: `Make Love with ${targetPerson.firstName}`,
      icon: '💋',
      subtitle: 'Choose your protection and intimacy preference:',
      target: targetPerson,
      items: [
        {
          id: 'unprotected',
          title: 'Unprotected / Passionate Intimacy',
          description:
            'Completely natural, raw passion. If biologically fertile, there is a natural probability of pregnancy!',
          badge: 'Conception Risk',
          badgeColor: 'rose',
          icon: <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />,
          data: 'unprotected' as const,
        },
        {
          id: 'pill',
          title: 'Birth Control Pill',
          description: 'Enjoy full intimacy with dependable hormonal birth control protection.',
          badge: '99% Protected',
          badgeColor: 'emerald',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />,
          data: 'pill' as const,
        },
        {
          id: 'condom',
          title: 'Safe Protection (Barrier)',
          description: 'Safe physical barrier contraception with virtually zero pregnancy risk.',
          badge: '98% Protected',
          badgeColor: 'sky',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />,
          data: 'condom' as const,
        },
      ],
      onSelect: (protection: 'unprotected' | 'pill' | 'condom') => {
        setActionPicker(null);
        handleExecuteIntimacy(protection);
      },
    });
  };

  // Open Family Planning Picker
  const handleOpenFamilyPlanningPicker = (targetPartner: PersonProfile) => {
    setActionPicker({
      title: `Family Planning with ${targetPartner.firstName}`,
      icon: '👶',
      subtitle: 'Explore paths to starting or growing your family:',
      target: targetPartner,
      items: [
        {
          id: 'natural',
          title: 'Try for a Baby Naturally',
          subtitle: 'Unprotected intimacy with your partner',
          description: 'Subject to natural biological fertility and age curve.',
          emoji: '👶',
          cost: 0,
          data: 'natural' as const,
        },
        {
          id: 'ivf',
          title: 'Fertility Clinic (IVF Treatment)',
          subtitle: 'Medical reproductive technology',
          description: 'Advanced clinical implantation with ~65% success rate.',
          emoji: '🔬',
          cost: 15000,
          disabled: character.cash < 15000,
          disabledReason: "Can't afford ($15,000)",
          data: 'ivf' as const,
        },
        {
          id: 'adopt_infant',
          title: 'Adopt an Infant (Age 0)',
          subtitle: 'Licensed adoption agency',
          description: 'Provide a permanent loving home for a newborn in need.',
          emoji: '🍼',
          cost: 6000,
          disabled: character.cash < 6000,
          disabledReason: "Can't afford ($6,000)",
          data: 'adopt_infant' as const,
        },
        {
          id: 'adopt_toddler',
          title: 'Adopt a Toddler (Age 2)',
          subtitle: 'Licensed adoption agency',
          description: 'Welcome an energetic toddler into your growing family.',
          emoji: '🧸',
          cost: 6000,
          disabled: character.cash < 6000,
          disabledReason: "Can't afford ($6,000)",
          data: 'adopt_toddler' as const,
        },
        {
          id: 'adopt_child',
          title: 'Adopt an Older Child (Age 6)',
          subtitle: 'Licensed adoption agency',
          description: 'Give a bright school-age child a fresh start and future.',
          emoji: '🎒',
          cost: 6000,
          disabled: character.cash < 6000,
          disabledReason: "Can't afford ($6,000)",
          data: 'adopt_child' as const,
        },
      ],
      onSelect: (choice) => {
        setActionPicker(null);
        if (choice === 'natural') {
          handleTryNatural();
        } else if (choice === 'ivf') {
          handleTryIVF();
        } else if (choice === 'adopt_infant') {
          handleAdopt('infant');
        } else if (choice === 'adopt_toddler') {
          handleAdopt('toddler');
        } else if (choice === 'adopt_child') {
          handleAdopt('child');
        }
      },
    });
  };

  // Open Divorce Picker
  const handleOpenDivorcePicker = (targetPartner: PersonProfile) => {
    const hasPrenup = targetPartner.partnerStats?.hasPrenup ?? false;
    setActionPicker({
      title: `File for Divorce from ${targetPartner.firstName}`,
      icon: '💔',
      subtitle: hasPrenup
        ? '🛡️ Active Prenuptial Agreement Found: Liquid savings and property are protected.'
        : '⚠️ No Prenuptial Agreement: Marital assets will be split 50/50 by the court.',
      target: targetPartner,
      items: [
        {
          id: 'public',
          title: 'Public Legal Aid Attorney',
          subtitle: 'Minimal cost, standard defense',
          emoji: '⚖️',
          cost: 300,
          disabled: character.cash < 300,
          disabledReason: "Can't afford ($300)",
          data: 'public' as const,
        },
        {
          id: 'standard',
          title: 'Private Family Law Firm',
          subtitle: 'Experienced negotiators for fair settlement',
          emoji: '🏛️',
          cost: 1500,
          disabled: character.cash < 1500,
          disabledReason: "Can't afford ($1,500)",
          data: 'standard' as const,
        },
        {
          id: 'high_powered',
          title: 'Elite Celebrity Divorce Litigators',
          subtitle: 'Aggressive defense, maximum asset retention',
          emoji: '💼',
          cost: 12000,
          disabled: character.cash < 12000,
          disabledReason: "Can't afford ($12,000)",
          data: 'high_powered' as const,
        },
      ],
      onSelect: (tier) => {
        setActionPicker(null);
        handleConfirmDivorce(tier);
      },
    });
  };

  // Execute Flirt
  const handleExecuteFlirt = (flirt: FlirtOption, targetOverride?: PersonProfile) => {
    const currentTarget = targetOverride || activeTarget || partner;
    if (!currentTarget) return;
    const { updatedTarget, result } = romanceService.executeFlirt(character, currentTarget, flirt);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const isCurrentPartner = partner?.id === updatedTarget.id;

    const updatedChar: CharacterProfile = {
      ...character,
      partner: isCurrentPartner ? updatedTarget : character.partner,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };

    setActiveModal(null);
    setActiveTarget(null);

    const fullMessage = `You tried ${flirt.label.toLowerCase()} with ${currentTarget.firstName}. ${result.message}`;
    triggerRomanceReaction(updatedChar, {
      title: result.success ? `Flirting with ${currentTarget.firstName}` : 'Awkward Flirt',
      icon: flirt.style === 'bold' ? '🔥' : '✨',
      partnerName: currentTarget.firstName,
      avatarEmoji: currentTarget.avatarEmoji,
      message: fullMessage,
      deltas: {
        romanceDelta: result.romanceDelta,
        relationshipDelta: result.relationshipDelta,
        happinessDelta: result.happinessDelta,
      },
      actionKey: 'romance_flirt',
      targetId: currentTarget.id,
    });
  };

  // Execute Date
  const handleExecuteDate = (venue: DateVenue, targetOverride?: PersonProfile) => {
    const currentTarget = targetOverride || activeTarget || partner;
    if (!currentTarget) return;
    const { updatedTarget, result } = romanceService.executeDate(character, currentTarget, venue);

    if (!result.success && result.relationshipDelta === 0) {
      setReactionModal({
        title: 'Date Cancelled',
        icon: '⚠️',
        partnerName: currentTarget.firstName,
        message: result.message,
      });
      return;
    }

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const isCurrentPartner = partner?.id === updatedTarget.id;

    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      partner: isCurrentPartner ? updatedTarget : character.partner,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };

    setActiveModal(null);
    setActiveTarget(null);

    triggerRomanceReaction(updatedChar, {
      title: `Date at ${venue.name}`,
      icon: venue.emoji || '🍷',
      partnerName: currentTarget.firstName,
      avatarEmoji: currentTarget.avatarEmoji,
      message: result.message,
      deltas: {
        romanceDelta: result.romanceDelta,
        relationshipDelta: result.relationshipDelta,
        happinessDelta: result.happinessDelta,
        cashDelta: result.cashDelta,
      },
      actionKey: 'romance_date',
      targetId: currentTarget.id,
    });
  };

  // Execute Romantic Talk
  const handleExecuteRomanticTalk = (talk: RomanticTalkOption, targetOverride?: PersonProfile) => {
    const currentTarget = targetOverride || activeTarget || partner;
    if (!currentTarget) return;
    const { updatedTarget, result } = romanceService.executeRomanticTalk(character, currentTarget, talk);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const isCurrentPartner = partner?.id === updatedTarget.id;

    const updatedChar: CharacterProfile = {
      ...character,
      partner: isCurrentPartner ? updatedTarget : character.partner,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, character.stats.happiness + (result.happinessDelta ?? 0)),
      },
    };

    setActiveModal(null);
    setActiveTarget(null);

    triggerRomanceReaction(updatedChar, {
      title: `Deep Talk with ${currentTarget.firstName}`,
      icon: '💬',
      partnerName: currentTarget.firstName,
      avatarEmoji: currentTarget.avatarEmoji,
      message: result.message,
      deltas: {
        romanceDelta: result.romanceDelta,
        relationshipDelta: result.relationshipDelta,
        happinessDelta: result.happinessDelta,
      },
      actionKey: 'romance_talk',
      targetId: currentTarget.id,
    });
  };

  // Execute Romantic Gift
  const handleExecuteRomanticGift = (gift: RomanticGift, targetOverride?: PersonProfile) => {
    const currentTarget = targetOverride || activeTarget || partner;
    if (!currentTarget) return;
    if (character.cash < gift.cost) {
      setReactionModal({
        title: 'Not Enough Cash',
        icon: '💰',
        partnerName: currentTarget.firstName,
        message: `You need at least $${gift.cost.toLocaleString()} for ${gift.name}.`,
      });
      return;
    }

    const { updatedTarget, result } = romanceService.executeRomanticGift(character, currentTarget, gift);
    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const isCurrentPartner = partner?.id === updatedTarget.id;

    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      partner: isCurrentPartner ? updatedTarget : character.partner,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, character.stats.happiness + (result.happinessDelta ?? 0)),
      },
    };

    setActiveModal(null);
    setActiveTarget(null);

    triggerRomanceReaction(updatedChar, {
      title: `Gift for ${currentTarget.firstName}`,
      icon: gift.emoji || '🎁',
      partnerName: currentTarget.firstName,
      avatarEmoji: currentTarget.avatarEmoji,
      message: result.message,
      deltas: {
        romanceDelta: result.romanceDelta,
        relationshipDelta: result.relationshipDelta,
        happinessDelta: result.happinessDelta,
        cashDelta: result.cashDelta,
      },
      actionKey: 'romance_gift',
      targetId: currentTarget.id,
    });
  };

  // Execute Intimacy
  const handleExecuteIntimacy = (protection: 'unprotected' | 'pill' | 'condom') => {
    if (!partner) return;
    const res = reproductionService.executeIntimacy(character, partner, protection);

    const partnerConceived = partner.gender === 'female' && res.conceptionOccurred;
    const updatedTarget: PersonProfile = {
      ...partner,
      relationship: Math.min(100, partner.relationship + res.relationshipDelta),
      romanceMeter: Math.min(100, (partner.romanceMeter ?? 0) + res.romanceDelta),
      partnerStats: partner.partnerStats
        ? {
            ...partner.partnerStats,
            isPregnant: partnerConceived || !!partner.partnerStats.isPregnant,
          }
        : partnerConceived
        ? {
            craziness: 30,
            generosity: 70,
            looks: 75,
            smarts: 75,
            fertility: 75,
            isPregnant: true,
          }
        : undefined,
    };

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const updatedChar: CharacterProfile = {
      ...character,
      partner: updatedTarget,
      relationships: updatedRelationships,
      isPregnant: character.gender === 'female' ? res.conceptionOccurred || character.isPregnant : false,
      stats: {
        ...character.stats,
        happiness: Math.min(100, character.stats.happiness + res.happinessDelta),
      },
    };

    setActiveModal(null);

    triggerRomanceReaction(updatedChar, {
      title: `Intimacy with ${partner.firstName}`,
      icon: '💋',
      partnerName: partner.firstName,
      avatarEmoji: partner.avatarEmoji,
      message: res.message,
      deltas: {
        romanceDelta: res.romanceDelta,
        relationshipDelta: res.relationshipDelta,
        happinessDelta: res.happinessDelta,
        isConception: res.conceptionOccurred,
      },
      actionKey: 'romance_intimacy',
      targetId: partner.id,
    });
  };

  // Confirm Ask Out
  const handleConfirmAskOut = (targetOverride?: PersonProfile) => {
    const currentTarget = targetOverride || activeTarget || partner;
    if (!currentTarget) return;
    const { updatedTarget, result } = romanceService.executeAskOut(character, currentTarget);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const newPartner = result.success
      ? updatedTarget
      : partner?.id === updatedTarget.id
      ? updatedTarget
      : partner;

    const updatedChar: CharacterProfile = {
      ...character,
      partner: newPartner,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };

    setActiveModal(null);
    setActiveTarget(null);

    triggerRomanceReaction(updatedChar, {
      title: result.success ? `Now Dating ${currentTarget.firstName}! 💖` : 'Ask Out Declined',
      icon: result.success ? '💖' : '💔',
      partnerName: currentTarget.firstName,
      avatarEmoji: currentTarget.avatarEmoji,
      message: result.message,
      deltas: {
        romanceDelta: result.romanceDelta,
        relationshipDelta: result.relationshipDelta,
        happinessDelta: result.happinessDelta,
      },
    });
  };

  // Confirm Proposal
  const handleConfirmProposal = (ring: EngagementRing, venue: ProposalVenue) => {
    const currentTarget = activeTarget || partner;
    if (!currentTarget) return;
    const { updatedTarget, result } = romanceService.executeProposal(character, currentTarget, ring, venue);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const isCurrentPartner = partner?.id === updatedTarget.id;

    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      partner: updatedTarget.romanticStage === 'ex' ? null : (isCurrentPartner ? updatedTarget : character.partner),
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };

    setActiveModal(null);
    setActiveTarget(null);

    triggerRomanceReaction(updatedChar, {
      title: result.success ? `Engaged to ${currentTarget.firstName}! 💍` : 'Proposal Declined',
      icon: '💍',
      partnerName: currentTarget.firstName,
      avatarEmoji: currentTarget.avatarEmoji,
      message: result.message,
      deltas: {
        romanceDelta: result.romanceDelta,
        relationshipDelta: result.relationshipDelta,
        happinessDelta: result.happinessDelta,
        cashDelta: result.cashDelta,
      },
    });
  };

  // Confirm Wedding
  const handleConfirmWedding = (venue: WeddingVenue, demandPrenup: boolean) => {
    if (!partner) return;
    const { updatedTarget, result } = romanceService.executeWedding(character, partner, venue, demandPrenup);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      partner: updatedTarget,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };

    setActiveModal(null);

    triggerRomanceReaction(updatedChar, {
      title: `Married to ${partner.firstName}! 💒`,
      icon: '💒',
      partnerName: partner.firstName,
      avatarEmoji: partner.avatarEmoji,
      message: result.message,
      deltas: {
        romanceDelta: result.romanceDelta,
        relationshipDelta: result.relationshipDelta,
        happinessDelta: result.happinessDelta,
        cashDelta: result.cashDelta,
        customBadge: demandPrenup ? 'Prenup Signed' : undefined,
      },
    });
  };

  // Break Up
  const handleBreakup = () => {
    if (!partner) return;
    const { updatedTarget, result } = romanceService.executeBreakup(character, partner);

    const exList = character.exPartners || [];
    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const updatedChar: CharacterProfile = {
      ...character,
      partner: null,
      exPartners: [...exList, updatedTarget],
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0)),
      },
    };

    triggerRomanceReaction(updatedChar, {
      title: `Broke Up with ${partner.firstName}`,
      icon: '💔',
      partnerName: partner.firstName,
      avatarEmoji: partner.avatarEmoji,
      message: result.message,
      deltas: {
        happinessDelta: result.happinessDelta,
      },
    });
  };

  // Confirm Divorce
  const handleConfirmDivorce = (attorneyTier: 'public' | 'standard' | 'high_powered') => {
    if (!partner) return;
    const { updatedCharacter, settlement } = divorceService.executeDivorce(character, partner, attorneyTier);

    setActiveModal(null);
    onUpdateCharacter(updatedCharacter);
    setReactionModal({
      title: 'Divorce Finalized',
      icon: '⚖️',
      partnerName: partner.firstName,
      avatarEmoji: partner.avatarEmoji,
      message: settlement.summaryMessage,
      deltas: {
        cashDelta: settlement.partnerShareCash > 0 ? -settlement.partnerShareCash : 0,
      },
    });
  };

  // Family Planning Handlers
  const handleTryNatural = () => {
    handleExecuteIntimacy('unprotected');
    setActiveModal(null);
  };

  const handleTryIVF = () => {
    if (!partner) return;
    const res = reproductionService.executeIVF(character, partner);
    if (!res.success && res.cashDelta === 0) {
      setReactionModal({
        title: 'Not Enough Cash',
        icon: '💵',
        message: res.message,
      });
      return;
    }

    const partnerConceived = partner.gender === 'female' && res.success;
    const updatedTarget: PersonProfile = {
      ...partner,
      partnerStats: partner.partnerStats
        ? {
            ...partner.partnerStats,
            isPregnant: partnerConceived || !!partner.partnerStats.isPregnant,
          }
        : partnerConceived
        ? {
            craziness: 30,
            generosity: 70,
            looks: 75,
            smarts: 75,
            fertility: 75,
            isPregnant: true,
          }
        : undefined,
    };

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + res.cashDelta,
      partner: updatedTarget,
      relationships: updatedRelationships,
      isPregnant: character.gender === 'female' ? res.success || character.isPregnant : false,
    };

    setActiveModal(null);

    triggerRomanceReaction(updatedChar, {
      title: res.success ? 'IVF Success! 🔬' : 'IVF Treatment Attempted',
      icon: '🔬',
      partnerName: partner.firstName,
      avatarEmoji: partner.avatarEmoji,
      message: res.message,
      deltas: {
        cashDelta: res.cashDelta,
        isConception: res.success,
      },
    });
  };

  const handleAdopt = (ageGroup: 'infant' | 'toddler' | 'child') => {
    const res = reproductionService.executeAdoption(character, ageGroup);
    if (!res.success) {
      setReactionModal({
        title: 'Adoption Notice',
        icon: '🏠',
        message: res.message,
      });
      return;
    }

    const currentChildren = character.children || [];
    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + res.cashDelta,
      children: [...currentChildren, res.child!],
    };

    setActiveModal(null);

    triggerRomanceReaction(updatedChar, {
      title: `Adopted ${res.child!.firstName}! 👶`,
      icon: '👶',
      message: res.message,
      deltas: {
        cashDelta: res.cashDelta,
        customBadge: 'New Family Member',
      },
    });
  };

  // Child Parenting Actions
  const handleChildSpendTime = (child: ChildProfile) => {
    const updatedChildren = (character.children || []).map((c) =>
      c.id === child.id ? { ...c, relationship: Math.min(100, c.relationship + 12), happiness: Math.min(100, c.happiness + 10) } : c
    );
    const updatedChar: CharacterProfile = {
      ...character,
      children: updatedChildren,
      stats: { ...character.stats, happiness: Math.min(100, character.stats.happiness + 5) },
    };
    setActiveModal(null);
    triggerRomanceReaction(updatedChar, {
      title: `Quality Time with ${child.firstName}`,
      icon: '🧸',
      partnerName: child.firstName,
      message: `You spent memorable quality time with ${child.firstName}! Their relationship and happiness blossomed.`,
      deltas: {
        relationshipDelta: 12,
        happinessDelta: 5,
      },
    });
  };

  const handleChildPraise = (child: ChildProfile) => {
    const updatedChildren = (character.children || []).map((c) =>
      c.id === child.id ? { ...c, relationship: Math.min(100, c.relationship + 8), smarts: Math.min(100, c.smarts + 4) } : c
    );
    const updatedChar: CharacterProfile = {
      ...character,
      children: updatedChildren,
    };
    setActiveModal(null);
    triggerRomanceReaction(updatedChar, {
      title: `Praised ${child.firstName}`,
      icon: '⭐',
      partnerName: child.firstName,
      message: `You praised ${child.firstName} for their efforts! Their confidence and smarts soared.`,
      deltas: {
        relationshipDelta: 8,
      },
    });
  };

  const handleChildAllowance = (child: ChildProfile, amount: number) => {
    if (character.cash < amount) {
      setReactionModal({
        title: 'Not Enough Cash',
        icon: '💵',
        message: 'You do not have enough cash.',
      });
      return;
    }
    const updatedChildren = (character.children || []).map((c) =>
      c.id === child.id ? { ...c, relationship: Math.min(100, c.relationship + 10), happiness: Math.min(100, c.happiness + 15) } : c
    );
    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash - amount,
      children: updatedChildren,
    };
    setActiveModal(null);
    triggerRomanceReaction(updatedChar, {
      title: `Allowance for ${child.firstName}`,
      icon: '💵',
      partnerName: child.firstName,
      message: `You gave ${child.firstName} a $${amount} allowance!`,
      deltas: {
        cashDelta: -amount,
        relationshipDelta: 10,
        happinessDelta: 5,
      },
    });
  };

  const datingProspects = (character.relationships || []).filter(
    (r) => r.romanceUnlocked && r.romanticStage === 'flirting' && r.id !== partner?.id
  );

  return (
    <div className="p-4 flex flex-col gap-3.5 bg-white min-h-[480px]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
        <button
          type="button"
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 text-xs font-black text-slate-800 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Activities</span>
        </button>

        <div className="flex items-center gap-1.5 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 text-xs font-black text-rose-900">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>Romance & Family</span>
        </div>
      </div>

      {/* Pregnancy Status Notification */}
      {character.isPregnant && (
        <div className="p-3 bg-amber-100 border-2 border-slate-900 rounded-2xl flex items-center gap-3 shadow-[2px_2px_0_#0f172a]">
          <span className="text-2xl">🍼</span>
          <div>
            <span className="text-xs font-black text-amber-950 block">
              Expecting a Baby!
            </span>
            <span className="text-[11px] font-semibold text-amber-900 leading-tight block">
              You are currently pregnant. Your child will be born upon aging up (+1 Year)!
            </span>
          </div>
        </div>
      )}

      {/* ================= PARTNER SECTION ================= */}
      {partner ? (
        <div className="flex flex-col gap-3">
          {/* Active Partner Hero Card */}
          <div className="p-4 rounded-2xl border-2 border-slate-900 bg-rose-50/70 shadow-[2px_3px_0_#0f172a] flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-300 border-2 border-slate-900 flex items-center justify-center text-3xl shadow-[1.5px_1.5px_0_#0f172a]">
                  {partner.avatarEmoji || '❤️'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-950 leading-tight">
                      {partner.firstName} {partner.lastName}
                    </h3>
                    <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-200 px-2 py-0.5 rounded-full border border-rose-400">
                      {partner.role}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    {partner.age} yrs old • {partner.partnerStats?.occupation || 'Employed'}
                  </span>
                  {partner.partnerStats?.annualIncome ? (
                    <span className="text-[10px] font-mono text-emerald-800 block">
                      Salary: ${partner.partnerStats.annualIncome.toLocaleString()}/yr
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Dual Meters */}
            <DualMeterDisplay
              relationship={partner.relationship}
              romanceMeter={partner.romanceMeter ?? 0}
              romanceUnlocked={true}
            />

            {/* Partner Details Strip */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-600 pt-1 border-t border-rose-200">
              <div className="flex flex-col">
                <span>Years Together</span>
                <span className="font-mono font-black text-rose-800">
                  {partner.partnerStats?.yearsTogether ?? 0} yrs
                </span>
              </div>
              <div className="flex flex-col">
                <span>Prenuptial</span>
                <span className="font-mono font-black text-emerald-800">
                  {partner.partnerStats?.hasPrenup ? 'Signed 🛡️' : 'None'}
                </span>
              </div>
              <div className="flex flex-col">
                <span>Ring</span>
                <span className="font-mono font-black text-sky-800 line-clamp-1">
                  {partner.partnerStats?.engagementRing?.name ? 'Yes 💍' : 'None'}
                </span>
              </div>
            </div>

            {/* Interactive Romance Actions Grid */}
            <div className="flex flex-col gap-2">
            {(() => {
              const partnerYearlyActions = character.yearlySocialActions?.[partner.id] || [];
              const partnerRomanceActions = partnerYearlyActions.filter((a) => a.startsWith('romance_'));
              const romanceCount = partnerRomanceActions.length;
              const isLimitReached = romanceCount >= 2;

              const hasDated = partnerRomanceActions.includes('romance_date');
              const hasFlirted = partnerRomanceActions.includes('romance_flirt');
              const hasTalked = partnerRomanceActions.includes('romance_talk');
              const hasGifted = partnerRomanceActions.includes('romance_gift');
              const hasIntimacy = partnerRomanceActions.includes('romance_intimacy');

              return (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Romantic Interactions
                    </h4>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        isLimitReached
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {romanceCount}/2 Actions This Year
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <CartoonButton
                      variant={isLimitReached || hasDated ? 'slate' : 'white'}
                      size="sm"
                      disabled={isLimitReached || hasDated}
                      className="flex items-center justify-center gap-1.5"
                      onClick={() => handleOpenDatePicker(partner)}
                    >
                      <Wine className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{hasDated ? 'Date (Done)' : 'Plan a Date'}</span>
                    </CartoonButton>

                    <CartoonButton
                      variant={isLimitReached || hasFlirted ? 'slate' : 'white'}
                      size="sm"
                      disabled={isLimitReached || hasFlirted}
                      className="flex items-center justify-center gap-1.5"
                      onClick={() => handleOpenFlirtPicker(partner)}
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{hasFlirted ? 'Flirt (Done)' : 'Flirt'}</span>
                    </CartoonButton>

                    <CartoonButton
                      variant={isLimitReached || hasTalked ? 'slate' : 'white'}
                      size="sm"
                      disabled={isLimitReached || hasTalked}
                      className="flex items-center justify-center gap-1.5"
                      onClick={() => handleOpenTalkPicker(partner)}
                    >
                      <MessageCircle className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>{hasTalked ? 'Deep Talk (Done)' : 'Deep Talk'}</span>
                    </CartoonButton>

                    <CartoonButton
                      variant={isLimitReached || hasGifted ? 'slate' : 'white'}
                      size="sm"
                      disabled={isLimitReached || hasGifted}
                      className="flex items-center justify-center gap-1.5"
                      onClick={() => handleOpenGiftPicker(partner)}
                    >
                      <Gift className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{hasGifted ? 'Gift (Done)' : 'Give Gift'}</span>
                    </CartoonButton>

                    {/* Intimacy: Gated behind 60% Love & 70% Relationship, plus annual limits */}
                    {(() => {
                      const meetsStats = (partner.romanceMeter ?? 0) >= 60 && partner.relationship >= 70;
                      const canMakeLove = meetsStats && !isLimitReached && !hasIntimacy;
                      return (
                        <CartoonButton
                          variant={canMakeLove ? 'white' : 'slate'}
                          size="sm"
                          disabled={!canMakeLove}
                          className={`flex items-center justify-center gap-1.5 ${!canMakeLove ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (canMakeLove) handleOpenIntimacyPicker(partner);
                          }}
                        >
                          <Flame className={`w-4 h-4 shrink-0 ${canMakeLove ? 'text-rose-600' : 'text-slate-400'}`} />
                          <span>
                            {hasIntimacy
                              ? 'Make Love (Done)'
                              : isLimitReached
                              ? 'Make Love (Limit 2/2)'
                              : meetsStats
                              ? 'Make Love'
                              : 'Make Love (60% Love)'}
                          </span>
                        </CartoonButton>
                      );
                    })()}

                    {/* Family Planning: Gated behind Marriage & 60% Love */}
                    {(() => {
                      const isMarried = partner.romanticStage === 'married';
                      const meetsRomance = (partner.romanceMeter ?? 0) >= 60 && partner.relationship >= 70;
                      const canFamily = isMarried && meetsRomance;
                      return (
                        <CartoonButton
                          variant={canFamily ? 'white' : 'slate'}
                          size="sm"
                          disabled={!canFamily}
                          className={`flex items-center justify-center gap-1.5 ${!canFamily ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (canFamily) handleOpenFamilyPlanningPicker(partner);
                          }}
                        >
                          <Baby className={`w-4 h-4 shrink-0 ${canFamily ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span>
                            {!isMarried ? 'Family (Married Only)' : !meetsRomance ? 'Family (60% Love)' : 'Family Planning'}
                          </span>
                        </CartoonButton>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Stage-Based Milestones */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
            {partner.romanticStage === 'flirting' && (
              <CartoonButton
                variant="rose"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setAskOutTarget(partner)}
              >
                <Heart className="w-4 h-4 fill-white shrink-0" />
                <span>Ask to Become Official Partners</span>
              </CartoonButton>
            )}

            {partner.romanticStage === 'dating' && (() => {
              const yearsDating = partner.partnerStats?.yearsTogether ?? 0;
              const meetsTenure = yearsDating >= 2;
              const meetsStats = (partner.romanceMeter ?? 0) >= 75 && partner.relationship >= 80;
              const canPropose = meetsTenure && meetsStats;

              let proposalLabel = '💍 Propose Marriage (Ring Shop)';
              if (!meetsTenure) {
                proposalLabel = `💍 Propose (Requires 2 Yrs Dating: Currently ${yearsDating} ${yearsDating === 1 ? 'Yr' : 'Yrs'})`;
              } else if (!meetsStats) {
                proposalLabel = `💍 Propose (Req. 75% Love [${partner.romanceMeter ?? 0}%] & 80% Rel [${Math.round(partner.relationship)}%])`;
              }

              return (
                <CartoonButton
                  variant={canPropose ? 'rose' : 'white'}
                  size="sm"
                  disabled={!canPropose}
                  className={`w-full flex items-center justify-center gap-2 ${!canPropose ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    setActiveTarget(partner);
                    setActiveModal('proposal');
                  }}
                >
                  <span>{proposalLabel}</span>
                </CartoonButton>
              );
            })()}

              {partner.romanticStage === 'engaged' && (
                <CartoonButton
                  variant="rose"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setActiveModal('wedding')}
                >
                  <Church className="w-4 h-4 text-white shrink-0" />
                  <span>Plan Wedding Ceremony 💒</span>
                </CartoonButton>
              )}

              {partner.romanticStage === 'married' ? (
                <CartoonButton
                  variant="slate"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleOpenDivorcePicker(partner)}
                >
                  <UserX className="w-4 h-4 shrink-0" />
                  <span>File for Divorce</span>
                </CartoonButton>
              ) : (
                <CartoonButton
                  variant="slate"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleBreakup}
                >
                  <UserX className="w-4 h-4 shrink-0" />
                  <span>Break Up</span>
                </CartoonButton>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================= SINGLE SECTION ================= */
        <div className="flex flex-col gap-3">
          <div className="p-4 rounded-2xl border-2 border-slate-900 bg-amber-50 shadow-[2px_2.5px_0_#0f172a] flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-300 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[1px_1px_0_#0f172a]">
              💔
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950">
                Currently Single
              </h3>
              <p className="text-[11px] font-semibold text-slate-600">
                {datingProspects.length > 0
                  ? `You have ${datingProspects.length} active dating prospect${datingProspects.length > 1 ? 's' : ''}! Build chemistry through flirting and dates.`
                  : 'You are not currently dating anyone. Look for love or connect with an acquaintance!'}
              </p>
            </div>
          </div>

          {/* Active Dating Prospects (Matches / Crushes / Romantic Interests) */}
          {datingProspects.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span>Dating Prospects & Matches ({datingProspects.length})</span>
                </h4>
              </div>

              <div className="flex flex-col gap-3">
                {datingProspects.map((prospect) => {
                  const romanceVal = prospect.romanceMeter ?? 0;
                  const canAskOut = romanceVal >= 35 && prospect.relationship >= 50;

                  return (
                    <div
                      key={prospect.id}
                      className="p-3.5 rounded-2xl border-2 border-slate-900 bg-white shadow-[2px_2.5px_0_#0f172a] flex flex-col gap-2.5"
                    >
                      {/* Top Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-xl bg-rose-200 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[1px_1px_0_#0f172a]">
                            {prospect.avatarEmoji || '💘'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-950">
                                {prospect.firstName} {prospect.lastName}
                              </span>
                              <span className="text-[9px] font-black uppercase text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded-full border border-rose-300">
                                {prospect.role || 'Prospect'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 block">
                              {prospect.age} yrs • {prospect.partnerStats?.occupation || 'Employed'}
                            </span>
                            {prospect.originStory && (
                              <span className="text-[9px] font-semibold text-slate-400 italic block line-clamp-1">
                                {prospect.originStory}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          Courtship
                        </span>
                      </div>

                      {/* Dual Meter */}
                      <DualMeterDisplay
                        relationship={prospect.relationship}
                        romanceMeter={romanceVal}
                        romanceUnlocked={true}
                      />

                      {/* Courtship Action Buttons */}
                      {(() => {
                        const pYearlyActions = character.yearlySocialActions?.[prospect.id] || [];
                        const pRomanceActions = pYearlyActions.filter((a) => a.startsWith('romance_'));
                        const pCount = pRomanceActions.length;
                        const pLimit = pCount >= 2;

                        const pDated = pRomanceActions.includes('romance_date');
                        const pFlirted = pRomanceActions.includes('romance_flirt');
                        const pTalked = pRomanceActions.includes('romance_talk');
                        const pGifted = pRomanceActions.includes('romance_gift');

                        return (
                          <>
                            <div className="flex items-center justify-between text-[11px] font-black text-slate-600 px-0.5">
                              <span>Courting Actions</span>
                              <span
                                className={`font-mono ${
                                  pLimit ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100'
                                } px-1.5 py-0.5 rounded text-[10px]`}
                              >
                                {pCount}/2 this year
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <CartoonButton
                                variant={pLimit || pFlirted ? 'slate' : 'white'}
                                size="sm"
                                disabled={pLimit || pFlirted}
                                className="flex items-center justify-center gap-1.5"
                                onClick={() => handleOpenFlirtPicker(prospect)}
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>{pFlirted ? 'Flirt (Done)' : 'Flirt'}</span>
                              </CartoonButton>

                              <CartoonButton
                                variant={pLimit || pDated ? 'slate' : 'white'}
                                size="sm"
                                disabled={pLimit || pDated}
                                className="flex items-center justify-center gap-1.5"
                                onClick={() => handleOpenDatePicker(prospect)}
                              >
                                <Wine className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{pDated ? 'Date (Done)' : 'Plan Date'}</span>
                              </CartoonButton>

                              <CartoonButton
                                variant={pLimit || pTalked ? 'slate' : 'white'}
                                size="sm"
                                disabled={pLimit || pTalked}
                                className="flex items-center justify-center gap-1.5"
                                onClick={() => handleOpenTalkPicker(prospect)}
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                <span>{pTalked ? 'Talk (Done)' : 'Deep Talk'}</span>
                              </CartoonButton>

                              <CartoonButton
                                variant={pLimit || pGifted ? 'slate' : 'white'}
                                size="sm"
                                disabled={pLimit || pGifted}
                                className="flex items-center justify-center gap-1.5"
                                onClick={() => handleOpenGiftPicker(prospect)}
                              >
                                <Gift className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{pGifted ? 'Gift (Done)' : 'Give Gift'}</span>
                              </CartoonButton>
                            </div>
                          </>
                        );
                      })()}

                      {/* Milestone Ask to be Partner */}
                      <CartoonButton
                        variant={canAskOut ? 'rose' : 'white'}
                        size="sm"
                        disabled={!canAskOut}
                        className={`w-full flex items-center justify-center gap-2 ${
                          !canAskOut ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        onClick={() => setAskOutTarget(prospect)}
                      >
                        <Heart className={`w-3.5 h-3.5 shrink-0 ${canAskOut ? 'fill-white' : 'text-slate-400'}`} />
                        <span>
                          {canAskOut
                            ? `Ask ${prospect.firstName} to be Partner ❤️`
                            : `Ask Out (Needs 35% Love [${romanceVal}%] & 50% Rel [${Math.round(prospect.relationship)}%])`}
                        </span>
                      </CartoonButton>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dating Options Hub */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Find Love
            </h4>

            <button
              type="button"
              onClick={handleOpenDatingApp}
              className="text-left p-3.5 rounded-2xl border-2 border-slate-900 bg-white hover:bg-rose-50 transition-all shadow-[2px_2px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-400 border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1px_1px_0_#0f172a]">
                  📱
                </div>
                <div>
                  <span className="text-xs font-black text-slate-950 group-hover:text-rose-950 block">
                    ArcDate Dating App
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Browse profiles of local verified singles matching your preferences.
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                Free
              </span>
            </button>

            <button
              type="button"
              onClick={handleMeetIRL}
              className="text-left p-3.5 rounded-2xl border-2 border-slate-900 bg-white hover:bg-amber-50 transition-all shadow-[2px_2px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1px_1px_0_#0f172a]">
                  🥂
                </div>
                <div>
                  <span className="text-xs font-black text-slate-950 group-hover:text-amber-950 block">
                    Meet Someone In Real Life
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Head to a downtown coffee lounge, fitness gym, or social gallery ($40).
                  </span>
                </div>
              </div>
              <span className="text-xs font-black font-mono text-emerald-700">
                $40
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenRelationships}
              className="text-left p-3.5 rounded-2xl border-2 border-slate-900 bg-white hover:bg-sky-50 transition-all shadow-[2px_2px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-400 border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1px_1px_0_#0f172a]">
                  💘
                </div>
                <div>
                  <span className="text-xs font-black text-slate-950 group-hover:text-sky-950 block">
                    Date an Existing Friend or Coworker
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Open your Relationships list and ignite a romantic spark with a friend (≥50% Rel).
                  </span>
                </div>
              </div>
              <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-800" />
            </button>
          </div>
        </div>
      )}

      {/* ================= CHILDREN SECTION ================= */}
      {character.children && character.children.length > 0 && (
        <div className="flex flex-col gap-2 pt-3 border-t-2 border-slate-900">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>👨‍👩‍👧‍👦 Your Children</span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                {character.children.length}
              </span>
            </h4>
          </div>

          <div className="flex flex-col gap-2">
            {character.children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => {
                  setSelectedChild(child);
                  setActiveModal('child_detail');
                }}
                className="text-left p-3 rounded-xl border-2 border-slate-900 bg-white hover:bg-amber-50/70 transition-all shadow-[1.5px_1.5px_0_#0f172a] hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">
                    {child.gender === 'female' ? '👧' : '👦'}
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-950 group-hover:text-amber-950 block">
                      {child.firstName} {child.lastName}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {child.age} yrs old • {child.occupation} {child.isAdopted ? '(Adopted)' : ''}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 block">
                    {Math.round(child.relationship)}% Rel
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= ACTIVE MODALS ================= */}
      {activeModal === 'dating_app' && (
        <DatingAppModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          candidates={datingCandidates}
          preference={datingPref}
          onChangePreference={(pref) => {
            setDatingPref(pref);
            const candidates = romanceService.generateDatingCandidates(character, 5, pref);
            setDatingCandidates(candidates);
          }}
          onAskOutCandidate={handleAskOutCandidate}
        />
      )}

      {/* Universal Action Picker for Flirt, Date, Deep Talk, Gift, Intimacy */}
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

      {/* Universal Confirmation for Milestone: Ask Out */}
      {askOutTarget && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setAskOutTarget(null)}
          title={`Ask Out ${askOutTarget.firstName}`}
          icon="❤️"
          message={`Are you ready to confess your feelings and ask ${askOutTarget.firstName} to be your official ${
            askOutTarget.gender === 'female' ? 'girlfriend' : askOutTarget.gender === 'male' ? 'boyfriend' : 'partner'
          }?`}
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
            (askOutTarget.romanceMeter ?? 0) < 35 || askOutTarget.relationship < 50
          }
          onConfirm={() => {
            const target = askOutTarget;
            setAskOutTarget(null);
            handleConfirmAskOut(target);
          }}
        >
          <DualMeterDisplay
            relationship={askOutTarget.relationship}
            romanceMeter={askOutTarget.romanceMeter ?? 0}
            romanceUnlocked={true}
          />
          <div className="text-[11px] font-bold text-slate-600 bg-white border border-slate-300 p-2.5 rounded-lg flex flex-col gap-1 mt-2">
            <div className="flex justify-between items-center">
              <span>Required Relationship:</span>
              <span className={askOutTarget.relationship >= 50 ? 'text-emerald-700' : 'text-rose-600'}>
                {Math.round(askOutTarget.relationship)}% / 50% min
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Required Romance:</span>
              <span className={(askOutTarget.romanceMeter ?? 0) >= 35 ? 'text-emerald-700' : 'text-rose-600'}>
                {askOutTarget.romanceMeter ?? 0}% / 35% min
              </span>
            </div>
          </div>
        </ConfirmModal>
      )}

      {activeModal === 'proposal' && (activeTarget || partner) && (
        <ProposalModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setActiveTarget(null);
          }}
          target={activeTarget || partner!}
          playerCash={character.cash}
          onConfirmProposal={handleConfirmProposal}
        />
      )}

      {activeModal === 'wedding' && partner && (
        <WeddingPlannerModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          target={partner}
          playerCash={character.cash}
          onConfirmWedding={handleConfirmWedding}
        />
      )}

      {activeModal === 'child_detail' && selectedChild && (
        <ChildDetailModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setSelectedChild(null);
          }}
          child={selectedChild}
          playerCash={character.cash}
          onSpendTime={() => handleChildSpendTime(selectedChild)}
          onPraise={() => handleChildPraise(selectedChild)}
          onGiveAllowance={(amt) => handleChildAllowance(selectedChild, amt)}
          onPayTuition={() => {
            if (character.cash < 15000) {
              setReactionModal({
                title: 'Insufficient Cash',
                icon: '🎓',
                message: 'Insufficient cash for college tuition ($15,000).',
              });
              return;
            }
            const updatedChildren = (character.children || []).map((c) =>
              c.id === selectedChild.id ? { ...c, relationship: 100, occupation: 'College Graduate' } : c
            );
            const updatedChar: CharacterProfile = {
              ...character,
              cash: character.cash - 15000,
              children: updatedChildren,
            };
            setActiveModal(null);
            triggerRomanceReaction(updatedChar, {
              title: `College Tuition for ${selectedChild.firstName}`,
              icon: '🎓',
              partnerName: selectedChild.firstName,
              message: `You paid $15,000 for ${selectedChild.firstName}'s college tuition! They graduated and are deeply grateful!`,
              deltas: {
                cashDelta: -15000,
                relationshipDelta: 20,
              },
            });
          }}
        />
      )}

      {/* Universal Action Outcome Popup */}
      {reactionModal && (
        <ActionOutcomeModal
          isOpen={true}
          onClose={() => setReactionModal(null)}
          title={reactionModal.title}
          icon={reactionModal.icon}
          partnerName={reactionModal.partnerName}
          avatarEmoji={reactionModal.avatarEmoji}
          message={reactionModal.message}
          statEffects={
            reactionModal.deltas?.happinessDelta
              ? { happiness: reactionModal.deltas.happinessDelta }
              : undefined
          }
          customDeltas={[
            ...(reactionModal.deltas?.romanceDelta !== undefined && reactionModal.deltas.romanceDelta !== 0
              ? [
                  {
                    label: 'Love',
                    delta:
                      reactionModal.deltas.romanceDelta > 0
                        ? `+${reactionModal.deltas.romanceDelta}%`
                        : `${reactionModal.deltas.romanceDelta}%`,
                    color: 'rose' as const,
                  },
                ]
              : []),
            ...(reactionModal.deltas?.relationshipDelta !== undefined && reactionModal.deltas.relationshipDelta !== 0
              ? [
                  {
                    label: 'Relationship',
                    delta:
                      reactionModal.deltas.relationshipDelta > 0
                        ? `+${reactionModal.deltas.relationshipDelta}%`
                        : `${reactionModal.deltas.relationshipDelta}%`,
                    color: (reactionModal.deltas.relationshipDelta > 0 ? 'emerald' : 'rose') as 'emerald' | 'rose',
                  },
                ]
              : []),
            ...(reactionModal.deltas?.cashDelta !== undefined && reactionModal.deltas.cashDelta !== 0
              ? [
                  {
                    label: 'Cash',
                    delta:
                      reactionModal.deltas.cashDelta > 0
                        ? `+$${reactionModal.deltas.cashDelta.toLocaleString()}`
                        : `-$${Math.abs(reactionModal.deltas.cashDelta).toLocaleString()}`,
                    color: (reactionModal.deltas.cashDelta > 0 ? 'emerald' : 'slate') as 'emerald' | 'slate',
                  },
                ]
              : []),
          ]}
          alertCallout={
            reactionModal.deltas?.isConception
              ? {
                  title: 'Baby on the Way! 🍼',
                  message: 'Pregnancy confirmed! A new bundle of joy will arrive next year.',
                  icon: '🍼',
                  variant: 'rose',
                }
              : reactionModal.deltas?.customBadge
              ? {
                  title: 'Romantic Milestone ✨',
                  message: reactionModal.deltas.customBadge,
                  icon: '✨',
                  variant: 'amber',
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
