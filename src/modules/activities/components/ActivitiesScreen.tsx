import React, { useState } from 'react';
import {
  ArrowLeft,
  Compass,
  Dumbbell,
  Gavel,
  HeartPulse,
  IdCard,
  Lock,
  Martini,
  Plane,
  Scissors,
  Shield,
  Sparkles,
  Stethoscope,
  Utensils,
} from 'lucide-react';
import { ActionOutcomeModal } from '../../../components/ui/ActionOutcomeModal';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Modal } from '../../../components/ui/Modal';
import type { CharacterProfile, StatEffects } from '../../../types/game';
import { isCurrentlyIncarcerated } from '../../crime/services/crimeSelectors';
import {
  ACTIVITIES_MIN_AGE,
  BELT_RANKS,
  DIET_CATALOG,
  DIET_MIN_AGE,
  GYM_MEMBERSHIP_ANNUAL_FEE,
  MARTIAL_ARTS_CATALOG,
  MARTIAL_ARTS_LESSON_FEE,
  MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR,
  MIND_BODY_ACTIONS,
  MINOR_FREE_CUTOFF_AGE,
  getDietTemplate,
} from '../data/activitiesCatalog';
import {
  PLASTIC_SURGERY_CATALOG,
  PLASTIC_SURGERY_MIN_AGE,
  SURGERY_CLINIC_TIERS,
} from '../data/surgeryCatalog';
import {
  EMIGRATION_DESTINATIONS,
  EMIGRATION_MIN_AGE,
  LICENSE_CATALOG,
  VACATION_CABIN_CLASSES,
  VACATION_DESTINATIONS,
  VACATION_MIN_AGE,
} from '../data/travelLicenseCatalog';
import {
  CLUBBING_ENTRY_FEE,
  CLUBBING_MIN_AGE,
  CIVIL_ATTORNEY_TIERS,
  MAX_CLUBBING_PER_YEAR,
  REHAB_TIERS,
  getAddictionTemplate,
  getCivilAttorneyTier,
  getRehabTier,
} from '../data/nightlifeLawsuitCatalog';
import {
  getActiveAddictions,
  getActiveVacationCompanions,
  getClubbingSessionsRemaining,
  getEffectiveActivityFee,
  getEffectiveGymWorkoutFee,
  getHighestMartialArtBelt,
  getOpenLawsuitClaims,
  getRemainingActivityUses,
  getRemainingMartialArtsSessionsThisYear,
  getSanitizedActivitiesState,
  getSelfDefenseScore,
  hasLicense,
} from '../services/activitiesSelectors';
import { REHAB_MIN_AGE, attendRehab } from '../services/addictionService';
import { fileCivilLawsuit } from '../services/lawsuitService';
import { goClubbing, resolveViceTemptation } from '../services/nightlifeService';
import { getPlasticSurgeryCost, undergoPlasticSurgery } from '../services/surgeryService';
import {
  attemptEmigration,
  calculateVacationCost,
  drawDriversQuizQuestions,
  evaluateEmigrationEligibility,
  getAnnualLicenseAttemptsUsed,
  submitDriversLicenseQuiz,
  takeLicenseExam,
  takeVacation,
} from '../services/travelLicenseService';
import {
  performMindBodyAction,
  setCharacterDiet,
  toggleGymMembership,
  trainMartialArt,
} from '../services/activitiesService';
import type {
  ActivityActionResult,
  AddictionId,
  CivilAttorneyTierId,
  DietId,
  DriversQuizQuestion,
  MartialArtId,
  MindBodyActionId,
  PlasticSurgeryId,
  RehabTierId,
  SurgeryClinicTierId,
  VacationCabinClassId,
  VacationCompanionMode,
  VacationDestinationId,
  ViceTemptationOffer,
} from '../types';

export type ActivitiesTabId = 'mind_body' | 'surgery' | 'travel' | 'nightlife';

interface ActivitiesScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (character: CharacterProfile) => void;
  onBackToMenu: () => void;
  initialTab?: ActivitiesTabId;
}

interface OutcomeModalState {
  title: string;
  subtitle?: string;
  message: string;
  succeeded: boolean;
  statEffects?: StatEffects;
}

function formatStatBadges(effects: {
  health?: number;
  happiness?: number;
  smarts?: number;
  looks?: number;
  karma?: number;
}): Array<{ label: string; positive: boolean }> {
  const chips: Array<{ label: string; positive: boolean }> = [];
  if (effects.health) chips.push({ label: `${effects.health > 0 ? '+' : ''}${effects.health} Health`, positive: effects.health > 0 });
  if (effects.happiness) chips.push({ label: `${effects.happiness > 0 ? '+' : ''}${effects.happiness} Happy`, positive: effects.happiness > 0 });
  if (effects.smarts) chips.push({ label: `${effects.smarts > 0 ? '+' : ''}${effects.smarts} Smarts`, positive: effects.smarts > 0 });
  if (effects.looks) chips.push({ label: `${effects.looks > 0 ? '+' : ''}${effects.looks} Looks`, positive: effects.looks > 0 });
  if (effects.karma) chips.push({ label: `${effects.karma > 0 ? '+' : ''}${effects.karma} Karma`, positive: effects.karma > 0 });
  return chips;
}

export const ActivitiesScreen: React.FC<ActivitiesScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
  initialTab = 'mind_body',
}) => {
  const [activeTab, setActiveTab] = useState<ActivitiesTabId>(initialTab);
  const [outcome, setOutcome] = useState<OutcomeModalState | null>(null);
  const [selectedTier, setSelectedTier] = useState<SurgeryClinicTierId>('board_certified');
  const [selectedCabin, setSelectedCabin] = useState<VacationCabinClassId>('economy');
  const [selectedCompanion, setSelectedCompanion] = useState<VacationCompanionMode>('solo');
  const [selectedRehabTier, setSelectedRehabTier] = useState<RehabTierId>('standard');
  const [selectedAttorneyTier, setSelectedAttorneyTier] = useState<CivilAttorneyTierId>('private');
  const [pendingTemptation, setPendingTemptation] = useState<ViceTemptationOffer | null>(null);
  const [quizState, setQuizState] = useState<{
    isOpen: boolean;
    age: number;
    questions: DriversQuizQuestion[];
    answers: (number | null)[];
  } | null>(null);

  const incarcerated = isCurrentlyIncarcerated(character);
  const unlocked = character.age >= ACTIVITIES_MIN_AGE;
  const activities = getSanitizedActivitiesState(character);
  const activeDiet = getDietTemplate(activities.diet);
  const highestBelt = getHighestMartialArtBelt(character);
  const selfDefenseScore = getSelfDefenseScore(character);
  const martialSessionsLeft = getRemainingMartialArtsSessionsThisYear(character);
  const martialLessonFee = getEffectiveActivityFee(character, MARTIAL_ARTS_LESSON_FEE);
  const clubbingRemaining = getClubbingSessionsRemaining(character);
  const activeAddictions = getActiveAddictions(character);
  const openClaims = getOpenLawsuitClaims(character);
  const selectedRehab = getRehabTier(selectedRehabTier);
  const selectedAttorney = getCivilAttorneyTier(selectedAttorneyTier);
  const driversFee = LICENSE_CATALOG.find((l) => l.id === 'drivers')?.fee ?? 75;
  const companions = getActiveVacationCompanions(character);
  const effectiveCompanion: VacationCompanionMode =
    selectedCompanion === 'partner' && !companions.partner
      ? 'solo'
      : selectedCompanion === 'family' && companions.children.length === 0
        ? 'solo'
        : selectedCompanion;

  const handleOutcomeResult = (result: ActivityActionResult, statEffects?: StatEffects) => {
    if (result.succeeded) {
      onUpdateCharacter(result.character);
    }
    setOutcome({
      title: result.title,
      subtitle: result.costPaid > 0 ? `Wallet Cost: $${result.costPaid.toLocaleString()}` : undefined,
      message: result.summary,
      succeeded: result.succeeded,
      statEffects: result.succeeded ? statEffects : undefined,
    });
  };

  const handleRoutineClick = (actionId: MindBodyActionId) => {
    const res = performMindBodyAction(character, actionId);
    handleOutcomeResult(
      res,
      res.appliedEffects ?? (res.costPaid > 0 ? { cash: -res.costPaid } : undefined)
    );
  };

  const handleToggleGymPass = () => {
    const res = toggleGymMembership(character, !activities.gymMembershipActive);
    handleOutcomeResult(res, res.appliedEffects ?? (res.costPaid > 0 ? { cash: -res.costPaid } : undefined));
  };

  const handleTrainMartialArt = (discipline: MartialArtId) => {
    const res = trainMartialArt(character, discipline);
    handleOutcomeResult(
      res,
      res.appliedEffects ?? (res.costPaid > 0 ? { cash: -res.costPaid } : undefined)
    );
  };

  const handleSelectDiet = (dietId: DietId) => {
    const res = setCharacterDiet(character, dietId);
    handleOutcomeResult(res);
  };

  const handlePlasticSurgery = (procedureId: PlasticSurgeryId) => {
    const res = undergoPlasticSurgery(character, procedureId, selectedTier);
    handleOutcomeResult(res, res.appliedEffects);
  };

  const handleOpenDriversQuiz = () => {
    setQuizState((prev) =>
      prev && prev.age === character.age
        ? { ...prev, isOpen: true }
        : {
            isOpen: true,
            age: character.age,
            questions: drawDriversQuizQuestions(),
            answers: [null, null, null],
          }
    );
  };

  const handleSubmitDriversQuiz = () => {
    if (!quizState || quizState.answers.some((a) => a === null)) return;
    const res = submitDriversLicenseQuiz(
      character,
      quizState.questions,
      quizState.answers as number[]
    );
    setQuizState(null);
    handleOutcomeResult(res, res.appliedEffects);
  };

  const handleTakeLicenseExam = (licenseId: 'boating' | 'pilot') => {
    const res = takeLicenseExam(character, licenseId);
    handleOutcomeResult(res, res.appliedEffects);
  };

  const handleTakeVacation = (destinationId: VacationDestinationId) => {
    const res = takeVacation(character, destinationId, selectedCabin, effectiveCompanion);
    handleOutcomeResult(res, res.appliedEffects);
  };

  const handleAttemptEmigration = (country: string) => {
    const res = attemptEmigration(character, country);
    handleOutcomeResult(res, res.appliedEffects);
  };

  const handleGoClubbing = () => {
    const res = goClubbing(character);
    if (res.temptation) {
      if (res.succeeded) {
        onUpdateCharacter(res.character);
      }
      setPendingTemptation(res.temptation);
      return;
    }
    handleOutcomeResult(res, res.appliedEffects);
  };

  const handleResolveTemptation = (accepted: boolean) => {
    if (!pendingTemptation) return;
    const res = resolveViceTemptation(character, pendingTemptation.addictionId, accepted);
    setPendingTemptation(null);
    handleOutcomeResult(res, res.appliedEffects);
  };

  const handleAttendRehab = (addictionId: AddictionId) => {
    const res = attendRehab(character, addictionId, selectedRehabTier);
    handleOutcomeResult(res, res.appliedEffects);
  };

  const handleFileLawsuit = (claimId: string) => {
    const res = fileCivilLawsuit(character, claimId, selectedAttorneyTier);
    handleOutcomeResult(res, res.appliedEffects);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <CartoonButton
          variant="white"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBackToMenu}
        >
          Back to Menu
        </CartoonButton>
        <Badge variant="emerald" size="sm">
          Cash: ${character.cash.toLocaleString()}
        </Badge>
      </div>

      <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-emerald-600" />
              Mind &amp; Body
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Daily routines, gym training, martial arts dojo, and meal plans.
            </p>
          </div>
          {character.age < MINOR_FREE_CUTOFF_AGE && unlocked && !incarcerated && (
            <Badge variant="sky" size="xs">
              Parent-Sponsored (&lt; Age {MINOR_FREE_CUTOFF_AGE})
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5">
            <div className="text-[10px] font-black uppercase text-slate-400">Active Diet</div>
            <div className="text-xs font-black text-slate-900 truncate mt-0.5">
              {activeDiet.name}
            </div>
          </div>
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5">
            <div className="text-[10px] font-black uppercase text-slate-400">Highest Belt</div>
            <div className="text-xs font-black text-slate-900 truncate mt-0.5">
              {highestBelt.label}
            </div>
          </div>
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5">
            <div className="text-[10px] font-black uppercase text-slate-400">Self-Defense</div>
            <div className="text-xs font-black text-slate-900 mt-0.5">
              {selfDefenseScore} / 100
            </div>
          </div>
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5">
            <div className="text-[10px] font-black uppercase text-slate-400">Gym Pass</div>
            <div className="text-xs font-black text-slate-900 mt-0.5">
              {character.age < MINOR_FREE_CUTOFF_AGE
                ? 'Parents Cover'
                : activities.gymMembershipActive
                  ? 'Active ($200/yr)'
                  : 'Drop-in ($50)'}
            </div>
          </div>
        </div>
      </div>

      {!unlocked ? (
        <div className="bg-amber-50 border-[2.5px] border-slate-900 rounded-2xl p-6 text-center shadow-[0_3px_0_#0f172a]">
          <Lock className="w-8 h-8 text-amber-700 mx-auto mb-2" />
          <h3 className="text-base font-black text-slate-900">
            Mind &amp; Body Unlocks at Age {ACTIVITIES_MIN_AGE}
          </h3>
          <p className="text-xs font-bold text-slate-600 mt-1">
            Come back at Age {ACTIVITIES_MIN_AGE} to walk, meditate, visit the library, and start martial arts.
          </p>
        </div>
      ) : incarcerated ? (
        <div className="bg-rose-50 border-[2.5px] border-slate-900 rounded-2xl p-6 text-center shadow-[0_3px_0_#0f172a]">
          <Lock className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="text-base font-black text-rose-950">Locked While In Prison</h3>
          <p className="text-xs font-bold text-rose-800 mt-1 max-w-md mx-auto">
            External Mind &amp; Body routines, dojo lessons, salon visits, and custom diets are suspended while serving your sentence. Active diet and gym billing are paused until release.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'mind_body', label: 'Mind & Body' },
                { id: 'surgery', label: 'Surgery' },
                { id: 'travel', label: 'Licenses & Travel' },
                { id: 'nightlife', label: 'Nightlife & Legal' },
              ] as const
            ).map((tab) => (
              <CartoonButton
                key={tab.id}
                variant={activeTab === tab.id ? 'slate' : 'white'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </CartoonButton>
            ))}
          </div>

          {activeTab === 'mind_body' && (
            <>
              {/* Section 1: Mind & Body Routines */}
          <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-600" />
                Mind &amp; Body Routines
              </h3>
              {character.age >= MINOR_FREE_CUTOFF_AGE && (
                <CartoonButton
                  variant={activities.gymMembershipActive ? 'rose' : 'sky'}
                  size="sm"
                  icon={<Dumbbell className="w-3.5 h-3.5" />}
                  onClick={handleToggleGymPass}
                >
                  {activities.gymMembershipActive
                    ? 'Cancel Gym Pass'
                    : `Buy Gym Pass ($${GYM_MEMBERSHIP_ANNUAL_FEE}/yr)`}
                </CartoonButton>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MIND_BODY_ACTIONS.map((action) => {
                const ageLocked = character.age < action.minAge;
                const remaining = getRemainingActivityUses(character, action.id);
                const fee =
                  action.id === 'gym_workout'
                    ? getEffectiveGymWorkoutFee(character, action.baseCost)
                    : getEffectiveActivityFee(character, action.baseCost);
                const canAfford = character.cash >= fee;
                const feeLabel =
                  fee > 0
                    ? `$${fee}`
                    : action.baseCost > 0 && character.age < MINOR_FREE_CUTOFF_AGE
                      ? 'Free (Parents)'
                      : action.id === 'gym_workout' && activities.gymMembershipActive
                        ? 'Free (Pass)'
                        : 'Free';
                const chips = formatStatBadges(action.effects);

                return (
                  <div
                    key={action.id}
                    className="border-2 border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2.5 bg-slate-50/70"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-slate-900">
                          {action.name}
                        </span>
                        <Badge
                          variant={
                            action.category === 'Mind'
                              ? 'purple'
                              : action.category === 'Body'
                                ? 'emerald'
                                : 'amber'
                          }
                          size="xs"
                        >
                          {action.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 mt-1">
                        {action.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {chips.map((chip) => (
                          <span
                            key={chip.label}
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                              chip.positive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                      <span className="text-[11px] font-black text-slate-500">
                        {feeLabel} • {remaining}/{action.annualLimit} left
                      </span>
                      <CartoonButton
                        variant={ageLocked || remaining === 0 || !canAfford ? 'white' : 'emerald'}
                        size="sm"
                        disabled={ageLocked || remaining === 0 || !canAfford}
                        onClick={() => handleRoutineClick(action.id)}
                      >
                        {ageLocked
                          ? `Age ${action.minAge}`
                          : remaining === 0
                            ? 'Done'
                            : !canAfford
                              ? `Need $${fee}`
                              : 'Do Activity'}
                      </CartoonButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Martial Arts Dojo */}
          <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-600" />
                  Martial Arts Dojo
                </h3>
                <p className="text-[11px] font-semibold text-slate-500">
                  Earn belts across 5 disciplines (+4 Health, +2 Happiness, +1 Smarts per lesson).
                </p>
              </div>
              <Badge variant="amber" size="xs">
                {martialSessionsLeft}/{MAX_MARTIAL_ARTS_SESSIONS_PER_YEAR} sessions left this yr
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MARTIAL_ARTS_CATALOG.map((discipline) => {
                const progress = activities.martialArts[discipline.id];
                const beltRank = progress?.beltRank ?? 0;
                const beltMeta = BELT_RANKS[beltRank];
                const trainedThisYear = progress?.lastTrainedAge === character.age;
                const mastered = beltRank >= 7;
                const canAfford = character.cash >= martialLessonFee;
                const disabled =
                  mastered || trainedThisYear || martialSessionsLeft === 0 || !canAfford;

                return (
                  <div
                    key={discipline.id}
                    className="border-2 border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2 bg-slate-50/70"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-black text-slate-900">
                            {discipline.name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1.5">
                            {discipline.origin}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${beltMeta.colorClass}`}
                        >
                          {beltMeta.label}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 mt-1">
                        {discipline.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                      <span className="text-[11px] font-black text-slate-500">
                        {martialLessonFee === 0
                          ? 'Free (Parents)'
                          : `$${martialLessonFee}/lesson`}
                      </span>
                      <CartoonButton
                        variant={disabled ? 'white' : 'amber'}
                        size="sm"
                        disabled={disabled}
                        onClick={() => handleTrainMartialArt(discipline.id)}
                      >
                        {mastered
                          ? 'Black Belt'
                          : trainedThisYear
                            ? 'Trained'
                            : martialSessionsLeft === 0
                              ? 'Yr Cap'
                              : !canAfford
                                ? `Need $${martialLessonFee}`
                                : 'Train Lesson'}
                      </CartoonButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Diet & Nutrition */}
          <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  Diet &amp; Nutrition
                </h3>
                <p className="text-[11px] font-semibold text-slate-500">
                  Your diet applies yearly stat changes and annual grocery cost on Age Up.
                </p>
              </div>
              {character.age < DIET_MIN_AGE && (
                <Badge variant="slate" size="xs">
                  Unlocks at Age {DIET_MIN_AGE}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DIET_CATALOG.map((diet) => {
                const isSelected = activities.diet === diet.id;
                const dietAgeLocked = character.age < DIET_MIN_AGE;
                const effectiveAnnualCost = getEffectiveActivityFee(
                  character,
                  diet.annualCost
                );
                const statChips = formatStatBadges({
                  health: diet.healthDelta,
                  happiness: diet.happinessDelta,
                  looks: diet.looksDelta,
                  karma: diet.karmaDelta,
                });

                return (
                  <div
                    key={diet.id}
                    className={`border-2 rounded-xl p-3 flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70'
                        : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-slate-900">{diet.name}</span>
                        <Badge variant={isSelected ? 'emerald' : 'slate'} size="xs">
                          {diet.annualCost === 0
                            ? '$0/yr'
                            : effectiveAnnualCost === 0
                              ? 'Free (<16)'
                              : `$${effectiveAnnualCost}/yr`}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 mt-1">
                        {diet.description}
                      </p>
                      {statChips.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {statChips.map((chip) => (
                            <span
                              key={chip.label}
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                                chip.positive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {chip.label}/yr
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <CartoonButton
                      variant={isSelected || dietAgeLocked ? 'white' : 'emerald'}
                      size="sm"
                      fullWidth
                      disabled={isSelected || dietAgeLocked}
                      onClick={() => handleSelectDiet(diet.id)}
                    >
                      {dietAgeLocked
                        ? `Age ${DIET_MIN_AGE}`
                        : isSelected
                          ? 'Active Diet'
                          : 'Select Diet'}
                    </CartoonButton>
                  </div>
                );
              })}
            </div>
          </div>
            </>
          )}

          {activeTab === 'surgery' && (
            <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-rose-600" />
                    Cosmetic &amp; Plastic Surgery
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Choose a clinic tier carefully — cheaper clinics carry higher malpractice risk.
                  </p>
                </div>
                {character.age < PLASTIC_SURGERY_MIN_AGE && (
                  <Badge variant="slate" size="xs">
                    Unlocks at Age {PLASTIC_SURGERY_MIN_AGE}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SURGERY_CLINIC_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={`text-left border-2 rounded-xl p-2.5 cursor-pointer transition-colors ${
                      selectedTier === tier.id
                        ? 'border-slate-900 bg-amber-50'
                        : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="text-xs font-black text-slate-900">{tier.name}</div>
                    <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {tier.priceMultiplier}x fee • {Math.round(tier.botchChance * 100)}% risk
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PLASTIC_SURGERY_CATALOG.map((proc) => {
                  const ageLocked = character.age < PLASTIC_SURGERY_MIN_AGE;
                  const cost = getPlasticSurgeryCost(proc.id, selectedTier);
                  const canAfford = character.cash >= cost;

                  return (
                    <div
                      key={proc.id}
                      className="border-2 border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2 bg-slate-50/70"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-slate-900">{proc.name}</span>
                          <Badge variant="amber" size="xs">
                            ${cost.toLocaleString()}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 mt-1">
                          {proc.description}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md border bg-emerald-50 text-emerald-800 border-emerald-200">
                            +{proc.looksGain} Looks
                          </span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md border bg-emerald-50 text-emerald-800 border-emerald-200">
                            +{proc.happinessGain} Happy
                          </span>
                        </div>
                      </div>

                      <CartoonButton
                        variant={ageLocked || !canAfford ? 'white' : 'rose'}
                        size="sm"
                        disabled={ageLocked || !canAfford}
                        onClick={() => handlePlasticSurgery(proc.id)}
                      >
                        {ageLocked
                          ? `Age ${PLASTIC_SURGERY_MIN_AGE}`
                          : !canAfford
                            ? `Need $${cost.toLocaleString()}`
                            : 'Book Procedure'}
                      </CartoonButton>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'travel' && (
            <>
              {/* Licenses */}
              <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                  <IdCard className="w-4 h-4 text-sky-600" />
                  Licenses &amp; Certifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {LICENSE_CATALOG.map((lic) => {
                    const owned = hasLicense(character, lic.id);
                    const ageLocked = character.age < lic.minAge;
                    const smartsLocked = character.stats.smarts < lic.minSmarts;
                    const attemptedThisYear =
                      lic.id === 'drivers'
                        ? activities.lastDriversTestAge === character.age
                        : getAnnualLicenseAttemptsUsed(character, lic.id) >= 1;
                    const canAfford = character.cash >= lic.fee;
                    const disabled =
                      owned || ageLocked || smartsLocked || attemptedThisYear || !canAfford;

                    return (
                      <div
                        key={lic.id}
                        className="border-2 border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2 bg-slate-50/70"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-slate-900">{lic.name}</span>
                            <Badge variant={owned ? 'emerald' : 'slate'} size="xs">
                              {owned ? 'Licensed' : `$${lic.fee.toLocaleString()}`}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-600 mt-1">
                            {lic.description}
                          </p>
                        </div>

                        <CartoonButton
                          variant={disabled ? 'white' : 'sky'}
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            lic.id === 'drivers'
                              ? handleOpenDriversQuiz()
                              : handleTakeLicenseExam(lic.id)
                          }
                        >
                          {owned
                            ? 'Active'
                            : ageLocked
                              ? `Age ${lic.minAge}`
                              : smartsLocked
                                ? `${lic.minSmarts} Smarts`
                                : attemptedThisYear
                                  ? 'Retry Next Yr'
                                  : !canAfford
                                    ? `Need $${lic.fee.toLocaleString()}`
                                    : lic.id === 'drivers'
                                      ? 'Take DMV Quiz'
                                      : 'Take Exam'}
                        </CartoonButton>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vacations */}
              <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-emerald-600" />
                    Vacations
                  </h3>
                  <Badge variant="slate" size="xs">
                    {activities.lastVacationAge === character.age
                      ? '0/1 trips left'
                      : '1/1 trip this yr'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {VACATION_CABIN_CLASSES.map((cabin) => (
                      <CartoonButton
                        key={cabin.id}
                        variant={selectedCabin === cabin.id ? 'slate' : 'white'}
                        size="sm"
                        onClick={() => setSelectedCabin(cabin.id)}
                      >
                        {cabin.name}
                      </CartoonButton>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <CartoonButton
                      variant={effectiveCompanion === 'solo' ? 'slate' : 'white'}
                      size="sm"
                      onClick={() => setSelectedCompanion('solo')}
                    >
                      Solo
                    </CartoonButton>
                    <CartoonButton
                      variant={effectiveCompanion === 'partner' ? 'slate' : 'white'}
                      size="sm"
                      disabled={!companions.partner}
                      onClick={() => setSelectedCompanion('partner')}
                    >
                      With Partner
                    </CartoonButton>
                    <CartoonButton
                      variant={effectiveCompanion === 'family' ? 'slate' : 'white'}
                      size="sm"
                      disabled={companions.children.length === 0}
                      onClick={() => setSelectedCompanion('family')}
                    >
                      Family ({companions.children.length > 0 ? companions.totalCount : 0})
                    </CartoonButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VACATION_DESTINATIONS.map((dest) => {
                    const ageLocked = character.age < VACATION_MIN_AGE;
                    const usedThisYear = activities.lastVacationAge === character.age;
                    const cost = calculateVacationCost(
                      character,
                      dest.id,
                      selectedCabin,
                      effectiveCompanion
                    );
                    const canAfford = character.cash >= cost;

                    return (
                      <div
                        key={dest.id}
                        className="border-2 border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2 bg-slate-50/70"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-slate-900">{dest.name}</span>
                            <Badge variant="emerald" size="xs">
                              ${cost.toLocaleString()}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-600 mt-1">
                            {dest.description}
                          </p>
                        </div>

                        <CartoonButton
                          variant={ageLocked || usedThisYear || !canAfford ? 'white' : 'emerald'}
                          size="sm"
                          disabled={ageLocked || usedThisYear || !canAfford}
                          onClick={() => handleTakeVacation(dest.id)}
                        >
                          {ageLocked
                            ? `Age ${VACATION_MIN_AGE}`
                            : usedThisYear
                              ? 'Traveled This Yr'
                              : !canAfford
                                ? `Need $${cost.toLocaleString()}`
                                : 'Book Trip'}
                        </CartoonButton>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Emigration */}
              <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-amber-600" />
                      Emigration ({character.flag || '🌐'} {character.city}, {character.country})
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Relocate abroad permanently. Criminal records, pending trials, and unpaid legal debt reduce visa approval.
                    </p>
                  </div>
                  {character.age < EMIGRATION_MIN_AGE && (
                    <Badge variant="slate" size="xs">
                      Unlocks at Age {EMIGRATION_MIN_AGE}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EMIGRATION_DESTINATIONS.map((dest) => {
                    const evalResult = evaluateEmigrationEligibility(character, dest.country);
                    const canAfford = character.cash >= dest.movingCost;
                    const isCurrent = dest.country === character.country;

                    return (
                      <div
                        key={dest.country}
                        className="border-2 border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2 bg-slate-50/70"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-slate-900">
                              {dest.flag} {dest.country} ({dest.city})
                            </span>
                            <Badge variant="amber" size="xs">
                              ${dest.movingCost.toLocaleString()}
                            </Badge>
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 mt-1">
                            {isCurrent
                              ? 'Current residence'
                              : evalResult.blockedReason ??
                                `Visa odds: ${Math.round(evalResult.approvalChance * 100)}% • ${dest.strictnessLabel}`}
                          </div>
                        </div>

                        <CartoonButton
                          variant={!evalResult.eligible || !canAfford ? 'white' : 'amber'}
                          size="sm"
                          disabled={!evalResult.eligible || !canAfford}
                          onClick={() => handleAttemptEmigration(dest.country)}
                        >
                          {isCurrent
                            ? 'Home Country'
                            : !evalResult.eligible
                              ? 'Restricted'
                              : !canAfford
                                ? `Need $${dest.movingCost.toLocaleString()}`
                                : 'Apply for Visa'}
                        </CartoonButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'nightlife' && (
            <>
              {/* Nightlife & Clubbing */}
              <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                      <Martini className="w-4 h-4 text-purple-600" />
                      Nightlife &amp; Clubbing
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Meet adult prospects, blow off steam, test your martial arts defense, or face VIP temptations.
                    </p>
                  </div>
                  <Badge variant="purple" size="xs">
                    {clubbingRemaining}/{MAX_CLUBBING_PER_YEAR} left this yr
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-2 border-2 border-slate-200 rounded-xl p-3 bg-slate-50/70">
                  <div>
                    <div className="text-sm font-black text-slate-900">Go Clubbing</div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      ${CLUBBING_ENTRY_FEE} cover charge • Unlocks at Age {CLUBBING_MIN_AGE}
                    </div>
                  </div>
                  <CartoonButton
                    variant={
                      character.age < CLUBBING_MIN_AGE ||
                      clubbingRemaining === 0 ||
                      character.cash < CLUBBING_ENTRY_FEE
                        ? 'white'
                        : 'purple'
                    }
                    size="sm"
                    disabled={
                      character.age < CLUBBING_MIN_AGE ||
                      clubbingRemaining === 0 ||
                      character.cash < CLUBBING_ENTRY_FEE
                    }
                    onClick={handleGoClubbing}
                  >
                    {character.age < CLUBBING_MIN_AGE
                      ? `Age ${CLUBBING_MIN_AGE}`
                      : clubbingRemaining === 0
                        ? 'Done This Yr'
                        : character.cash < CLUBBING_ENTRY_FEE
                          ? `Need $${CLUBBING_ENTRY_FEE}`
                          : `Hit the Club ($${CLUBBING_ENTRY_FEE})`}
                  </CartoonButton>
                </div>
              </div>

              {/* Addictions & Rehab Center */}
              <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-rose-600" />
                      Addictions &amp; Rehab Center
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Untreated addictions drain -4 Health, -4 Happiness, and $250–$600/yr. Rehab is 1x/yr.
                    </p>
                  </div>
                  {activities.lastRehabAge === character.age && (
                    <Badge variant="slate" size="xs">
                      Rehab Used This Yr
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {REHAB_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedRehabTier(tier.id)}
                      className={`text-left border-2 rounded-xl p-2.5 cursor-pointer transition-colors ${
                        selectedRehabTier === tier.id
                          ? 'border-slate-900 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="text-xs font-black text-slate-900">{tier.name}</div>
                      <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                        ${tier.fee.toLocaleString()} • {Math.round(tier.recoveryChance * 100)}% recovery
                      </div>
                    </button>
                  ))}
                </div>

                {activeAddictions.length === 0 ? (
                  <div className="border-2 border-emerald-200 bg-emerald-50/60 rounded-xl p-3 text-xs font-bold text-emerald-900">
                    Clean bill of behavioral health — no active addictions.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeAddictions.map((item) => {
                      const template = getAddictionTemplate(item.id);
                      const rehabUsed = activities.lastRehabAge === character.age;
                      const ageLocked = character.age < REHAB_MIN_AGE;
                      const canAfford = character.cash >= selectedRehab.fee;

                      return (
                        <div
                          key={item.id}
                          className="border-2 border-rose-200 bg-rose-50/60 rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap"
                        >
                          <div>
                            <div className="text-sm font-black text-slate-900">{template.name}</div>
                            <div className="text-[11px] font-bold text-rose-800">
                              Severity {item.severity}/100 • Since Age {item.acquiredAtAge}
                            </div>
                          </div>
                          <CartoonButton
                            variant={ageLocked || rehabUsed || !canAfford ? 'white' : 'emerald'}
                            size="sm"
                            disabled={ageLocked || rehabUsed || !canAfford}
                            onClick={() => handleAttendRehab(item.id)}
                          >
                            {ageLocked
                              ? `Age ${REHAB_MIN_AGE}`
                              : rehabUsed
                                ? 'Done This Yr'
                                : !canAfford
                                  ? `Need $${selectedRehab.fee.toLocaleString()}`
                                  : `Attend Rehab ($${selectedRehab.fee.toLocaleString()})`}
                          </CartoonButton>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Civil Lawsuits */}
              <div className="bg-white border-[2.5px] border-slate-900 rounded-2xl p-4 shadow-[0_3px_0_#0f172a] space-y-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                    <Gavel className="w-4 h-4 text-amber-600" />
                    Civil Lawsuits &amp; Open Claims
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Sue clinics or establishments for botched procedures or assaults before the 2-year claim window expires.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CIVIL_ATTORNEY_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedAttorneyTier(tier.id)}
                      className={`text-left border-2 rounded-xl p-2.5 cursor-pointer transition-colors ${
                        selectedAttorneyTier === tier.id
                          ? 'border-slate-900 bg-amber-50'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="text-xs font-black text-slate-900">{tier.name}</div>
                      <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                        ${tier.fee.toLocaleString()} fee • {Math.round(tier.winChance * 100)}% win odds
                      </div>
                    </button>
                  ))}
                </div>

                {openClaims.length === 0 ? (
                  <div className="border-2 border-slate-200 bg-slate-50/70 rounded-xl p-3 text-xs font-bold text-slate-600">
                    No active civil claims on file right now.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openClaims.map((claim) => {
                      const canAfford = character.cash >= selectedAttorney.fee;

                      return (
                        <div
                          key={claim.id}
                          className="border-2 border-amber-300 bg-amber-50/60 rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap"
                        >
                          <div>
                            <div className="text-sm font-black text-slate-900">
                              vs. {claim.defendantName}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-700">
                              {claim.summary} • Est. ${claim.claimedDamages.toLocaleString()} • Expires Age{' '}
                              {claim.expiresAtAge}
                            </div>
                          </div>
                          <CartoonButton
                            variant={!canAfford ? 'white' : 'amber'}
                            size="sm"
                            disabled={!canAfford}
                            onClick={() => handleFileLawsuit(claim.id)}
                          >
                            {!canAfford
                              ? `Need $${selectedAttorney.fee.toLocaleString()}`
                              : `File Lawsuit ($${selectedAttorney.fee.toLocaleString()})`}
                          </CartoonButton>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {pendingTemptation && (
        <Modal
          isOpen={true}
          title={pendingTemptation.title}
          maxWidth="sm"
          actions={
            <div className="grid grid-cols-2 gap-2 w-full">
              <CartoonButton
                variant="emerald"
                fullWidth
                onClick={() => handleResolveTemptation(false)}
              >
                Decline (+2 Karma)
              </CartoonButton>
              <CartoonButton
                variant="rose"
                fullWidth
                onClick={() => handleResolveTemptation(true)}
              >
                Accept (+10 Happy)
              </CartoonButton>
            </div>
          }
        >
          <p className="text-xs font-bold text-slate-700">{pendingTemptation.prompt}</p>
          <p className="text-[11px] font-semibold text-amber-700">
            Accepting carries a {Math.round(pendingTemptation.riskChance * 100)}% risk of triggering an addiction.
          </p>
        </Modal>
      )}

      {quizState?.isOpen && (
        <Modal
          isOpen={true}
          onClose={() => setQuizState((prev) => (prev ? { ...prev, isOpen: false } : null))}
          title="DMV Road-Rules Quiz (2/3 to Pass)"
          maxWidth="md"
          actions={
            <CartoonButton
              variant="emerald"
              fullWidth
              disabled={quizState.answers.some((a) => a === null)}
              onClick={handleSubmitDriversQuiz}
            >
              Submit Quiz (${driversFee})
            </CartoonButton>
          }
        >
          <div className="space-y-4">
            {quizState.questions.map((q, qIdx) => (
              <div key={q.id} className="space-y-1.5">
                <div className="text-xs font-black text-slate-900">
                  {qIdx + 1}. {q.prompt}
                </div>
                <div className="space-y-1">
                  {q.options.map((opt, optIdx) => {
                    const picked = quizState.answers[qIdx] === optIdx;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setQuizState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  answers: prev.answers.map((a, idx) =>
                                    idx === qIdx ? optIdx : a
                                  ),
                                }
                              : null
                          )
                        }
                        className={`w-full text-left text-xs font-bold p-2 rounded-xl border-2 cursor-pointer ${
                          picked
                            ? 'border-sky-600 bg-sky-50 text-sky-950'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {outcome && (
        <ActionOutcomeModal
          isOpen={true}
          onClose={() => setOutcome(null)}
          title={outcome.title}
          subtitle={outcome.subtitle}
          message={outcome.message}
          statEffects={outcome.statEffects}
          alertCallout={
            !outcome.succeeded
              ? {
                  title: 'Action Unavailable',
                  message: outcome.message,
                  variant: 'amber',
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
