import type { LifeEvent, StatEffects } from '../../../types/game'
import { createId } from '../../../utils/id'
import { pickRandom } from '../../../utils/random'

export const EARLY_MILESTONES: Record<number, { message: string; icon: string; statEffects?: StatEffects }> = {
  1: {
    message: 'You celebrated your 1st birthday with a smash cake! You took your first wobbly steps.',
    icon: '🎂',
    statEffects: { happiness: 5, health: 2 },
  },
  2: {
    message: "You learned the word 'No!' and now use it for absolutely everything.",
    icon: '🗣️',
    statEffects: { smarts: 3 },
  },
  3: {
    message: 'You got potty trained! Your parents threw a small celebration in relief.',
    icon: '🎉',
    statEffects: { smarts: 2, happiness: 4 },
  },
  4: {
    message: 'You scribbled all over the living room wall with a bright blue crayon. It was a masterpiece.',
    icon: '🖍️',
    statEffects: { happiness: 3, smarts: 2 },
  },
  5: {
    message: 'You learned how to tie your own shoelaces and count all the way to a hundred!',
    icon: '👟',
    statEffects: { smarts: 5, happiness: 2 },
  },
  6: {
    message: 'You lost your first baby tooth! You couldn’t stop wiggling it all week.',
    icon: '🦷',
    statEffects: { happiness: 4 },
  },
  7: {
    message: 'You learned how to ride a bicycle without training wheels!',
    icon: '🚲',
    statEffects: { health: 4, happiness: 5 },
  },
  8: {
    message: 'You participated in the school science fair and made a baking soda volcano.',
    icon: '🌋',
    statEffects: { smarts: 4 },
  },
  9: {
    message: 'You spent your summer building a secret fort out of tree branches and blankets.',
    icon: '🏕️',
    statEffects: { happiness: 4, health: 3 },
  },
  10: {
    message: 'You entered double digits! Your parents threw a pizza party with your friends.',
    icon: '🍕',
    statEffects: { happiness: 5 },
  },
  11: {
    message: 'You survived a grueling elementary school dodgeball tournament.',
    icon: '⚽',
    statEffects: { health: 3 },
  },
  12: {
    message: 'You hit a sudden growth spurt and outgrew almost all of your favorite clothes!',
    icon: '📏',
    statEffects: { smarts: 3, happiness: 3 },
  },
  13: {
    message: 'You are officially a teenager! Your voice cracked during a presentation.',
    icon: '🎸',
    statEffects: { happiness: -2, smarts: 3 },
  },
  14: {
    message: 'You got braces installed on your teeth. Everything hurts for a few days.',
    icon: '😬',
    statEffects: { happiness: -4, health: 2 },
  },
  15: {
    message: 'You studied hard for your high school entrance exams.',
    icon: '📚',
    statEffects: { smarts: 5 },
  },
  16: {
    message: 'Sweet sixteen! You passed your driver permit test on the first try.',
    icon: '🚗',
    statEffects: { happiness: 8, smarts: 3 },
  },
  17: {
    message: 'You attended your high school prom and danced until your feet hurt.',
    icon: '🕺',
    statEffects: { happiness: 6, looks: 2 },
  },
  18: {
    message: 'You turned 18! You are now legally an adult with full independence and responsibilities.',
    icon: '🥂',
    statEffects: { happiness: 10 },
  },
};

export function getMilestoneForAge(age: number): LifeEvent {
  const milestone = EARLY_MILESTONES[age];
  if (milestone) {
    return {
      id: createId(),
      age,
      year: new Date().getFullYear() + age,
      message: milestone.message,
      category: age < 6 ? 'childhood' : age < 18 ? 'education' : 'milestone',
      icon: milestone.icon,
    };
  }

  // Generic year passage for older ages
  const genericEvents = [
    `Another year has passed. You maintained your routine and stayed healthy.`,
    `You reflected on your goals and spent quality time relaxing.`,
    `You celebrated your birthday with good food and close thoughts.`,
    `A calm and productive year went by without major incidents.`,
  ];
  const chosenMsg = pickRandom(genericEvents);

  return {
    id: createId(),
    age,
    year: new Date().getFullYear() + age,
    message: chosenMsg,
    category: 'milestone',
    icon: '⭐',
  };
}
