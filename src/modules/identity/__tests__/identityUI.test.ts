import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CharacterProfile } from '../../../types/game';
import type {
  InheritanceRecord,
  NpcProfile,
  RelationshipEdge,
  WorldSimulationState,
} from '../../autonomy/types';
import { createInitialCareerState } from '../../career/services/careerService';
import { createInitialEducation } from '../../education/services/educationService';
import { DeathModal } from '../../../components/game/DeathModal';
import { MenuScreen } from '../../../components/layout/MenuScreen';
import { FamilyMemberDetailModal } from '../components/FamilyMemberDetailModal';
import { IdentityHeritageScreen, type IdentityTabId } from '../components/IdentityHeritageScreen';
import { selectFamilyMemberDetail } from '../services/familyGraphSelectors';

function assert(condition: unknown, message: string): asserts condition {
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

function renderScreen(
  character: CharacterProfile,
  initialTab: IdentityTabId = 'identity',
  backLabel = 'Menu'
): string {
  return renderToStaticMarkup(
    React.createElement(IdentityHeritageScreen, {
      key: `${character.id}:${initialTab}`,
      character,
      onBackToMenu: () => {},
      backLabel,
      initialTab,
    })
  );
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
    education: overrides.education ?? {
      currentStage: 'graduated',
      schoolName: 'Toronto Poly',
      degreeEarned: 'B.Sc.',
      fieldOfStudy: 'Engineering',
      grades: 88,
      history: [],
    },
    career: overrides.career ?? {
      jobId: 'dev',
      title: 'Senior Engineer',
      companyName: 'NorthTech',
      occupation: 'Engineer',
      salary: 92000,
      performance: 85,
      yearsInRole: 6,
      isRetired: false,
      pensionAnnual: 0,
      history: [],
    },
    finances: {
      currency: 'CAD',
      cash: 15000,
      savings: 0,
      realEstateValue: 0,
      businessEquity: 0,
      studentDebt: 0,
      mortgageBalance: 0,
      otherLiabilities: 0,
      annualIncome: 92000,
      annualExpenses: 40000,
      netWorth: 15000,
    },
    lifeHistory: overrides.lifeHistory ?? [],
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
    yearsTogether: 4,
    lastInteractedYear: 2025,
    episodes: [],
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
    worldSeed: 77,
    simulationVersion: 1,
    lastSimulatedYear: 2025,
    lastSimulationTurnId: 'turn_77',
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
    id: 'player_ui_1',
    firstName: 'Aria',
    lastName: 'Lin',
    gender: 'female',
    age: 34,
    birthYear: 1991,
    country: 'Canada',
    city: 'Toronto',
    flag: '🇨🇦',
    occupation: 'Architect',
    cash: 30000,
    bankBalance: 20000,
    netWorth: 50000,
    isAlive: true,
    stats: { health: 90, happiness: 85, smarts: 88, looks: 80, karma: 85 },
    parents: {
      father: {
        id: 'dad_1',
        role: 'father',
        firstName: 'David',
        lastName: 'Lin',
        age: 66,
        occupation: 'Accountant',
        isAlive: true,
        relationship: 85,
        generosity: 75,
      },
      mother: {
        id: 'mom_1',
        role: 'mother',
        firstName: 'Mei',
        lastName: 'Lin',
        age: 64,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 90,
        generosity: 80,
      },
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

// 1. Age 0 character + MenuScreen tile enabled + all four tabs render
{
  const age0 = makeBaseCharacter({
    id: 'baby_aria',
    age: 0,
    birthYear: 2025,
    occupation: 'Infant',
    cash: 0,
    bankBalance: 0,
    netWorth: 0,
  });

  const menuHtml = renderToStaticMarkup(
    React.createElement(MenuScreen, {
      character: age0,
      onOpenRelationships: () => {},
      onOpenIdentity: () => {},
    })
  );
  assert(menuHtml.includes('Identity &amp; Heritage'), 'MenuScreen displays Identity & Heritage tile');
  assert(!menuHtml.includes('Module 12'), 'MenuScreen no longer shows locked Module 12 placeholder badge');

  const tab1 = renderScreen(age0, 'identity');
  assert(tab1.includes('Identity') && tab1.includes('Records') && tab1.includes('Family') && tab1.includes('Estates'), 'All four tabs render');
  assert(tab1.includes('Aria Lin'), 'Full name displayed at Age 0');
  assert(tab1.includes('Toronto, Canada'), 'Birthplace displayed at Age 0');
  assert(tab1.includes('Childhood'), 'Childhood life stage displayed at Age 0');
  assert(tab1.includes('No milestone highlights recorded yet'), 'Age 0 empty highlights state displayed');

  const tab4 = renderScreen(age0, 'estates');
  assert(tab4.includes('No recorded family estate settlements are available'), 'Age 0 empty estate history state displayed');
}

// 2. Adult character with complete records + separate business equity + timeline-derived exit
{
  const edu = createInitialEducation();
  edu.currentStage = 'university';
  edu.schoolName = 'University of Toronto';
  edu.grades = 91;
  edu.diplomas = ['High School Diploma'];
  edu.studentDebt = 12000;
  edu.university = {
    universityName: 'University of Toronto',
    majorId: 'arch',
    majorName: 'Architecture',
    degreeTitle: 'B.Arch.',
    year: 2,
    totalYears: 4,
    fundingType: 'student_loan',
    tuitionPerYear: 9000,
  };
  edu.history = [
    {
      id: 'hs_1',
      stage: 'high_school',
      stageLabel: 'High School',
      schoolName: 'Northern Secondary',
      startAge: 14,
      endAge: 18,
      finalGrades: 93,
      status: 'graduated',
    },
  ];
  edu.disciplines.debate = {
    disciplineId: 'debate',
    label: 'Debate',
    icon: '🎙️',
    totalYears: 3,
    highestRole: 'captain',
    trophiesWon: 2,
  };

  const career = createInitialCareerState();
  career.totalCareerEarnings = 415000;
  career.currentJob = {
    jobId: 'arch_lead',
    title: 'Lead Architect',
    companyName: 'Skyline Studio',
    field: 'technology',
    type: 'full_time',
    salary: 125000,
    yearsInJob: 4,
    performance: 92,
    hiredAge: 30,
    icon: '📐',
  };
  career.history = [
    {
      id: 'job_hist_1',
      jobId: 'junior_arch',
      title: 'Junior Drafter',
      companyName: 'Civic Design',
      type: 'full_time',
      startAge: 24,
      endAge: 29,
      finalSalary: 68000,
      reasonForLeaving: 'switched_jobs',
    },
  ];

  const adult = makeBaseCharacter({
    cash: 60000,
    bankBalance: 50000,
    assets: {
      properties: [
        {
          id: 'prop_1',
          catalogId: 'condo_seattle_ridge',
          name: 'Seattle Ridge Condo',
          type: 'condo',
          city: 'Seattle',
          purchasePrice: 210000,
          purchaseAge: 29,
          marketValue: 250000,
          annualMaintenance: 3200,
          mortgage: {
            originalPrincipal: 168000,
            principal: 150000,
            annualInterestRate: 0.04,
            annualPrincipalPayment: 5600,
          },
        },
      ],
    },
    business: {
      id: 'biz_1',
      templateId: 'saas_startup',
      name: 'Lin Design Labs',
      slogan: 'Built to last',
      sector: 'software_tech',
      icon: '💻',
      foundedYear: 2021,
      foundedAge: 30,
      equityPct: 80,
      treasury: 40000,
      valuation: 500000,
      pricing: 'standard',
      marketing: 'organic',
      payroll: 'standard',
      rnd: 'balanced',
      ownerSalary: 85000,
      dividendRatePct: 10,
      morale: 85,
      brandReputation: 82,
      qualityScore: 88,
      employeeCount: 12,
      locationsCount: 2,
      equipmentTier: 1,
      hasAuditCompleted: true,
      actionCooldowns: {},
      outstandingLoan: 0,
      annualLoanPayment: 0,
      yearsInOperation: 4,
      lifetimeRevenue: 900000,
      lifetimeProfit: 220000,
      isPubliclyTraded: true,
      tickerSymbol: 'LINL',
    },
    education: edu,
    career,
    timeline: [
      {
        id: 'evt_exit_1',
        age: 29,
        year: 2020,
        category: 'money',
        title: 'Sold NorthCraft Studio!',
        message: 'Sold NorthCraft Studio to a private equity firm for $320,000.',
        icon: '🤝',
      },
    ],
  });

  const identityHtml = renderScreen(adult, 'identity');
  // Personal net worth: 60k + 50k + (250k - 150k) - 12k student debt = $198,000 (MUST exclude $500k/$400k business equity)
  assert(identityHtml.includes('$198,000'), 'Personal net worth shows $198,000 separately from business');
  assert(identityHtml.includes('$500,000'), 'Business valuation shown separately');
  assert(identityHtml.includes('$400,000'), 'Business ownership stake value ($400,000) shown separately');
  assert(identityHtml.includes('Separate from Personal Net Worth'), 'Explicitly separates business equity');

  const recordsHtml = renderScreen(adult, 'records');
  assert(recordsHtml.includes('In Progress'), 'Ongoing university explicitly distinguished as In Progress');
  assert(recordsHtml.includes('High School Diploma'), 'Completed diploma displayed');
  assert(recordsHtml.includes('$415,000'), 'Total career earnings displayed');
  assert(recordsHtml.includes('Lead Architect'), 'Current job displayed');
  assert(recordsHtml.includes('Junior Drafter'), 'Career history displayed');
  assert(recordsHtml.includes('Lin Design Labs (LINL)'), 'Active business displayed');
  assert(recordsHtml.includes('NorthCraft Studio') && recordsHtml.includes('Timeline-Derived'), 'Timeline-derived business exit clearly labeled');
}

// 3. Missing education / career / business data renders graceful fallbacks (never crashes or fakes $0 earnings)
{
  const minimal = makeBaseCharacter({
    occupation: 'Drifter',
    education: undefined as unknown as CharacterProfile['education'],
    career: undefined as unknown as CharacterProfile['career'],
    business: undefined,
  });
  const html = renderScreen(minimal, 'records');
  assert(html.includes('No education record available'), 'Missing education renders empty fallback');
  assert(html.includes('Unavailable'), 'Missing career total earnings displays Unavailable instead of $0');
  assert(html.includes('No active company owned'), 'Missing business renders empty state');
}

// 4. Family tree categories, deceased members, pet memorials separation, modal open/close, and recorded estates immutability
{
  const dad = makeNpc({ id: 'dad_1', firstName: 'David', gender: 'male', biologicalGender: 'male', age: 70, isAlive: false, deathYear: 2024, causeOfDeath: 'Natural causes' });
  const mom = makeNpc({ id: 'mom_1', firstName: 'Mei', age: 68 });
  const sib = makeNpc({ id: 'sib_1', firstName: 'Lucas', gender: 'male', biologicalGender: 'male', age: 36 });
  const sibSpouse = makeNpc({ id: 'sib_spouse', firstName: 'Rachel', age: 35 });
  const niece = makeNpc({ id: 'niece_1', firstName: 'Maya', age: 8 });
  const spouse = makeNpc({ id: 'partner_1', firstName: 'Jordan', gender: 'male', biologicalGender: 'male', age: 35 });
  const ex = makeNpc({ id: 'ex_1', firstName: 'Blake', lastName: 'Stone', isAlive: true, age: 34 });
  const child = makeNpc({ id: 'child_1', firstName: 'Elena', age: 21 });
  const childSpouse = makeNpc({ id: 'child_spouse', firstName: 'Omar', age: 22 });
  const grandchild = makeNpc({ id: 'gc_1', firstName: 'Noah', age: 1 });
  const unrelatedNpc = makeNpc({ id: 'unrelated_999', firstName: 'SecretStranger', isAlive: false, deathYear: 2024 });

  const richFamilyChar = makeBaseCharacter({
    age: 42,
    parents: {
      ...makeBaseCharacter().parents,
      father: { ...makeBaseCharacter().parents.father, isAlive: false },
    },
    partner: {
      id: 'partner_1',
      firstName: 'Jordan',
      lastName: 'Lin',
      age: 35,
      gender: 'male',
      role: 'Husband',
      relationshipType: 'spouse',
      romanticStage: 'married',
      relationship: 92,
      originStory: 'Work',
      stageMet: 'adulthood',
    },
    exPartners: [
      {
        id: 'ex_1',
        firstName: 'Blake',
        lastName: 'Stone',
        age: 34,
        gender: 'female',
        role: 'Ex-Spouse',
        relationshipType: 'ex',
        romanticStage: 'ex',
        relationship: 20,
        originStory: 'College',
        stageMet: 'university',
        partnerStats: { craziness: 30, generosity: 50, looks: 70, smarts: 70, fertility: 70, weddingVenue: 'Garden' },
      },
    ],
    pets: {
      animals: [
        {
          id: 'pet_m1',
          name: 'Mochi',
          species: 'pet_cat',
          temperament: 'steady',
          petAge: 15,
          adoptedAtAge: 22,
          health: 0,
          attachment: 95,
          lastFedAge: 36,
          lastPlayedAge: 36,
          lastVetAge: null,
          lastMoment: 'Mochi slept peacefully.',
          status: 'memorial',
          closedAtAge: 37,
          closingLine: 'Mochi was deeply loved.',
        },
      ],
    },
    worldState: makeWorld(
      [dad, mom, sib, sibSpouse, niece, spouse, ex, child, childSpouse, grandchild, unrelatedNpc],
      [
        makeEdge({ id: 'e_dad', a: 'dad_1', b: 'player_ui_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'father', status: 'deceased' }),
        makeEdge({ id: 'e_mom', a: 'mom_1', b: 'player_ui_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child', parentRoleForA: 'mother' }),
        makeEdge({ id: 'e_sib', a: 'player_ui_1', b: 'sib_1', category: 'sibling', roleForA: 'sibling', roleForB: 'sibling' }),
        makeEdge({ id: 'e_sibsp', a: 'sib_1', b: 'sib_spouse', category: 'spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'active' }),
        makeEdge({ id: 'e_niece', a: 'sib_1', b: 'niece_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
        makeEdge({ id: 'e_sp', a: 'player_ui_1', b: 'partner_1', category: 'spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'active' }),
        makeEdge({ id: 'e_ch', a: 'player_ui_1', b: 'child_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
        makeEdge({ id: 'e_chsp', a: 'child_1', b: 'child_spouse', category: 'spouse', roleForA: 'spouse', roleForB: 'spouse', status: 'active' }),
        makeEdge({ id: 'e_gc', a: 'child_1', b: 'gc_1', category: 'parent_child', roleForA: 'parent', roleForB: 'child' }),
      ],
      {
        rec_dad: {
          id: 'rec_dad',
          deceasedNpcId: 'dad_1',
          settlementYear: 2024,
          currency: 'CAD',
          grossAssets: 150000,
          totalLiabilities: 30000,
          liabilitiesPaid: 30000,
          unpaidLiabilities: 0,
          netDistributableEstate: 120000,
          distributions: [
            {
              beneficiaryId: 'player_ui_1',
              relationshipToDeceased: 'child',
              sourceCurrency: 'CAD',
              targetCurrency: 'CAD',
              exchangeRateApplied: 1,
              amountInSourceCurrency: 60000,
              amountAwardedInTargetCurrency: 60000,
            },
          ],
          escheatedToState: false,
          escheatedAmount: 0,
          status: 'settled',
        },
        rec_unrelated: {
          id: 'rec_unrelated',
          deceasedNpcId: 'unrelated_999',
          settlementYear: 2024,
          currency: 'CAD',
          grossAssets: 999999,
          totalLiabilities: 0,
          liabilitiesPaid: 0,
          unpaidLiabilities: 0,
          netDistributableEstate: 999999,
          distributions: [],
          escheatedToState: false,
          escheatedAmount: 0,
          status: 'settled',
        },
      }
    ),
  });

  deepFreeze(richFamilyChar);
  const snapshotBefore = JSON.stringify(richFamilyChar);

  const familyHtml = renderScreen(richFamilyChar, 'family');
  assert(familyHtml.includes('Parents') && familyHtml.includes('David Lin') && familyHtml.includes('Deceased'), 'Parents & deceased father status rendered');
  assert(familyHtml.includes('Current Partner') && familyHtml.includes('Jordan Lin'), 'Current partner category rendered');
  assert(familyHtml.includes('Siblings') && familyHtml.includes('Lucas Lin'), 'Siblings category rendered');
  assert(familyHtml.includes('Former Partners &amp; Spouses') && familyHtml.includes('Blake Stone'), 'Former partner category rendered');
  assert(familyHtml.includes('Children') && familyHtml.includes('Elena Lin'), 'Children category rendered');
  assert(familyHtml.includes('Grandchildren') && familyHtml.includes('Noah Lin'), 'Grandchildren category rendered');
  assert(familyHtml.includes('Nieces &amp; Nephews') && familyHtml.includes('Maya Lin'), 'Nieces & Nephews category rendered');
  assert(familyHtml.includes('Extended Relatives (In-Laws)') && familyHtml.includes('Rachel Lin'), 'Extended in-laws category rendered');
  assert(familyHtml.includes('Pet Memorials') && familyHtml.includes('Mochi') && familyHtml.includes('Separate from human tree'), 'Pet memorials rendered separately');
  assert(!familyHtml.includes('SecretStranger'), 'Unrelated NPC excluded from family tree');

  // Member detail modal open and close
  const dadDetail = selectFamilyMemberDetail(richFamilyChar, 'dad_1');
  assert(dadDetail !== null, 'selectFamilyMemberDetail returns deceased father');
  const openModalHtml = renderToStaticMarkup(
    React.createElement(FamilyMemberDetailModal, {
      isOpen: true,
      member: dadDetail,
      onClose: () => {},
    })
  );
  assert(openModalHtml.includes('David Lin') && openModalHtml.includes('Natural causes') && openModalHtml.includes('2024'), 'Member detail modal renders deceased details');
  const closedModalHtml = renderToStaticMarkup(
    React.createElement(FamilyMemberDetailModal, {
      isOpen: false,
      member: dadDetail,
      onClose: () => {},
    })
  );
  assert(closedModalHtml === '', 'Closed member detail modal renders empty');

  // Recorded estates render verified relative, omit unrelated, do NOT change cash/netWorth
  const estatesHtml = renderScreen(richFamilyChar, 'estates');
  assert(estatesHtml.includes('David Lin') && estatesHtml.includes('Player Allocation') && estatesHtml.includes('CAD 60,000'), 'Recorded family estate & player allocation displayed');
  assert(!estatesHtml.includes('SecretStranger') && !estatesHtml.includes('999,999'), 'Real estate filter omits unrelated NPC estate');
  assert(richFamilyChar.cash === 30000 && richFamilyChar.bankBalance === 20000 && richFamilyChar.netWorth === 50000, 'Player finances untouched');
  assert(JSON.stringify(richFamilyChar) === snapshotBefore, 'Selectors & screens perform zero simulation or mutation');
}

// 5. v2 worldState containing ONLY unrelated estate still shows empty estate state
{
  const stranger = makeNpc({ id: 'stranger_only', firstName: 'HiddenGhost', isAlive: false, deathYear: 2024 });
  const emptyEstateChar = makeBaseCharacter({
    worldState: makeWorld([stranger], [], {
      rec_hidden: {
        id: 'rec_hidden',
        deceasedNpcId: 'stranger_only',
        settlementYear: 2024,
        currency: 'USD',
        grossAssets: 250000,
        totalLiabilities: 0,
        liabilitiesPaid: 0,
        unpaidLiabilities: 0,
        netDistributableEstate: 250000,
        distributions: [],
        escheatedToState: false,
        escheatedAmount: 0,
        status: 'settled',
      },
    }),
  });
  const estatesHtml = renderScreen(emptyEstateChar, 'estates');
  assert(estatesHtml.includes('No recorded family estate settlements found for verified relatives'), 'Empty verified estates state shown');
  assert(!estatesHtml.includes('HiddenGhost') && !estatesHtml.includes('250,000'), 'Unrelated estate filtered out cleanly');
}

// 6. Deceased player access via DeathModal + IdentityHeritageScreen post-mortem & key-based fresh-life state isolation
{
  const deceased = makeBaseCharacter({
    id: 'dead_player_1',
    age: 82,
    isAlive: false,
    causeOfDeath: 'Old age',
  });
  const deathModalHtml = renderToStaticMarkup(
    React.createElement(DeathModal, {
      character: deceased,
      isOpen: true,
      onStartNewLife: () => {},
      onViewIdentity: () => {},
      onClose: () => {},
    })
  );
  assert(deathModalHtml.includes('View Identity &amp; Heritage'), 'DeathModal includes View Identity & Heritage action');

  const postMortemHtml = renderScreen(deceased, 'identity', 'Obituary');
  assert(postMortemHtml.includes('Deceased') && postMortemHtml.includes('Old age') && postMortemHtml.includes('Obituary'), 'Post-mortem Identity screen preserves deceased status, cause of death, and back-to-obituary navigation');
}

console.log('✅ identityUI tests passed!');
