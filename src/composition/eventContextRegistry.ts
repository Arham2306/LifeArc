import { createEventContextRegistry } from '../modules/events/services/eventContext';

/** Application composition point. Gameplay modules are added here, not inside the event engine. */
export const gameEventContextRegistry = createEventContextRegistry([]);
