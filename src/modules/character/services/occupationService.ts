import type { CharacterProfile } from '../../../types/game';
import type { ActiveBusinessProfile } from '../../business/types';
import type { CareerHistoryEntry } from '../../career/types';
import type { PrisonState } from '../../crime/types';
import type { ProfessionalSchoolProfile, SchoolStage } from '../../education/types';

export type RetirementOccupation = 'Retired' | 'Retired Entrepreneur';

export interface OccupationResolutionOptions {
  professionalSchool?: Pick<ProfessionalSchoolProfile, 'schoolId' | 'programName'> | null;
  isPubliclyTradedBusiness?: boolean;
  retirementFallback?: RetirementOccupation | null;
  careerHistory?: readonly CareerHistoryEntry[];
}

export function getProfessionalStudentOccupation(
  prof?: Pick<ProfessionalSchoolProfile, 'schoolId' | 'programName'> | null,
): string {
  if (!prof) return 'Graduate Student';
  if (prof.schoolId === 'med_school') return 'Medical Student';
  if (prof.schoolId === 'law_school') return 'Law Student';
  if (prof.schoolId === 'flight_school') return 'Flight Student';
  return `${prof.programName} Student`;
}

export function getBusinessOccupation(
  business: Pick<ActiveBusinessProfile, 'name' | 'isPubliclyTraded'>,
): string {
  return business.isPubliclyTraded
    ? `Public CEO & Founder (${business.name})`
    : `Founder & CEO (${business.name})`;
}

export function resolveRetirementOccupation(
  currentOccupation?: string,
  retirementFallback?: RetirementOccupation | null,
  careerHistory?: readonly CareerHistoryEntry[],
): RetirementOccupation | null {
  if (retirementFallback === 'Retired' || retirementFallback === 'Retired Entrepreneur') {
    return retirementFallback;
  }
  if (currentOccupation === 'Retired' || currentOccupation === 'Retired Entrepreneur') {
    return currentOccupation;
  }
  // `null` indicates pre-incarceration occupation was explicitly non-retired
  // (for example, an intervening job loss or business liquidation).
  if (retirementFallback === undefined && Array.isArray(careerHistory) && careerHistory.length > 0) {
    const latestEntry = careerHistory[careerHistory.length - 1];
    if (latestEntry?.reasonForLeaving === 'retired') {
      return 'Retired';
    }
  }
  return null;
}

/**
 * Authoritative occupation resolution based on age, education, employment, business, and retirement state.
 */
export function resolveOccupationForAge(
  age: number,
  currentOccupation?: string,
  educationStage?: SchoolStage | string,
  activeJobTitle?: string,
  activeBusinessName?: string,
  options: OccupationResolutionOptions = {},
): string {
  if (age <= 2) return 'Infant';
  if (age <= 4) return 'Toddler';
  if (age <= 10) return 'Elementary Student';
  if (age <= 13) return 'Middle School Student';

  if (activeBusinessName) {
    return options.isPubliclyTradedBusiness
      ? `Public CEO & Founder (${activeBusinessName})`
      : `Founder & CEO (${activeBusinessName})`;
  }
  if (activeJobTitle) return activeJobTitle;

  if (age <= 17) {
    if (educationStage === 'dropped_out' || currentOccupation === 'High School Dropout') {
      return 'High School Dropout';
    }
    return 'High School Student';
  }

  if (educationStage === 'university') return 'University Student';
  if (educationStage === 'professional_school') {
    if (options.professionalSchool) {
      return getProfessionalStudentOccupation(options.professionalSchool);
    }
    return currentOccupation && currentOccupation.endsWith('Student')
      ? currentOccupation
      : 'Graduate Student';
  }

  const retiredOccupation = resolveRetirementOccupation(
    currentOccupation,
    options.retirementFallback,
    options.careerHistory,
  );
  if (retiredOccupation) {
    return retiredOccupation;
  }

  return 'Unemployed';
}

export interface CharacterOccupationOverrides {
  age?: number;
  currentOccupationBaseline?: string;
  educationStage?: SchoolStage;
  professionalSchool?: ProfessionalSchoolProfile | null;
  activeJobTitle?: string;
  business?: ActiveBusinessProfile | null;
  prisonContext?: PrisonState | null;
}

/**
 * Resolves a character's civilian occupation consistently across Age Up and mid-year prison release.
 */
export function resolveCharacterOccupation(
  character: Pick<
    CharacterProfile,
    'age' | 'occupation' | 'education' | 'career' | 'business' | 'crime'
  >,
  overrides: CharacterOccupationOverrides = {},
): string {
  const effectiveAge = overrides.age ?? character.age;
  const effectiveEdu = character.education;
  const effectiveStage = overrides.educationStage ?? effectiveEdu?.currentStage;
  const effectiveProfSchool =
    overrides.professionalSchool !== undefined
      ? overrides.professionalSchool
      : (effectiveEdu?.professionalSchool ?? null);
  const effectiveJobTitle =
    overrides.activeJobTitle !== undefined
      ? overrides.activeJobTitle
      : character.career?.currentJob?.title;
  const effectiveBusiness =
    overrides.business !== undefined ? overrides.business : (character.business ?? null);
  const effectivePrison =
    overrides.prisonContext !== undefined
      ? overrides.prisonContext
      : (character.crime?.prison ?? null);

  return resolveOccupationForAge(
    effectiveAge,
    overrides.currentOccupationBaseline ?? character.occupation,
    effectiveStage,
    effectiveJobTitle,
    effectiveBusiness?.name,
    {
      professionalSchool: effectiveProfSchool,
      isPubliclyTradedBusiness: Boolean(effectiveBusiness?.isPubliclyTraded),
      retirementFallback: effectivePrison?.priorRetirementOccupation,
      careerHistory: character.career?.history,
    },
  );
}

