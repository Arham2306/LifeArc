import type { NpcProfile, WorldSimulationState } from '../types';
import { progressNpcCareerForYear } from './autonomousCareerService';
import { progressNpcEducationForYear } from './autonomousEducationService';
import { progressNpcFinancesForYear } from './autonomousFinanceService';
import { progressNpcMemoryYear } from './autonomousMemoryService';
import { progressNpcMortalityYear } from './autonomousMortalityService';
import { progressNpcRomanceYear } from './autonomousRomanceService';
import { progressNpcSocialYear } from './autonomousSocialService';
import { processNpcGoalsLifecycle } from './goalService';
import { appendDeduplicatedLifeEvents } from './migrationService';
import { createNpcPRNG } from './seededPrngService';

/**
 * Runs one canonical NPC year.
 * Mortality ages NPCs first. Education, career, and finance then see that age.
 * Memory runs last so it can read every life event from the completed year.
 * A repeat or earlier year returns the same world. A gap throws before any clone.
 */
export function progressAutonomousYear(
  world: WorldSimulationState,
  year: number,
  playerId: string
): WorldSimulationState {
  if (!Number.isFinite(year)) {
    throw new Error(`Non-sequential simulation year: expected a finite year, received ${String(year)}`);
  }

  const last = world.lastSimulatedYear;
  if (Number.isFinite(last)) {
    if (year <= last) return world;
    if (year !== last + 1) {
      throw new Error(`Non-sequential simulation year: expected ${last + 1}, received ${year}`);
    }
  }

  let draft = structuredClone(world);
  draft = progressNpcMortalityYear(draft, year, playerId);
  draft = progressLivingNpcs(draft, year);
  draft = progressNpcSocialYear(draft, year, playerId);
  draft = progressNpcRomanceYear(draft, year, playerId);
  draft = progressNpcMemoryYear(draft, year, playerId);
  draft.lastSimulatedYear = year;
  return draft;
}

function progressLivingNpcs(world: WorldSimulationState, year: number): WorldSimulationState {
  const ids = Object.keys(world.npcRegistry).sort((left, right) => left.localeCompare(right));
  for (const id of ids) {
    const npc = world.npcRegistry[id];
    if (!npc?.isAlive) continue;
    world.npcRegistry[id] = progressLivingNpc(world, npc, year);
  }
  return world;
}

function progressLivingNpc(world: WorldSimulationState, npc: NpcProfile, year: number): NpcProfile {
  const goalsPrng = createNpcPRNG(world.worldSeed, year, npc.id, 'goals', world.simulationVersion);
  let current = processNpcGoalsLifecycle(npc, year, goalsPrng).updatedNpc;

  const education = progressNpcEducationForYear(
    current,
    year,
    createNpcPRNG(world.worldSeed, year, npc.id, 'education', world.simulationVersion),
    { familyWealth: world.familyWealth }
  );
  current = withLifeEvents(education.updatedNpc, education.lifeEvents);

  const career = progressNpcCareerForYear(
    current,
    year,
    createNpcPRNG(world.worldSeed, year, npc.id, 'career', world.simulationVersion),
    world.populationConfig.retirementTargetAge
  );
  current = withLifeEvents(career.updatedNpc, career.lifeEvents);

  const finance = progressNpcFinancesForYear(
    current,
    year,
    createNpcPRNG(world.worldSeed, year, npc.id, 'finance', world.simulationVersion)
  );
  current = withLifeEvents(finance.updatedNpc, finance.lifeEvents);

  return processNpcGoalsLifecycle(current, year, goalsPrng).updatedNpc;
}

function withLifeEvents(npc: NpcProfile, lifeEvents: NpcProfile['lifeHistory']): NpcProfile {
  return {
    ...npc,
    lifeHistory: appendDeduplicatedLifeEvents(npc.lifeHistory, lifeEvents),
  };
}
