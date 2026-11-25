import React, { useState } from 'react';
import {
  ArrowLeft,
  Dumbbell,
  HeartPulse,
  Lock,
  Shield,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { ActionOutcomeModal } from '../../../components/ui/ActionOutcomeModal';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
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
  getEffectiveActivityFee,
  getEffectiveGymWorkoutFee,
  getHighestMartialArtBelt,
  getRemainingActivityUses,
  getRemainingMartialArtsSessionsThisYear,
  getSanitizedActivitiesState,
  getSelfDefenseScore,
} from '../services/activitiesSelectors';
import {
  performMindBodyAction,
  setCharacterDiet,
  toggleGymMembership,
  trainMartialArt,
} from '../services/activitiesService';
import type {
  ActivityActionResult,
  DietId,
  MartialArtId,
  MindBodyActionId,
} from '../types';

interface ActivitiesScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (character: CharacterProfile) => void;
  onBackToMenu: () => void;
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
}) => {
  const [outcome, setOutcome] = useState<OutcomeModalState | null>(null);

  const incarcerated = isCurrentlyIncarcerated(character);
  const unlocked = character.age >= ACTIVITIES_MIN_AGE;
  const activities = getSanitizedActivitiesState(character);
  const activeDiet = getDietTemplate(activities.diet);
  const highestBelt = getHighestMartialArtBelt(character);
  const selfDefenseScore = getSelfDefenseScore(character);
  const martialSessionsLeft = getRemainingMartialArtsSessionsThisYear(character);
  const martialLessonFee = getEffectiveActivityFee(character, MARTIAL_ARTS_LESSON_FEE);

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
    const template = MIND_BODY_ACTIONS.find((a) => a.id === actionId);
    const res = performMindBodyAction(character, actionId);
    handleOutcomeResult(
      res,
      template
        ? {
            ...template.effects,
            ...(res.costPaid > 0 ? { cash: -res.costPaid } : {}),
          }
        : undefined
    );
  };

  const handleToggleGymPass = () => {
    const res = toggleGymMembership(character, !activities.gymMembershipActive);
    handleOutcomeResult(res, res.costPaid > 0 ? { cash: -res.costPaid } : undefined);
  };

  const handleTrainMartialArt = (discipline: MartialArtId) => {
    const res = trainMartialArt(character, discipline);
    handleOutcomeResult(
      res,
      res.succeeded
        ? {
            health: 4,
            happiness: 2,
            smarts: 1,
            ...(res.costPaid > 0 ? { cash: -res.costPaid } : {}),
          }
        : undefined
    );
  };

  const handleSelectDiet = (dietId: DietId) => {
    const res = setCharacterDiet(character, dietId);
    handleOutcomeResult(res);
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
