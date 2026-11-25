import type { CharacterProfile } from '../../../types/game';
import { createInitialCareerState } from '../../career/services/careerService';
import { createEmptyCrimeState } from '../../crime/services/crimeSelectors';
import { performPrisonAction } from '../../crime/services/prisonService';
import { createInitialEducation } from '../../education/services/educationService';
import {
  fetchAllCountries,
  fetchCitiesForCountry,
  pickRandomCity,
} from '../services/locationService';
import {
  getBusinessOccupation,
  getProfessionalStudentOccupation,
  resolveCharacterOccupation,
  resolveOccupationForAge,
} from '../services/occupationService';
import { applyEffects, finalizeCharacterDeath } from '../services/statService';

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  const age = overrides.age ?? 24;
  return {
    id: 'char-core-test',
    firstName: 'Sam',
    lastName: 'Rivera',
    gender: 'non-binary',
    country: 'United States',
    city: 'Austin',
    occupation: 'Unemployed',
    birthYear: 2026 - age,
    age,
    isAlive: true,
    cash: 1000,
    bankBalance: 0,
    netWorth: 1000,
    stats: {
      health: 80,
      happiness: 75,
      smarts: 70,
      looks: 65,
      karma: 85,
    },
    parents: {
      father: {
        id: 'dad-core',
        role: 'father',
        firstName: 'Carlos',
        lastName: 'Rivera',
        age: age + 27,
        occupation: 'Teacher',
        isAlive: true,
        relationship: 80,
        generosity: 60,
      },
      mother: {
        id: 'mom-core',
        role: 'mother',
        firstName: 'Elena',
        lastName: 'Rivera',
        age: age + 25,
        occupation: 'Nurse',
        isAlive: true,
        relationship: 85,
        generosity: 65,
      },
      wealth: 'comfortable',
    },
    relationships: [],
    education: createInitialEducation(),
    career: createInitialCareerState(),
    timeline: [],
    seenEventIds: [],
    ...overrides,
  };
}

console.log('--- STARTING CHARACTER CORE SERVICES TESTS ---');

// 1. applyEffects: clamping, actual deltas, cash floor, and fatal health
{
  const base = makeCharacter({
    cash: 150,
    stats: { health: 96, happiness: 5, smarts: 50, looks: 50, karma: 50 },
  });
  const res = applyEffects(base, {
    health: 10,
    happiness: -20,
    cash: -400,
  });
  assert(
    res.character.stats.health === 100 &&
      res.applied.health === 4 &&
      res.character.stats.happiness === 0 &&
      res.applied.happiness === -5 &&
      res.character.cash === 0 &&
      res.applied.cash === -150,
    'applyEffects clamps stats [0, 100], floors cash at $0, and reports actual applied deltas'
  );

  const fatal = applyEffects(makeCharacter({ stats: { health: 3, happiness: 50, smarts: 50, looks: 50, karma: 50 } }), {
    health: -5,
  });
  assert(
    !fatal.character.isAlive &&
      fatal.character.stats.health === 0 &&
      fatal.character.causeOfDeath === 'Succumbed to poor health',
    'applyEffects marks character deceased when health drops to 0'
  );
}

// 2. Sub-screen death finalization helper & prison work lethality (#3)
{
  const fragilePrisoner = makeCharacter({
    age: 30,
    occupation: 'Incarcerated',
    stats: { health: 1, happiness: 40, smarts: 60, looks: 60, karma: 40 },
    crime: {
      ...createEmptyCrimeState(),
      prison: {
        facilityName: 'State Penitentiary',
        securityLevel: 'medium',
        chargeTitle: 'Burglary',
        yearsTotal: 3,
        yearsServed: 1,
        yearsRemaining: 2,
        behaviorScore: 60,
        paroleEligibleAtServed: 1,
        actionsTakenThisYear: 0,
        actionIdsThisYear: [],
        lastActionAge: null,
        lastProgressedAge: 29,
      },
    },
  });

  const fatalWork = performPrisonAction(fragilePrisoner, 'work');
  assert(fatalWork.ok && !fatalWork.character.isAlive, 'Prison work at 1 HP results in death');

  const finalizedOnce = finalizeCharacterDeath(fatalWork.character);
  const finalizedTwice = finalizeCharacterDeath(finalizedOnce);
  const ripEvents = finalizedTwice.timeline.filter((e) => e.title === 'Rest in Peace');
  assert(
    finalizedOnce.stats.health === 0 &&
      ripEvents.length === 1 &&
      finalizedTwice.timeline.length === finalizedOnce.timeline.length,
    'finalizeCharacterDeath clamps health to 0 and appends exactly one Rest in Peace event idempotently'
  );
}

// 3. Occupation resolution across life stages, education, employment, business, and retirement
{
  assert(resolveOccupationForAge(1) === 'Infant', 'Age 1 resolves Infant');
  assert(resolveOccupationForAge(4) === 'Toddler', 'Age 4 resolves Toddler');
  assert(resolveOccupationForAge(8) === 'Elementary Student', 'Age 8 resolves Elementary Student');
  assert(resolveOccupationForAge(12) === 'Middle School Student', 'Age 12 resolves Middle School Student');
  assert(resolveOccupationForAge(16) === 'High School Student', 'Age 16 resolves High School Student');
  assert(
    resolveOccupationForAge(16, undefined, 'dropped_out') === 'High School Dropout',
    'Dropped-out minor resolves High School Dropout'
  );
  assert(
    resolveOccupationForAge(20, undefined, 'university') === 'University Student',
    'University student resolves University Student'
  );
  assert(
    getProfessionalStudentOccupation({ schoolId: 'med_school', programName: 'MD' }) === 'Medical Student',
    'Medical school resolves Medical Student'
  );
  assert(
    getBusinessOccupation({ name: 'Apex Labs', isPubliclyTraded: true }) === 'Public CEO & Founder (Apex Labs)',
    'Publicly traded business resolves Public CEO & Founder'
  );

  const workingChar = makeCharacter({
    age: 29,
    occupation: 'Unemployed',
    career: {
      ...createInitialCareerState(),
      currentJob: {
        jobId: 'eng',
        title: 'Software Engineer',
        companyName: 'CoreTech',
        field: 'technology',
        type: 'full_time',
        salary: 95000,
        yearsInJob: 2,
        performance: 85,
        hiredAge: 27,
        icon: '💻',
      },
    },
  });
  assert(
    resolveCharacterOccupation(workingChar) === 'Software Engineer',
    'resolveCharacterOccupation resolves active job title'
  );
  assert(
    resolveCharacterOccupation(makeCharacter({ age: 68, occupation: 'Retired' })) === 'Retired',
    'resolveCharacterOccupation preserves Retired status'
  );
}

// 4. locationService timeout/abort & failure fallback and pickRandomCity (#4)
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('Simulated network failure');
  }) as typeof fetch;

  try {
    const fallbackCountries = await fetchAllCountries();
    assert(fallbackCountries.length > 0, 'fetchAllCountries returns curated fallback list when fetch fails');

    const fallbackCities = await fetchCitiesForCountry('Japan');
    assert(fallbackCities.includes('Tokyo'), 'fetchCitiesForCountry falls back to curated major cities');

    const picked = pickRandomCity('Japan', fallbackCities);
    assert(typeof picked === 'string' && picked.length > 0, 'pickRandomCity returns a valid city string');
  } finally {
    globalThis.fetch = originalFetch;
  }

  let abortFired = false;
  let receivedSignal = false;
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal instanceof AbortSignal) {
        receivedSignal = true;
        signal.addEventListener('abort', () => {
          abortFired = true;
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      }
    })) as typeof fetch;

  try {
    const timedOutCities = await fetchCitiesForCountry('TimeoutCheckCountry', 25);
    assert(
      receivedSignal &&
        abortFired &&
        timedOutCities.length === 1 &&
        timedOutCities[0] === 'TimeoutCheckCountry',
      'fetchCitiesForCountry passes AbortSignal, aborts hanging requests on timeout, and returns fallback'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('--- ALL CHARACTER CORE SERVICES TESTS PASSED PERFECTLY! ---');
