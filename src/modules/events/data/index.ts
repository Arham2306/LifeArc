import type { LifeEventTemplate } from '../types'
import { TODDLER_EVENTS } from './toddlerEvents'
import { CHILDHOOD_EVENTS } from './childhoodEvents'
import { MIDDLE_SCHOOL_EVENTS } from './middleSchoolEvents'
import { TEEN_EVENTS } from './teenEvents'
import { UNIVERSITY_EVENTS } from './universityEvents'
import { WORKPLACE_EVENTS } from './workplaceEvents'
import { PARENT_EVENTS } from './parentEvents'
import { BUSINESS_EVENTS } from './businessEvents'

/**
 * Every interactive event in the game.
 * To add a new pack, create a file in this folder and spread it in here.
 */
export const EVENT_POOL: LifeEventTemplate[] = [
  ...TODDLER_EVENTS,
  ...CHILDHOOD_EVENTS,
  ...MIDDLE_SCHOOL_EVENTS,
  ...TEEN_EVENTS,
  ...UNIVERSITY_EVENTS,
  ...WORKPLACE_EVENTS,
  ...PARENT_EVENTS,
  ...BUSINESS_EVENTS,
];
