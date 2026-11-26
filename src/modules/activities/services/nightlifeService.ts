import type { CharacterProfile, PersonProfile, StatEffects } from '../../../types/game';
import { createId } from '../../../utils/id';
import { FEMALE_NAMES, LAST_NAMES, MALE_NAMES } from '../../character/data/names';
import { applyEffects, finalizeCharacterDeath } from '../../character/services/statService';
import {
  ADDICTION_CATALOG,
  CLUBBING_ENTRY_FEE,
  CLUBBING_MIN_AGE,
  CLUBBING_SELF_DEFENSE_THRESHOLD,
  MAX_CLUBBING_PER_YEAR,
  getAddictionTemplate,
} from '../data/nightlifeLawsuitCatalog';
import type {
  ActiveAddiction,
  ActivityActionResult,
  AddictionId,
  ClubbingActionResult,
  PendingLawsuitClaim,
  PlayerActivitiesState,
} from '../types';
import {
  getClubbingSessionsRemaining,
  getSanitizedActivitiesState,
  getSelfDefenseScore,
} from './activitiesSelectors';
import {
  blockedActivityResult,
  checkActivityEligibility,
  makeActivityEvent,
} from './activitiesService';

function pickFrom<T>(list: readonly T[], rng: () => number): T {
  const idx = Math.min(list.length - 1, Math.max(0, Math.floor(rng() * list.length)));
  return list[idx];
}

export function goClubbing(
  character: CharacterProfile,
  rng: () => number = Math.random
): ClubbingActionResult {
  const guard = checkActivityEligibility(
    character,
    CLUBBING_MIN_AGE,
    'Nightlife & Clubbing',
    'Clubbing is unavailable while serving a prison sentence.'
  );
  if (guard) return blockedActivityResult(character, 'Nightlife & Clubbing', guard);

  const remaining = getClubbingSessionsRemaining(character);
  if (remaining <= 0) {
    return blockedActivityResult(
      character,
      'Nightlife & Clubbing',
      `You have already hit the clubs ${MAX_CLUBBING_PER_YEAR}/${MAX_CLUBBING_PER_YEAR} times this year.`
    );
  }

  if (character.cash < CLUBBING_ENTRY_FEE) {
    return blockedActivityResult(
      character,
      'Nightlife & Clubbing',
      `You need $${CLUBBING_ENTRY_FEE} in wallet cash for club entry and cover.`
    );
  }

  const activities = getSanitizedActivitiesState(character);
  const annualCounts =
    activities.lastActionAge === character.age ? { ...activities.annualActionCounts } : {};
  annualCounts.go_clubbing = (annualCounts.go_clubbing ?? 0) + 1;

  const baseActivities: PlayerActivitiesState = {
    ...activities,
    annualActionCounts: annualCounts,
    lastActionAge: character.age,
  };

  const roll = rng();

  // 1. Electric Night Out (< 0.30)
  if (roll < 0.3) {
    const summary = `Danced under strobe lights until last call (+8 Happiness, +2 Looks). Paid $${CLUBBING_ENTRY_FEE}.`;
    const { character: nextChar, applied } = applyEffects(
      {
        ...character,
        activities: baseActivities,
        timeline: [
          ...character.timeline,
          makeActivityEvent(character, character.age, 'Electric Night Out', summary, 'social'),
        ],
      },
      { happiness: 8, looks: 2, cash: -CLUBBING_ENTRY_FEE }
    );
    return {
      character: nextChar,
      succeeded: true,
      title: 'Electric Night Out',
      summary,
      costPaid: CLUBBING_ENTRY_FEE,
      appliedEffects: applied,
    };
  }

  // 2. Social Connection (< 0.55)
  if (roll < 0.55) {
    const isMale = rng() < 0.5;
    const firstName = isMale ? pickFrom(MALE_NAMES, rng) : pickFrom(FEMALE_NAMES, rng);
    const lastName = pickFrom(LAST_NAMES, rng);
    const ageOffset = Math.floor(rng() * 7) - 3;
    const newContact: PersonProfile = {
      id: createId(),
      firstName,
      lastName,
      gender: isMale ? 'male' : 'female',
      age: Math.max(18, character.age + ageOffset),
      role: 'Nightlife Friend',
      relationshipType: 'friend',
      relationship: 55,
      originStory: 'Met dancing at a downtown club.',
      stageMet: 'adulthood',
      romanceUnlocked: true,
      romanceMeter: 15,
      avatarEmoji: isMale ? '🕺' : '💃',
    };
    const summary = `Hit it off with ${firstName} ${lastName} by the DJ booth! Paid $${CLUBBING_ENTRY_FEE}.`;
    const { character: nextChar, applied } = applyEffects(
      {
        ...character,
        activities: baseActivities,
        relationships: [...(character.relationships || []), newContact],
        timeline: [
          ...character.timeline,
          makeActivityEvent(character, character.age, 'Club Connection', summary, 'relationship'),
        ],
      },
      { happiness: 5, cash: -CLUBBING_ENTRY_FEE }
    );
    return {
      character: nextChar,
      succeeded: true,
      title: `Met ${firstName} ${lastName}`,
      summary,
      costPaid: CLUBBING_ENTRY_FEE,
      appliedEffects: applied,
    };
  }

  // 3. Bar Scuffle (< 0.78)
  if (roll < 0.78) {
    const defense = getSelfDefenseScore(character);
    if (defense >= CLUBBING_SELF_DEFENSE_THRESHOLD) {
      const summary = `A drunken patron swung at you near the exit, but your martial arts training (${defense}/100 defense) let you neutralize the scuffle with zero injury! Paid $${CLUBBING_ENTRY_FEE}.`;
      const { character: nextChar, applied } = applyEffects(
        {
          ...character,
          activities: baseActivities,
          timeline: [
            ...character.timeline,
            makeActivityEvent(character, character.age, 'Defended Bar Scuffle', summary, 'social'),
          ],
        },
        { happiness: 5, cash: -CLUBBING_ENTRY_FEE }
      );
      return {
        character: nextChar,
        succeeded: true,
        title: 'Handled a Bar Scuffle',
        summary,
        costPaid: CLUBBING_ENTRY_FEE,
        appliedEffects: applied,
      };
    }

    const claimedDamages = Math.round(3500 + rng() * 3500);
    const claim: PendingLawsuitClaim = {
      id: createId(),
      source: 'nightlife_assault',
      defendantName: 'Velvet Lounge Security',
      summary: 'Negligent club bouncer assault outside Velvet Lounge',
      occurredAtAge: character.age,
      expiresAtAge: character.age + 2,
      claimedDamages,
      resolved: false,
    };
    const nextActivities: PlayerActivitiesState = {
      ...baseActivities,
      pendingClaims: [...baseActivities.pendingClaims, claim],
    };

    const { character: postEffects, applied } = applyEffects(
      { ...character, activities: nextActivities },
      { health: -10, happiness: -5, cash: -CLUBBING_ENTRY_FEE }
    );

    const summary = postEffects.isAlive
      ? `Rough night outside the club — security shoved you down in a bar scuffle (-10 Health). You can sue Velvet Lounge Security for ~$${claimedDamages.toLocaleString()}. Paid $${CLUBBING_ENTRY_FEE}.`
      : `Severe injuries from an altercation outside Velvet Lounge proved fatal. Paid $${CLUBBING_ENTRY_FEE}.`;

    const withEvent: CharacterProfile = {
      ...postEffects,
      timeline: [
        ...postEffects.timeline,
        makeActivityEvent(character, character.age, 'Nightlife Assault', summary, 'misfortune'),
      ],
    };
    const finalizedChar = withEvent.isAlive
      ? withEvent
      : finalizeCharacterDeath({ ...withEvent, causeOfDeath: 'Nightlife assault injuries' });

    return {
      character: finalizedChar,
      succeeded: true,
      title: 'Injured in Bar Scuffle',
      summary,
      costPaid: CLUBBING_ENTRY_FEE,
      appliedEffects: applied,
    };
  }

  // 4. Vice Temptation Offer (>= 0.78)
  const template = pickFrom(ADDICTION_CATALOG, rng);
  const { character: enteredChar, applied } = applyEffects(
    { ...character, activities: baseActivities },
    { cash: -CLUBBING_ENTRY_FEE }
  );

  return {
    character: enteredChar,
    succeeded: true,
    title: template.temptationTitle,
    summary: `${template.temptationPrompt} Paid $${CLUBBING_ENTRY_FEE} entry.`,
    costPaid: CLUBBING_ENTRY_FEE,
    appliedEffects: applied,
    temptation: {
      addictionId: template.id,
      title: template.temptationTitle,
      prompt: template.temptationPrompt,
      riskChance: template.riskChance,
    },
  };
}

export function resolveViceTemptation(
  character: CharacterProfile,
  addictionId: AddictionId,
  accepted: boolean,
  rng: () => number = Math.random
): ActivityActionResult {
  const guard = checkActivityEligibility(
    character,
    CLUBBING_MIN_AGE,
    'Nightlife Choice',
    'Unavailable while serving a prison sentence.'
  );
  if (guard) return blockedActivityResult(character, 'Nightlife Choice', guard);

  const template = getAddictionTemplate(addictionId);
  if (!accepted) {
    const summary = `Turned down the ${template.temptationTitle.toLowerCase()} and headed home clear-headed (+2 Karma, +2 Happiness).`;
    const { character: nextChar, applied } = applyEffects(
      {
        ...character,
        timeline: [
          ...character.timeline,
          makeActivityEvent(character, character.age, 'Declined Temptation', summary, 'social'),
        ],
      },
      { karma: 2, happiness: 2 }
    );
    return {
      character: nextChar,
      succeeded: true,
      title: 'Temptation Declined',
      summary,
      costPaid: 0,
      appliedEffects: applied,
    };
  }

  const activities = getSanitizedActivitiesState(character);
  const triggered = rng() < template.riskChance;
  const existingIdx = activities.addictions.findIndex((a) => a.id === addictionId);
  let nextAddictions: ActiveAddiction[] = activities.addictions;

  if (triggered) {
    if (existingIdx >= 0) {
      nextAddictions = activities.addictions.map((a, idx) =>
        idx === existingIdx ? { ...a, severity: Math.min(100, a.severity + 15) } : a
      );
    } else {
      nextAddictions = [
        ...activities.addictions,
        {
          id: addictionId,
          severity: 35,
          acquiredAtAge: character.age,
          lastProgressedAge: null,
        },
      ];
    }
  }

  const summary = triggered
    ? `You indulged at the club (+10 Happiness), but hooked yourself into ${template.name}.`
    : 'You indulged for one wild night (+10 Happiness) and walked away unscathed.';
  const effects: StatEffects = { happiness: 10 };

  const { character: nextChar, applied } = applyEffects(
    {
      ...character,
      activities: {
        ...activities,
        addictions: nextAddictions,
      },
      timeline: [
        ...character.timeline,
        makeActivityEvent(
          character,
          character.age,
          triggered ? `Addiction Developed: ${template.name}` : 'Wild VIP Night',
          summary,
          triggered ? 'misfortune' : 'social'
        ),
      ],
    },
    effects
  );

  return {
    character: nextChar,
    succeeded: true,
    title: triggered ? `${template.name} Developed` : 'Indulged at the Club',
    summary,
    costPaid: 0,
    appliedEffects: applied,
  };
}
