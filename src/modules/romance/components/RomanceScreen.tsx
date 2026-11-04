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
import { FlirtModal } from './FlirtModal';
import { DatePlannerModal } from './DatePlannerModal';
import { IntimacyModal } from './IntimacyModal';
import { AskOutModal } from './AskOutModal';
import { ProposalModal } from './ProposalModal';
import { WeddingPlannerModal } from './WeddingPlannerModal';
import { FamilyPlanningModal } from './FamilyPlanningModal';
import { ChildDetailModal } from './ChildDetailModal';
import { DivorceModal } from './DivorceModal';
import { DatingAppModal } from './DatingAppModal';
import { romanceService } from '../services/romanceService';
import { reproductionService } from '../services/reproductionService';
import { divorceService } from '../services/divorceService';
import { ROMANTIC_GIFTS, ROMANTIC_TALK_TOPICS } from '../data/romanticInteractions';
import type { CharacterProfile, PersonProfile, ChildProfile } from '../../../types/game';
import type {
  FlirtOption,
  DateVenue,
  EngagementRing,
  ProposalVenue,
  WeddingVenue,
  DatingCandidate,
} from '../types';

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
  const [activeModal, setActiveModal] = useState<
    | null
    | 'dating_app'
    | 'flirt'
    | 'date'
    | 'intimacy'
    | 'ask_out'
    | 'proposal'
    | 'wedding'
    | 'family_planning'
    | 'child_detail'
    | 'divorce'
  >(null);

  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [datingCandidates, setDatingCandidates] = useState<DatingCandidate[]>([]);
  const [datingPref, setDatingPref] = useState<'women' | 'men' | 'everyone'>(
    character.datingPreference || 'everyone'
  );
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'danger' | 'info' } | null>(null);

  const partner = character.partner;

  const showToast = (message: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4500);
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
      role: 'Romantic Interest',
      relationshipType: 'crush',
      relationship: 70,
      originStory: 'Met through ArcDate dating app',
      stageMet: 'adulthood',
      avatarEmoji: candidate.avatarEmoji,
      romanceUnlocked: true,
      romanceMeter: 45,
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
      partner: newPerson, // Set as active dating interest
    };

    onUpdateCharacter(updatedChar);
    setActiveModal(null);
    showToast(`You and ${candidate.firstName} hit it off on ArcDate! You are now dating! ❤️`, 'success');
  };

  // Meet Someone In Real Life
  const handleMeetIRL = () => {
    if (character.cash < 40) {
      showToast('You need at least $40 to go out socializing.', 'danger');
      return;
    }

    const candidate = romanceService.generateDatingCandidates(character, 1, datingPref)[0];
    const newPerson: PersonProfile = {
      id: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      gender: candidate.gender,
      age: candidate.age,
      role: 'Crush',
      relationshipType: 'crush',
      relationship: 60,
      originStory: 'Struck up a conversation at a downtown coffee lounge',
      stageMet: 'adulthood',
      avatarEmoji: candidate.avatarEmoji,
      romanceUnlocked: true,
      romanceMeter: 35,
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
      partner: character.partner ? character.partner : newPerson,
    };

    onUpdateCharacter(updatedChar);
    showToast(`You met ${candidate.firstName} at a cozy lounge! There was an undeniable romantic spark. ✨`, 'success');
  };

  // Execute Flirt
  const handleExecuteFlirt = (flirt: FlirtOption) => {
    if (!partner) return;
    const { updatedTarget, result } = romanceService.executeFlirt(character, partner, flirt);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    const updatedChar: CharacterProfile = {
      ...character,
      partner: updatedTarget,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    };

    onUpdateCharacter(updatedChar);
    setActiveModal(null);
    showToast(result.message, result.success ? 'success' : 'danger');
  };

  // Execute Date
  const handleExecuteDate = (venue: DateVenue) => {
    if (!partner) return;
    const { updatedTarget, result } = romanceService.executeDate(character, partner, venue);

    if (!result.success && result.relationshipDelta === 0) {
      showToast(result.message, 'danger');
      return;
    }

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

    onUpdateCharacter(updatedChar);
    setActiveModal(null);
    showToast(result.message, result.success ? 'success' : 'danger');
  };

  // Execute Romantic Talk
  const handleExecuteRomanticTalk = () => {
    if (!partner) return;
    const talk = ROMANTIC_TALK_TOPICS[Math.floor(Math.random() * ROMANTIC_TALK_TOPICS.length)];
    const { updatedTarget, result } = romanceService.executeRomanticTalk(character, partner, talk);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    onUpdateCharacter({
      ...character,
      partner: updatedTarget,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, character.stats.happiness + (result.happinessDelta ?? 0)),
      },
    });

    showToast(result.message, 'success');
  };

  // Execute Romantic Gift
  const handleExecuteRomanticGift = () => {
    if (!partner) return;
    const gift = ROMANTIC_GIFTS[1]; // Red roses default
    if (character.cash < gift.cost) {
      showToast(`You need at least $${gift.cost} for ${gift.name}.`, 'danger');
      return;
    }

    const { updatedTarget, result } = romanceService.executeRomanticGift(character, partner, gift);
    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    onUpdateCharacter({
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      partner: updatedTarget,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, character.stats.happiness + (result.happinessDelta ?? 0)),
      },
    });

    showToast(result.message, 'success');
  };

  // Execute Intimacy
  const handleExecuteIntimacy = (protection: 'unprotected' | 'pill' | 'condom') => {
    if (!partner) return;
    const res = reproductionService.executeIntimacy(character, partner, protection);

    const updatedTarget: PersonProfile = {
      ...partner,
      relationship: Math.min(100, partner.relationship + res.relationshipDelta),
      romanceMeter: Math.min(100, (partner.romanceMeter ?? 50) + res.romanceDelta),
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

    onUpdateCharacter(updatedChar);
    setActiveModal(null);
    showToast(res.message, res.conceptionOccurred ? 'info' : 'success');
  };

  // Confirm Ask Out
  const handleConfirmAskOut = () => {
    if (!partner) return;
    const { updatedTarget, result } = romanceService.executeAskOut(character, partner);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    onUpdateCharacter({
      ...character,
      partner: updatedTarget,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    });

    setActiveModal(null);
    showToast(result.message, result.success ? 'success' : 'danger');
  };

  // Confirm Proposal
  const handleConfirmProposal = (ring: EngagementRing, venue: ProposalVenue) => {
    if (!partner) return;
    const { updatedTarget, result } = romanceService.executeProposal(character, partner, ring, venue);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    onUpdateCharacter({
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      partner: updatedTarget.romanticStage === 'ex' ? null : updatedTarget,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    });

    setActiveModal(null);
    showToast(result.message, result.success ? 'success' : 'danger');
  };

  // Confirm Wedding
  const handleConfirmWedding = (venue: WeddingVenue, demandPrenup: boolean) => {
    if (!partner) return;
    const { updatedTarget, result } = romanceService.executeWedding(character, partner, venue, demandPrenup);

    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    onUpdateCharacter({
      ...character,
      cash: character.cash + (result.cashDelta ?? 0),
      partner: updatedTarget,
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.min(100, Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0))),
      },
    });

    setActiveModal(null);
    showToast(result.message, result.success ? 'success' : 'danger');
  };

  // Break Up
  const handleBreakup = () => {
    if (!partner) return;
    const { updatedTarget, result } = romanceService.executeBreakup(character, partner);

    const exList = character.exPartners || [];
    const updatedRelationships = (character.relationships || []).map((r) =>
      r.id === updatedTarget.id ? updatedTarget : r
    );

    onUpdateCharacter({
      ...character,
      partner: null,
      exPartners: [...exList, updatedTarget],
      relationships: updatedRelationships,
      stats: {
        ...character.stats,
        happiness: Math.max(0, character.stats.happiness + (result.happinessDelta ?? 0)),
      },
    });

    showToast(result.message, 'danger');
  };

  // Confirm Divorce
  const handleConfirmDivorce = (attorneyTier: 'public' | 'standard' | 'high_powered') => {
    if (!partner) return;
    const { updatedCharacter, settlement } = divorceService.executeDivorce(character, partner, attorneyTier);

    onUpdateCharacter(updatedCharacter);
    setActiveModal(null);
    showToast(settlement.summaryMessage, 'info');
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
      showToast(res.message, 'danger');
      return;
    }

    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + res.cashDelta,
      isPregnant: res.success ? true : character.isPregnant,
    };

    onUpdateCharacter(updatedChar);
    setActiveModal(null);
    showToast(res.message, res.success ? 'success' : 'danger');
  };

  const handleAdopt = (ageGroup: 'infant' | 'toddler' | 'child') => {
    const res = reproductionService.executeAdoption(character, ageGroup);
    if (!res.success) {
      showToast(res.message, 'danger');
      return;
    }

    const currentChildren = character.children || [];
    const updatedChar: CharacterProfile = {
      ...character,
      cash: character.cash + res.cashDelta,
      children: [...currentChildren, res.child!],
    };

    onUpdateCharacter(updatedChar);
    setActiveModal(null);
    showToast(res.message, 'success');
  };

  // Child Parenting Actions
  const handleChildSpendTime = (child: ChildProfile) => {
    const updatedChildren = (character.children || []).map((c) =>
      c.id === child.id ? { ...c, relationship: Math.min(100, c.relationship + 12), happiness: Math.min(100, c.happiness + 10) } : c
    );
    onUpdateCharacter({
      ...character,
      children: updatedChildren,
      stats: { ...character.stats, happiness: Math.min(100, character.stats.happiness + 5) },
    });
    showToast(`You spent memorable quality time with ${child.firstName}!`, 'success');
    setActiveModal(null);
  };

  const handleChildPraise = (child: ChildProfile) => {
    const updatedChildren = (character.children || []).map((c) =>
      c.id === child.id ? { ...c, relationship: Math.min(100, c.relationship + 8), smarts: Math.min(100, c.smarts + 4) } : c
    );
    onUpdateCharacter({
      ...character,
      children: updatedChildren,
    });
    showToast(`You praised ${child.firstName} for their efforts! Their confidence soared.`, 'success');
    setActiveModal(null);
  };

  const handleChildAllowance = (child: ChildProfile, amount: number) => {
    if (character.cash < amount) {
      showToast('You do not have enough cash.', 'danger');
      return;
    }
    const updatedChildren = (character.children || []).map((c) =>
      c.id === child.id ? { ...c, relationship: Math.min(100, c.relationship + 10), happiness: Math.min(100, c.happiness + 15) } : c
    );
    onUpdateCharacter({
      ...character,
      cash: character.cash - amount,
      children: updatedChildren,
    });
    showToast(`You gave ${child.firstName} a $${amount} allowance!`, 'success');
    setActiveModal(null);
  };

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

      {/* Feedback Toast */}
      {feedbackToast && (
        <div
          className={`p-3 rounded-xl border-2 border-slate-900 text-xs font-black shadow-[2px_2px_0_#0f172a] animate-in fade-in transition-all ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-100 text-emerald-950'
              : feedbackToast.type === 'danger'
              ? 'bg-rose-100 text-rose-950'
              : 'bg-sky-100 text-sky-950'
          }`}
        >
          {feedbackToast.message}
        </div>
      )}

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
              romanceMeter={partner.romanceMeter ?? 50}
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
          </div>

          {/* Interactive Romance Actions Grid */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Romantic Interactions
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <CartoonButton
                variant="white"
                size="sm"
                className="flex items-center justify-center gap-1.5"
                onClick={() => setActiveModal('date')}
              >
                <Wine className="w-4 h-4 text-rose-500" />
                Plan a Date
              </CartoonButton>

              <CartoonButton
                variant="white"
                size="sm"
                className="flex items-center justify-center gap-1.5"
                onClick={() => setActiveModal('flirt')}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Flirt
              </CartoonButton>

              <CartoonButton
                variant="white"
                size="sm"
                className="flex items-center justify-center gap-1.5"
                onClick={handleExecuteRomanticTalk}
              >
                <MessageCircle className="w-4 h-4 text-sky-500" />
                Deep Talk
              </CartoonButton>

              <CartoonButton
                variant="white"
                size="sm"
                className="flex items-center justify-center gap-1.5"
                onClick={handleExecuteRomanticGift}
              >
                <Gift className="w-4 h-4 text-emerald-500" />
                Give Gift ($50)
              </CartoonButton>

              <CartoonButton
                variant="white"
                size="sm"
                className="flex items-center justify-center gap-1.5"
                onClick={() => setActiveModal('intimacy')}
              >
                <Flame className="w-4 h-4 text-rose-600" />
                Make Love
              </CartoonButton>

              <CartoonButton
                variant="white"
                size="sm"
                className="flex items-center justify-center gap-1.5"
                onClick={() => setActiveModal('family_planning')}
              >
                <Baby className="w-4 h-4 text-amber-600" />
                Family Planning
              </CartoonButton>
            </div>

            {/* Stage-Based Milestones */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
              {partner.romanticStage === 'flirting' && (
                <CartoonButton
                  variant="rose"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setActiveModal('ask_out')}
                >
                  <Heart className="w-4 h-4 fill-white" />
                  Ask to Become Official Partners
                </CartoonButton>
              )}

              {partner.romanticStage === 'dating' && (
                <CartoonButton
                  variant="rose"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setActiveModal('proposal')}
                >
                  <span className="text-sm">💍</span>
                  Propose Marriage (Ring Shop)
                </CartoonButton>
              )}

              {partner.romanticStage === 'engaged' && (
                <CartoonButton
                  variant="rose"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setActiveModal('wedding')}
                >
                  <Church className="w-4 h-4 text-white" />
                  Plan Wedding Ceremony 💒
                </CartoonButton>
              )}

              {partner.romanticStage === 'married' ? (
                <CartoonButton
                  variant="slate"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setActiveModal('divorce')}
                >
                  <UserX className="w-4 h-4" />
                  File for Divorce
                </CartoonButton>
              ) : (
                <CartoonButton
                  variant="slate"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleBreakup}
                >
                  <UserX className="w-4 h-4" />
                  Break Up
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
                You are not currently dating anyone. Look for love or connect with an acquaintance!
              </p>
            </div>
          </div>

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
                    Open your Relationships list and ignite a romantic spark with a friend (≥60% Rel).
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

      {activeModal === 'flirt' && partner && (
        <FlirtModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          target={partner}
          onSelectFlirt={handleExecuteFlirt}
        />
      )}

      {activeModal === 'date' && partner && (
        <DatePlannerModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          target={partner}
          playerCash={character.cash}
          onSelectVenue={handleExecuteDate}
        />
      )}

      {activeModal === 'intimacy' && partner && (
        <IntimacyModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          target={partner}
          onSelectProtection={handleExecuteIntimacy}
        />
      )}

      {activeModal === 'ask_out' && partner && (
        <AskOutModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          target={partner}
          onConfirmAskOut={handleConfirmAskOut}
        />
      )}

      {activeModal === 'proposal' && partner && (
        <ProposalModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          target={partner}
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

      {activeModal === 'family_planning' && partner && (
        <FamilyPlanningModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          target={partner}
          playerCash={character.cash}
          onTryNatural={handleTryNatural}
          onTryIVF={handleTryIVF}
          onAdopt={handleAdopt}
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
              showToast('Insufficient cash for college tuition.', 'danger');
              return;
            }
            const updatedChildren = (character.children || []).map((c) =>
              c.id === selectedChild.id ? { ...c, relationship: 100, occupation: 'College Graduate' } : c
            );
            onUpdateCharacter({
              ...character,
              cash: character.cash - 15000,
              children: updatedChildren,
            });
            showToast(`You paid $15,000 for ${selectedChild.firstName}'s college tuition!`, 'success');
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'divorce' && partner && (
        <DivorceModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          target={partner}
          playerCash={character.cash}
          onConfirmDivorce={handleConfirmDivorce}
        />
      )}
    </div>
  );
};
