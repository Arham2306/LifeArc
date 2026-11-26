import type { CharacterProfile } from '../../../types/game';
import { createId } from '../../../utils/id';
import { applyEffects, finalizeCharacterDeath } from '../../character/services/statService';
import {
  PLASTIC_SURGERY_MIN_AGE,
  getPlasticSurgeryTemplate,
  getSurgeryClinicTier,
} from '../data/surgeryCatalog';
import type {
  ActivityActionResult,
  PendingLawsuitClaim,
  PlasticSurgeryId,
  PlayerActivitiesState,
  SurgeryClinicTierId,
} from '../types';
import { getSanitizedActivitiesState } from './activitiesSelectors';
import {
  blockedActivityResult,
  checkActivityEligibility,
  makeActivityEvent,
} from './activitiesService';

export function getPlasticSurgeryCost(
  procedureId: PlasticSurgeryId,
  clinicTierId: SurgeryClinicTierId
): number {
  const procedure = getPlasticSurgeryTemplate(procedureId);
  const tier = getSurgeryClinicTier(clinicTierId);
  return procedure ? Math.round(procedure.baseCost * tier.priceMultiplier) : 0;
}

export function undergoPlasticSurgery(
  character: CharacterProfile,
  procedureId: PlasticSurgeryId,
  clinicTierId: SurgeryClinicTierId,
  rng: () => number = Math.random
): ActivityActionResult {
  const procedure = getPlasticSurgeryTemplate(procedureId);
  if (!procedure) {
    return blockedActivityResult(character, 'Plastic Surgery', 'Procedure not found.');
  }

  const tier = getSurgeryClinicTier(clinicTierId);
  const guard = checkActivityEligibility(
    character,
    PLASTIC_SURGERY_MIN_AGE,
    procedure.name,
    'Cosmetic surgery is unavailable while incarcerated.'
  );
  if (guard) return blockedActivityResult(character, procedure.name, guard);

  const cost = Math.round(procedure.baseCost * tier.priceMultiplier);
  if (character.cash < cost) {
    return blockedActivityResult(
      character,
      procedure.name,
      `You need $${cost.toLocaleString()} in wallet cash for ${procedure.name} (${tier.name}).`
    );
  }

  const activities = getSanitizedActivitiesState(character);
  const botched = rng() < tier.botchChance;
  const nextSurgeryCount = activities.plasticSurgeryCount + 1;

  if (!botched) {
    const summary = `Your ${procedure.name} at ${tier.clinicLabel} went smoothly! Paid $${cost.toLocaleString()}.`;
    const nextActivities: PlayerActivitiesState = {
      ...activities,
      plasticSurgeryCount: nextSurgeryCount,
    };
    const { character: updated, applied } = applyEffects(
      {
        ...character,
        activities: nextActivities,
        timeline: [
          ...character.timeline,
          makeActivityEvent(character, character.age, `Surgery: ${procedure.name}`, summary, 'health'),
        ],
      },
      { looks: procedure.looksGain, happiness: procedure.happinessGain, cash: -cost }
    );
    return {
      character: updated,
      succeeded: true,
      title: `${procedure.name} Successful`,
      summary,
      costPaid: cost,
      appliedEffects: applied,
    };
  }

  const claimedDamages = Math.round(cost * (2 + rng() * 1.5));
  const claim: PendingLawsuitClaim = {
    id: createId(),
    source: 'botched_surgery',
    defendantName: tier.clinicLabel,
    summary: `Botched ${procedure.name} at ${tier.clinicLabel}`,
    occurredAtAge: character.age,
    expiresAtAge: character.age + 2,
    claimedDamages,
    resolved: false,
  };

  const nextActivities: PlayerActivitiesState = {
    ...activities,
    plasticSurgeryCount: nextSurgeryCount,
    pendingClaims: [...activities.pendingClaims, claim],
  };

  const { character: postEffects, applied } = applyEffects(
    {
      ...character,
      activities: nextActivities,
    },
    { looks: -18, health: -10, happiness: -15, cash: -cost }
  );

  const summary = postEffects.isAlive
    ? `Something went wrong during your ${procedure.name} at ${tier.clinicLabel}. Recovery left lasting scarring (-18 Looks, -10 Health, -15 Happiness). Paid $${cost.toLocaleString()}. Malpractice claim recorded ($${claimedDamages.toLocaleString()} estimated damages).`
    : `Complications during your ${procedure.name} at ${tier.clinicLabel} proved fatal. Paid $${cost.toLocaleString()}.`;

  const withEvent: CharacterProfile = {
    ...postEffects,
    timeline: [
      ...postEffects.timeline,
      makeActivityEvent(
        character,
        character.age,
        `Botched Surgery: ${procedure.name}`,
        summary,
        'misfortune'
      ),
    ],
  };

  const finalizedChar = withEvent.isAlive
    ? withEvent
    : finalizeCharacterDeath({ ...withEvent, causeOfDeath: 'Surgical complications' });

  return {
    character: finalizedChar,
    succeeded: true,
    title: `Botched ${procedure.name}!`,
    summary,
    costPaid: cost,
    appliedEffects: applied,
  };
}
