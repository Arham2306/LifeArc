export interface OutingDefinition {
  id: string;
  title: string;
  emoji: string;
  description: string;
  minAge: number;
  price: number;
  /** Stored relationship required before the outing can be chosen. */
  minRelationship: number | null;
  fullRelationship: number;
  fullHappiness: number;
  fullScene: string;
  coolScene: string;
}

export interface OutingScene {
  title: string;
  scene: string;
  relationshipDelta: number;
  happinessDelta: number;
}

export const OUTINGS: readonly OutingDefinition[] = [
  {
    id: 'outing_movie',
    title: 'Movie',
    emoji: '🎬',
    description: 'Two tickets and the whole film.',
    minAge: 13,
    price: 22,
    minRelationship: null,
    fullRelationship: 8,
    fullHappiness: 4,
    fullScene: 'You bought two tickets and watched the whole film together.',
    coolScene: 'You bought two tickets. They checked the time more than the screen.',
  },
  {
    id: 'outing_meal',
    title: 'Restaurant',
    emoji: '🍽️',
    description: 'A meal you sit through together.',
    minAge: 13,
    price: 48,
    minRelationship: null,
    fullRelationship: 12,
    fullHappiness: 5,
    fullScene: 'You split a meal and stayed until the plates were gone.',
    coolScene: 'The meal was fine. The conversation kept stalling.',
  },
  {
    id: 'outing_concert',
    title: 'Concert',
    emoji: '🎵',
    description: 'A night out in a loud room.',
    minAge: 16,
    price: 85,
    minRelationship: null,
    fullRelationship: 14,
    fullHappiness: 6,
    fullScene: 'You stood through the concert and left with the last song still going.',
    coolScene: 'The room was loud, and they mostly watched the crowd.',
  },
  {
    id: 'outing_day',
    title: 'Day Out',
    emoji: '🌤️',
    description: 'The whole day, away from home.',
    minAge: 18,
    price: 160,
    minRelationship: 45,
    fullRelationship: 16,
    fullHappiness: 6,
    fullScene: 'You spent the day out and came home later than you planned.',
    coolScene: 'You spent the day out and came home later than you planned.',
  },
];

const BY_ID = new Map(OUTINGS.map((outing) => [outing.id, outing]));

export function getOuting(id: string): OutingDefinition | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Scene and stat deltas for a paid outing. Cash is applied by the caller.
 * A relationship under 25 uses the cool scene. 60 or more adds a warmer clause.
 */
export function outingScene(
  outing: OutingDefinition,
  relationship: number,
  ownsInstrument: boolean,
): OutingScene {
  const score = typeof relationship === 'number' && Number.isFinite(relationship) ? relationship : 0;
  if (score < 25) {
    return {
      title: outing.title,
      scene: outing.coolScene,
      relationshipDelta: 3,
      happinessDelta: 1,
    };
  }

  let scene = outing.fullScene;
  if (outing.id === 'outing_concert' && ownsInstrument) {
    scene = `${scene} You caught yourself watching the player's hands.`;
  }
  let relationshipDelta = outing.fullRelationship;
  if (score >= 60) {
    scene = `${scene} It felt easy.`;
    relationshipDelta += 2;
  }
  return {
    title: outing.title,
    scene,
    relationshipDelta,
    happinessDelta: outing.fullHappiness,
  };
}
