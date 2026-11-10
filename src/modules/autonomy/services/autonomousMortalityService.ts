import type {
  InheritanceBeneficiaryShare,
  InheritanceRecord,
  NpcFinanceState,
  RelationshipEdge,
  WorldSimulationState,
} from '../types';
import { calculateCanonicalNetWorth, convertCurrency } from './currencyService';
import { calculateAgeHealthDelta, evaluateMortalityHazard } from './healthMortalityService';
import { appendDeduplicatedLifeEvents, createDeduplicatedLifeEvent, rebuildRelationshipIndex } from './migrationService';
import { reconcilePopulationTiers } from './npcRegistryService';
import { createNpcPRNG, deterministicUUID } from './seededPrngService';
import { reconcileRomanticEdgesAfterDeath } from './autonomousRomanceService';
import { reconcileSocialEdgesAfterDeath } from './autonomousSocialService';

type HeirRelationship = InheritanceBeneficiaryShare['relationshipToDeceased'];

interface EstateSnapshot {
  currency: string;
  cash: number;
  savings: number;
  realEstateValue: number;
  businessEquity: number;
  studentDebt: number;
  mortgageBalance: number;
  otherLiabilities: number;
}

interface Allocation {
  beneficiaryId: string;
  relationship: HeirRelationship;
  amount: number;
}

/**
 * Ages living NPCs, resolves every death, then settles estates from the final living population.
 * A repeat or earlier year returns the same world.
 */
export function progressNpcMortalityYear(
  world: WorldSimulationState,
  year: number,
  playerId: string
): WorldSimulationState {
  if (Number.isFinite(world.lastMortalitySimYear) && year <= (world.lastMortalitySimYear as number)) {
    return world;
  }

  let draft = structuredClone(world);
  const cutoff = Number.isFinite(draft.populationConfig.elderMortalityAgeCutoff)
    ? draft.populationConfig.elderMortalityAgeCutoff
    : 75;
  const livingIds = Object.values(draft.npcRegistry)
    .filter((npc) => npc.isAlive)
    .map((npc) => npc.id)
    .sort((left, right) => left.localeCompare(right));
  const deaths: Array<{ id: string; causeOfDeath: string }> = [];

  for (const id of livingIds) {
    const npc = draft.npcRegistry[id];
    if (!npc || npc.birthYear === year) continue;
    const prng = createNpcPRNG(draft.worldSeed, year, id, 'health', draft.simulationVersion);
    const newAge = npc.age + 1;
    const newHealth = clampStat(npc.health + calculateAgeHealthDelta(newAge, prng));
    const hazard = evaluateMortalityHazard(newAge, newHealth, prng, cutoff);
    draft.npcRegistry[id] = {
      ...npc,
      age: newAge,
      birthYear: year - newAge,
      health: newHealth,
    };
    if (hazard.passedAway) {
      deaths.push({
        id,
        causeOfDeath: hazard.causeOfDeath ?? 'Passed away',
      });
    }
  }

  deaths.sort((left, right) => left.id.localeCompare(right.id));
  for (const death of deaths) {
    const npc = draft.npcRegistry[death.id];
    if (!npc) continue;
    draft.npcRegistry[death.id] = {
      ...npc,
      isAlive: false,
      deathYear: year,
      causeOfDeath: death.causeOfDeath,
    };
  }

  const settlementIds = Object.values(draft.npcRegistry)
    .filter((npc) => !npc.isAlive && npc.estateSettled !== true && !draft.inheritanceRecords[npc.id])
    .map((npc) => npc.id)
    .sort((left, right) => left.localeCompare(right));

  for (const id of settlementIds) {
    const npc = draft.npcRegistry[id];
    if (!npc) continue;
    const yearOfDeath = Number.isFinite(npc.deathYear) ? (npc.deathYear as number) : year;
    if (npc.deathYear !== yearOfDeath) {
      draft.npcRegistry[id] = { ...npc, deathYear: yearOfDeath };
    }
    draft = reconcileSocialEdgesAfterDeath(draft, id, yearOfDeath);
    draft = reconcileRomanticEdgesAfterDeath(draft, id, yearOfDeath);
  }

  const snapshots = new Map<string, EstateSnapshot>();
  for (const id of settlementIds) {
    const npc = draft.npcRegistry[id];
    if (npc) snapshots.set(id, snapshotEstate(npc.finances));
  }

  const blocked = new Set(settlementIds);
  const livingHeir = (id: string) => isLivingHeir(draft, id, playerId, blocked);
  for (const id of settlementIds) {
    const npc = draft.npcRegistry[id];
    const snapshot = snapshots.get(id);
    if (!npc || !snapshot) continue;
    const yearOfDeath = Number.isFinite(npc.deathYear) ? (npc.deathYear as number) : year;
    draft.inheritanceRecords[id] = buildRecord(draft, npc.id, snapshot, yearOfDeath, playerId, livingHeir);
  }

  for (const id of settlementIds) {
    const record = draft.inheritanceRecords[id];
    const npc = draft.npcRegistry[id];
    if (!record || !npc) continue;
    draft.npcRegistry[id] = {
      ...npc,
      estateSettled: true,
      finances: zeroEstate(npc.finances),
    };
  }

  for (const id of settlementIds) {
    const record = draft.inheritanceRecords[id];
    if (!record) continue;
    for (const share of record.distributions) {
      creditHeir(draft, share, record.id, record.settlementYear, year, playerId);
    }
  }

  for (const npc of Object.values(draft.npcRegistry)) {
    if (draft.inheritanceRecords[npc.id] && npc.estateSettled !== true) {
      draft.npcRegistry[npc.id] = { ...npc, estateSettled: true };
    }
  }

  return finalizeMortalityWorld(draft, year, playerId);
}

function clampStat(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function snapshotEstate(finances: NpcFinanceState): EstateSnapshot {
  return {
    currency: finances.currency || 'USD',
    cash: roundMoney(finances.cash),
    savings: roundMoney(finances.savings),
    realEstateValue: roundMoney(finances.realEstateValue),
    businessEquity: roundMoney(finances.businessEquity),
    studentDebt: roundMoney(finances.studentDebt),
    mortgageBalance: roundMoney(finances.mortgageBalance),
    otherLiabilities: roundMoney(finances.otherLiabilities),
  };
}

function zeroEstate(finances: NpcFinanceState): NpcFinanceState {
  const cleared: NpcFinanceState = {
    ...finances,
    cash: 0,
    savings: 0,
    realEstateValue: 0,
    businessEquity: 0,
    studentDebt: 0,
    mortgageBalance: 0,
    otherLiabilities: 0,
  };
  return { ...cleared, netWorth: calculateCanonicalNetWorth(cleared) };
}

function isLivingHeir(
  world: WorldSimulationState,
  id: string,
  playerId: string,
  blocked: ReadonlySet<string>
): boolean {
  if (blocked.has(id)) return false;
  if (id === playerId) return true;
  return world.npcRegistry[id]?.isAlive === true;
}

function edgesOf(world: WorldSimulationState): RelationshipEdge[] {
  return Object.values(world.relationshipsById).sort((left, right) => left.id.localeCompare(right.id));
}

function parentAndChild(edge: RelationshipEdge): { parentId: string; childId: string } | null {
  if (edge.category !== 'parent_child') return null;
  if (edge.roleForA === 'parent' && edge.roleForB === 'child') {
    return { parentId: edge.participantAId, childId: edge.participantBId };
  }
  if (edge.roleForB === 'parent' && edge.roleForA === 'child') {
    return { parentId: edge.participantBId, childId: edge.participantAId };
  }
  return null;
}

function qualifiesAsLineage(edge: RelationshipEdge): boolean {
  return edge.lineageRelation === 'biological' || edge.lineageRelation === 'adoptive';
}

function linkedChildIds(world: WorldSimulationState, parentId: string, lineageOnly: boolean): string[] {
  const ids = new Set<string>();
  for (const edge of edgesOf(world)) {
    const ends = parentAndChild(edge);
    if (!ends || ends.parentId !== parentId) continue;
    if (lineageOnly && !qualifiesAsLineage(edge)) continue;
    ids.add(ends.childId);
  }
  return [...ids];
}

function parentIdsOf(world: WorldSimulationState, childId: string): Set<string> {
  const ids = new Set<string>();
  for (const edge of edgesOf(world)) {
    const ends = parentAndChild(edge);
    if (!ends || ends.childId !== childId || !qualifiesAsLineage(edge)) continue;
    ids.add(ends.parentId);
  }
  return ids;
}

function shareQualifyingParent(world: WorldSimulationState, leftId: string, rightId: string): boolean {
  const leftParents = parentIdsOf(world, leftId);
  for (const parentId of parentIdsOf(world, rightId)) {
    if (leftParents.has(parentId)) return true;
  }
  return false;
}

function splitAmount(total: number, ids: readonly string[]): Map<string, number> {
  const shares = new Map<string, number>();
  const sorted = [...ids].sort((left, right) => left.localeCompare(right));
  if (sorted.length === 0 || total <= 0) return shares;
  const base = Math.floor(total / sorted.length);
  const extra = total % sorted.length;
  sorted.forEach((id, index) => {
    const share = base + (index < extra ? 1 : 0);
    if (share > 0) shares.set(id, share);
  });
  return shares;
}

function spouseIds(world: WorldSimulationState, deceasedId: string, livingHeir: (id: string) => boolean): string[] {
  const ids = new Set<string>();
  for (const edge of edgesOf(world)) {
    if (edge.category !== 'deceased_spouse') continue;
    if (edge.participantAId !== deceasedId && edge.participantBId !== deceasedId) continue;
    const heirId = edge.participantAId === deceasedId ? edge.participantBId : edge.participantAId;
    if (livingHeir(heirId)) ids.add(heirId);
  }
  return [...ids];
}

function eligibleBranches(
  world: WorldSimulationState,
  deceasedId: string,
  livingHeir: (id: string) => boolean
): string[] {
  const branches: string[] = [];
  for (const childId of linkedChildIds(world, deceasedId, true)) {
    const grandchildren = linkedChildIds(world, childId, true).filter((id) => livingHeir(id));
    if (livingHeir(childId) || grandchildren.length > 0) branches.push(childId);
  }
  return branches;
}

function allocationsFor(
  world: WorldSimulationState,
  deceasedId: string,
  net: number,
  livingHeir: (id: string) => boolean
): Allocation[] {
  if (net <= 0) return [];
  const claimed = new Set<string>();
  const spouses = spouseIds(world, deceasedId, livingHeir).filter((id) => {
    if (claimed.has(id)) return false;
    claimed.add(id);
    return true;
  });
  const branches = eligibleBranches(world, deceasedId, livingHeir).filter((id) => !claimed.has(id));
  const allocations: Allocation[] = [];

  if (spouses.length > 0 || branches.length > 0) {
    let spousePool = 0;
    let descendantPool = 0;
    if (spouses.length > 0 && branches.length > 0) {
      spousePool = Math.floor(net / 2);
      descendantPool = net - spousePool;
    } else if (spouses.length > 0) {
      spousePool = net;
    } else {
      descendantPool = net;
    }
    for (const [beneficiaryId, amount] of splitAmount(spousePool, spouses)) {
      allocations.push({ beneficiaryId, relationship: 'spouse', amount });
    }
    const branchShares = splitAmount(descendantPool, branches);
    for (const childId of branches) {
      const share = branchShares.get(childId) ?? 0;
      if (share <= 0) continue;
      if (livingHeir(childId)) {
        allocations.push({ beneficiaryId: childId, relationship: 'child', amount: share });
        continue;
      }
      const grandchildren = linkedChildIds(world, childId, true).filter((id) => livingHeir(id) && !claimed.has(id));
      for (const [beneficiaryId, amount] of splitAmount(share, grandchildren)) {
        allocations.push({ beneficiaryId, relationship: 'grandchild_per_stirpes', amount });
      }
    }
    return allocations;
  }

  const parents = [...parentIdsOf(world, deceasedId)].filter((id) => livingHeir(id) && !claimed.has(id));
  if (parents.length > 0) {
    for (const [beneficiaryId, amount] of splitAmount(net, parents)) {
      allocations.push({ beneficiaryId, relationship: 'parent', amount });
    }
    return allocations;
  }

  const siblings = edgesOf(world)
    .filter((edge) => edge.category === 'sibling' && (edge.participantAId === deceasedId || edge.participantBId === deceasedId))
    .map((edge) => (edge.participantAId === deceasedId ? edge.participantBId : edge.participantAId))
    .filter((id, index, all) => all.indexOf(id) === index)
    .filter((id) => livingHeir(id) && !claimed.has(id) && shareQualifyingParent(world, deceasedId, id));
  for (const [beneficiaryId, amount] of splitAmount(net, siblings)) {
    allocations.push({ beneficiaryId, relationship: 'sibling', amount });
  }
  return allocations;
}

function buildRecord(
  world: WorldSimulationState,
  deceasedId: string,
  snapshot: EstateSnapshot,
  settlementYear: number,
  playerId: string,
  livingHeir: (id: string) => boolean
): InheritanceRecord {
  const grossAssets = snapshot.cash + snapshot.savings + snapshot.realEstateValue + snapshot.businessEquity;
  const totalLiabilities = snapshot.studentDebt + snapshot.mortgageBalance + snapshot.otherLiabilities;
  const nonNegativeGross = Math.max(0, grossAssets);
  const nonNegativeLiabilities = Math.max(0, totalLiabilities);
  const liabilitiesPaid = Math.min(nonNegativeGross, nonNegativeLiabilities);
  const unpaidLiabilities = nonNegativeLiabilities - liabilitiesPaid;
  const netDistributableEstate = nonNegativeGross - liabilitiesPaid;
  const allocations = allocationsFor(world, deceasedId, netDistributableEstate, livingHeir);
  const distributions = allocations
    .filter((allocation) => allocation.amount > 0)
    .map((allocation) => toShare(world, allocation, snapshot.currency, playerId))
    .sort(
      (left, right) =>
        left.beneficiaryId.localeCompare(right.beneficiaryId) ||
        left.relationshipToDeceased.localeCompare(right.relationshipToDeceased)
    );
  let status: InheritanceRecord['status'] = 'settled';
  if (netDistributableEstate <= 0) status = 'insolvent';
  else if (distributions.length === 0) status = 'escheated';
  return {
    id: deterministicUUID('npc-estate', deceasedId, settlementYear),
    deceasedNpcId: deceasedId,
    settlementYear,
    currency: snapshot.currency,
    grossAssets,
    totalLiabilities,
    liabilitiesPaid,
    unpaidLiabilities,
    netDistributableEstate,
    distributions,
    escheatedToState: status === 'escheated',
    escheatedAmount: status === 'escheated' ? netDistributableEstate : 0,
    status,
  };
}

function toShare(
  world: WorldSimulationState,
  allocation: Allocation,
  sourceCurrency: string,
  playerId: string
): InheritanceBeneficiaryShare {
  const heir = world.npcRegistry[allocation.beneficiaryId];
  const targetCurrency =
    allocation.beneficiaryId === playerId || !heir ? sourceCurrency : heir.finances.currency || sourceCurrency;
  const converted = convertCurrency(allocation.amount, sourceCurrency, targetCurrency);
  return {
    beneficiaryId: allocation.beneficiaryId,
    relationshipToDeceased: allocation.relationship,
    sourceCurrency,
    targetCurrency,
    exchangeRateApplied: converted.exchangeRateApplied,
    amountInSourceCurrency: allocation.amount,
    amountAwardedInTargetCurrency: Math.max(0, converted.convertedAmount),
  };
}

function creditHeir(
  draft: WorldSimulationState,
  share: InheritanceBeneficiaryShare,
  estateId: string,
  settlementYear: number,
  year: number,
  playerId: string
): void {
  if (share.beneficiaryId === playerId) return;
  const heir = draft.npcRegistry[share.beneficiaryId];
  if (!heir || share.amountAwardedInTargetCurrency <= 0) return;
  const cash = heir.finances.cash + share.amountAwardedInTargetCurrency;
  const finances = { ...heir.finances, cash };
  const event = createDeduplicatedLifeEvent({
    npcId: heir.id,
    year: settlementYear,
    age: Math.max(0, heir.age - Math.max(0, year - settlementYear)),
    type: 'inheritance_received',
    title: 'Inheritance received',
    description: `${heir.firstName} received an inheritance.`,
    referenceId: estateId,
  });
  draft.npcRegistry[heir.id] = {
    ...heir,
    finances: { ...finances, netWorth: calculateCanonicalNetWorth(finances) },
    lifeHistory: appendDeduplicatedLifeEvents(heir.lifeHistory, [event]),
  };
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {};
  for (const key of Object.keys(record).sort((left, right) => left.localeCompare(right))) {
    sorted[key] = record[key] as T;
  }
  return sorted;
}

function finalizeMortalityWorld(world: WorldSimulationState, year: number, playerId: string): WorldSimulationState {
  const tiered = reconcilePopulationTiers(world, playerId);
  const relationshipsById = sortRecord(tiered.relationshipsById);
  return {
    ...tiered,
    npcRegistry: sortRecord(tiered.npcRegistry),
    relationshipsById,
    inheritanceRecords: sortRecord(tiered.inheritanceRecords),
    relationshipIndex: rebuildRelationshipIndex(relationshipsById),
    lastMortalitySimYear: year,
  };
}
