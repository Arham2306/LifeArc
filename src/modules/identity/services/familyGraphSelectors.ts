import type {
  CharacterProfile,
  ChildProfile,
  ParentProfile,
  PersonProfile,
  SiblingProfile,
} from '../../../types/game';
import type { NpcProfile, RelationshipCategory, RelationshipEdge } from '../../autonomy/types';
import { orientRelationshipEdge } from '../../autonomy/services/npcRegistryService';
import { validPets } from '../../pets/services/petService';
import type {
  FamilyDataSource,
  FamilyGenerationOffset,
  FamilyMemberCareerDetails,
  FamilyMemberEducationDetails,
  FamilyMemberLifeHistoryItem,
  FamilyMemberMaritalDetails,
  FamilyRelationKind,
  IdentityFamilyGraphSummary,
  IdentityFamilyMember,
  IdentityPetMemorialSummary,
} from '../types';

export const FAMILY_GRAPH_MAX_DEPTH = 2;
export const MEMBER_LIFE_HISTORY_LIMIT = 12;

const KINSHIP_ALLOWED_CATEGORIES: ReadonlySet<RelationshipCategory> = new Set([
  'parent_child',
  'sibling',
  'spouse',
  'former_spouse',
  'deceased_spouse',
  'dating',
  'fiance',
  'ex',
]);

const VALID_GENDERS = new Set(['male', 'female', 'non-binary']);
const VALID_LINEAGE_RELATIONS = new Set(['biological', 'adoptive', 'step', 'in_law', 'none']);
const VALID_BIRTH_ORDERS = new Set(['older', 'younger', 'twin']);

const RELATION_SORT_PRIORITY: Record<FamilyRelationKind, number> = {
  parent: 1,
  parent_in_law: 2,
  partner: 3,
  sibling: 4,
  sibling_in_law: 5,
  former_spouse: 6,
  deceased_spouse: 7,
  ex_partner: 8,
  child: 9,
  niece_nephew: 10,
  child_in_law: 11,
  grandchild: 12,
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteNonNegativeIntOrNull(value: unknown): number | null {
  return finiteNumber(value) && value >= 0 ? Math.trunc(value) : null;
}

function finiteIntOrNull(value: unknown): number | null {
  return finiteNumber(value) ? Math.trunc(value) : null;
}

function normalizeGender(value: unknown): IdentityFamilyMember['gender'] {
  return typeof value === 'string' && VALID_GENDERS.has(value)
    ? (value as IdentityFamilyMember['gender'])
    : 'unknown';
}

function normalizeLineage(
  value: unknown,
  fallback: IdentityFamilyMember['lineageRelation'] = 'none'
): IdentityFamilyMember['lineageRelation'] {
  return typeof value === 'string' && VALID_LINEAGE_RELATIONS.has(value)
    ? (value as IdentityFamilyMember['lineageRelation'])
    : fallback;
}

function isSyntheticLegacyId(id: string): boolean {
  return id.startsWith('legacy:');
}

function extractNpcEducation(npc: NpcProfile | undefined): FamilyMemberEducationDetails | null {
  if (!npc || !isPlainRecord(npc.education)) return null;
  const currentStage = nonEmptyString(npc.education.currentStage);
  if (!currentStage) return null;
  return {
    currentStage,
    degreeEarned: nonEmptyString(npc.education.degreeEarned),
    fieldOfStudy: nonEmptyString(npc.education.fieldOfStudy),
  };
}

function extractNpcCareer(npc: NpcProfile | undefined): FamilyMemberCareerDetails | null {
  if (!npc || !isPlainRecord(npc.career)) return null;
  const title = nonEmptyString(npc.career.title);
  const companyName = nonEmptyString(npc.career.companyName);
  const occupation = nonEmptyString(npc.career.occupation);
  if (!title && !companyName && !occupation) return null;
  return {
    title,
    companyName,
    occupation,
    isRetired: npc.career.isRetired === true,
  };
}

function extractNpcLifeHistory(npc: NpcProfile | undefined): FamilyMemberLifeHistoryItem[] {
  if (!npc || !Array.isArray(npc.lifeHistory)) return [];
  const items: FamilyMemberLifeHistoryItem[] = [];
  for (let i = 0; i < npc.lifeHistory.length; i++) {
    const raw = npc.lifeHistory[i];
    if (!isPlainRecord(raw)) continue;
    const title = nonEmptyString(raw.title);
    const description = nonEmptyString(raw.description);
    const type = nonEmptyString(raw.type);
    if (!title || !description || !type) continue;
    if (!finiteNumber(raw.year) || !finiteNumber(raw.age) || raw.age < 0) continue;
    items.push({
      id: nonEmptyString(raw.id) ?? `npc_event:${npc.id}:${i}`,
      year: Math.trunc(raw.year),
      age: Math.trunc(raw.age),
      type,
      title,
      description,
    });
  }
  items.sort((a, b) => a.year - b.year || a.age - b.age || a.id.localeCompare(b.id));
  return items.slice(-MEMBER_LIFE_HISTORY_LIMIT);
}

interface LegacyParentEntry {
  id: string;
  hasCanonicalId: boolean;
  role: 'father' | 'mother';
  raw: ParentProfile;
}

interface LegacySiblingEntry {
  id: string;
  hasCanonicalId: boolean;
  raw: SiblingProfile;
}

interface LegacyChildEntry {
  id: string;
  hasCanonicalId: boolean;
  raw: ChildProfile;
}

interface LegacyPersonEntry {
  id: string;
  hasCanonicalId: boolean;
  isExSpouseHint: boolean;
  raw: PersonProfile;
}

interface LegacySlices {
  parents: LegacyParentEntry[];
  siblings: LegacySiblingEntry[];
  children: LegacyChildEntry[];
  activePartner: LegacyPersonEntry | null;
  exPartnersById: Map<string, LegacyPersonEntry>;
  allLegacyIds: Set<string>;
}

function extractLegacySlices(character: CharacterProfile): LegacySlices {
  const parents: LegacyParentEntry[] = [];
  const siblings: LegacySiblingEntry[] = [];
  const children: LegacyChildEntry[] = [];
  const exPartnersById = new Map<string, LegacyPersonEntry>();
  const allLegacyIds = new Set<string>();

  if (isPlainRecord(character.parents)) {
    const fatherRaw = character.parents.father as unknown;
    if (isPlainRecord(fatherRaw) && nonEmptyString(fatherRaw.firstName)) {
      const explicitId = nonEmptyString(fatherRaw.id);
      const id = explicitId ?? 'legacy:father';
      const hasCanonicalId = explicitId !== null && !isSyntheticLegacyId(explicitId);
      if (hasCanonicalId && explicitId !== null) allLegacyIds.add(explicitId);
      parents.push({
        id,
        hasCanonicalId,
        role: 'father',
        raw: fatherRaw as unknown as ParentProfile,
      });
    }
    const motherRaw = character.parents.mother as unknown;
    if (isPlainRecord(motherRaw) && nonEmptyString(motherRaw.firstName)) {
      const explicitId = nonEmptyString(motherRaw.id);
      const id = explicitId ?? 'legacy:mother';
      const hasCanonicalId = explicitId !== null && !isSyntheticLegacyId(explicitId);
      if (hasCanonicalId && explicitId !== null) allLegacyIds.add(explicitId);
      parents.push({
        id,
        hasCanonicalId,
        role: 'mother',
        raw: motherRaw as unknown as ParentProfile,
      });
    }
  }

  if (Array.isArray(character.siblings)) {
    character.siblings.forEach((raw, idx) => {
      if (!isPlainRecord(raw) || !nonEmptyString(raw.firstName)) return;
      const explicitId = nonEmptyString(raw.id);
      const id = explicitId ?? `legacy:sibling:${idx}`;
      const hasCanonicalId = explicitId !== null && !isSyntheticLegacyId(explicitId);
      if (hasCanonicalId && explicitId !== null) allLegacyIds.add(explicitId);
      siblings.push({
        id,
        hasCanonicalId,
        raw: raw as unknown as SiblingProfile,
      });
    });
  }

  if (Array.isArray(character.children)) {
    character.children.forEach((raw, idx) => {
      if (!isPlainRecord(raw) || !nonEmptyString(raw.firstName)) return;
      const explicitId = nonEmptyString(raw.id);
      const id = explicitId ?? `legacy:child:${idx}`;
      const hasCanonicalId = explicitId !== null && !isSyntheticLegacyId(explicitId);
      if (hasCanonicalId && explicitId !== null) allLegacyIds.add(explicitId);
      children.push({
        id,
        hasCanonicalId,
        raw: raw as unknown as ChildProfile,
      });
    });
  }

  let activePartner: LegacyPersonEntry | null = null;
  if (isPlainRecord(character.partner) && nonEmptyString(character.partner.firstName)) {
    const explicitId = nonEmptyString(character.partner.id);
    const id = explicitId ?? 'legacy:partner';
    const hasCanonicalId = explicitId !== null && !isSyntheticLegacyId(explicitId);
    if (hasCanonicalId && explicitId !== null) allLegacyIds.add(explicitId);
    activePartner = {
      id,
      hasCanonicalId,
      isExSpouseHint: false,
      raw: character.partner as unknown as PersonProfile,
    };
  }

  const recordExEntry = (raw: unknown, fallbackId: string) => {
    if (!isPlainRecord(raw) || !nonEmptyString(raw.firstName)) return;
    const explicitId = nonEmptyString(raw.id);
    const id = explicitId ?? fallbackId;
    const hasCanonicalId = explicitId !== null && !isSyntheticLegacyId(explicitId);
    if (hasCanonicalId && explicitId !== null) allLegacyIds.add(explicitId);
    const roleLower = (nonEmptyString(raw.role) ?? '').toLowerCase();
    const pStats = isPlainRecord(raw.partnerStats) ? raw.partnerStats : null;
    const isExSpouseHint =
      roleLower.includes('ex-spouse') ||
      Boolean(pStats && (nonEmptyString(pStats.weddingVenue) || pStats.hasPrenup === true));
    if (!exPartnersById.has(id)) {
      exPartnersById.set(id, {
        id,
        hasCanonicalId,
        isExSpouseHint,
        raw: raw as unknown as PersonProfile,
      });
    }
  };

  if (Array.isArray(character.exPartners)) {
    character.exPartners.forEach((raw, idx) => recordExEntry(raw, `legacy:ex_partner:${idx}`));
  }

  if (Array.isArray(character.relationships)) {
    character.relationships.forEach((raw, idx) => {
      if (!isPlainRecord(raw)) return;
      if (
        raw.relationshipType === 'ex' ||
        raw.romanticStage === 'ex' ||
        raw.romanticStage === 'widowed'
      ) {
        const id = nonEmptyString(raw.id);
        // Active partner entry overrides historical relationship entry for the same id
        if (id && activePartner && activePartner.id === id) return;
        recordExEntry(raw, `legacy:rel_ex:${idx}`);
      }
    });
  }

  return { parents, siblings, children, activePartner, exPartnersById, allLegacyIds };
}

interface ValidatedCanonicalGraph {
  npcMap: Map<string, NpcProfile>;
  adjByParticipant: Map<string, RelationshipEdge[]>;
}

function isValidCanonicalEdge(value: unknown): value is RelationshipEdge {
  if (!isPlainRecord(value)) return false;
  if (!nonEmptyString(value.id)) return false;
  if (!nonEmptyString(value.participantAId) || !nonEmptyString(value.participantBId)) return false;
  if (
    typeof value.category !== 'string' ||
    !KINSHIP_ALLOWED_CATEGORIES.has(value.category as RelationshipCategory)
  ) {
    return false;
  }
  return true;
}

function readCanonicalWorld(
  character: CharacterProfile,
  allLegacyIds: ReadonlySet<string>
): ValidatedCanonicalGraph | null {
  const world = character.worldState as unknown;
  if (!isPlainRecord(world)) return null;
  if (world.schemaVersion !== 2) return null;
  if (!isPlainRecord(world.npcRegistry) || !isPlainRecord(world.relationshipsById)) return null;

  const npcMap = new Map<string, NpcProfile>();
  for (const rawNpc of Object.values(world.npcRegistry)) {
    if (!isPlainRecord(rawNpc)) continue;
    const id = nonEmptyString(rawNpc.id);
    const firstName = nonEmptyString(rawNpc.firstName);
    if (!id || !firstName || isSyntheticLegacyId(id)) continue;
    npcMap.set(id, rawNpc as unknown as NpcProfile);
  }

  const adjByParticipant = new Map<string, RelationshipEdge[]>();
  const playerId = nonEmptyString(character.id) ?? '';

  const edges = Object.values(world.relationshipsById)
    .filter(isValidCanonicalEdge)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const edge of edges) {
    // Drop dangling canonical edges that reference missing NPCs (unless endpoint is playerId or known legacy id)
    const aKnown = edge.participantAId === playerId || npcMap.has(edge.participantAId) || allLegacyIds.has(edge.participantAId);
    const bKnown = edge.participantBId === playerId || npcMap.has(edge.participantBId) || allLegacyIds.has(edge.participantBId);
    if (!aKnown || !bKnown) continue;

    const listA = adjByParticipant.get(edge.participantAId);
    if (listA) listA.push(edge);
    else adjByParticipant.set(edge.participantAId, [edge]);

    if (edge.participantBId !== edge.participantAId) {
      const listB = adjByParticipant.get(edge.participantBId);
      if (listB) listB.push(edge);
      else adjByParticipant.set(edge.participantBId, [edge]);
    }
  }

  return { npcMap, adjByParticipant };
}

function formatParentLabel(
  role: 'father' | 'mother' | 'parent' | undefined,
  lineage: IdentityFamilyMember['lineageRelation']
): string {
  const base = role === 'father' ? 'Father' : role === 'mother' ? 'Mother' : 'Parent';
  if (lineage === 'adoptive') return `Adoptive ${base}`;
  if (lineage === 'step') return `Step-${base}`;
  return base;
}

function formatSiblingLabel(
  gender: IdentityFamilyMember['gender'],
  lineage: IdentityFamilyMember['lineageRelation']
): string {
  const base = gender === 'male' ? 'Brother' : gender === 'female' ? 'Sister' : 'Sibling';
  if (lineage === 'step') return `Step-${base}`;
  if (lineage === 'adoptive') return `Adoptive ${base}`;
  return base;
}

function formatChildLabel(
  gender: IdentityFamilyMember['gender'],
  lineage: IdentityFamilyMember['lineageRelation']
): string {
  const base = gender === 'male' ? 'Son' : gender === 'female' ? 'Daughter' : 'Child';
  if (lineage === 'adoptive') return `Adopted ${base}`;
  if (lineage === 'step') return `Stepchild`;
  return base;
}

function formatPartnerLabel(romanticStage: string | null, relationshipType?: string): string {
  if (romanticStage === 'married' || relationshipType === 'spouse') return 'Spouse';
  if (romanticStage === 'engaged') return 'Fiancé(e)';
  return 'Partner';
}

function maritalFromPersonAndEdge(
  person: PersonProfile | undefined,
  edge: RelationshipEdge | undefined
): FamilyMemberMaritalDetails | null {
  const pStats = person && isPlainRecord(person.partnerStats) ? person.partnerStats : null;
  const yearsTogether =
    (pStats ? finiteNonNegativeIntOrNull(pStats.yearsTogether) : null) ??
    (edge ? finiteNonNegativeIntOrNull(edge.yearsTogether) : null);
  const romanticStage = nonEmptyString(person?.romanticStage) ?? (edge ? edge.category : null);
  const hasPrenup =
    typeof pStats?.hasPrenup === 'boolean'
      ? pStats.hasPrenup
      : typeof edge?.hasPrenup === 'boolean'
        ? edge.hasPrenup
        : null;
  const weddingVenue = nonEmptyString(pStats?.weddingVenue) ?? nonEmptyString(edge?.weddingVenue);

  if (yearsTogether === null && romanticStage === null && hasPrenup === null && weddingVenue === null) {
    return null;
  }
  return { romanticStage, yearsTogether, hasPrenup, weddingVenue };
}

function buildMemberFromCanonicalNpc(params: {
  npc: NpcProfile;
  relationKind: FamilyRelationKind;
  relationLabel: string;
  lineageRelation: IdentityFamilyMember['lineageRelation'];
  generationOffset: FamilyGenerationOffset;
  traversalDepth: 1 | 2;
  isCurrent: boolean;
  isFormerRelationship: boolean;
  edge?: RelationshipEdge;
  person?: PersonProfile;
  source?: FamilyDataSource;
}): IdentityFamilyMember {
  const { npc, edge, person } = params;
  const isAlive = npc.isAlive !== false;
  const firstName = nonEmptyString(npc.firstName) ?? 'Unknown';
  const lastName = nonEmptyString(npc.lastName) ?? '';
  const occupation =
    nonEmptyString(npc.career?.title) ??
    nonEmptyString(npc.career?.occupation) ??
    nonEmptyString(person?.partnerStats?.occupation) ??
    nonEmptyString(person?.role);

  return {
    id: npc.id,
    hasCanonicalId: !isSyntheticLegacyId(npc.id),
    firstName,
    lastName,
    fullName: lastName ? `${firstName} ${lastName}` : firstName,
    gender: normalizeGender(npc.gender ?? npc.biologicalGender),
    relationKind: params.relationKind,
    relationLabel: params.relationLabel,
    lineageRelation: params.lineageRelation,
    generationOffset: params.generationOffset,
    traversalDepth: params.traversalDepth,
    source: params.source ?? 'canonical',
    isAlive,
    isCurrent: params.isCurrent,
    isFormerRelationship: params.isFormerRelationship,
    age: finiteNonNegativeIntOrNull(npc.age),
    birthYear: finiteIntOrNull(npc.birthYear),
    deathYear: !isAlive ? finiteIntOrNull(npc.deathYear) : null,
    causeOfDeath: !isAlive ? nonEmptyString(npc.causeOfDeath) : null,
    occupation,
    birthOrder:
      typeof npc.birthOrder === 'string' && VALID_BIRTH_ORDERS.has(npc.birthOrder)
        ? (npc.birthOrder as IdentityFamilyMember['birthOrder'])
        : null,
    education: extractNpcEducation(npc),
    career: extractNpcCareer(npc),
    maritalDetails:
      params.relationKind === 'partner' ||
      params.relationKind === 'former_spouse' ||
      params.relationKind === 'deceased_spouse' ||
      params.relationKind === 'ex_partner'
        ? maritalFromPersonAndEdge(person, edge)
        : null,
    lifeHistoryHighlights: extractNpcLifeHistory(npc),
  };
}

function selectPetMemorials(character: CharacterProfile): IdentityPetMemorialSummary[] {
  return validPets(character)
    .filter((pet) => pet.status === 'memorial')
    .map((pet) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      petAge: pet.petAge,
      adoptedAtAge: pet.adoptedAtAge,
      closedAtAge: finiteNonNegativeIntOrNull(pet.closedAtAge),
      closingLine: nonEmptyString(pet.closingLine) ?? pet.lastMoment,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function selectFamilyGraph(character: CharacterProfile): IdentityFamilyGraphSummary {
  const playerId = nonEmptyString(character.id) ?? '';
  const legacy = extractLegacySlices(character);
  const canonical = readCanonicalWorld(character, legacy.allLegacyIds);

  const memberMap = new Map<string, IdentityFamilyMember>();
  const visitedIds = new Set<string>(playerId ? [playerId] : []);

  const canonicalAnchorEdgesByOtherId = new Map<string, RelationshipEdge[]>();
  if (canonical && playerId) {
    const incident = canonical.adjByParticipant.get(playerId) ?? [];
    for (const edge of incident) {
      const oriented = orientRelationshipEdge(edge, playerId);
      if (!oriented) continue;
      if (!canonical.npcMap.has(oriented.otherId) && !legacy.allLegacyIds.has(oriented.otherId)) continue;
      const list = canonicalAnchorEdgesByOtherId.get(oriented.otherId);
      if (list) list.push(edge);
      else canonicalAnchorEdgesByOtherId.set(oriented.otherId, [edge]);
    }
  }

  // 1. Reconcile Legacy Parents (+ canonical enrichment only for explicit authoritative IDs)
  for (const pEntry of legacy.parents) {
    const npc = pEntry.hasCanonicalId ? canonical?.npcMap.get(pEntry.id) : undefined;
    const matchingEdge = pEntry.hasCanonicalId
      ? canonicalAnchorEdgesByOtherId.get(pEntry.id)?.find((e) => e.category === 'parent_child')
      : undefined;
    const lineage = normalizeLineage(
      matchingEdge?.lineageRelation ?? pEntry.raw.lineageRelation,
      'biological'
    );
    const label = formatParentLabel(pEntry.role, lineage);
    // Irreversible death: if either source states deceased, mark deceased
    const isAlive = (npc ? npc.isAlive !== false : true) && pEntry.raw.isAlive !== false;
    const firstName = nonEmptyString(npc?.firstName) ?? nonEmptyString(pEntry.raw.firstName) ?? 'Unknown';
    const lastName = nonEmptyString(npc?.lastName) ?? nonEmptyString(pEntry.raw.lastName) ?? '';

    memberMap.set(pEntry.id, {
      id: pEntry.id,
      hasCanonicalId: pEntry.hasCanonicalId,
      firstName,
      lastName,
      fullName: lastName ? `${firstName} ${lastName}` : firstName,
      gender: npc
        ? normalizeGender(npc.gender ?? npc.biologicalGender)
        : pEntry.role === 'father'
          ? 'male'
          : 'female',
      relationKind: 'parent',
      relationLabel: label,
      lineageRelation: lineage,
      generationOffset: 1,
      traversalDepth: 1,
      source: npc ? 'reconciled' : 'legacy',
      isAlive,
      isCurrent: true,
      isFormerRelationship: false,
      age: finiteNonNegativeIntOrNull(npc?.age) ?? finiteNonNegativeIntOrNull(pEntry.raw.age),
      birthYear: finiteIntOrNull(npc?.birthYear),
      deathYear: !isAlive ? finiteIntOrNull(npc?.deathYear) : null,
      causeOfDeath: !isAlive ? nonEmptyString(npc?.causeOfDeath) : null,
      occupation:
        nonEmptyString(pEntry.raw.occupation) ??
        nonEmptyString(npc?.career?.title) ??
        nonEmptyString(npc?.career?.occupation),
      birthOrder: null,
      education: extractNpcEducation(npc),
      career: extractNpcCareer(npc),
      maritalDetails: null,
      lifeHistoryHighlights: extractNpcLifeHistory(npc),
    });
    visitedIds.add(pEntry.id);
  }

  // 2. Reconcile Legacy Siblings (+ canonical enrichment only for explicit authoritative IDs)
  for (const sEntry of legacy.siblings) {
    if (memberMap.has(sEntry.id)) continue;
    const npc = sEntry.hasCanonicalId ? canonical?.npcMap.get(sEntry.id) : undefined;
    const matchingEdge = sEntry.hasCanonicalId
      ? canonicalAnchorEdgesByOtherId.get(sEntry.id)?.find((e) => e.category === 'sibling')
      : undefined;
    const lineage = normalizeLineage(matchingEdge?.lineageRelation, 'biological');
    const gender = npc ? normalizeGender(npc.gender ?? npc.biologicalGender) : normalizeGender(sEntry.raw.gender);
    const isAlive = (npc ? npc.isAlive !== false : true) && sEntry.raw.isAlive !== false;
    const firstName = nonEmptyString(npc?.firstName) ?? nonEmptyString(sEntry.raw.firstName) ?? 'Unknown';
    const lastName = nonEmptyString(npc?.lastName) ?? nonEmptyString(sEntry.raw.lastName) ?? '';

    memberMap.set(sEntry.id, {
      id: sEntry.id,
      hasCanonicalId: sEntry.hasCanonicalId,
      firstName,
      lastName,
      fullName: lastName ? `${firstName} ${lastName}` : firstName,
      gender,
      relationKind: 'sibling',
      relationLabel: formatSiblingLabel(gender, lineage),
      lineageRelation: lineage,
      generationOffset: 0,
      traversalDepth: 1,
      source: npc ? 'reconciled' : 'legacy',
      isAlive,
      isCurrent: true,
      isFormerRelationship: false,
      age: finiteNonNegativeIntOrNull(sEntry.raw.age) ?? finiteNonNegativeIntOrNull(npc?.age),
      birthYear: finiteIntOrNull(npc?.birthYear),
      deathYear: !isAlive ? finiteIntOrNull(npc?.deathYear) : null,
      causeOfDeath: !isAlive ? nonEmptyString(npc?.causeOfDeath) : null,
      occupation:
        nonEmptyString(sEntry.raw.occupation) ??
        nonEmptyString(npc?.career?.title) ??
        nonEmptyString(npc?.career?.occupation),
      birthOrder:
        typeof sEntry.raw.birthOrder === 'string' && VALID_BIRTH_ORDERS.has(sEntry.raw.birthOrder)
          ? sEntry.raw.birthOrder
          : null,
      education: extractNpcEducation(npc),
      career: extractNpcCareer(npc),
      maritalDetails: null,
      lifeHistoryHighlights: extractNpcLifeHistory(npc),
    });
    visitedIds.add(sEntry.id);
  }

  // 3. Reconcile Legacy Children (preserves same-year adoptions/births even if not yet in canonical)
  for (const cEntry of legacy.children) {
    if (memberMap.has(cEntry.id)) continue;
    const npc = cEntry.hasCanonicalId ? canonical?.npcMap.get(cEntry.id) : undefined;
    const matchingEdge = cEntry.hasCanonicalId
      ? canonicalAnchorEdgesByOtherId.get(cEntry.id)?.find((e) => e.category === 'parent_child')
      : undefined;
    const lineage =
      cEntry.raw.isAdopted === true
        ? 'adoptive'
        : normalizeLineage(matchingEdge?.lineageRelation, 'biological');
    const gender = npc
      ? normalizeGender(npc.gender ?? npc.biologicalGender)
      : normalizeGender(cEntry.raw.gender);
    const isAlive = (npc ? npc.isAlive !== false : true) && cEntry.raw.isAlive !== false;
    const firstName = nonEmptyString(npc?.firstName) ?? nonEmptyString(cEntry.raw.firstName) ?? 'Unknown';
    const lastName = nonEmptyString(npc?.lastName) ?? nonEmptyString(cEntry.raw.lastName) ?? '';

    memberMap.set(cEntry.id, {
      id: cEntry.id,
      hasCanonicalId: cEntry.hasCanonicalId,
      firstName,
      lastName,
      fullName: lastName ? `${firstName} ${lastName}` : firstName,
      gender,
      relationKind: 'child',
      relationLabel: formatChildLabel(gender, lineage),
      lineageRelation: lineage,
      generationOffset: -1,
      traversalDepth: 1,
      source: npc ? 'reconciled' : 'legacy',
      isAlive,
      isCurrent: true,
      isFormerRelationship: false,
      age: finiteNonNegativeIntOrNull(cEntry.raw.age) ?? finiteNonNegativeIntOrNull(npc?.age),
      birthYear: finiteIntOrNull(npc?.birthYear),
      deathYear: !isAlive ? finiteIntOrNull(npc?.deathYear) : null,
      causeOfDeath: !isAlive ? nonEmptyString(npc?.causeOfDeath) : null,
      occupation:
        nonEmptyString(cEntry.raw.occupation) ??
        nonEmptyString(npc?.career?.title) ??
        nonEmptyString(npc?.career?.occupation),
      birthOrder: null,
      education: extractNpcEducation(npc),
      career: extractNpcCareer(npc),
      maritalDetails: null,
      lifeHistoryHighlights: extractNpcLifeHistory(npc),
    });
    visitedIds.add(cEntry.id);
  }

  // 4. Reconcile Active Partner (legacy owns current-year marriage unless canonical says deceased or legacy says widowed)
  if (legacy.activePartner) {
    const pEntry = legacy.activePartner;
    const npc = pEntry.hasCanonicalId ? canonical?.npcMap.get(pEntry.id) : undefined;
    const matchingEdge = pEntry.hasCanonicalId
      ? canonicalAnchorEdgesByOtherId
          .get(pEntry.id)
          ?.find(
            (e) =>
              e.category === 'spouse' ||
              e.category === 'dating' ||
              e.category === 'fiance' ||
              e.category === 'deceased_spouse'
          )
      : undefined;

    const canonicalDeceased =
      (npc !== undefined && npc.isAlive === false) ||
      matchingEdge?.category === 'deceased_spouse';
    const legacyWidowed = pEntry.raw.romanticStage === 'widowed';

    const firstName = nonEmptyString(npc?.firstName) ?? nonEmptyString(pEntry.raw.firstName) ?? 'Unknown';
    const lastName = nonEmptyString(npc?.lastName) ?? nonEmptyString(pEntry.raw.lastName) ?? '';

    if (canonicalDeceased || legacyWidowed) {
      memberMap.set(pEntry.id, {
        id: pEntry.id,
        hasCanonicalId: pEntry.hasCanonicalId,
        firstName,
        lastName,
        fullName: lastName ? `${firstName} ${lastName}` : firstName,
        gender: npc ? normalizeGender(npc.gender ?? npc.biologicalGender) : normalizeGender(pEntry.raw.gender),
        relationKind: 'deceased_spouse',
        relationLabel: 'Deceased Spouse',
        lineageRelation: 'none',
        generationOffset: 0,
        traversalDepth: 1,
        source: npc ? 'reconciled' : 'legacy',
        isAlive: false,
        isCurrent: false,
        isFormerRelationship: true,
        age: finiteNonNegativeIntOrNull(npc?.age) ?? finiteNonNegativeIntOrNull(pEntry.raw.age),
        birthYear: finiteIntOrNull(npc?.birthYear),
        deathYear: canonicalDeceased ? finiteIntOrNull(npc?.deathYear) : null,
        causeOfDeath: canonicalDeceased ? nonEmptyString(npc?.causeOfDeath) : null,
        occupation:
          nonEmptyString(npc?.career?.title) ??
          nonEmptyString(pEntry.raw.partnerStats?.occupation) ??
          nonEmptyString(pEntry.raw.role),
        birthOrder: null,
        education: extractNpcEducation(npc),
        career: extractNpcCareer(npc),
        maritalDetails: maritalFromPersonAndEdge(pEntry.raw, matchingEdge),
        lifeHistoryHighlights: extractNpcLifeHistory(npc),
      });
    } else {
      const stage = nonEmptyString(pEntry.raw.romanticStage);
      memberMap.set(pEntry.id, {
        id: pEntry.id,
        hasCanonicalId: pEntry.hasCanonicalId,
        firstName,
        lastName,
        fullName: lastName ? `${firstName} ${lastName}` : firstName,
        gender: npc ? normalizeGender(npc.gender ?? npc.biologicalGender) : normalizeGender(pEntry.raw.gender),
        relationKind: 'partner',
        relationLabel: formatPartnerLabel(stage, pEntry.raw.relationshipType),
        lineageRelation: 'none',
        generationOffset: 0,
        traversalDepth: 1,
        source: npc ? 'reconciled' : 'legacy',
        isAlive: true,
        isCurrent: true,
        isFormerRelationship: false,
        age: finiteNonNegativeIntOrNull(pEntry.raw.age) ?? finiteNonNegativeIntOrNull(npc?.age),
        birthYear: finiteIntOrNull(npc?.birthYear),
        deathYear: null,
        causeOfDeath: null,
        occupation:
          nonEmptyString(pEntry.raw.partnerStats?.occupation) ??
          nonEmptyString(npc?.career?.title) ??
          nonEmptyString(pEntry.raw.role),
        birthOrder: null,
        education: extractNpcEducation(npc),
        career: extractNpcCareer(npc),
        maritalDetails: maritalFromPersonAndEdge(pEntry.raw, matchingEdge),
        lifeHistoryHighlights: extractNpcLifeHistory(npc),
      });
    }
    visitedIds.add(pEntry.id);
  }

  // 5. Reconcile Legacy Ex-Partners & Divorces (overrides stale canonical active partner/spouse edges)
  for (const exEntry of legacy.exPartnersById.values()) {
    if (memberMap.has(exEntry.id)) continue;
    const npc = exEntry.hasCanonicalId ? canonical?.npcMap.get(exEntry.id) : undefined;
    const matchingEdge = exEntry.hasCanonicalId
      ? canonicalAnchorEdgesByOtherId
          .get(exEntry.id)
          ?.find(
            (e) =>
              e.category === 'former_spouse' ||
              e.category === 'deceased_spouse' ||
              e.category === 'spouse' ||
              e.category === 'ex' ||
              e.category === 'dating' ||
              e.category === 'fiance'
          )
      : undefined;
    const canonicalDeceased =
      (npc !== undefined && npc.isAlive === false) ||
      matchingEdge?.category === 'deceased_spouse';
    const legacyWidowed = exEntry.raw.romanticStage === 'widowed';
    const isAlive = !canonicalDeceased && !legacyWidowed;
    const wasSpouse =
      exEntry.isExSpouseHint ||
      legacyWidowed ||
      matchingEdge?.category === 'former_spouse' ||
      matchingEdge?.category === 'spouse' ||
      matchingEdge?.category === 'deceased_spouse';

    const relationKind: FamilyRelationKind = !isAlive && wasSpouse
      ? 'deceased_spouse'
      : wasSpouse
        ? 'former_spouse'
        : 'ex_partner';
    const relationLabel =
      relationKind === 'deceased_spouse'
        ? legacy.exPartnersById.has(exEntry.id) && legacyWidowed && !exEntry.isExSpouseHint
          ? 'Deceased Spouse'
          : 'Deceased Former Spouse'
        : relationKind === 'former_spouse'
          ? 'Former Spouse'
          : 'Ex-Partner';

    const firstName = nonEmptyString(npc?.firstName) ?? nonEmptyString(exEntry.raw.firstName) ?? 'Unknown';
    const lastName = nonEmptyString(npc?.lastName) ?? nonEmptyString(exEntry.raw.lastName) ?? '';

    memberMap.set(exEntry.id, {
      id: exEntry.id,
      hasCanonicalId: exEntry.hasCanonicalId,
      firstName,
      lastName,
      fullName: lastName ? `${firstName} ${lastName}` : firstName,
      gender: npc ? normalizeGender(npc.gender ?? npc.biologicalGender) : normalizeGender(exEntry.raw.gender),
      relationKind,
      relationLabel,
      lineageRelation: 'none',
      generationOffset: 0,
      traversalDepth: 1,
      source: npc ? 'reconciled' : 'legacy',
      isAlive,
      isCurrent: false,
      isFormerRelationship: true,
      age: finiteNonNegativeIntOrNull(npc?.age) ?? finiteNonNegativeIntOrNull(exEntry.raw.age),
      birthYear: finiteIntOrNull(npc?.birthYear),
      deathYear: canonicalDeceased ? finiteIntOrNull(npc?.deathYear) : null,
      causeOfDeath: canonicalDeceased ? nonEmptyString(npc?.causeOfDeath) : null,
      occupation:
        nonEmptyString(npc?.career?.title) ??
        nonEmptyString(exEntry.raw.partnerStats?.occupation) ??
        nonEmptyString(exEntry.raw.role),
      birthOrder: null,
      education: extractNpcEducation(npc),
      career: extractNpcCareer(npc),
      maritalDetails: maritalFromPersonAndEdge(exEntry.raw, matchingEdge),
      lifeHistoryHighlights: extractNpcLifeHistory(npc),
    });
    visitedIds.add(exEntry.id);
  }

  // 6. Canonical Depth-1 Kin & Romantic Edges not already added from legacy slices
  if (canonical && playerId) {
    const incident = canonical.adjByParticipant.get(playerId) ?? [];
    for (const edge of incident) {
      const oriented = orientRelationshipEdge(edge, playerId);
      if (!oriented) continue;
      if (memberMap.has(oriented.otherId)) continue;
      const npc = canonical.npcMap.get(oriented.otherId);
      if (!npc) continue; // dangling edge without legacy fallback already omitted

      const isAlive = npc.isAlive !== false;
      const lineage = normalizeLineage(edge.lineageRelation, 'none');

      if (edge.category === 'parent_child' && oriented.viewerRole === 'child') {
        memberMap.set(
          npc.id,
          buildMemberFromCanonicalNpc({
            npc,
            relationKind: 'parent',
            relationLabel: formatParentLabel(oriented.otherParentRole, lineage),
            lineageRelation: lineage === 'none' ? 'biological' : lineage,
            generationOffset: 1,
            traversalDepth: 1,
            isCurrent: true,
            isFormerRelationship: false,
            edge,
          })
        );
        visitedIds.add(npc.id);
      } else if (edge.category === 'parent_child' && oriented.viewerRole === 'parent') {
        const npcGender = normalizeGender(npc.gender ?? npc.biologicalGender);
        const childLineage = lineage === 'none' ? 'biological' : lineage;
        memberMap.set(
          npc.id,
          buildMemberFromCanonicalNpc({
            npc,
            relationKind: 'child',
            relationLabel: formatChildLabel(npcGender, childLineage),
            lineageRelation: childLineage,
            generationOffset: -1,
            traversalDepth: 1,
            isCurrent: true,
            isFormerRelationship: false,
            edge,
          })
        );
        visitedIds.add(npc.id);
      } else if (edge.category === 'sibling') {
        const npcGender = normalizeGender(npc.gender ?? npc.biologicalGender);
        const sibLineage = lineage === 'none' ? 'biological' : lineage;
        memberMap.set(
          npc.id,
          buildMemberFromCanonicalNpc({
            npc,
            relationKind: 'sibling',
            relationLabel: formatSiblingLabel(npcGender, sibLineage),
            lineageRelation: sibLineage,
            generationOffset: 0,
            traversalDepth: 1,
            isCurrent: true,
            isFormerRelationship: false,
            edge,
          })
        );
        visitedIds.add(npc.id);
      } else if (edge.category === 'deceased_spouse') {
        memberMap.set(
          npc.id,
          buildMemberFromCanonicalNpc({
            npc,
            relationKind: 'deceased_spouse',
            relationLabel: 'Deceased Spouse',
            lineageRelation: 'none',
            generationOffset: 0,
            traversalDepth: 1,
            isCurrent: false,
            isFormerRelationship: true,
            edge,
          })
        );
        visitedIds.add(npc.id);
      } else if (edge.category === 'former_spouse') {
        memberMap.set(
          npc.id,
          buildMemberFromCanonicalNpc({
            npc,
            relationKind: 'former_spouse',
            relationLabel: 'Former Spouse',
            lineageRelation: 'none',
            generationOffset: 0,
            traversalDepth: 1,
            isCurrent: false,
            isFormerRelationship: true,
            edge,
          })
        );
        visitedIds.add(npc.id);
      } else if (edge.category === 'ex') {
        memberMap.set(
          npc.id,
          buildMemberFromCanonicalNpc({
            npc,
            relationKind: 'ex_partner',
            relationLabel: 'Ex-Partner',
            lineageRelation: 'none',
            generationOffset: 0,
            traversalDepth: 1,
            isCurrent: false,
            isFormerRelationship: true,
            edge,
          })
        );
        visitedIds.add(npc.id);
      } else if (edge.category === 'spouse' || edge.category === 'dating' || edge.category === 'fiance') {
        if (!isAlive && edge.category === 'spouse') {
          memberMap.set(
            npc.id,
            buildMemberFromCanonicalNpc({
              npc,
              relationKind: 'deceased_spouse',
              relationLabel: 'Deceased Spouse',
              lineageRelation: 'none',
              generationOffset: 0,
              traversalDepth: 1,
              isCurrent: false,
              isFormerRelationship: true,
              edge,
            })
          );
        } else if (isAlive && edge.status === 'active' && !legacy.activePartner) {
          memberMap.set(
            npc.id,
            buildMemberFromCanonicalNpc({
              npc,
              relationKind: 'partner',
              relationLabel:
                edge.category === 'spouse'
                  ? 'Spouse'
                  : edge.category === 'fiance'
                    ? 'Fiancé(e)'
                    : 'Partner',
              lineageRelation: 'none',
              generationOffset: 0,
              traversalDepth: 1,
              isCurrent: true,
              isFormerRelationship: false,
              edge,
            })
          );
        }
        visitedIds.add(npc.id);
      }
    }

    // 7. Bounded Depth-2 Traversal (only from verified Depth-1 non-former kin; stops cleanly at depth 2)
    if (FAMILY_GRAPH_MAX_DEPTH >= 2) {
      const depth1Anchors = [...memberMap.values()].filter(
        (m) =>
          m.hasCanonicalId &&
          m.traversalDepth === 1 &&
          (m.relationKind === 'parent' ||
            m.relationKind === 'sibling' ||
            m.relationKind === 'child' ||
            (m.relationKind === 'partner' && m.isCurrent && m.isAlive))
      );

      for (const anchor of depth1Anchors) {
        const anchorEdges = canonical.adjByParticipant.get(anchor.id) ?? [];
        for (const edge of anchorEdges) {
          const oriented = orientRelationshipEdge(edge, anchor.id);
          if (!oriented) continue;
          const targetId = oriented.otherId;
          if (visitedIds.has(targetId) || memberMap.has(targetId)) continue;
          const targetNpc = canonical.npcMap.get(targetId);
          if (!targetNpc) continue;

          const edgeLineage = normalizeLineage(edge.lineageRelation, 'none');

          if (anchor.relationKind === 'parent') {
            // Downward only (parent -> other child = player sibling). Never traverse upward to grandparents.
            if (edge.category === 'parent_child' && oriented.viewerRole === 'parent') {
              const targetGender = normalizeGender(targetNpc.gender ?? targetNpc.biologicalGender);
              const sibLineage = edgeLineage === 'none' ? 'biological' : edgeLineage;
              memberMap.set(
                targetId,
                buildMemberFromCanonicalNpc({
                  npc: targetNpc,
                  relationKind: 'sibling',
                  relationLabel: formatSiblingLabel(targetGender, sibLineage),
                  lineageRelation: sibLineage,
                  generationOffset: 0,
                  traversalDepth: 2,
                  isCurrent: true,
                  isFormerRelationship: false,
                  edge,
                })
              );
              visitedIds.add(targetId);
            }
          } else if (anchor.relationKind === 'sibling') {
            if (edge.category === 'parent_child' && oriented.viewerRole === 'parent') {
              const targetGender = normalizeGender(targetNpc.gender ?? targetNpc.biologicalGender);
              const label =
                targetGender === 'female' ? 'Niece' : targetGender === 'male' ? 'Nephew' : 'Niece / Nephew';
              memberMap.set(
                targetId,
                buildMemberFromCanonicalNpc({
                  npc: targetNpc,
                  relationKind: 'niece_nephew',
                  relationLabel: label,
                  lineageRelation: edgeLineage === 'none' ? 'biological' : edgeLineage,
                  generationOffset: -1,
                  traversalDepth: 2,
                  isCurrent: true,
                  isFormerRelationship: false,
                  edge,
                })
              );
              visitedIds.add(targetId);
            } else if (edge.category === 'spouse' && edge.status === 'active') {
              memberMap.set(
                targetId,
                buildMemberFromCanonicalNpc({
                  npc: targetNpc,
                  relationKind: 'sibling_in_law',
                  relationLabel: 'Sibling-in-Law',
                  lineageRelation: 'in_law',
                  generationOffset: 0,
                  traversalDepth: 2,
                  isCurrent: true,
                  isFormerRelationship: false,
                  edge,
                })
              );
              visitedIds.add(targetId);
            }
          } else if (anchor.relationKind === 'child') {
            if (edge.category === 'parent_child' && oriented.viewerRole === 'parent') {
              const targetGender = normalizeGender(targetNpc.gender ?? targetNpc.biologicalGender);
              const label =
                targetGender === 'female'
                  ? 'Granddaughter'
                  : targetGender === 'male'
                    ? 'Grandson'
                    : 'Grandchild';
              memberMap.set(
                targetId,
                buildMemberFromCanonicalNpc({
                  npc: targetNpc,
                  relationKind: 'grandchild',
                  relationLabel: label,
                  lineageRelation: edgeLineage === 'none' ? 'biological' : edgeLineage,
                  generationOffset: -2,
                  traversalDepth: 2,
                  isCurrent: true,
                  isFormerRelationship: false,
                  edge,
                })
              );
              visitedIds.add(targetId);
            } else if (edge.category === 'spouse' && edge.status === 'active') {
              memberMap.set(
                targetId,
                buildMemberFromCanonicalNpc({
                  npc: targetNpc,
                  relationKind: 'child_in_law',
                  relationLabel: 'Child-in-Law',
                  lineageRelation: 'in_law',
                  generationOffset: -1,
                  traversalDepth: 2,
                  isCurrent: true,
                  isFormerRelationship: false,
                  edge,
                })
              );
              visitedIds.add(targetId);
            }
          } else if (anchor.relationKind === 'partner') {
            if (edge.category === 'parent_child' && oriented.viewerRole === 'parent') {
              const targetGender = normalizeGender(targetNpc.gender ?? targetNpc.biologicalGender);
              memberMap.set(
                targetId,
                buildMemberFromCanonicalNpc({
                  npc: targetNpc,
                  relationKind: 'child',
                  relationLabel: formatChildLabel(targetGender, 'step'),
                  lineageRelation: 'step',
                  generationOffset: -1,
                  traversalDepth: 2,
                  isCurrent: true,
                  isFormerRelationship: false,
                  edge,
                })
              );
              visitedIds.add(targetId);
            } else if (edge.category === 'parent_child' && oriented.viewerRole === 'child') {
              memberMap.set(
                targetId,
                buildMemberFromCanonicalNpc({
                  npc: targetNpc,
                  relationKind: 'parent_in_law',
                  relationLabel: 'Parent-in-Law',
                  lineageRelation: 'in_law',
                  generationOffset: 1,
                  traversalDepth: 2,
                  isCurrent: true,
                  isFormerRelationship: false,
                  edge,
                })
              );
              visitedIds.add(targetId);
            }
          }
        }
      }
    }
  }

  const allMembers = [...memberMap.values()].sort(
    (a, b) =>
      b.generationOffset - a.generationOffset ||
      RELATION_SORT_PRIORITY[a.relationKind] - RELATION_SORT_PRIORITY[b.relationKind] ||
      a.id.localeCompare(b.id)
  );

  const parents = allMembers.filter((m) => m.relationKind === 'parent');
  const siblings = allMembers.filter((m) => m.relationKind === 'sibling');
  const currentPartner =
    allMembers.find((m) => m.relationKind === 'partner' && m.isCurrent && m.isAlive) ?? null;
  const formerPartners = allMembers.filter(
    (m) =>
      m.relationKind === 'former_spouse' ||
      m.relationKind === 'deceased_spouse' ||
      m.relationKind === 'ex_partner'
  );
  const children = allMembers.filter((m) => m.relationKind === 'child');
  const grandchildren = allMembers.filter((m) => m.relationKind === 'grandchild');
  const niecesAndNephews = allMembers.filter((m) => m.relationKind === 'niece_nephew');
  const extendedFamily = allMembers.filter(
    (m) =>
      m.relationKind === 'parent_in_law' ||
      m.relationKind === 'sibling_in_law' ||
      m.relationKind === 'child_in_law'
  );

  return {
    canonicalStateUsed: canonical !== null,
    parents,
    siblings,
    currentPartner,
    formerPartners,
    children,
    grandchildren,
    niecesAndNephews,
    extendedFamily,
    allMembers,
    petMemorials: selectPetMemorials(character),
  };
}

export function selectFamilyMemberDetail(
  character: CharacterProfile,
  memberId: string
): IdentityFamilyMember | null {
  const cleanId = nonEmptyString(memberId);
  if (!cleanId) return null;
  const graph = selectFamilyGraph(character);
  return graph.allMembers.find((member) => member.id === cleanId) ?? null;
}
