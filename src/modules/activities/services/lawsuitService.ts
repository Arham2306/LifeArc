import type { CharacterProfile } from '../../../types/game';
import { applyEffects } from '../../character/services/statService';
import { isCurrentlyIncarcerated } from '../../crime/services/crimeSelectors';
import { getCivilAttorneyTier } from '../data/nightlifeLawsuitCatalog';
import type { ActivityActionResult, CivilAttorneyTierId, PlayerActivitiesState } from '../types';
import { getSanitizedActivitiesState } from './activitiesSelectors';
import { blockedActivityResult, makeActivityEvent } from './activitiesService';

export function fileCivilLawsuit(
  character: CharacterProfile,
  claimId: string,
  tierId: CivilAttorneyTierId,
  rng: () => number = Math.random
): ActivityActionResult {
  if (!character.isAlive) {
    return blockedActivityResult(character, 'Civil Lawsuit', 'This life has already ended.');
  }
  if (isCurrentlyIncarcerated(character)) {
    return blockedActivityResult(
      character,
      'Civil Lawsuit',
      'Civil lawsuit filings are suspended while serving a prison sentence.'
    );
  }

  const activities = getSanitizedActivitiesState(character);
  const claim = activities.pendingClaims.find((c) => c.id === claimId);
  if (!claim) {
    return blockedActivityResult(character, 'Civil Lawsuit', 'Lawsuit claim not found.');
  }
  if (claim.resolved) {
    return blockedActivityResult(
      character,
      'Civil Lawsuit',
      'This legal claim has already been resolved.'
    );
  }
  if (claim.expiresAtAge < character.age) {
    return blockedActivityResult(
      character,
      'Civil Lawsuit',
      `The statute of limitations on your claim against ${claim.defendantName} has expired.`
    );
  }

  const tier = getCivilAttorneyTier(tierId);
  if (character.cash < tier.fee) {
    return blockedActivityResult(
      character,
      'Civil Lawsuit',
      `You need $${tier.fee.toLocaleString()} in wallet cash to retain ${tier.name}.`
    );
  }

  const won = rng() < tier.winChance;
  const nextClaims = activities.pendingClaims.map((c) =>
    c.id === claimId ? { ...c, resolved: true } : c
  );
  const nextActivities: PlayerActivitiesState = {
    ...activities,
    pendingClaims: nextClaims,
  };

  const summary = won
    ? `Court ruled in your favor against ${claim.defendantName}! Awarded $${claim.claimedDamages.toLocaleString()} settlement (after $${tier.fee.toLocaleString()} legal fee).`
    : `Your civil case against ${claim.defendantName} was dismissed. You forfeited $${tier.fee.toLocaleString()} in legal fees.`;

  const { character: nextChar, applied } = applyEffects(
    {
      ...character,
      activities: nextActivities,
      timeline: [
        ...character.timeline,
        makeActivityEvent(
          character,
          character.age,
          won ? `Lawsuit Won vs. ${claim.defendantName}` : `Lawsuit Lost vs. ${claim.defendantName}`,
          summary,
          won ? 'milestone' : 'money'
        ),
      ],
    },
    won
      ? { cash: claim.claimedDamages - tier.fee, happiness: 10 }
      : { cash: -tier.fee, happiness: -6 }
  );

  return {
    character: nextChar,
    succeeded: true,
    title: won ? 'Civil Lawsuit Won!' : 'Civil Lawsuit Dismissed',
    summary,
    costPaid: tier.fee,
    appliedEffects: applied,
  };
}
