import type { CharacterProfile } from '../../../types/game';
import type {
  InheritanceBeneficiaryShare,
  InheritanceRecord,
  NpcProfile,
  RelationshipEdge,
  WorldSimulationState,
} from '../../autonomy/types';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { selectRecordedFamilyEstates } from '../services/recordedEstateSelectors';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function makeNpc(overrides: Partial<NpcProfile> & { id: string; firstName: string }): NpcProfile {
  return {
    id: overrides.id,
    tier: overrides.tier ?? 'social',
    firstName: overrides.firstName,
    lastName: overrides.lastName ?? 'Lin',
    gender: overrides.gender ?? 'female',
    biologicalGender: overrides.biologicalGender ?? 'female',
    age: overrides.age ?? 40,
    birthYear: overrides.birthYear ?? 1985,
    isAlive: overrides.isAlive ?? true,
    deathYear: overrides.deathYear,
    causeOfDeath: overrides.causeOfDeath,
    location: overrides.location ?? { country: 'Canada', city: 'Toronto', residenceHistory: [] },
    identityResolutionStatus: 'canonical',
    looks: 70,
    smarts: 70,
    health: 80,
    happiness: 75,
    fertility: 70,
    craziness: 30,
    personality: {
      openness: 60,
      conscientiousness: 60,
      extraversion: 60,
      agreeableness: 60,
      neuroticism: 40,
      ambition: 60,
      generosity: 60,
      loyalty: 70,
      riskTolerance: 40,
      empathy: 70,
      sociability: 60,
      patience: 60,
      materialism: 40,
    },
    lifestyle: {
      diet: 'standard',
      fitnessHabit: 'casual',
      substances: { alcohol: 'none', smoking: false },
      interests: [],
      hobbies: [],
    },
    goals: [],
    healthConditions: [],
    education: {
      currentStage: 'graduated',
      schoolName: 'State U',
      grades: 85,
      history: [],
    },
    career: {
      jobId: 'dev',
      title: 'Engineer',
      companyName: 'NorthTech',
      occupation: 'Engineer',
      salary: 75000,
      performance: 80,
      yearsInRole: 4,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
    finances: {
      currency: 'CAD',
      cash: 10000,
      savings: 0,
      realEstateValue: 0,
      businessEquity: 0,
      studentDebt: 0,
      mortgageBalance: 0,
      otherLiabilities: 0,
      annualIncome: 75000,
      annualExpenses: 40000,
      netWorth: 10000,
    },
    lifeHistory: [],
    adoptiveParentIds: [],
    stepParentIds: [],
    isAdopted: false,
  };
}

function makeEdge(params: {
  id: string;
  a: string;
  b: string;
  category: RelationshipEdge['category'];
  roleForA: RelationshipEdge['roleForA'];
  roleForB: RelationshipEdge['roleForB'];
  lineage?: RelationshipEdge['lineageRelation'];
  status?: RelationshipEdge['status'];
  parentRoleForA?: RelationshipEdge['parentRoleForA'];
  parentRoleForB?: RelationshipEdge['parentRoleForB'];
}): RelationshipEdge {
  const flip = params.a > params.b;
  return {
    id: params.id,
    participantAId: flip ? params.b : params.a,
    participantBId: flip ? params.a : params.b,
    category: params.category,
    roleForA: flip ? params.roleForB : params.roleForA,
    roleForB: flip ? params.roleForA : params.roleForB,
    lineageRelation: params.lineage ?? 'biological',
    parentRoleForA: flip ? params.parentRoleForB : params.parentRoleForA,
    parentRoleForB: flip ? params.parentRoleForA : params.parentRoleForB,
    status: params.status ?? 'active',
    trust: 80,
    affection: 80,
    respect: 80,
    romance: 75,
    compatibility: 80,
    yearsTogether: 2,
    lastInteractedYear: 2025,
    episodes: [],
  };
}

function makeShare(
  overrides: Partial<InheritanceBeneficiaryShare> & { beneficiaryId: string }
): InheritanceBeneficiaryShare {
  return {
    beneficiaryId: overrides.beneficiaryId,
    relationshipToDeceased: overrides.relationshipToDeceased ?? 'child',
    sourceCurrency: overrides.sourceCurrency ?? 'CAD',
    targetCurrency: overrides.targetCurrency ?? 'CAD',
    exchangeRateApplied: overrides.exchangeRateApplied ?? 1,
    amountInSourceCurrency: overrides.amountInSourceCurrency ?? 25000,
    amountAwardedInTargetCurrency: overrides.amountAwardedInTargetCurrency ?? 25000,
  };
}

function makeEstateRecord(
  overrides: Partial<InheritanceRecord> & { id: string; deceasedNpcId: string }
): InheritanceRecord {
  return {
    id: overrides.id,
    deceasedNpcId: overrides.deceasedNpcId,
    settlementYear: overrides.settlementYear ?? 2024,
    currency: overrides.currency ?? 'CAD',
    grossAssets: overrides.grossAssets ?? 120000,
    totalLiabilities: overrides.totalLiabilities ?? 20000,
    liabilitiesPaid: overrides.liabilitiesPaid ?? 20000,
    unpaidLiabilities: overrides.unpaidLiabilities ?? 0,
    netDistributableEstate: overrides.netDistributableEstate ?? 100000,
    distributions: overrides.distributions ?? [],
    escheatedToState: overrides.escheatedToState ?? false,
    escheatedAmount: overrides.escheatedAmount ?? 0,
    status: overrides.status ?? 'settled',
  };
}

function makeWorld(
  npcs: NpcProfile[],
  edges: RelationshipEdge[],
  inheritanceRecords: Record<string, InheritanceRecord> = {}
): WorldSimulationState {
  const npcRegistry: Record<string, NpcProfile> = {};
  for (const npc of npcs) npcRegistry[npc.id] = npc;
  const relationshipsById: Record<string, RelationshipEdge> = {};
  for (const edge of edges) relationshipsById[edge.id] = edge;
  return {
    schemaVersion: 2,
    worldSeed: 99,
    simulationVersion: 1,
    lastSimulatedYear: 2025,
    lastSimulationTurnId: 'turn_99',
    familyWealth: 'comfortable',
    legacyIdMappings: {},
    npcRegistry,
    relationshipsById,
    relationshipIndex: {},
    inheritanceRecords,
    memories: {},
    lifeUpdatesFeed: [],
    populationConfig: {
      activeNpcTarget: 120,
      maxChildrenPerCouple: 4,
      allowMultipleBirths: true,
      elderMortalityAgeCutoff: 75,
      minAutonomousRomanceAge: 18,
      minAutonomousReproductionAge: 18,
      maxFemaleBiologicalFertilityAge: 46,
      minEngagementYears: 2,
      retirementTargetAge: 60,
      allowRelocation: true,
    },
  };
}

function makeBaseCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'player_1',
    firstName: 'Aria',
    lastName: 'Lin',
    gender: 'female',
    age: 38,
    birthYear: 1987,
    country: 'Canada',
    city: 'Toronto',
    occupation: 'Architect',
    cash: 20000,
    bankBalance: 10000,
    netWorth: 30000,
    isAlive: true,
    stats: { health: 85, happiness: 85, smarts: 85, looks: 80, karma: 80 },
    parents: {
      father: {
        id: 'dad_1',
        role: 'father',
        firstName: 'David',
        lastName: 'Lin',
        age: 68,
        occupation: 'Accountant',
        isAlive: false,
        relationship: 80,
        generosity: 70,
      },
      mother: {
        role: 'mother',
        // Deliberately omit id to verify synthetic legacy:mother never matches estates.
        firstName: 'Mei',
        lastName: 'Lin',
        age: 65,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 85,
        generosity: 80,
      } as unknown as CharacterProfile['parents']['mother'],
      wealth: 'comfortable',
    },
    siblings: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    relationships: [],
    seenEventIds: [],
    timeline: [],
    ...overrides,
  };
}

// 1. Missing / pre-v2 worldState returns canonicalStateAvailable: false and empty records
{
  const preV2 = makeBaseCharacter({
    worldState: undefined,
  });
  const resMissing = selectRecordedFamilyEstates(preV2);
  assert(resMissing.canonicalStateAvailable === false, 'Missing worldState sets canonicalStateAvailable false');
  assert(resMissing.records.length === 0, 'Missing worldState has 0 estate records');
  assert(resMissing.omittedRecordCount === 0, 'Missing worldState has 0 omitted records');

  const wrongSchema = makeBaseCharacter({
    worldState: { schemaVersion: 1 } as unknown as WorldSimulationState,
  });
  const resV1 = selectRecordedFamilyEstates(wrongSchema);
  assert(resV1.canonicalStateAvailable === false, 'Schema v1 sets canonicalStateAvailable false');
  assert(resV1.records.length === 0, 'Schema v1 returns empty records');
}

// 2. Verified relatives across branches + strict omission of unrelated, name-only impersonators, depth-3, pet memorials, player-self, synthetic keys
{
  const dad = makeNpc({ id: 'dad_1', firstName: 'David', lastName: 'Lin', gender: 'male', biologicalGender: 'male', age: 68, isAlive: false, deathYear: 2024 });
  const sib = makeNpc({ id: 'sib_1', firstName: 'Lucas', lastName: 'Lin', gender: 'male', biologicalGender: 'male', age: 40, isAlive: false, deathYear: 2023 });
  const spouse = makeNpc({ id: 'spouse_1', firstName: 'Jordan', lastName: 'Park', gender: 'male', biologicalGender: 'male', age: 41, isAlive: false, deathYear: 2025 });
  const child = makeNpc({ id: 'child_1', firstName: 'Noah', lastName: 'Lin', gender: 'male', biologicalGender: 'male', age: 19, isAlive: true });
  const grandchild = makeNpc({ id: 'gc_1', firstName: 'Lily', lastName: 'Lin', age: 2, isAlive: false, deathYear: 2025 });
  const niece = makeNpc({ id: 'niece_1', firstName: 'Maya', lastName: 'Lin', age: 12 });
  const tooDeepGreatNiece = makeNpc({ id: 'great_niece_1', firstName: 'Deep', lastName: 'Lin', age: 1, isAlive: false, deathYear: 2025 });

  // Unrelated stranger AND an unrelated NPC sharing the exact same full name as dad_1 ("David Lin")
  const stranger = makeNpc({ id: 'stranger_1', firstName: 'Marcus', lastName: 'Cole', age: 75, isAlive: false, deathYear: 2024 });
  const nameImpersonator = makeNpc({ id: 'impersonator_david', firstName: 'David', lastName: 'Lin', age: 72, isAlive: false, deathYear: 2024 });
  const externalHeir = makeNpc({ id: 'charity_friend', firstName: 'Elena', lastName: 'Rostova', age: 50 });

  const edges: RelationshipEdge[] = [
    makeEdge({ id: 'e_dad', a: 'dad_1', b: 'player_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'father', status: 'deceased' }),
    makeEdge({ id: 'e_sib', a: 'sib_1', b: 'player_1', category: 'sibling', roleForA: 'sibling', roleForB: 'sibling', status: 'deceased' }),
    makeEdge({ id: 'e_spouse', a: 'player_1', b: 'spouse_1', category: 'spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'deceased' }),
    makeEdge({ id: 'e_child', a: 'player_1', b: 'child_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
    makeEdge({ id: 'e_gc', a: 'child_1', b: 'gc_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', status: 'deceased' }),
    makeEdge({ id: 'e_niece', a: 'sib_1', b: 'niece_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
    makeEdge({ id: 'e_depth3', a: 'niece_1', b: 'great_niece_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', status: 'deceased' }),
  ];

  const inheritanceRecords: Record<string, InheritanceRecord> = {
    rec_dad_primary: makeEstateRecord({
      id: 'rec_dad_primary',
      deceasedNpcId: 'dad_1',
      settlementYear: 2024,
      grossAssets: 150000,
      totalLiabilities: 30000,
      liabilitiesPaid: 30000,
      unpaidLiabilities: 0,
      netDistributableEstate: 120000,
      distributions: [
        makeShare({ beneficiaryId: 'player_1', relationshipToDeceased: 'child', amountInSourceCurrency: 60000, amountAwardedInTargetCurrency: 60000 }),
        makeShare({ beneficiaryId: 'sib_1', relationshipToDeceased: 'child', amountInSourceCurrency: 40000, amountAwardedInTargetCurrency: 40000 }),
        makeShare({ beneficiaryId: 'charity_friend', relationshipToDeceased: 'parent', amountInSourceCurrency: 20000, amountAwardedInTargetCurrency: 20000 }),
      ],
    }),
    // Second distinct record ID for same verified relative (must both be kept)
    rec_dad_supplemental: makeEstateRecord({
      id: 'rec_dad_supplemental',
      deceasedNpcId: 'dad_1',
      settlementYear: 2024,
      grossAssets: 10000,
      totalLiabilities: 0,
      liabilitiesPaid: 0,
      unpaidLiabilities: 0,
      netDistributableEstate: 10000,
      distributions: [],
    }),
    // Duplicate identical record.id stored under another key -> deduplicated
    rec_dad_dup_id: makeEstateRecord({
      id: 'rec_dad_primary',
      deceasedNpcId: 'dad_1',
      settlementYear: 2024,
    }),
    rec_sib_insolvent: makeEstateRecord({
      id: 'rec_sib_insolvent',
      deceasedNpcId: 'sib_1',
      settlementYear: 2023,
      status: 'insolvent',
      grossAssets: 15000,
      totalLiabilities: 45000,
      liabilitiesPaid: 15000,
      unpaidLiabilities: 30000,
      netDistributableEstate: 0,
      distributions: [],
    }),
    rec_spouse_settled: makeEstateRecord({
      id: 'rec_spouse_settled',
      deceasedNpcId: 'spouse_1',
      settlementYear: 2025,
      grossAssets: 90000,
      totalLiabilities: 10000,
      liabilitiesPaid: 10000,
      netDistributableEstate: 80000,
      distributions: [
        makeShare({ beneficiaryId: 'player_1', relationshipToDeceased: 'spouse', amountInSourceCurrency: 80000, amountAwardedInTargetCurrency: 80000 }),
      ],
    }),
    rec_gc_escheated: makeEstateRecord({
      id: 'rec_gc_escheated',
      deceasedNpcId: 'gc_1',
      settlementYear: 2025,
      status: 'escheated',
      escheatedToState: true,
      escheatedAmount: 5000,
      grossAssets: 5000,
      totalLiabilities: 0,
      liabilitiesPaid: 0,
      netDistributableEstate: 5000,
    }),
    // --- Records that MUST be omitted ---
    rec_stranger: makeEstateRecord({ id: 'rec_stranger', deceasedNpcId: 'stranger_1' }),
    rec_name_impersonator: makeEstateRecord({ id: 'rec_name_impersonator', deceasedNpcId: 'impersonator_david' }),
    rec_depth3: makeEstateRecord({ id: 'rec_depth3', deceasedNpcId: 'great_niece_1' }),
    rec_unknown: makeEstateRecord({ id: 'rec_unknown', deceasedNpcId: 'nonexistent_npc' }),
    rec_player_self: makeEstateRecord({ id: 'rec_player_self', deceasedNpcId: 'player_1' }),
    rec_pet_memorial: makeEstateRecord({ id: 'rec_pet_memorial', deceasedNpcId: 'pet_memorial_1' }),
    rec_synthetic_key: makeEstateRecord({ id: 'rec_synthetic_key', deceasedNpcId: 'legacy:mother' }),
  };

  const char = makeBaseCharacter({
    pets: {
      animals: [
        {
          id: 'pet_memorial_1',
          name: 'Mochi',
          species: 'pet_dog',
          temperament: 'steady',
          petAge: 14,
          adoptedAtAge: 20,
          health: 0,
          attachment: 95,
          lastFedAge: 34,
          lastPlayedAge: 34,
          lastVetAge: 34,
          lastMoment: 'Passed peacefully.',
          status: 'memorial',
          closingLine: 'A faithful companion.',
          closedAtAge: 34,
        },
      ],
    },
    worldState: makeWorld(
      [dad, sib, spouse, child, grandchild, niece, tooDeepGreatNiece, stranger, nameImpersonator, externalHeir],
      edges,
      inheritanceRecords
    ),
  });

  deepFreeze(char);
  const snapshotBefore = JSON.stringify(char);

  const res = selectRecordedFamilyEstates(char);

  assert(JSON.stringify(char) === snapshotBefore, 'selectRecordedFamilyEstates is strictly immutable');
  assert(res.canonicalStateAvailable === true, 'Canonical state available');
  assert(res.records.length === 5, `Expected 5 verified family estate records (got ${res.records.length})`);
  // Omitted: rec_dad_dup_id + stranger + impersonator + depth3 + unknown + player_self + pet_memorial + synthetic_key = 8
  assert(res.omittedRecordCount === 8, `Expected 8 omitted records (got ${res.omittedRecordCount})`);

  // Deterministic ordering: 2025 gc_1 -> 2025 spouse_1 -> 2024 dad_1 (primary, supplemental) -> 2023 sib_1
  assert(res.records[0].recordId === 'rec_gc_escheated', '2025 grandchild sorts first alphabetically by owner ID');
  assert(res.records[0].relationshipToPlayerKind === 'grandchild', 'Grandchild relationship kind verified');
  assert(res.records[0].escheatedToState === true && res.records[0].escheatedAmount === 5000, 'Escheat fields preserved');

  assert(res.records[1].recordId === 'rec_spouse_settled', 'Spouse estate second');
  assert(res.records[1].playerDistributions.length === 1 && res.records[1].playerDistributions[0].amountAwardedInTargetCurrency === 80000, 'Player spouse share captured');
  assert(res.records[1].playerDistributions[0].beneficiaryName === 'Aria Lin', 'Player beneficiary name resolved');

  assert(res.records[2].recordId === 'rec_dad_primary', 'Father primary estate third');
  assert(res.records[2].relationshipToPlayerKind === 'parent' && res.records[2].relationshipToPlayerLabel === 'Father', 'Father relationship label preserved');
  assert(res.records[2].distributions.length === 3, 'All 3 beneficiaries preserved');
  const charityShare = res.records[2].distributions.find((d) => d.beneficiaryId === 'charity_friend');
  assert(charityShare?.beneficiaryName === 'Elena Rostova' && charityShare.isPlayer === false, 'Non-family NPC beneficiary name resolved from canonical npcRegistry');
  const sibShare = res.records[2].distributions.find((d) => d.beneficiaryId === 'sib_1');
  assert(sibShare?.beneficiaryName === 'Lucas Lin', 'Family beneficiary name resolved');

  assert(res.records[3].recordId === 'rec_dad_supplemental', 'Second distinct record ID for dad kept');
  assert(res.records[4].recordId === 'rec_sib_insolvent' && res.records[4].unpaidLiabilities === 30000, 'Sibling insolvent record preserved');

  // Verify character cash / bankBalance / netWorth were never credited or altered
  assert(char.cash === 20000 && char.bankBalance === 10000 && char.netWorth === 30000, 'Player cash/netWorth untouched');
}

// 3. Legacy-only parent id is verified if canonicalized in worldState, while missing & malformed fields behave cleanly
{
  const dad = makeNpc({ id: 'dad_1', firstName: 'David', gender: 'male', biologicalGender: 'male', age: 70, isAlive: false, deathYear: 2024 });

  // Build partially corrupted world inheritance records to verify resilience and zero NaN leaks
  const malformedRecords: Record<string, unknown> = {
    rec_missing_optional: {
      id: 'rec_missing_optional',
      deceasedNpcId: 'dad_1',
      status: 'settled',
      settlementYear: undefined,
      grossAssets: 50000,
      liabilitiesPaid: 12000,
      // totalLiabilities, unpaidLiabilities, netDistributableEstate, escheatedAmount intentionally omitted
      distributions: [],
    },
    rec_invalid_numbers: {
      id: 'rec_invalid_numbers',
      deceasedNpcId: 'dad_1',
      status: 'settled',
      settlementYear: Number.NaN,
      grossAssets: -500,
      totalLiabilities: Number.POSITIVE_INFINITY,
      liabilitiesPaid: Number.NEGATIVE_INFINITY,
      unpaidLiabilities: 0,
      netDistributableEstate: undefined,
      escheatedAmount: -10,
      distributions: [
        'not_an_object',
        { beneficiaryId: '', amountInSourceCurrency: 10 },
        { beneficiaryId: 'player_1', relationshipToDeceased: 'child', amountInSourceCurrency: Number.NaN, amountAwardedInTargetCurrency: 500 },
      ],
    },
    rec_bad_status: {
      id: 'rec_bad_status',
      deceasedNpcId: 'dad_1',
      status: 'pending_probate',
    },
    rec_missing_id: {
      id: '   ',
      deceasedNpcId: 'dad_1',
      status: 'settled',
    },
    rec_null_entry: null,
  };

  const char = makeBaseCharacter({
    worldState: makeWorld(
      [dad],
      [makeEdge({ id: 'e_dad', a: 'dad_1', b: 'player_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'father', status: 'deceased' })],
      malformedRecords as Record<string, InheritanceRecord>
    ),
  });

  const res = selectRecordedFamilyEstates(char);
  assert(res.canonicalStateAvailable === true, 'Canonical state valid');
  assert(res.records.length === 2, `Expected 2 valid/resilient records (got ${res.records.length})`);
  assert(res.omittedRecordCount === 3, `Expected 3 malformed top-level records omitted (got ${res.omittedRecordCount})`);

  const missingOpt = res.records.find((r) => r.recordId === 'rec_missing_optional');
  assert(Boolean(missingOpt), 'rec_missing_optional present');
  assert(missingOpt!.hasMalformedFields === false, 'Omitted optional values do not set hasMalformedFields');
  assert(missingOpt!.settlementYear === null && missingOpt!.totalLiabilities === null && missingOpt!.unpaidLiabilities === null, 'Missing optional numbers become null, never 0');
  assert(missingOpt!.netDistributableEstate === 38000, 'Derived netDistributableEstate = max(0, 50000 - 12000) when valid gross & paid provided');

  const invalidNums = res.records.find((r) => r.recordId === 'rec_invalid_numbers');
  assert(Boolean(invalidNums), 'rec_invalid_numbers retained with sanitized fields');
  assert(invalidNums!.hasMalformedFields === true, 'NaN/Infinity/negative values set hasMalformedFields = true');
  assert(
    invalidNums!.settlementYear === null &&
      invalidNums!.grossAssets === null &&
      invalidNums!.totalLiabilities === null &&
      invalidNums!.liabilitiesPaid === null &&
      invalidNums!.netDistributableEstate === null &&
      invalidNums!.escheatedAmount === null,
    'Invalid numeric fields sanitized to null without NaN leak or 0 fabrication'
  );
  assert(invalidNums!.distributions.length === 1 && invalidNums!.distributions[0].amountInSourceCurrency === null, 'Malformed distribution entries skipped while valid-ID entry keeps null on NaN amount');
  assert(invalidNums!.distributions[0].amountAwardedInTargetCurrency === 500, 'Valid sibling field on distribution preserved');
}

// 4. Non-array distributions field sets hasMalformedFields without crashing
{
  const dad = makeNpc({ id: 'dad_1', firstName: 'David', gender: 'male', biologicalGender: 'male', age: 70, isAlive: false });
  const char = makeBaseCharacter({
    worldState: makeWorld(
      [dad],
      [makeEdge({ id: 'e_dad', a: 'dad_1', b: 'player_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', status: 'deceased' })],
      {
        rec_bad_dist: {
          id: 'rec_bad_dist',
          deceasedNpcId: 'dad_1',
          status: 'settled',
          grossAssets: 1000,
          liabilitiesPaid: 0,
          distributions: 'invalid' as unknown as InheritanceBeneficiaryShare[],
        } as unknown as InheritanceRecord,
      }
    ),
  });

  const res = selectRecordedFamilyEstates(char);
  assert(res.records.length === 1, 'Record with non-array distributions remains readable');
  assert(res.records[0].hasMalformedFields === true, 'Non-array distributions flags hasMalformedFields');
  assert(res.records[0].distributions.length === 0, 'Non-array distributions yields empty array');
}

// 5. Hardened selector ignores any fabricated runtime graph injection (no public graph override)
{
  const stranger = makeNpc({ id: 'stranger_spoof', firstName: 'Mallory', isAlive: false, deathYear: 2024 });
  const char = makeBaseCharacter({
    worldState: makeWorld(
      [stranger],
      [],
      {
        rec_spoof: makeEstateRecord({ id: 'rec_spoof', deceasedNpcId: 'stranger_spoof', grossAssets: 999999 }),
      }
    ),
  });
  const fabricatedGraph = {
    canonicalStateUsed: true,
    parents: [],
    siblings: [],
    currentPartner: null,
    formerPartners: [],
    children: [],
    grandchildren: [],
    niecesAndNephews: [],
    extendedFamily: [],
    petMemorials: [],
    allMembers: [
      {
        id: 'stranger_spoof',
        hasCanonicalId: true,
        firstName: 'Mallory',
        lastName: 'Lin',
        fullName: 'Mallory Lin',
        gender: 'female',
        relationKind: 'parent',
        relationLabel: 'Mother',
        lineageRelation: 'biological',
        generationOffset: 1,
        traversalDepth: 1,
        source: 'canonical',
        isAlive: false,
        isCurrent: true,
        isFormerRelationship: false,
        age: 70,
        birthYear: 1954,
        deathYear: 2024,
        causeOfDeath: null,
        occupation: null,
        birthOrder: null,
        education: null,
        career: null,
        maritalDetails: null,
        lifeHistoryHighlights: [],
      },
    ],
  };

  const spoofAttempt = (
    selectRecordedFamilyEstates as unknown as (c: CharacterProfile, g?: unknown) => ReturnType<typeof selectRecordedFamilyEstates>
  )(char, fabricatedGraph);

  assert(spoofAttempt.records.length === 0, 'Fabricated caller graph cannot authorize unrelated NPC estate');
  assert(spoofAttempt.omittedRecordCount === 1, 'Unrelated estate omitted when internal verification runs');
}

// 6. Focused regression checks: explicit-ID legacy-only relative, blank/missing deceasedNpcId, best_friend owner, negative totalLiabilities, missing assets+liabilities net=null
{
  const bestFriendNpc = makeNpc({ id: 'bf_1', firstName: 'Taylor', isAlive: false, deathYear: 2024 });
  const friendNpc = makeNpc({ id: 'fr_1', firstName: 'Morgan', isAlive: false, deathYear: 2024 });

  // Case A: Explicit-ID legacy-only father ('dad_1' absent from npcRegistry & relationshipsById)
  //         + blank/missing deceasedNpcId + best_friend/friend estate owners + negative totalLiabilities + all-missing financials
  const regressionRecords: Record<string, unknown> = {
    rec_legacy_explicit_dad: {
      id: 'rec_legacy_explicit_dad',
      deceasedNpcId: 'dad_1',
      status: 'settled',
      settlementYear: 2024,
      grossAssets: 80000,
      totalLiabilities: 10000,
      liabilitiesPaid: 10000,
      netDistributableEstate: 70000,
      distributions: [],
    },
    rec_blank_deceased: {
      id: 'rec_blank_deceased',
      deceasedNpcId: '   ',
      status: 'settled',
    },
    rec_missing_deceased: {
      id: 'rec_missing_deceased',
      status: 'settled',
    },
    rec_best_friend: makeEstateRecord({ id: 'rec_best_friend', deceasedNpcId: 'bf_1' }),
    rec_friend: makeEstateRecord({ id: 'rec_friend', deceasedNpcId: 'fr_1' }),
    rec_neg_liabilities: {
      id: 'rec_neg_liabilities',
      deceasedNpcId: 'dad_1',
      status: 'settled',
      settlementYear: 2024,
      grossAssets: 5000,
      totalLiabilities: -500,
      liabilitiesPaid: 0,
      netDistributableEstate: 5000,
      distributions: [],
    },
    rec_all_missing_money: {
      id: 'rec_all_missing_money',
      deceasedNpcId: 'dad_1',
      status: 'settled',
      settlementYear: 2024,
      distributions: [],
    },
  };

  const char = makeBaseCharacter({
    // Note: dad_1 is in character.parents.father with explicit id: 'dad_1', NOT in npcRegistry or edges!
    worldState: makeWorld(
      [bestFriendNpc, friendNpc],
      [
        makeEdge({ id: 'e_bf', a: 'player_1', b: 'bf_1', category: 'best_friend', roleForA: 'best_friend', roleForB: 'best_friend' }),
        makeEdge({ id: 'e_fr', a: 'player_1', b: 'fr_1', category: 'friend', roleForA: 'friend', roleForB: 'friend' }),
      ],
      regressionRecords as Record<string, InheritanceRecord>
    ),
  });

  const res = selectRecordedFamilyEstates(char);
  assert(res.records.length === 3, `Expected 3 records for legacy explicit-ID dad_1 (got ${res.records.length})`);
  // Omitted: rec_blank_deceased + rec_missing_deceased + rec_best_friend + rec_friend = 4
  assert(res.omittedRecordCount === 4, `Expected 4 omitted records (got ${res.omittedRecordCount})`);

  const legDadRec = res.records.find((r) => r.recordId === 'rec_legacy_explicit_dad');
  assert(
    Boolean(legDadRec) &&
      legDadRec!.deceasedOwnerName === 'David Lin' &&
      legDadRec!.relationshipToPlayerKind === 'parent' &&
      legDadRec!.hasMalformedFields === false,
    'Explicit-ID legacy-only relative without canonical NPC entry authorizes recorded estate'
  );

  const negLiabRec = res.records.find((r) => r.recordId === 'rec_neg_liabilities');
  assert(
    Boolean(negLiabRec) && negLiabRec!.totalLiabilities === null && negLiabRec!.hasMalformedFields === true,
    'Negative totalLiabilities sanitized to null and flags hasMalformedFields'
  );

  const missingMoneyRec = res.records.find((r) => r.recordId === 'rec_all_missing_money');
  assert(
    Boolean(missingMoneyRec) &&
      missingMoneyRec!.grossAssets === null &&
      missingMoneyRec!.totalLiabilities === null &&
      missingMoneyRec!.liabilitiesPaid === null &&
      missingMoneyRec!.netDistributableEstate === null &&
      missingMoneyRec!.hasMalformedFields === false,
    'Missing grossAssets, liabilities, and netDistributableEstate stay null rather than fabricated 0'
  );
}

console.log('recordedEstateSelectors tests passed');
