import type { CharacterProfile, LifeEvent, StatEffects } from '../../../types/game';
import { applyEffects } from '../../character/services/statService';
import {
  getAddictionTemplate,
  getRehabTier,
} from '../data/nightlifeLawsuitCatalog';
import type {
  ActiveAddiction,
  ActivityActionResult,
  AddictionId,
  PlayerActivitiesState,
  RehabTierId,
} from '../types';
import { getSanitizedActivitiesState } from './activitiesSelectors';
import {
  blockedActivityResult,
  checkActivityEligibility,
  makeActivityEvent,
} from './activitiesService';

export const REHAB_MIN_AGE = 18;

export function attendRehab(
  character: CharacterProfile,
  addictionId: AddictionId,
  tierId: RehabTierId,
  rng: () => number = Math.random
): ActivityActionResult {
  const tier = getRehabTier(tierId);
  const template = getAddictionTemplate(addictionId);
  const guard = checkActivityEligibility(
    character,
    REHAB_MIN_AGE,
    tier.name,
    'External rehab programs are unavailable while incarcerated.'
  );
  if (guard) return blockedActivityResult(character, tier.name, guard);

  const activities = getSanitizedActivitiesState(character);
  const addiction = activities.addictions.find((a) => a.id === addictionId);
  if (!addiction) {
    return blockedActivityResult(
      character,
      tier.name,
      `You are not currently dealing with ${template.name}.`
    );
  }

  if (activities.lastRehabAge === character.age) {
    return blockedActivityResult(
      character,
      tier.name,
      'You already attended a rehab program this year.'
    );
  }

  if (character.cash < tier.fee) {
    return blockedActivityResult(
      character,
      tier.name,
      `You need $${tier.fee.toLocaleString()} in wallet cash for ${tier.name}.`
    );
  }

  const recovered = rng() < tier.recoveryChance;
  const nextAddictions: ActiveAddiction[] = recovered
    ? activities.addictions.filter((a) => a.id !== addictionId)
    : activities.addictions.map((a) =>
        a.id === addictionId ? { ...a, severity: Math.max(10, a.severity - 15) } : a
      );

  const nextActivities: PlayerActivitiesState = {
    ...activities,
    addictions: nextAddictions,
    lastRehabAge: character.age,
  };

  const feeNote = tier.fee > 0 ? ` Paid $${tier.fee.toLocaleString()}.` : '';
  const summary = recovered
    ? `Completed ${tier.name} and overcame ${template.name}!${feeNote}`
    : `Completed ${tier.name}, easing ${template.name} urges, though recovery did not fully hold yet.${feeNote}`;

  const effects: StatEffects = {
    ...(recovered ? { health: 6 } : {}),
    happiness: (recovered ? 6 : 0) + tier.bonusHappiness,
    ...(tier.bonusKarma !== 0 ? { karma: tier.bonusKarma } : {}),
    ...(tier.fee > 0 ? { cash: -tier.fee } : {}),
  };

  const { character: nextChar, applied } = applyEffects(
    {
      ...character,
      activities: nextActivities,
      timeline: [
        ...character.timeline,
        makeActivityEvent(
          character,
          character.age,
          recovered ? `Recovered: ${template.name}` : `Rehab Progress: ${template.name}`,
          summary,
          recovered ? 'milestone' : 'health'
        ),
      ],
    },
    effects
  );

  return {
    character: nextChar,
    succeeded: true,
    title: recovered ? `Overcame ${template.name}!` : 'Rehab Completed (Ongoing Recovery)',
    summary,
    costPaid: tier.fee,
    appliedEffects: applied,
  };
}

export function progressAddictionsAndClaimsForYear(
  character: Pick<CharacterProfile, 'birthYear'>,
  activities: PlayerActivitiesState,
  nextAge: number,
  spendableCash: number,
  isIncarceratedForYear: boolean
): {
  activities: PlayerActivitiesState;
  cashSpent: number;
  healthDelta: number;
  happinessDelta: number;
  events: LifeEvent[];
} {
  const events: LifeEvent[] = [];

  // 1. Prune resolved claims and auto-expire unresolved claims past their 2-year window
  const remainingClaims = activities.pendingClaims.filter((claim) => {
    if (claim.resolved) {
      return false;
    }
    if (claim.expiresAtAge < nextAge) {
      events.push(
        makeActivityEvent(
          character,
          nextAge,
          'Lawsuit Claim Expired',
          `Your 2-year filing window against ${claim.defendantName} (${claim.summary}) expired.`,
          'money'
        )
      );
      return false;
    }
    return true;
  });

  if (isIncarceratedForYear || activities.addictions.length === 0) {
    return {
      activities: {
        ...activities,
        pendingClaims: remainingClaims,
      },
      cashSpent: 0,
      healthDelta: 0,
      happinessDelta: 0,
      events,
    };
  }

  let cashAvailable = Number.isFinite(spendableCash) ? Math.max(0, spendableCash) : 0;
  let cashSpent = 0;
  let healthDelta = 0;
  let happinessDelta = 0;

  const updatedAddictions: ActiveAddiction[] = activities.addictions.map((addiction) => {
    if (addiction.lastProgressedAge === nextAge) {
      return addiction;
    }
    const template = getAddictionTemplate(addiction.id);
    const rawAnnualCost = Math.round(
      template.baseAnnualCost +
        (addiction.severity / 100) * (template.maxAnnualCost - template.baseAnnualCost)
    );
    const actualSpend = Math.min(cashAvailable, rawAnnualCost);
    cashAvailable -= actualSpend;
    cashSpent += actualSpend;
    healthDelta -= 4;
    happinessDelta -= 4;

    return {
      ...addiction,
      severity: Math.min(100, addiction.severity + 5),
      lastProgressedAge: nextAge,
    };
  });

  if (healthDelta < 0 || cashSpent > 0) {
    const names = updatedAddictions.map((a) => getAddictionTemplate(a.id).name).join(', ');
    events.push(
      makeActivityEvent(
        character,
        nextAge,
        'Addiction Toll',
        `Living with ${names} drained ${healthDelta} Health, ${happinessDelta} Happiness, and $${cashSpent.toLocaleString()} this year.`,
        'misfortune'
      )
    );
  }

  return {
    activities: {
      ...activities,
      addictions: updatedAddictions,
      pendingClaims: remainingClaims,
    },
    cashSpent,
    healthDelta,
    happinessDelta,
    events,
  };
}
