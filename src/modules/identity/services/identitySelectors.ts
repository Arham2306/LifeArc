import type { CharacterProfile, FamilyWealth, LifeEventCategory } from '../../../types/game';
import { calculatePlayerNetWorth, validProperties } from '../../assets/services/assetService';
import type { BusinessSector } from '../../business/types';
import type { CareerField, CareerHistoryEntry, EmploymentType } from '../../career/types';
import {
  getActiveAdultConvictions,
  getJuvenileAdjudications,
  getSanitizedCrimeState,
  getUnpaidFines,
  hasPendingCourtCase,
  isCurrentlyIncarcerated,
  isOnProbation,
  isRecordClearedForAdultChecks,
} from '../../crime/services/crimeSelectors';
import type {
  ActivityRole,
  DisciplineId,
  DisciplineRecord,
  SchoolHistoryEntry,
  SchoolStage,
} from '../../education/types';
import type {
  IdentityActiveBusinessSummary,
  IdentityActiveJobSummary,
  IdentityBusinessSummary,
  IdentityCareerSummary,
  IdentityCoreSummary,
  IdentityEducationSummary,
  IdentityEmploymentStatus,
  IdentityFinancialSummary,
  IdentityHeritageReadModel,
  IdentityLegalStandingSummary,
  IdentityLifeStage,
  IdentityNonConvictionDisposition,
  IdentityPublicConvictionRecord,
  IdentityTimelineHighlight,
  IdentityTimelineSummary,
  IdentityUnsealedJuvenileAdjudication,
  TimelineDerivedBusinessExit,
} from '../types';

export const IDENTITY_TIMELINE_HIGHLIGHT_LIMIT = 25;
export const IDENTITY_TIMELINE_SCAN_LIMIT = 2000;

const VALID_GENDERS = new Set(['male', 'female', 'non-binary']);
const VALID_WEALTH_TIERS: ReadonlySet<FamilyWealth> = new Set([
  'struggling',
  'modest',
  'comfortable',
  'wealthy',
]);
const VALID_SCHOOL_STAGES: ReadonlySet<SchoolStage> = new Set([
  'none',
  'elementary',
  'middle_school',
  'high_school',
  'graduated',
  'dropped_out',
  'university',
  'professional_school',
]);
const VALID_SCHOOL_HISTORY_STAGES = new Set([
  'elementary',
  'middle_school',
  'high_school',
  'university',
  'professional_school',
]);
const VALID_DISCIPLINE_IDS: ReadonlySet<DisciplineId> = new Set([
  'soccer',
  'basketball',
  'robotics',
  'debate',
  'drama',
  'music',
  'journalism',
  'visual_arts',
]);
const VALID_ACTIVITY_ROLES: ReadonlySet<ActivityRole> = new Set([
  'member',
  'captain',
  'president',
  'lead',
]);
const VALID_EMPLOYMENT_TYPES: ReadonlySet<EmploymentType> = new Set([
  'full_time',
  'part_time',
  'freelance',
]);
const VALID_CAREER_FIELDS: ReadonlySet<CareerField> = new Set([
  'technology',
  'medicine_healthcare',
  'business_finance',
  'law_government',
  'arts_media',
  'trades_services',
  'hospitality_retail',
  'aviation_transport',
  'education_science',
]);
const VALID_LEAVING_REASONS = new Set(['resigned', 'switched_jobs', 'fired', 'retired']);
const VALID_BUSINESS_SECTORS: ReadonlySet<BusinessSector> = new Set([
  'food_hospitality',
  'services',
  'retail_commerce',
  'media_creative',
  'software_tech',
  'industrial_logistics',
  'deep_tech_pharma',
]);
const VALID_LIFE_EVENT_CATEGORIES: ReadonlySet<LifeEventCategory> = new Set([
  'birth',
  'childhood',
  'education',
  'career',
  'business',
  'health',
  'relationship',
  'social',
  'money',
  'misfortune',
  'milestone',
]);
const HIGHLIGHT_PRIORITY_CATEGORIES: ReadonlySet<LifeEventCategory> = new Set([
  'birth',
  'milestone',
  'education',
  'career',
  'business',
  'money',
  'relationship',
]);
const CONVICTION_OUTCOMES = new Set<'fined' | 'probation' | 'imprisoned'>([
  'fined',
  'probation',
  'imprisoned',
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteNonNegative(value: unknown, fallback = 0): number {
  return finiteNumber(value) && value >= 0 ? value : fallback;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function isMalformedDefinedNumber(value: unknown): boolean {
  return value !== undefined && !finiteNumber(value);
}

/**
 * Maps a valid non-negative age onto the deterministic Identity life-stage classification.
 * Returns null for non-finite or negative ages so invalid ages are never misclassified as childhood.
 */
export function selectLifeStageForAge(age: number): IdentityLifeStage | null {
  if (!finiteNumber(age) || age < 0) return null;
  if (age <= 12) return 'childhood';
  if (age <= 17) return 'teens';
  if (age <= 39) return 'adulthood';
  if (age <= 64) return 'middle_age';
  return 'old_age';
}

function sanitizeActiveBusiness(rawBusiness: unknown): {
  business: IdentityActiveBusinessSummary | null;
  hasMalformedNumericFields: boolean;
} {
  if (!isPlainRecord(rawBusiness)) {
    return { business: null, hasMalformedNumericFields: false };
  }

  const malformedNumeric =
    isMalformedDefinedNumber(rawBusiness.valuation) ||
    isMalformedDefinedNumber(rawBusiness.equityPct) ||
    isMalformedDefinedNumber(rawBusiness.treasury) ||
    isMalformedDefinedNumber(rawBusiness.foundedYear) ||
    isMalformedDefinedNumber(rawBusiness.foundedAge) ||
    isMalformedDefinedNumber(rawBusiness.locationsCount) ||
    isMalformedDefinedNumber(rawBusiness.yearsInOperation) ||
    isMalformedDefinedNumber(rawBusiness.lifetimeRevenue) ||
    isMalformedDefinedNumber(rawBusiness.lifetimeProfit);

  const id = nonEmptyString(rawBusiness.id);
  const name = nonEmptyString(rawBusiness.name);
  const sector = rawBusiness.sector;
  if (!id || !name || typeof sector !== 'string' || !VALID_BUSINESS_SECTORS.has(sector as BusinessSector)) {
    return { business: null, hasMalformedNumericFields: malformedNumeric };
  }

  const valuation = finiteNumber(rawBusiness.valuation) ? Math.max(0, rawBusiness.valuation) : 0;
  const rawEquity = finiteNumber(rawBusiness.equityPct) ? rawBusiness.equityPct : 0;
  const equityPct = Math.min(100, Math.max(0, rawEquity));
  const ownershipStakeValue = Math.round(valuation * (equityPct / 100));

  return {
    hasMalformedNumericFields: malformedNumeric,
    business: {
      id,
      name,
      slogan: nonEmptyString(rawBusiness.slogan),
      sector: sector as BusinessSector,
      foundedYear: finiteNonNegative(rawBusiness.foundedYear, 0),
      foundedAge: finiteNonNegative(rawBusiness.foundedAge, 0),
      valuation,
      equityPct,
      ownershipStakeValue,
      treasury: finiteNumber(rawBusiness.treasury) ? rawBusiness.treasury : 0,
      locationsCount: finiteNonNegative(rawBusiness.locationsCount, 1),
      yearsInOperation: finiteNonNegative(rawBusiness.yearsInOperation, 0),
      lifetimeRevenue: finiteNumber(rawBusiness.lifetimeRevenue) ? rawBusiness.lifetimeRevenue : 0,
      lifetimeProfit: finiteNumber(rawBusiness.lifetimeProfit) ? rawBusiness.lifetimeProfit : 0,
      isPubliclyTraded: rawBusiness.isPubliclyTraded === true,
      tickerSymbol: nonEmptyString(rawBusiness.tickerSymbol),
    },
  };
}

export function selectIdentityCore(character: CharacterProfile): IdentityCoreSummary {
  const firstName = nonEmptyString(character.firstName) ?? 'Unknown';
  const lastName = nonEmptyString(character.lastName) ?? '';
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;

  const ageValid = finiteNumber(character.age) && character.age >= 0;
  const age = ageValid ? Math.floor(character.age) : 0;
  const birthYear = finiteNumber(character.birthYear) ? Math.trunc(character.birthYear) : null;

  const rawGender = character.gender;
  const gender =
    typeof rawGender === 'string' && VALID_GENDERS.has(rawGender)
      ? (rawGender as IdentityCoreSummary['gender'])
      : 'unknown';

  const isAlive = character.isAlive !== false;
  const causeOfDeath = !isAlive ? nonEmptyString(character.causeOfDeath) : null;

  const rawWealth = isPlainRecord(character.parents) ? character.parents.wealth : undefined;
  const familyWealth =
    typeof rawWealth === 'string' && VALID_WEALTH_TIERS.has(rawWealth as FamilyWealth)
      ? (rawWealth as FamilyWealth)
      : null;

  return {
    id: nonEmptyString(character.id) ?? '',
    firstName,
    lastName,
    fullName,
    gender,
    age,
    ageValid,
    birthYear,
    birthplace: {
      city: nonEmptyString(character.city),
      country: nonEmptyString(character.country),
      flag: nonEmptyString(character.flag),
    },
    lifeStage: ageValid ? selectLifeStageForAge(age) : null,
    occupation: nonEmptyString(character.occupation) ?? 'Unemployed',
    isAlive,
    causeOfDeath,
    familyWealth,
  };
}

export function selectFinancialSummary(character: CharacterProfile): IdentityFinancialSummary {
  const cashMalformed = isMalformedDefinedNumber(character.cash);
  const bankMalformed = isMalformedDefinedNumber(character.bankBalance);
  const netWorthMalformed = isMalformedDefinedNumber(character.netWorth);
  const debtMalformed = isPlainRecord(character.education)
    ? isMalformedDefinedNumber(character.education.studentDebt)
    : false;

  const cash = finiteNumber(character.cash) ? character.cash : 0;
  const bankBalance = finiteNumber(character.bankBalance) ? character.bankBalance : 0;
  const personalNetWorth = calculatePlayerNetWorth(character);

  const properties = validProperties(character);
  let realEstateValue = 0;
  let realEstateMortgageDebt = 0;
  for (const prop of properties) {
    realEstateValue += prop.marketValue;
    if (prop.mortgage) {
      realEstateMortgageDebt += prop.mortgage.principal;
    }
  }

  const { business, hasMalformedNumericFields: businessMalformed } = sanitizeActiveBusiness(
    character.business
  );

  return {
    cash,
    bankBalance,
    personalNetWorth,
    realEstateCount: properties.length,
    realEstateValue,
    realEstateMortgageDebt,
    activeBusinessValuation: business ? business.valuation : null,
    activeBusinessOwnershipPct: business ? business.equityPct : null,
    activeBusinessOwnershipStakeValue: business ? business.ownershipStakeValue : null,
    hasMalformedNumericFields:
      cashMalformed || bankMalformed || netWorthMalformed || debtMalformed || businessMalformed,
  };
}

function isValidSchoolHistoryEntry(value: unknown): value is SchoolHistoryEntry {
  if (!isPlainRecord(value)) return false;
  if (!nonEmptyString(value.id)) return false;
  if (typeof value.stage !== 'string' || !VALID_SCHOOL_HISTORY_STAGES.has(value.stage)) return false;
  if (!nonEmptyString(value.stageLabel) || !nonEmptyString(value.schoolName)) return false;
  if (!finiteNumber(value.startAge) || value.startAge < 0) return false;
  if (!finiteNumber(value.endAge) || value.endAge < 0) return false;
  if (!finiteNumber(value.finalGrades) || value.finalGrades < 0) return false;
  if (value.status !== 'graduated' && value.status !== 'dropped_out') return false;
  return true;
}

function isValidDisciplineRecord(value: unknown): value is DisciplineRecord {
  if (!isPlainRecord(value)) return false;
  if (
    typeof value.disciplineId !== 'string' ||
    !VALID_DISCIPLINE_IDS.has(value.disciplineId as DisciplineId)
  ) {
    return false;
  }
  if (!nonEmptyString(value.label) || !nonEmptyString(value.icon)) return false;
  if (!finiteNumber(value.totalYears) || value.totalYears < 0) return false;
  if (
    typeof value.highestRole !== 'string' ||
    !VALID_ACTIVITY_ROLES.has(value.highestRole as ActivityRole)
  ) {
    return false;
  }
  if (!finiteNumber(value.trophiesWon) || value.trophiesWon < 0) return false;
  return true;
}

export function selectEducationSummary(character: CharacterProfile): IdentityEducationSummary {
  const edu = character.education as unknown;
  if (!isPlainRecord(edu)) {
    return {
      hasData: false,
      currentStage: 'unavailable',
      schoolName: null,
      gradeLevelLabel: null,
      grades: null,
      diplomas: [],
      history: [],
      disciplines: [],
      activeUniversity: null,
      activeProfessionalSchool: null,
      studentDebt: 0,
    };
  }

  const currentStage =
    typeof edu.currentStage === 'string' && VALID_SCHOOL_STAGES.has(edu.currentStage as SchoolStage)
      ? (edu.currentStage as SchoolStage)
      : 'unavailable';

  const diplomas = Array.isArray(edu.diplomas)
    ? edu.diplomas
        .map((d) => nonEmptyString(d))
        .filter((d): d is string => d !== null)
    : [];

  const history: SchoolHistoryEntry[] = Array.isArray(edu.history)
    ? edu.history.filter(isValidSchoolHistoryEntry).map((entry) => ({
        id: entry.id.trim(),
        stage: entry.stage,
        stageLabel: entry.stageLabel.trim(),
        schoolName: entry.schoolName.trim(),
        startAge: entry.startAge,
        endAge: entry.endAge,
        finalGrades: entry.finalGrades,
        status: entry.status,
      }))
    : [];

  const disciplines: DisciplineRecord[] = isPlainRecord(edu.disciplines)
    ? Object.values(edu.disciplines)
        .filter(isValidDisciplineRecord)
        .map((rec) => ({
          disciplineId: rec.disciplineId,
          label: rec.label.trim(),
          icon: rec.icon.trim(),
          totalYears: rec.totalYears,
          highestRole: rec.highestRole,
          trophiesWon: rec.trophiesWon,
        }))
    : [];

  const rawUni = edu.university;
  const activeUniversity =
    isPlainRecord(rawUni) &&
    nonEmptyString(rawUni.universityName) &&
    nonEmptyString(rawUni.majorName) &&
    nonEmptyString(rawUni.degreeTitle)
      ? {
          universityName: (rawUni.universityName as string).trim(),
          majorName: (rawUni.majorName as string).trim(),
          degreeTitle: (rawUni.degreeTitle as string).trim(),
          year: finiteNonNegative(rawUni.year, 1),
          totalYears: finiteNonNegative(rawUni.totalYears, 4),
        }
      : null;

  const rawProf = edu.professionalSchool;
  const activeProfessionalSchool =
    isPlainRecord(rawProf) &&
    nonEmptyString(rawProf.schoolName) &&
    nonEmptyString(rawProf.programName) &&
    nonEmptyString(rawProf.degreeAwarded)
      ? {
          schoolName: (rawProf.schoolName as string).trim(),
          programName: (rawProf.programName as string).trim(),
          degreeAwarded: (rawProf.degreeAwarded as string).trim(),
          year: finiteNonNegative(rawProf.year, 1),
          totalYears: finiteNonNegative(rawProf.totalYears, 3),
        }
      : null;

  return {
    hasData: true,
    currentStage,
    schoolName: nonEmptyString(edu.schoolName),
    gradeLevelLabel: nonEmptyString(edu.gradeLevelLabel),
    grades: finiteNumber(edu.grades) ? Math.max(0, Math.min(100, edu.grades)) : null,
    diplomas,
    history,
    disciplines,
    activeUniversity,
    activeProfessionalSchool,
    studentDebt: finiteNonNegative(edu.studentDebt, 0),
  };
}

function isValidCareerHistoryEntry(value: unknown): value is CareerHistoryEntry {
  if (!isPlainRecord(value)) return false;
  if (!nonEmptyString(value.id) || !nonEmptyString(value.jobId)) return false;
  if (!nonEmptyString(value.title) || !nonEmptyString(value.companyName)) return false;
  if (typeof value.type !== 'string' || !VALID_EMPLOYMENT_TYPES.has(value.type as EmploymentType)) {
    return false;
  }
  if (!finiteNumber(value.startAge) || value.startAge < 0) return false;
  if (!finiteNumber(value.endAge) || value.endAge < 0) return false;
  if (!finiteNumber(value.finalSalary) || value.finalSalary < 0) return false;
  if (typeof value.reasonForLeaving !== 'string' || !VALID_LEAVING_REASONS.has(value.reasonForLeaving)) {
    return false;
  }
  return true;
}

function parseActiveJob(rawJob: unknown): IdentityActiveJobSummary | null {
  if (!isPlainRecord(rawJob)) return null;
  const jobId = nonEmptyString(rawJob.jobId);
  const title = nonEmptyString(rawJob.title);
  const companyName = nonEmptyString(rawJob.companyName);
  const field = rawJob.field;
  const type = rawJob.type;
  if (
    !jobId ||
    !title ||
    !companyName ||
    typeof field !== 'string' ||
    !VALID_CAREER_FIELDS.has(field as CareerField) ||
    typeof type !== 'string' ||
    !VALID_EMPLOYMENT_TYPES.has(type as EmploymentType)
  ) {
    return null;
  }
  return {
    jobId,
    title,
    companyName,
    field: field as CareerField,
    type: type as EmploymentType,
    salary: finiteNonNegative(rawJob.salary, 0),
    yearsInJob: finiteNonNegative(rawJob.yearsInJob, 0),
    performance: finiteNumber(rawJob.performance) ? Math.max(0, Math.min(100, rawJob.performance)) : 0,
    hiredAge: finiteNonNegative(rawJob.hiredAge, 0),
  };
}

function deriveEmploymentStatus(
  character: CharacterProfile,
  occupation: string,
  currentJob: IdentityActiveJobSummary | null,
  hasActiveBusiness: boolean
): IdentityEmploymentStatus {
  if (character.isAlive === false) return 'deceased';
  if (isCurrentlyIncarcerated(character)) return 'incarcerated';
  if (currentJob) return 'employed';
  if (hasActiveBusiness) return 'self_employed';
  if (occupation === 'Retired' || occupation === 'Retired Entrepreneur') return 'retired';

  const stage = isPlainRecord(character.education) ? character.education.currentStage : undefined;
  if (
    stage === 'elementary' ||
    stage === 'middle_school' ||
    stage === 'high_school' ||
    stage === 'university' ||
    stage === 'professional_school'
  ) {
    return 'student';
  }

  const age = finiteNumber(character.age) ? character.age : 0;
  if (age < 6 && (occupation === 'Infant' || occupation === 'Toddler')) {
    return 'infant';
  }

  return 'unemployed';
}

export function selectCareerSummary(character: CharacterProfile): IdentityCareerSummary {
  const occupation = nonEmptyString(character.occupation) ?? 'Unemployed';
  const careerRaw = character.career as unknown;
  const { business } = sanitizeActiveBusiness(character.business);

  if (!isPlainRecord(careerRaw)) {
    return {
      hasData: false,
      employmentStatus: deriveEmploymentStatus(character, occupation, null, business !== null),
      occupation,
      currentJob: null,
      history: [],
      totalCareerEarnings: null,
    };
  }

  const currentJob = parseActiveJob(careerRaw.currentJob);
  const history: CareerHistoryEntry[] = Array.isArray(careerRaw.history)
    ? careerRaw.history.filter(isValidCareerHistoryEntry).map((entry) => ({
        id: entry.id.trim(),
        jobId: entry.jobId.trim(),
        title: entry.title.trim(),
        companyName: entry.companyName.trim(),
        type: entry.type,
        startAge: entry.startAge,
        endAge: entry.endAge,
        finalSalary: entry.finalSalary,
        reasonForLeaving: entry.reasonForLeaving,
      }))
    : [];

  const totalCareerEarnings = finiteNumber(careerRaw.totalCareerEarnings)
    ? Math.max(0, careerRaw.totalCareerEarnings)
    : null;

  return {
    hasData: true,
    employmentStatus: deriveEmploymentStatus(character, occupation, currentJob, business !== null),
    occupation,
    currentJob,
    history,
    totalCareerEarnings,
  };
}

function parseTimelineBusinessExit(entry: unknown): TimelineDerivedBusinessExit | null {
  if (!isPlainRecord(entry)) return null;
  const id = nonEmptyString(entry.id) ?? '';
  const title = nonEmptyString(entry.title);
  const message = nonEmptyString(entry.message);
  if (!title || !message) return null;
  if (!finiteNumber(entry.age) || entry.age < 0) return null;
  if (!finiteNumber(entry.year)) return null;

  // Match only genuine business exit templates produced by businessService.exitBusiness:
  // avoid false positives from real estate ("Sold <Property>") or lifestyle possessions ("Sold <Item>").
  if (entry.category === 'money') {
    const soldMatch = /^Sold (.+)!$/.exec(title);
    if (soldMatch && message.includes('private equity firm')) {
      const businessName = soldMatch[1].trim();
      if (!businessName) return null;
      return {
        eventId: id,
        exitType: 'acquisition',
        businessName,
        age: Math.trunc(entry.age),
        year: Math.trunc(entry.year),
        title,
        message,
        source: 'timeline_derived',
      };
    }
  }

  if (entry.category === 'business') {
    const liqMatch = /^Liquidated (.+)$/.exec(title);
    if (liqMatch && message.includes('paying off outstanding creditors')) {
      const businessName = liqMatch[1].trim();
      if (!businessName) return null;
      return {
        eventId: id,
        exitType: 'liquidation',
        businessName,
        age: Math.trunc(entry.age),
        year: Math.trunc(entry.year),
        title,
        message,
        source: 'timeline_derived',
      };
    }
  }

  return null;
}

export function selectBusinessSummary(character: CharacterProfile): IdentityBusinessSummary {
  const { business: activeBusiness } = sanitizeActiveBusiness(character.business);

  const rawTimeline = Array.isArray(character.timeline) ? character.timeline : [];
  const startIndex = Math.max(0, rawTimeline.length - IDENTITY_TIMELINE_SCAN_LIMIT);
  const timelineDerivedExits: TimelineDerivedBusinessExit[] = [];

  for (let i = startIndex; i < rawTimeline.length; i++) {
    const parsedExit = parseTimelineBusinessExit(rawTimeline[i]);
    if (parsedExit) {
      timelineDerivedExits.push(parsedExit);
    }
  }

  return {
    hasAnyRecord: activeBusiness !== null || timelineDerivedExits.length > 0,
    activeBusiness,
    timelineDerivedExits,
  };
}

export function selectLegalStanding(character: CharacterProfile): IdentityLegalStandingSummary {
  const crime = getSanitizedCrimeState(character);

  const activeAdultConvictions: IdentityPublicConvictionRecord[] = getActiveAdultConvictions(character)
    .filter((entry): entry is typeof entry & { outcome: 'fined' | 'probation' | 'imprisoned' } =>
      CONVICTION_OUTCOMES.has(entry.outcome as 'fined' | 'probation' | 'imprisoned')
    )
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      offenseClass: entry.offenseClass,
      age: entry.age,
      year: entry.year,
      outcome: entry.outcome,
      sentenceYears: entry.sentenceYears,
      fineImposed: entry.fineImposed,
    }));

  const unsealedJuvenileAdjudications: IdentityUnsealedJuvenileAdjudication[] =
    getJuvenileAdjudications(character, { includeSealed: false })
      .filter(
        (entry): entry is typeof entry & { outcome: 'fined' | 'probation' | 'imprisoned' } =>
          !isRecordClearedForAdultChecks(entry) &&
          CONVICTION_OUTCOMES.has(entry.outcome as 'fined' | 'probation' | 'imprisoned')
      )
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        offenseClass: entry.offenseClass,
        age: entry.age,
        year: entry.year,
        outcome: entry.outcome,
        sentenceYears: entry.sentenceYears,
        fineImposed: entry.fineImposed,
      }));

  // Preserve confidentiality of sealed juvenile entries and omit expunged records completely.
  const hasSealedJuvenileRecords = crime.records.some(
    (entry) => entry.jurisdiction === 'juvenile' && entry.sealed && !entry.expunged
  );

  const juvenileWarningCount = crime.records.filter(
    (entry) =>
      entry.jurisdiction === 'juvenile' &&
      entry.outcome === 'warned' &&
      !isRecordClearedForAdultChecks(entry)
  ).length;

  const nonConvictionDispositions: IdentityNonConvictionDisposition[] = crime.records
    .filter(
      (entry): entry is typeof entry & { outcome: 'dismissed' | 'acquitted' } =>
        !isRecordClearedForAdultChecks(entry) &&
        (entry.outcome === 'dismissed' || entry.outcome === 'acquitted')
    )
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      jurisdiction: entry.jurisdiction,
      age: entry.age,
      year: entry.year,
      outcome: entry.outcome,
      isConviction: false,
    }));

  const isIncarcerated = isCurrentlyIncarcerated(character);
  const prison = isIncarcerated ? crime.prison : null;
  const onProbation = isOnProbation(character);
  const probation = onProbation ? crime.probation : null;
  const hasPending = hasPendingCourtCase(character);
  const pending = hasPending ? crime.pendingCase : null;
  const unpaidFines = getUnpaidFines(character);

  const hasActivePublicCriminalRecord =
    activeAdultConvictions.length > 0 || unsealedJuvenileAdjudications.length > 0;

  return {
    hasNoActivePublicCriminalRecord: !hasActivePublicCriminalRecord,
    hasActivePublicCriminalRecord,
    custody: {
      isIncarcerated,
      facilityName: prison ? prison.facilityName : null,
      securityLevel: prison ? prison.securityLevel : null,
      chargeTitle: prison ? prison.chargeTitle : null,
      yearsRemaining: prison ? prison.yearsRemaining : null,
      yearsServed: prison ? prison.yearsServed : null,
    },
    probation: {
      isOnProbation: onProbation,
      chargeTitle: probation ? probation.chargeTitle : null,
      jurisdiction: probation ? probation.jurisdiction : null,
      yearsRemaining: probation ? probation.yearsRemaining : null,
    },
    obligations: {
      hasPendingCourtCase: hasPending,
      pendingCase: pending
        ? {
            title: pending.title,
            offenseClass: pending.offenseClass,
            jurisdiction: pending.jurisdiction,
            arrestedAtAge: pending.arrestedAtAge,
            arrestedAtYear: pending.arrestedAtYear,
          }
        : null,
      unpaidFines,
    },
    activeAdultConvictions,
    unsealedJuvenileAdjudications,
    hasSealedJuvenileRecords,
    juvenileWarningCount,
    nonConvictionDispositions,
  };
}

export function selectTimelineHighlights(character: CharacterProfile): IdentityTimelineSummary {
  const rawTimeline = Array.isArray(character.timeline) ? character.timeline : [];
  const startIndex = Math.max(0, rawTimeline.length - IDENTITY_TIMELINE_SCAN_LIMIT);
  const prioritized: IdentityTimelineHighlight[] = [];
  const secondary: IdentityTimelineHighlight[] = [];
  let scanned = 0;

  for (let i = startIndex; i < rawTimeline.length; i++) {
    scanned++;
    const raw = rawTimeline[i];
    if (!isPlainRecord(raw)) continue;
    const message = nonEmptyString(raw.message);
    if (!message) continue;
    if (!finiteNumber(raw.age) || raw.age < 0) continue;
    if (!finiteNumber(raw.year)) continue;
    if (
      typeof raw.category !== 'string' ||
      !VALID_LIFE_EVENT_CATEGORIES.has(raw.category as LifeEventCategory)
    ) {
      continue;
    }

    const highlight: IdentityTimelineHighlight = {
      id: nonEmptyString(raw.id) ?? `timeline:${i}`,
      age: Math.trunc(raw.age),
      year: Math.trunc(raw.year),
      category: raw.category as LifeEventCategory,
      title: nonEmptyString(raw.title),
      message,
      icon: nonEmptyString(raw.icon),
    };

    if (HIGHLIGHT_PRIORITY_CATEGORIES.has(highlight.category)) {
      prioritized.push(highlight);
    } else {
      secondary.push(highlight);
    }
  }

  let selected: IdentityTimelineHighlight[];
  if (prioritized.length >= IDENTITY_TIMELINE_HIGHLIGHT_LIMIT) {
    selected = prioritized.slice(-IDENTITY_TIMELINE_HIGHLIGHT_LIMIT);
  } else {
    const remainingSlots = IDENTITY_TIMELINE_HIGHLIGHT_LIMIT - prioritized.length;
    selected = [...prioritized, ...secondary.slice(-remainingSlots)].sort(
      (a, b) => a.age - b.age || a.year - b.year
    );
  }

  return {
    totalEventsScanned: scanned,
    highlights: selected,
  };
}

export function buildIdentityReadModel(character: CharacterProfile): IdentityHeritageReadModel {
  return {
    core: selectIdentityCore(character),
    financial: selectFinancialSummary(character),
    education: selectEducationSummary(character),
    career: selectCareerSummary(character),
    business: selectBusinessSummary(character),
    legal: selectLegalStanding(character),
    timeline: selectTimelineHighlights(character),
  };
}
