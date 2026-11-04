import type { CharacterProfile, LifeEvent, StatEffects } from '../../../types/game'
import type {
  ActionOutcomeNotice,
  ActiveExtracurricular,
  ActiveSchoolStage,
  DisciplineId,
  DisciplineRecord,
  EducationProfile,
  ProfessionalSchoolProfile,
  ProfessionalSchoolTemplate,
  SchoolHistoryEntry,
  SchoolMilestoneNotice,
  TuitionFunding,
  UniversityMajor,
  UniversityProfile,
  YearlyStudentActions,
} from '../types'
import { SCHOOL_STAGE_CONFIG, generateSchoolName, getLetterGradeMeta } from '../data/schools'
import {
  DISCIPLINE_META,
  MAX_CONCURRENT_ACTIVITIES,
  createInitialDisciplines,
  getActivityTemplateById,
} from '../data/activities'
import {
  UNIVERSITY_TOTAL_YEARS,
  UNIVERSITY_YEAR_LABELS,
  generateUniversityName,
  getTuitionFundingMeta,
  getUniversityMajorById,
} from '../data/majors'
import {
  generateProfessionalSchoolName,
  getProfessionalSchoolById,
} from '../data/professionalSchools'
import { applyEffects } from '../../character/services/statService'
import { createId } from '../../../utils/id'
import { chance, pickRandom, randomInt } from '../../../utils/random'

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function createEmptyYearActions(): YearlyStudentActions {
  return {
    studiedHard: false,
    slackedOff: false,
    askedForTutor: false,
  };
}

/** Creates the initial education profile for a newborn at Age 0. */
export function createInitialEducation(): EducationProfile {
  return {
    currentStage: 'none',
    schoolName: null,
    stageStartAge: null,
    yearInStage: 0,
    totalYearsInStage: 0,
    gradeLevelLabel: null,
    grades: 0,
    popularity: 0,
    diplomas: [],
    history: [],
    yearActions: createEmptyYearActions(),
    activities: [],
    disciplines: createInitialDisciplines(),
    university: null,
    professionalSchool: null,
    studentDebt: 0,
  };
}

/** Calculates natural yearly change in academic grades based on smarts. */
function driftGrades(currentGrades: number, smarts: number): number {
  const targetPull = Math.round((smarts - currentGrades) * 0.18);
  const delta = targetPull + randomInt(-4, 4);
  return clamp(currentGrades + delta);
}

/** Calculates natural yearly change in school popularity based on looks & happiness. */
function driftPopularity(currentPopularity: number, looks: number, happiness: number): number {
  const socialBase = (looks + happiness) / 2;
  const targetPull = Math.round((socialBase - currentPopularity) * 0.15);
  const delta = targetPull + randomInt(-4, 4);
  return clamp(currentPopularity + delta);
}

function mergeStatEffects(a: StatEffects, b: StatEffects): StatEffects {
  return {
    health: (a.health ?? 0) + (b.health ?? 0),
    happiness: (a.happiness ?? 0) + (b.happiness ?? 0),
    smarts: (a.smarts ?? 0) + (b.smarts ?? 0),
    looks: (a.looks ?? 0) + (b.looks ?? 0),
    karma: (a.karma ?? 0) + (b.karma ?? 0),
    parents: (a.parents ?? 0) + (b.parents ?? 0),
    grades: (a.grades ?? 0) + (b.grades ?? 0),
    popularity: (a.popularity ?? 0) + (b.popularity ?? 0),
  };
}

interface AnnualActivityPassResult {
  updatedActivities: ActiveExtracurricular[];
  updatedDisciplines: Record<DisciplineId, DisciplineRecord>;
  activityEvents: LifeEvent[];
  activityEffects: StatEffects;
}

/**
 * Processes a full year of participation in all active clubs/teams:
 * - Increments club & lifelong discipline years
 * - Accumulates annual stat perks
 * - Rolls for Leadership promotion (Captain / President / Lead)
 * - Rolls for Championship / Tournament victories
 */
function processAnnualActivities(
  character: CharacterProfile,
  nextAge: number
): AnnualActivityPassResult {
  const edu = character.education;
  const nextYear = character.birthYear + nextAge;
  const updatedDisciplines: Record<DisciplineId, DisciplineRecord> = {
    ...edu.disciplines,
  };
  const activityEvents: LifeEvent[] = [];
  let activityEffects: StatEffects = {};

  const updatedActivities: ActiveExtracurricular[] = edu.activities.map((act) => {
    const template = getActivityTemplateById(act.activityId);
    const prevDiscipline = updatedDisciplines[act.disciplineId] || {
      disciplineId: act.disciplineId,
      label: DISCIPLINE_META[act.disciplineId].label,
      icon: DISCIPLINE_META[act.disciplineId].icon,
      totalYears: 0,
      highestRole: 'member',
      trophiesWon: 0,
    };

    const nextYearsInClub = act.yearsInClub + 1;
    const nextTotalDisciplineYears = prevDiscipline.totalYears + 1;
    let nextRole = act.role;
    let nextHighestRole = prevDiscipline.highestRole;
    let nextTrophies = prevDiscipline.trophiesWon;

    if (template) {
      activityEffects = mergeStatEffects(activityEffects, template.annualPerks);
    }

    // 1. Check for Leadership Promotion (Captain / President / Lead)
    const eligibleByTenure =
      act.role === 'member' &&
      (nextYearsInClub >= 2 || (nextYearsInClub >= 1 && nextTotalDisciplineYears >= 3));

    const relevantStatValue =
      act.category === 'athletics'
        ? character.stats.health
        : act.category === 'academics'
        ? character.stats.smarts
        : Math.max(character.stats.looks, character.stats.happiness);

    if (eligibleByTenure && relevantStatValue >= 60 && template && chance(0.38)) {
      nextRole = template.leaderRole;
      nextHighestRole = template.leaderRole;
      activityEffects = mergeStatEffects(activityEffects, {
        popularity: 7,
        happiness: 5,
      });

      activityEvents.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: `Named ${template.leaderTitle}!`,
        message: `Thanks to your dedication and skill (${nextTotalDisciplineYears} total years in ${prevDiscipline.label}), you were appointed ${template.leaderTitle} of ${act.name}!`,
        category: 'education',
        icon: '🏅',
      });
    }

    // 2. Roll for Championship / Competition Trophy (16% chance per year)
    if (chance(0.16)) {
      nextTrophies += 1;
      activityEffects = mergeStatEffects(activityEffects, {
        popularity: 5,
        happiness: 5,
        grades: act.category === 'academics' ? 3 : 0,
      });

      const competitionLabel =
        act.category === 'athletics'
          ? 'Regional Championship Trophy'
          : act.category === 'academics'
          ? '1st Place State Competition Award'
          : 'Best Performance Gold Medal';

      activityEvents.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: `Won ${competitionLabel}!`,
        message: `Your ${act.name} squad triumphed this season and brought home the ${competitionLabel}!`,
        category: 'education',
        icon: '🏆',
      });
    }

    updatedDisciplines[act.disciplineId] = {
      ...prevDiscipline,
      totalYears: nextTotalDisciplineYears,
      highestRole: nextHighestRole,
      trophiesWon: nextTrophies,
    };

    return {
      ...act,
      yearsInClub: nextYearsInClub,
      role: nextRole,
      practicedThisYear: false,
    };
  });

  return {
    updatedActivities,
    updatedDisciplines,
    activityEvents,
    activityEffects,
  };
}

export interface EducationProgressionResult {
  education: EducationProfile;
  events: LifeEvent[];
  statEffects?: StatEffects;
}

/**
 * Advances a character's education state when aging up to `nextAge`.
 * Handles automatic enrollment at 5, transitions at 11 and 14, graduation at 18,
 * 4-year university progression, extracurriculars, and resets per-year actions.
 */
export function progressEducationForYear(
  character: CharacterProfile,
  nextAge: number
): EducationProgressionResult {
  const edu = character.education;
  const nextYear = character.birthYear + nextAge;
  const events: LifeEvent[] = [];
  const resetActions = createEmptyYearActions();

  if (edu.currentStage === 'dropped_out' || edu.currentStage === 'graduated') {
    return {
      education: { ...edu, yearActions: resetActions, activities: [] },
      events,
    };
  }

  // Process any active extracurriculars for the year that just finished
  const activityPass = processAnnualActivities(character, nextAge);
  events.push(...activityPass.activityEvents);
  let combinedEffects: StatEffects = { ...activityPass.activityEffects };

  // 1. Age 5: Enroll in Elementary School
  if (nextAge === SCHOOL_STAGE_CONFIG.elementary.startAge && edu.currentStage === 'none') {
    const config = SCHOOL_STAGE_CONFIG.elementary;
    const schoolName = generateSchoolName(character.city, 'elementary');
    const initialGrades = clamp(Math.round(character.stats.smarts * 0.65 + 25 + randomInt(-8, 8)));
    const initialPopularity = clamp(
      Math.round(((character.stats.looks + character.stats.happiness) / 2) * 0.6 + 20 + randomInt(-10, 10))
    );

    events.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Started Elementary School',
      message: `You started ${config.gradeLabelsByAge[nextAge]} at ${schoolName}! You packed your backpack and met your classmates.`,
      category: 'education',
      icon: config.icon,
    });

    return {
      education: {
        ...edu,
        currentStage: 'elementary',
        schoolName,
        stageStartAge: nextAge,
        yearInStage: 1,
        totalYearsInStage: config.totalYears,
        gradeLevelLabel: config.gradeLabelsByAge[nextAge],
        grades: initialGrades,
        popularity: initialPopularity,
        yearActions: resetActions,
        activities: [],
        disciplines: activityPass.updatedDisciplines,
      },
      events,
    };
  }

  // 2. Age 11: Complete Elementary School -> Enroll in Middle School
  if (nextAge === SCHOOL_STAGE_CONFIG.middle_school.startAge && edu.currentStage === 'elementary') {
    const prevConfig = SCHOOL_STAGE_CONFIG.elementary;
    const nextConfig = SCHOOL_STAGE_CONFIG.middle_school;
    const completedEntry: SchoolHistoryEntry = {
      id: createId(),
      stage: 'elementary',
      stageLabel: prevConfig.label,
      schoolName: edu.schoolName || `${character.city} Elementary`,
      startAge: edu.stageStartAge ?? prevConfig.startAge,
      endAge: nextAge - 1,
      finalGrades: edu.grades,
      status: 'graduated',
    };

    const newSchoolName = generateSchoolName(character.city, 'middle_school');
    const nextGrades = clamp(
      driftGrades(edu.grades, character.stats.smarts) + (combinedEffects.grades ?? 0)
    );
    const nextPopularity = clamp(
      driftPopularity(edu.popularity, character.stats.looks, character.stats.happiness) +
        (combinedEffects.popularity ?? 0)
    );

    events.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Started Middle School',
      message: `You finished ${completedEntry.schoolName} and enrolled in ${nextConfig.gradeLabelsByAge[nextAge]} at ${newSchoolName}. You can now try out for Middle School clubs and sports teams!`,
      category: 'education',
      icon: nextConfig.icon,
    });

    return {
      education: {
        ...edu,
        currentStage: 'middle_school',
        schoolName: newSchoolName,
        stageStartAge: nextAge,
        yearInStage: 1,
        totalYearsInStage: nextConfig.totalYears,
        gradeLevelLabel: nextConfig.gradeLabelsByAge[nextAge],
        grades: nextGrades,
        popularity: nextPopularity,
        diplomas: [...edu.diplomas, 'Elementary School'],
        history: [...edu.history, completedEntry],
        yearActions: resetActions,
        activities: [],
        disciplines: activityPass.updatedDisciplines,
      },
      events,
      statEffects: combinedEffects,
    };
  }

  // 3. Age 14: Complete Middle School -> Enroll in High School
  if (nextAge === SCHOOL_STAGE_CONFIG.high_school.startAge && edu.currentStage === 'middle_school') {
    const prevConfig = SCHOOL_STAGE_CONFIG.middle_school;
    const nextConfig = SCHOOL_STAGE_CONFIG.high_school;
    const completedEntry: SchoolHistoryEntry = {
      id: createId(),
      stage: 'middle_school',
      stageLabel: prevConfig.label,
      schoolName: edu.schoolName || `${character.city} Middle School`,
      startAge: edu.stageStartAge ?? prevConfig.startAge,
      endAge: nextAge - 1,
      finalGrades: edu.grades,
      status: 'graduated',
    };

    const newSchoolName = generateSchoolName(character.city, 'high_school');
    const nextGrades = clamp(
      driftGrades(edu.grades, character.stats.smarts) + (combinedEffects.grades ?? 0)
    );
    const nextPopularity = clamp(
      driftPopularity(edu.popularity, character.stats.looks, character.stats.happiness) +
        (combinedEffects.popularity ?? 0)
    );

    events.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'Started High School',
      message: `You graduated from ${completedEntry.schoolName} and began ${nextConfig.gradeLabelsByAge[nextAge]} at ${newSchoolName}! Varsity teams and high school societies are now open.`,
      category: 'education',
      icon: nextConfig.icon,
    });

    return {
      education: {
        ...edu,
        currentStage: 'high_school',
        schoolName: newSchoolName,
        stageStartAge: nextAge,
        yearInStage: 1,
        totalYearsInStage: nextConfig.totalYears,
        gradeLevelLabel: nextConfig.gradeLabelsByAge[nextAge],
        grades: nextGrades,
        popularity: nextPopularity,
        diplomas: [...edu.diplomas, 'Middle School'],
        history: [...edu.history, completedEntry],
        yearActions: resetActions,
        activities: [],
        disciplines: activityPass.updatedDisciplines,
      },
      events,
      statEffects: combinedEffects,
    };
  }

  // 4. Age 18: Graduate from High School
  if (nextAge === 18 && edu.currentStage === 'high_school') {
    const prevConfig = SCHOOL_STAGE_CONFIG.high_school;
    const finalGrades = clamp(
      driftGrades(edu.grades, character.stats.smarts) + (combinedEffects.grades ?? 0)
    );
    const gradeMeta = getLetterGradeMeta(finalGrades);
    const diplomaTitle =
      finalGrades >= 88 ? 'High School Diploma (Honors)' : 'High School Diploma';

    const completedEntry: SchoolHistoryEntry = {
      id: createId(),
      stage: 'high_school',
      stageLabel: prevConfig.label,
      schoolName: edu.schoolName || `${character.city} High School`,
      startAge: edu.stageStartAge ?? prevConfig.startAge,
      endAge: 18,
      finalGrades,
      status: 'graduated',
    };

    events.push({
      id: createId(),
      age: nextAge,
      year: nextYear,
      title: 'High School Graduation!',
      message: `You graduated from ${completedEntry.schoolName} with a ${gradeMeta.letter} average (${finalGrades}%) and earned your ${diplomaTitle}!`,
      category: 'education',
      icon: '🎓',
    });

    return {
      education: {
        ...edu,
        currentStage: 'graduated',
        schoolName: null,
        stageStartAge: null,
        yearInStage: 0,
        totalYearsInStage: 0,
        gradeLevelLabel: 'High School Graduate',
        grades: finalGrades,
        diplomas: [...edu.diplomas, diplomaTitle],
        history: [...edu.history, completedEntry],
        yearActions: resetActions,
        activities: [],
        disciplines: activityPass.updatedDisciplines,
      },
      events,
      statEffects: combinedEffects,
    };
  }

  // 5. University Progression (4-Year Undergraduate Degree)
  if (edu.currentStage === 'university' && edu.university) {
    const uni = edu.university;
    const nextGrades = clamp(
      driftGrades(edu.grades, character.stats.smarts) + (combinedEffects.grades ?? 0)
    );
    const nextPopularity = clamp(
      driftPopularity(edu.popularity, character.stats.looks, character.stats.happiness) +
        (combinedEffects.popularity ?? 0)
    );

    // Accrue annual tuition onto studentDebt if funded by student loans
    const addedDebt = uni.fundingType === 'student_loan' ? uni.tuitionPerYear : 0;
    const nextStudentDebt = edu.studentDebt + addedDebt;

    // Check if completing Senior Year (Year 4 of 4)
    if (uni.year >= uni.totalYears) {
      const gradeMeta = getLetterGradeMeta(nextGrades);
      const completedEntry: SchoolHistoryEntry = {
        id: createId(),
        stage: 'university',
        stageLabel: uni.degreeTitle,
        schoolName: uni.universityName,
        startAge: edu.stageStartAge ?? nextAge - 4,
        endAge: nextAge,
        finalGrades: nextGrades,
        status: 'graduated',
      };

      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: 'University Graduation!',
        message: `You graduated from ${uni.universityName} with a ${gradeMeta.letter} GPA (${nextGrades}%) and earned your ${uni.degreeTitle}!`,
        category: 'education',
        icon: '🎓',
      });

      combinedEffects = mergeStatEffects(combinedEffects, {
        smarts: 5,
        happiness: 8,
      });

      return {
        education: {
          ...edu,
          currentStage: 'graduated',
          schoolName: null,
          stageStartAge: null,
          yearInStage: 0,
          totalYearsInStage: 0,
          gradeLevelLabel: uni.degreeTitle,
          grades: nextGrades,
          popularity: nextPopularity,
          diplomas: [...edu.diplomas, uni.degreeTitle],
          history: [...edu.history, completedEntry],
          yearActions: resetActions,
          activities: [],
          disciplines: activityPass.updatedDisciplines,
          university: null,
          studentDebt: nextStudentDebt,
        },
        events,
        statEffects: combinedEffects,
      };
    }

    // Advancing to next undergraduate year (Year 2, 3, or 4)
    const nextUniYear = uni.year + 1;
    const yearLabel = UNIVERSITY_YEAR_LABELS[nextUniYear] || `Year ${nextUniYear}`;

    return {
      education: {
        ...edu,
        yearInStage: nextUniYear,
        totalYearsInStage: uni.totalYears,
        gradeLevelLabel: `${yearLabel} • ${uni.majorName}`,
        grades: nextGrades,
        popularity: nextPopularity,
        yearActions: resetActions,
        activities: activityPass.updatedActivities,
        disciplines: activityPass.updatedDisciplines,
        university: {
          ...uni,
          year: nextUniYear,
        },
        studentDebt: nextStudentDebt,
      },
      events,
      statEffects: combinedEffects,
    };
  }

  // 6. Professional & Graduate School Progression (Medical, Law, Flight, etc.)
  if (edu.currentStage === 'professional_school' && edu.professionalSchool) {
    const prof = edu.professionalSchool;
    const nextGrades = clamp(
      driftGrades(edu.grades, character.stats.smarts) + (combinedEffects.grades ?? 0)
    );
    const nextPopularity = clamp(
      driftPopularity(edu.popularity, character.stats.looks, character.stats.happiness) +
        (combinedEffects.popularity ?? 0)
    );

    const addedDebt = prof.fundingType === 'student_loan' ? prof.tuitionPerYear : 0;
    const nextStudentDebt = edu.studentDebt + addedDebt;

    // Check if completing final year
    if (prof.year >= prof.totalYears) {
      const gradeMeta = getLetterGradeMeta(nextGrades);
      const completedEntry: SchoolHistoryEntry = {
        id: createId(),
        stage: 'professional_school',
        stageLabel: prof.degreeAwarded,
        schoolName: prof.schoolName,
        startAge: edu.stageStartAge ?? nextAge - prof.totalYears,
        endAge: nextAge,
        finalGrades: nextGrades,
        status: 'graduated',
      };

      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: `${prof.programName} Graduation!`,
        message: `You successfully completed ${prof.schoolName} with a ${gradeMeta.letter} average (${nextGrades}%) and earned your ${prof.degreeAwarded}!`,
        category: 'education',
        icon: '🎓',
      });

      combinedEffects = mergeStatEffects(combinedEffects, {
        smarts: 6,
        happiness: 10,
      });

      return {
        education: {
          ...edu,
          currentStage: 'graduated',
          schoolName: null,
          stageStartAge: null,
          yearInStage: 0,
          totalYearsInStage: 0,
          gradeLevelLabel: prof.degreeAwarded,
          grades: nextGrades,
          popularity: nextPopularity,
          diplomas: [...edu.diplomas, prof.degreeAwarded],
          history: [...edu.history, completedEntry],
          yearActions: resetActions,
          activities: [],
          disciplines: activityPass.updatedDisciplines,
          professionalSchool: null,
          studentDebt: nextStudentDebt,
        },
        events,
        statEffects: combinedEffects,
      };
    }

    // Advancing to next professional year
    const nextProfYear = prof.year + 1;
    return {
      education: {
        ...edu,
        yearInStage: nextProfYear,
        totalYearsInStage: prof.totalYears,
        gradeLevelLabel: `Year ${nextProfYear} of ${prof.totalYears} • ${prof.programName}`,
        grades: nextGrades,
        popularity: nextPopularity,
        yearActions: resetActions,
        activities: activityPass.updatedActivities,
        disciplines: activityPass.updatedDisciplines,
        professionalSchool: {
          ...prof,
          year: nextProfYear,
        },
        studentDebt: nextStudentDebt,
      },
      events,
      statEffects: combinedEffects,
    };
  }

  // 7. Continuing within an active K-12 school stage
  if (
    edu.currentStage === 'elementary' ||
    edu.currentStage === 'middle_school' ||
    edu.currentStage === 'high_school'
  ) {
    const stageKey: ActiveSchoolStage = edu.currentStage;
    const config = SCHOOL_STAGE_CONFIG[stageKey];
    const yearInStage = nextAge - config.startAge + 1;
    const gradeLevelLabel = config.gradeLabelsByAge[nextAge] || edu.gradeLevelLabel;
    const nextGrades = clamp(
      driftGrades(edu.grades, character.stats.smarts) + (combinedEffects.grades ?? 0)
    );
    const nextPopularity = clamp(
      driftPopularity(edu.popularity, character.stats.looks, character.stats.happiness) +
        (combinedEffects.popularity ?? 0)
    );

    if (nextGrades < 50 && !edu.yearActions.studiedHard) {
      events.push({
        id: createId(),
        age: nextAge,
        year: nextYear,
        title: 'Academic Probation Warning',
        message: `Your report card came back with failing grades (${nextGrades}%). Your parents grounded you for two weeks and lectured you about taking school seriously!`,
        category: 'education',
        icon: '⚠️',
      });
      combinedEffects = mergeStatEffects(combinedEffects, { happiness: -6, parents: -5 });
    }

    return {
      education: {
        ...edu,
        yearInStage,
        totalYearsInStage: config.totalYears,
        gradeLevelLabel,
        grades: nextGrades,
        popularity: nextPopularity,
        yearActions: resetActions,
        activities: activityPass.updatedActivities,
        disciplines: activityPass.updatedDisciplines,
      },
      events,
      statEffects: combinedEffects,
    };
  }

  return {
    education: {
      ...edu,
      yearActions: resetActions,
      activities: activityPass.updatedActivities,
      disciplines: activityPass.updatedDisciplines,
    },
    events,
    statEffects: combinedEffects,
  };
}

/**
 * Returns a modal notification payload if the character just hit a major school transition
 * (Elementary at 5, Middle at 11, High School at 14, High School Graduation at 18, or University Graduation).
 */
export function getSchoolMilestoneNotice(
  character: CharacterProfile
): SchoolMilestoneNotice | null {
  const { age, education: edu } = character;

  if (age === SCHOOL_STAGE_CONFIG.elementary.startAge && edu.currentStage === 'elementary') {
    const schoolName = edu.schoolName || `${character.city} Elementary School`;
    const gradeLevel = edu.gradeLevelLabel || 'Kindergarten';
    return {
      milestoneType: 'elementary',
      title: 'Enrolled in Elementary School!',
      subtitle: `Age ${age} • Elementary School (Ages 5–10)`,
      schoolName,
      gradeLevel,
      description: `You packed your backpack and officially started ${gradeLevel} at ${schoolName}! You can track your grades and join school clubs anytime in the School tab.`,
      icon: SCHOOL_STAGE_CONFIG.elementary.icon,
      grades: edu.grades,
      popularity: edu.popularity,
    };
  }

  if (age === SCHOOL_STAGE_CONFIG.middle_school.startAge && edu.currentStage === 'middle_school') {
    const schoolName = edu.schoolName || `${character.city} Middle School`;
    const gradeLevel = edu.gradeLevelLabel || '6th Grade';
    return {
      milestoneType: 'middle_school',
      title: 'Started Middle School!',
      subtitle: `Age ${age} • Middle School (Ages 11–13)`,
      schoolName,
      gradeLevel,
      description: `You completed Elementary School and moved up to ${gradeLevel} at ${schoolName}! Don't forget to rejoin your favorite clubs or try out for middle school sports teams.`,
      icon: SCHOOL_STAGE_CONFIG.middle_school.icon,
      grades: edu.grades,
      popularity: edu.popularity,
    };
  }

  if (age === SCHOOL_STAGE_CONFIG.high_school.startAge && edu.currentStage === 'high_school') {
    const schoolName = edu.schoolName || `${character.city} High School`;
    const gradeLevel = edu.gradeLevelLabel || '9th Grade (Freshman)';
    return {
      milestoneType: 'high_school',
      title: 'Started High School!',
      subtitle: `Age ${age} • High School (Ages 14–17)`,
      schoolName,
      gradeLevel,
      description: `You graduated from Middle School and began ${gradeLevel} at ${schoolName}! Varsity sports and high school societies are now open for tryouts.`,
      icon: SCHOOL_STAGE_CONFIG.high_school.icon,
      grades: edu.grades,
      popularity: edu.popularity,
    };
  }

  // Check if just graduated from University this year
  const lastHistoryItem = edu.history[edu.history.length - 1];
  if (
    edu.currentStage === 'graduated' &&
    lastHistoryItem &&
    lastHistoryItem.stage === 'professional_school' &&
    lastHistoryItem.endAge === age &&
    lastHistoryItem.status === 'graduated'
  ) {
    return {
      milestoneType: 'professional_graduation',
      title: 'Professional Graduation!',
      subtitle: `Class of ${character.birthYear + age} • Age ${age}`,
      schoolName: lastHistoryItem.schoolName,
      gradeLevel: lastHistoryItem.stageLabel,
      description: `Congratulations! You completed your specialized training at ${lastHistoryItem.schoolName} and earned your ${lastHistoryItem.stageLabel}!`,
      icon: '🎓',
      grades: edu.grades,
      popularity: edu.popularity,
      isGraduation: true,
      diplomaEarned: lastHistoryItem.stageLabel,
    };
  }

  if (
    edu.currentStage === 'graduated' &&
    lastHistoryItem &&
    lastHistoryItem.stage === 'university' &&
    lastHistoryItem.endAge === age &&
    lastHistoryItem.status === 'graduated'
  ) {
    return {
      milestoneType: 'university_graduation',
      title: 'University Graduation!',
      subtitle: `Class of ${character.birthYear + age} • Age ${age}`,
      schoolName: lastHistoryItem.schoolName,
      gradeLevel: lastHistoryItem.stageLabel,
      description: `Congratulations! You walked across the stage and graduated from ${lastHistoryItem.schoolName} with your ${lastHistoryItem.stageLabel}!`,
      icon: '🎓',
      grades: edu.grades,
      popularity: edu.popularity,
      isGraduation: true,
      diplomaEarned: lastHistoryItem.stageLabel,
    };
  }

  if (age === 18 && edu.currentStage === 'graduated') {
    const lastHighSchool =
      [...edu.history].reverse().find((h) => h.stage === 'high_school')?.schoolName ||
      `${character.city} High School`;
    const diploma = edu.diplomas[edu.diplomas.length - 1] || 'High School Diploma';
    return {
      milestoneType: 'high_school_graduation',
      title: 'High School Graduation!',
      subtitle: `Class of ${character.birthYear + age} • Age ${age}`,
      schoolName: lastHighSchool,
      gradeLevel: 'High School Graduate',
      description: `Congratulations! You tossed your cap in the air and graduated from ${lastHighSchool}! Would you like to apply for university now or take some time to explore?`,
      icon: '🎓',
      grades: edu.grades,
      popularity: edu.popularity,
      isGraduation: true,
      diplomaEarned: diploma,
    };
  }

  return null;
}

// ============================================================================
// MODULE 3.2: STUDENT ACTIONS ENGINE
// ============================================================================

export interface StudentActionResult {
  character: CharacterProfile;
  outcome: ActionOutcomeNotice;
}

/**
 * 1. Study Harder: Boosts Grades (+6% to +12%) and Smarts (+1 to +3),
 * with slight study stress (-3 to -5 Happiness). 1x per year.
 */
export function performStudyHarder(character: CharacterProfile): StudentActionResult {
  const { education: edu, age, birthYear } = character;

  const rawEffects: StatEffects = {
    grades: randomInt(6, 12),
    smarts: randomInt(1, 3),
    happiness: -randomInt(3, 5),
  };

  const narratives: Record<ActiveSchoolStage | 'university', string[]> = {
    elementary: [
      'You spent extra afternoon hours practicing spelling words and reading storybooks. Your teacher put a gold star on your notebook!',
      'You double-checked all your math worksheets and finished your reading log ahead of everyone else in class.',
    ],
    middle_school: [
      'You stayed focused after school, organized your study flashcards, and finished your science project early.',
      'You reviewed your textbook chapters twice and aced your weekly pop quizzes!',
    ],
    high_school: [
      'You locked yourself in your room with highlighters and past exam papers, cramming late into the evening.',
      'You spent hours in the school library reviewing lecture notes and preparing for upcoming midterms.',
    ],
    university: [
      'You camped out in the university library with espresso and lecture slides, mastering every topic before finals week!',
      'You attended professor office hours, completed extra lab assignments, and aced your midterms!',
    ],
  };

  const stageKey: ActiveSchoolStage | 'university' =
    edu.currentStage === 'elementary' ||
    edu.currentStage === 'middle_school' ||
    edu.currentStage === 'high_school' ||
    edu.currentStage === 'university'
      ? edu.currentStage
      : 'elementary';

  const message = pickRandom(narratives[stageKey]);

  const { character: updated, applied } = applyEffects(character, rawEffects);

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: 'Studied Harder',
    message,
    category: 'education',
    icon: '📖',
  };

  return {
    character: {
      ...updated,
      education: {
        ...updated.education,
        yearActions: {
          ...updated.education.yearActions,
          studiedHard: true,
        },
      },
      timeline: [...updated.timeline, journalEvent],
    },
    outcome: {
      title: 'Studied Harder!',
      subtitle: `${edu.schoolName || 'School'} • ${edu.gradeLevelLabel || ''}`,
      message,
      icon: '📖',
      appliedEffects: applied,
    },
  };
}

/**
 * 2. Slack Off / Cut Class (or Campus Party in University):
 * Drops Grades (-8% to -14%), boosts Happiness (+4 to +8) and Popularity (+2% to +5%).
 */
export function performSlackOff(character: CharacterProfile): StudentActionResult {
  const { education: edu, age, birthYear } = character;
  const isUniversity = edu.currentStage === 'university';
  const caughtByTeacher = !isUniversity && chance(0.35);

  const rawEffects: StatEffects = {
    grades: -randomInt(8, 14),
    happiness: caughtByTeacher ? randomInt(1, 3) : randomInt(4, 8),
    popularity: randomInt(2, 5),
    ...(caughtByTeacher ? { parents: -randomInt(4, 7) } : {}),
  };

  const message = isUniversity
    ? `You skipped morning lectures to hang out on the campus quad and party with classmates late into the night. Your GPA took a hit, but you had an unforgettable time!`
    : caughtByTeacher
    ? `You doodled in your notebook, passed notes to classmates, and blew off your homework. Unfortunately, your teacher caught you slacking and called your parents!`
    : `You kicked back, ignored your homework assignments, and goofed around with classmates all week. Your grades slipped, but you had a blast!`;

  const { character: updated, applied } = applyEffects(character, rawEffects);

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: isUniversity
      ? 'Skipped Lectures & Partied'
      : caughtByTeacher
      ? 'Caught Slacking Off!'
      : 'Slacked Off in Class',
    message,
    category: 'education',
    icon: isUniversity ? '🎉' : caughtByTeacher ? '🚨' : '😴',
  };

  return {
    character: {
      ...updated,
      education: {
        ...updated.education,
        yearActions: {
          ...updated.education.yearActions,
          slackedOff: true,
        },
      },
      timeline: [...updated.timeline, journalEvent],
    },
    outcome: {
      title: isUniversity
        ? 'Campus Party & Skipped Lectures!'
        : caughtByTeacher
        ? 'Caught Slacking Off!'
        : 'Slacked Off!',
      subtitle: caughtByTeacher
        ? 'Teacher Called Home • Detention Warning'
        : `${edu.schoolName || 'Campus'} • Social Vibes`,
      message,
      icon: isUniversity ? '🎉' : caughtByTeacher ? '🚨' : '😴',
      appliedEffects: applied,
    },
  };
}

/**
 * 3. Ask Parents for a Private Tutor:
 * Respects the $0 under-18 rule — parents evaluate the request based on their
 * family wealth tier and their relationship with the player.
 */
export function performAskForTutor(character: CharacterProfile): StudentActionResult {
  const { parents, age, birthYear, city } = character;

  const baseChanceByWealth: Record<typeof parents.wealth, number> = {
    wealthy: 0.9,
    comfortable: 0.75,
    modest: 0.45,
    struggling: 0.15,
  };

  const avgRelationship =
    (parents.father.relationship + parents.mother.relationship) / 2;
  const relBonus =
    avgRelationship >= 80 ? 0.15 : avgRelationship < 40 ? -0.2 : 0;

  const approvalChance = Math.min(
    0.96,
    Math.max(0.05, baseChanceByWealth[parents.wealth] + relBonus)
  );
  const isApproved = chance(approvalChance);

  if (isApproved) {
    const rawEffects: StatEffects = {
      grades: randomInt(12, 18),
      smarts: randomInt(2, 4),
      parents: 3,
      happiness: 2,
    };

    const approvalMessages: Record<typeof parents.wealth, string> = {
      wealthy: `Your parents gladly hired one of ${city}'s top private tutors! "Only the finest education for our child," they beamed.`,
      comfortable: `Your parents agreed right away and paid for a private tutor to work with you twice a week after school.`,
      modest: `Your parents reworked the monthly family budget to pay for a weekend tutor: "We're proud of you for caring about your grades!"`,
      struggling: `Money is very tight at home, but your parents pooled their savings to pay for tutoring: "Your future comes first, sweetheart."`,
    };

    const message = approvalMessages[parents.wealth];
    const { character: updated, applied } = applyEffects(character, rawEffects);

    const journalEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: 'Parents Paid for a Private Tutor',
      message,
      category: 'education',
      icon: '👨‍🏫',
    };

    return {
      character: {
        ...updated,
        education: {
          ...updated.education,
          yearActions: {
            ...updated.education.yearActions,
            askedForTutor: true,
          },
        },
        timeline: [...updated.timeline, journalEvent],
      },
      outcome: {
        title: 'Tutor Approved!',
        subtitle: `Paid by ${parents.father.firstName} & ${parents.mother.firstName} (${parents.wealth} family)`,
        message,
        icon: '👨‍🏫',
        appliedEffects: applied,
      },
    };
  }

  // Denied
  const rawEffects: StatEffects = {
    happiness: -4,
    parents: -2,
  };

  const denialMessage =
    parents.wealth === 'struggling' || parents.wealth === 'modest'
      ? `Your parents sighed softly: "We wish we could afford a private tutor right now, honey, but bills are too tight this year. Do your best with your school books."`
      : avgRelationship < 45
      ? `Your parents crossed their arms: "We aren't spending money on a tutor when you barely listen to us at home. Open your textbook and study yourself!"`
      : `Your parents shook their heads: "You don't need an expensive private tutor—just pay closer attention in class and ask your teacher for help!"`;

  const { character: updated, applied } = applyEffects(character, rawEffects);

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: 'Tutor Request Refused',
    message: denialMessage,
    category: 'education',
    icon: '🙅',
  };

  return {
    character: {
      ...updated,
      education: {
        ...updated.education,
        yearActions: {
          ...updated.education.yearActions,
          askedForTutor: true,
        },
      },
      timeline: [...updated.timeline, journalEvent],
    },
    outcome: {
      title: 'Parents Refused Tutor',
      subtitle: `${parents.father.firstName} & ${parents.mother.firstName} said no`,
      message: denialMessage,
      icon: '🙅',
      appliedEffects: applied,
    },
  };
}

/**
 * 4. Drop Out of High School (Age 16+) or University:
 * If in High School: sets status to 'dropped_out', occupation 'High School Dropout'.
 * If in University: leaves university early while preserving High School Diploma.
 */
export function performDropOut(character: CharacterProfile): StudentActionResult {
  const { education: edu, age, birthYear, city } = character;
  const isUniversity = edu.currentStage === 'university';
  const schoolName =
    edu.schoolName ||
    edu.university?.universityName ||
    `${city} ${isUniversity ? 'University' : 'High School'}`;

  const rawEffects: StatEffects = {
    parents: isUniversity ? -randomInt(12, 22) : -randomInt(28, 40),
    happiness: -randomInt(4, 10),
  };

  const { character: updated, applied } = applyEffects(character, rawEffects);

  if (isUniversity) {
    const uniDropoutEntry: SchoolHistoryEntry = {
      id: createId(),
      stage: 'university',
      stageLabel: edu.university?.degreeTitle || 'University',
      schoolName,
      startAge: edu.stageStartAge ?? age,
      endAge: age,
      finalGrades: edu.grades,
      status: 'dropped_out',
    };

    const message = `You withdrew from ${schoolName} at age ${age} before completing your degree.`;
    const journalEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: 'Dropped Out of University',
      message,
      category: 'education',
      icon: '🚪',
    };

    return {
      character: {
        ...updated,
        occupation: 'Unemployed',
        education: {
          ...updated.education,
          currentStage: 'graduated',
          schoolName: null,
          stageStartAge: null,
          yearInStage: 0,
          totalYearsInStage: 0,
          gradeLevelLabel: 'High School Graduate',
          activities: [],
          university: null,
          history: [...updated.education.history, uniDropoutEntry],
        },
        timeline: [...updated.timeline, journalEvent],
      },
      outcome: {
        title: 'Left University',
        subtitle: `Withdrew from ${schoolName} at Age ${age}`,
        message,
        icon: '🚪',
        appliedEffects: applied,
      },
    };
  }

  const dropoutHistoryEntry: SchoolHistoryEntry = {
    id: createId(),
    stage: 'high_school',
    stageLabel: SCHOOL_STAGE_CONFIG.high_school.label,
    schoolName,
    startAge: edu.stageStartAge ?? SCHOOL_STAGE_CONFIG.high_school.startAge,
    endAge: age,
    finalGrades: edu.grades,
    status: 'dropped_out',
  };

  const message = `You packed up your locker and officially dropped out of ${schoolName} at age ${age}. Your parents were heartbroken and furious when they got the call from the principal's office.`;

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: 'Dropped Out of High School',
    message,
    category: 'education',
    icon: '🚪',
  };

  return {
    character: {
      ...updated,
      occupation: 'High School Dropout',
      education: {
        ...updated.education,
        currentStage: 'dropped_out',
        schoolName: null,
        stageStartAge: null,
        yearInStage: 0,
        totalYearsInStage: 0,
        gradeLevelLabel: 'High School Dropout',
        activities: [],
        history: [...updated.education.history, dropoutHistoryEntry],
      },
      timeline: [...updated.timeline, journalEvent],
    },
    outcome: {
      title: 'Dropped Out of School',
      subtitle: `Left ${schoolName} at Age ${age}`,
      message,
      icon: '🚪',
      appliedEffects: applied,
    },
  };
}

// ============================================================================
// MODULE 3.3: EXTRACURRICULARS & DISCIPLINE PIPELINE ENGINE
// ============================================================================

export function joinOrTryoutActivity(
  character: CharacterProfile,
  templateId: string
): StudentActionResult {
  const { education: edu, age, birthYear, parents } = character;
  const template = getActivityTemplateById(templateId);

  if (!template || edu.activities.length >= MAX_CONCURRENT_ACTIVITIES) {
    return {
      character,
      outcome: {
        title: 'Schedule Full',
        message: `You can only participate in up to ${MAX_CONCURRENT_ACTIVITIES} extracurricular activities at the same time.`,
        icon: '📅',
        appliedEffects: {},
      },
    };
  }

  const disciplineRec = edu.disciplines[template.disciplineId];
  const priorYears = disciplineRec?.totalYears ?? 0;
  const hadPriorLeadership =
    disciplineRec && disciplineRec.highestRole !== 'member';

  let passedTryout = true;
  if (template.requiresTryout && template.requiredStat && template.minStatValue) {
    const playerStat = character.stats[template.requiredStat];
    const scoutingBonus = priorYears > 0 ? 18 + Math.min(12, priorYears * 3) : 0;
    const leadershipBonus = hadPriorLeadership ? 8 : 0;
    const effectiveScore = playerStat + scoutingBonus + leadershipBonus + randomInt(-5, 8);
    passedTryout = effectiveScore >= template.minStatValue;
  }

  if (!passedTryout) {
    const rawEffects: StatEffects = { happiness: -4 };
    const { character: updated, applied } = applyEffects(character, rawEffects);

    const failMsg = `You tried out for ${template.name}, but didn't quite make the final roster this time. Raise your ${template.requiredStat?.toUpperCase()} or prior experience and try again!`;

    const journalEvent: LifeEvent = {
      id: createId(),
      age,
      year: birthYear + age,
      title: `Cut from ${template.name} Tryouts`,
      message: failMsg,
      category: 'education',
      icon: template.icon,
    };

    return {
      character: {
        ...updated,
        timeline: [...updated.timeline, journalEvent],
      },
      outcome: {
        title: "Didn't Make the Cut",
        subtitle: `${template.name} Tryouts`,
        message: failMsg,
        icon: '📋',
        appliedEffects: applied,
      },
    };
  }

  const rawEffects: StatEffects = {
    happiness: 4,
    popularity: template.requiresTryout ? 4 : 2,
  };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  const newActivity: ActiveExtracurricular = {
    activityId: template.id,
    disciplineId: template.disciplineId,
    name: template.name,
    category: template.category,
    icon: template.icon,
    joinedAge: age,
    yearsInClub: 1,
    role: 'member',
    leaderTitle: template.leaderTitle,
    practicedThisYear: false,
  };

  const scoutingNote =
    priorYears > 0
      ? ` The coach immediately recognized your ${priorYears} ${priorYears === 1 ? 'year' : 'years'} of prior ${disciplineRec.label} experience!`
      : '';

  const gearNote =
    template.category === 'athletics'
      ? parents.wealth === 'wealthy' || parents.wealth === 'comfortable'
        ? ' Your parents bought you brand-new equipment for the season.'
        : ' The school athletic department provided you with team gear for the season.'
      : '';

  const joinMsg = template.requiresTryout
    ? `You crushed the tryouts and made the roster for ${template.name}!${scoutingNote}${gearNote}`
    : `You officially signed up and joined ${template.name}!${scoutingNote}`;

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Joined ${template.name}`,
    message: joinMsg,
    category: 'education',
    icon: template.icon,
  };

  return {
    character: {
      ...updated,
      education: {
        ...updated.education,
        activities: [...updated.education.activities, newActivity],
      },
      timeline: [...updated.timeline, journalEvent],
    },
    outcome: {
      title: template.requiresTryout ? 'Made the Roster!' : 'Club Joined!',
      subtitle:
        priorYears > 0
          ? `${template.name} • Scouting Bonus Applied (${priorYears} yrs exp)`
          : `${template.name} • ${edu.schoolName || 'School'}`,
      message: joinMsg,
      icon: template.icon,
      appliedEffects: applied,
    },
  };
}

export function practiceActivity(
  character: CharacterProfile,
  activityId: string
): StudentActionResult {
  const { education: edu, age, birthYear } = character;
  const act = edu.activities.find((a) => a.activityId === activityId);
  const template = getActivityTemplateById(activityId);

  if (!act || !template || act.practicedThisYear) {
    return {
      character,
      outcome: {
        title: 'Already Practiced',
        message: 'You have already completed extra practice for this activity this year.',
        icon: '⏳',
        appliedEffects: {},
      },
    };
  }

  const disciplineRec = edu.disciplines[act.disciplineId];
  const totalTrackYears = (disciplineRec?.totalYears ?? 0) + act.yearsInClub;

  const promotedDuringPractice =
    act.role === 'member' &&
    (act.yearsInClub >= 2 || totalTrackYears >= 2) &&
    chance(0.28);

  const rawEffects: StatEffects = mergeStatEffects(
    template.practiceEffects,
    promotedDuringPractice ? { popularity: 5, happiness: 4 } : {}
  );

  const { character: updated, applied } = applyEffects(character, rawEffects);

  const updatedActivities = updated.education.activities.map((item) =>
    item.activityId === activityId
      ? {
          ...item,
          practicedThisYear: true,
          role: promotedDuringPractice ? template.leaderRole : item.role,
        }
      : item
  );

  const updatedDisciplines = { ...updated.education.disciplines };
  if (promotedDuringPractice && updatedDisciplines[act.disciplineId]) {
    updatedDisciplines[act.disciplineId] = {
      ...updatedDisciplines[act.disciplineId],
      highestRole: template.leaderRole,
    };
  }

  const message = promotedDuringPractice
    ? `You put in extra hours at ${act.name} practice. Everyone was so impressed by your leadership and work ethic that you were named ${template.leaderTitle}!`
    : act.category === 'athletics'
    ? `You stayed late after school running drills and conditioning with ${act.name}. Your skills and stamina improved!`
    : act.category === 'academics'
    ? `You spent extra afternoon sessions preparing and sharpening your skills with ${act.name}.`
    : `You rehearsed your routines and polished your craft with ${act.name}.`;

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: promotedDuringPractice
      ? `Promoted to ${template.leaderTitle} (${act.name})!`
      : `Practiced with ${act.name}`,
    message,
    category: 'education',
    icon: promotedDuringPractice ? '🏅' : act.icon,
  };

  return {
    character: {
      ...updated,
      education: {
        ...updated.education,
        activities: updatedActivities,
        disciplines: updatedDisciplines,
      },
      timeline: [...updated.timeline, journalEvent],
    },
    outcome: {
      title: promotedDuringPractice
        ? `Promoted to ${template.leaderTitle}!`
        : `${act.name} Practice`,
      subtitle: `${edu.schoolName || 'School'} • Track Experience: ${totalTrackYears} yrs`,
      message,
      icon: promotedDuringPractice ? '🏅' : act.icon,
      appliedEffects: applied,
    },
  };
}

export function quitActivity(
  character: CharacterProfile,
  activityId: string
): StudentActionResult {
  const { education: edu, age, birthYear } = character;
  const act = edu.activities.find((a) => a.activityId === activityId);

  if (!act) {
    return {
      character,
      outcome: {
        title: 'Not Enrolled',
        message: 'You are not currently in that activity.',
        icon: 'ℹ️',
        appliedEffects: {},
      },
    };
  }

  const message = `You decided to step away and quit ${act.name}.`;
  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Left ${act.name}`,
    message,
    category: 'education',
    icon: act.icon,
  };

  return {
    character: {
      ...character,
      education: {
        ...edu,
        activities: edu.activities.filter((a) => a.activityId !== activityId),
      },
      timeline: [...character.timeline, journalEvent],
    },
    outcome: {
      title: `Left ${act.name}`,
      subtitle: 'Schedule Slot Freed',
      message,
      icon: act.icon,
      appliedEffects: {},
    },
  };
}

// ============================================================================
// MODULE 3.4: UNIVERSITY ADMISSIONS, SCHOLARSHIPS & TUITION ENGINE
// ============================================================================

export interface MajorEligibilityCheck {
  isAdmissible: boolean;
  hasDisciplineBonus: boolean;
  disciplineYears: number;
  qualifiesMeritScholarship: boolean;
  qualifiesAthleticScholarship: boolean;
  alreadyEarned?: boolean;
  reasonIfIneligible?: string;
}

/**
 * Evaluates whether the character meets admissions requirements for a University Major,
 * and whether they qualify for a Full Academic Merit or Full Athletic Scholarship.
 */
export function evaluateMajorEligibility(
  character: CharacterProfile,
  major: UniversityMajor
): MajorEligibilityCheck {
  const { education: edu, stats } = character;
  const hasHSDiploma = (edu.diplomas || []).some((d) =>
    d.toLowerCase().includes('high school diploma')
  );
  const alreadyEarned = (edu.diplomas || []).includes(major.degreeTitle);

  const discYears = major.disciplineId
    ? edu.disciplines[major.disciplineId]?.totalYears ?? 0
    : 0;
  const hasDisciplineBonus = discYears >= 2;
  const bonus = hasDisciplineBonus ? 10 : 0;

  const effectiveGrades = edu.grades + bonus;
  const effectiveSmarts = stats.smarts + bonus;
  const meetsGrades = effectiveGrades >= major.minGrades;
  const meetsSmarts = effectiveSmarts >= major.minSmarts;
  const meetsHealth = !major.minHealth || stats.health + bonus >= major.minHealth;

  const isAdmissible =
    hasHSDiploma && !alreadyEarned && meetsGrades && meetsSmarts && meetsHealth;

  let reasonIfIneligible: string | undefined;
  if (alreadyEarned) {
    reasonIfIneligible = 'Degree Already Earned';
  } else if (!hasHSDiploma) {
    reasonIfIneligible = 'Requires High School Diploma';
  } else if (!meetsGrades) {
    reasonIfIneligible = `Requires ${major.minGrades}% Grades`;
  } else if (!meetsSmarts) {
    reasonIfIneligible = `Requires ${major.minSmarts} Smarts`;
  } else if (!meetsHealth) {
    reasonIfIneligible = `Requires ${major.minHealth} Health`;
  }

  const qualifiesMeritScholarship =
    isAdmissible && edu.grades >= 88 && stats.smarts >= 74;

  const soccerRec = edu.disciplines.soccer;
  const bballRec = edu.disciplines.basketball;
  const qualifiesAthleticScholarship =
    isAdmissible &&
    stats.health >= 65 &&
    ((soccerRec && (soccerRec.highestRole === 'captain' || soccerRec.totalYears >= 4)) ||
      (bballRec && (bballRec.highestRole === 'captain' || bballRec.totalYears >= 4)));

  return {
    isAdmissible,
    hasDisciplineBonus,
    disciplineYears: discYears,
    qualifiesMeritScholarship,
    qualifiesAthleticScholarship,
    alreadyEarned,
    reasonIfIneligible,
  };
}

export interface UniversityEnrollmentResult {
  character: CharacterProfile;
  outcome: ActionOutcomeNotice;
  enrolled: boolean;
}

/**
 * Enrolls the character in a 4-year undergraduate degree program with the chosen
 * funding method ('scholarship', 'parents', or 'student_loan').
 */
export function enrollInUniversity(
  character: CharacterProfile,
  majorId: string,
  fundingMethod: 'scholarship' | 'parents' | 'student_loan'
): UniversityEnrollmentResult {
  const major = getUniversityMajorById(majorId);
  if (!major) {
    return {
      character,
      enrolled: false,
      outcome: {
        title: 'Major Not Found',
        message: 'Please select a valid university major.',
        icon: '⚠️',
        appliedEffects: {},
      },
    };
  }

  const eligibility = evaluateMajorEligibility(character, major);
  if (!eligibility.isAdmissible) {
    return {
      character,
      enrolled: false,
      outcome: {
        title: 'Application Rejected',
        subtitle: major.name,
        message: `The admissions board declined your application for ${major.degreeTitle} (${eligibility.reasonIfIneligible}).`,
        icon: '📩',
        appliedEffects: {},
      },
    };
  }

  const { parents, city, age, birthYear } = character;
  let resolvedFunding: TuitionFunding = 'student_loan';

  // 1. Scholarship Check
  if (fundingMethod === 'scholarship') {
    if (eligibility.qualifiesMeritScholarship) {
      resolvedFunding = 'scholarship_merit';
    } else if (eligibility.qualifiesAthleticScholarship) {
      resolvedFunding = 'scholarship_athletic';
    } else {
      return {
        character,
        enrolled: false,
        outcome: {
          title: 'Scholarship Denied',
          subtitle: major.name,
          message: `The scholarship committee reviewed your file, but your high school grades (${character.education.grades}%) and athletic record didn't qualify for a full-ride scholarship. Try asking your parents or applying with a Student Loan!`,
          icon: '📋',
          appliedEffects: {},
        },
      };
    }
  }

  // 2. Ask Parents to Pay Check
  if (fundingMethod === 'parents') {
    const wealthChance: Record<typeof parents.wealth, number> = {
      wealthy: 0.95,
      comfortable: 0.78,
      modest: 0.32,
      struggling: 0.08,
    };
    const avgRel = (parents.father.relationship + parents.mother.relationship) / 2;
    const relMod = avgRel >= 80 ? 0.12 : avgRel < 45 ? -0.25 : 0;
    const approved = chance(Math.min(0.98, Math.max(0.04, wealthChance[parents.wealth] + relMod)));

    if (!approved) {
      const refusalMsg =
        parents.wealth === 'struggling' || parents.wealth === 'modest'
          ? `Your parents hugged you apologetically: "We're so proud you got accepted into ${major.name}, sweetheart, but we simply don't have $${(major.tuitionPerYear * 4).toLocaleString()} for college tuition. You'll need to apply for a Student Loan."`
          : `Your parents shook their heads: "You're an adult now! If you want to go to university, take out a Student Loan and pay your own way."`;

      return {
        character,
        enrolled: false,
        outcome: {
          title: 'Parents Declined Tuition',
          subtitle: `${parents.father.firstName} & ${parents.mother.firstName}`,
          message: refusalMsg,
          icon: '🙅',
          appliedEffects: {},
        },
      };
    }

    resolvedFunding = 'parents';
  }

  // 3. Successfully Enrolled in University!
  const universityName = generateUniversityName(city);
  const fundingMeta = getTuitionFundingMeta(resolvedFunding);
  const initialYearDebt = resolvedFunding === 'student_loan' ? major.tuitionPerYear : 0;

  const universityProfile: UniversityProfile = {
    universityName,
    majorId: major.id,
    majorName: major.name,
    degreeTitle: major.degreeTitle,
    year: 1,
    totalYears: UNIVERSITY_TOTAL_YEARS,
    fundingType: resolvedFunding,
    tuitionPerYear: major.tuitionPerYear,
  };

  const rawEffects: StatEffects = {
    happiness: 6,
    smarts: 2,
    ...(resolvedFunding === 'parents' ? { parents: 5 } : {}),
  };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  const fundingNarrative =
    resolvedFunding === 'scholarship_merit'
      ? `You were awarded a 100% Full Academic Merit Scholarship!`
      : resolvedFunding === 'scholarship_athletic'
      ? `You were signed on a 100% Full Athletic Division Scholarship!`
      : resolvedFunding === 'parents'
      ? `Your parents proudly agreed to cover your entire $${(major.tuitionPerYear * 4).toLocaleString()} university tuition!`
      : `You financed your studies with a deferred government student loan ($${major.tuitionPerYear.toLocaleString()}/yr).`;

  const message = `You enrolled at ${universityName} to pursue a ${major.degreeTitle}! ${fundingNarrative}`;

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Enrolled at ${universityName}`,
    message,
    category: 'education',
    icon: '🎓',
  };

  return {
    enrolled: true,
    character: {
      ...updated,
      occupation: 'University Student',
      education: {
        ...updated.education,
        currentStage: 'university',
        schoolName: universityName,
        stageStartAge: age,
        yearInStage: 1,
        totalYearsInStage: UNIVERSITY_TOTAL_YEARS,
        gradeLevelLabel: `${UNIVERSITY_YEAR_LABELS[1]} • ${major.name}`,
        yearActions: createEmptyYearActions(),
        activities: [],
        university: universityProfile,
        studentDebt: updated.education.studentDebt + initialYearDebt,
      },
      timeline: [...updated.timeline, journalEvent],
    },
    outcome: {
      title: 'Accepted to University!',
      subtitle: `${universityName} • ${fundingMeta.label}`,
      message,
      icon: major.icon,
      appliedEffects: applied,
    },
  };
}

// ============================================================================
// MODULE 3.5: PROFESSIONAL & GRADUATE SCHOOLS ENGINE
// ============================================================================

export interface ProfessionalSchoolEligibility {
  isAdmissible: boolean;
  hasRequiredDegree: boolean;
  missingDegreeName?: string;
  qualifiesMeritScholarship: boolean;
  alreadyEarned?: boolean;
  reasonIfIneligible?: string;
}

/**
 * Evaluates whether the character meets admissions requirements for a Professional School
 * (Medical, Law, Flight, Dental, Veterinary, Nursing, Graduate, Fine Arts).
 * Enforces strict undergraduate degree prerequisites!
 */
export function evaluateProfessionalSchoolEligibility(
  character: CharacterProfile,
  school: ProfessionalSchoolTemplate
): ProfessionalSchoolEligibility {
  const { education: edu, stats } = character;

  const alreadyEarned = (edu.diplomas || []).includes(school.degreeAwarded);

  let hasRequiredDegree = true;
  let missingDegreeName: string | undefined;

  if (school.requiredDegreeTitles.length > 0) {
    hasRequiredDegree = school.requiredDegreeTitles.some((title) =>
      title === 'High School Diploma'
        ? edu.diplomas.some((d) => d.toLowerCase().includes('high school diploma'))
        : edu.diplomas.includes(title)
    );
    if (!hasRequiredDegree) {
      missingDegreeName = school.requiredDegreeTitles[0];
    }
  }

  const meetsGrades = edu.grades >= school.minGrades;
  const meetsSmarts = stats.smarts >= school.minSmarts;
  const meetsHealth = !school.minHealth || stats.health >= school.minHealth;

  const isAdmissible =
    !alreadyEarned && hasRequiredDegree && meetsGrades && meetsSmarts && meetsHealth;

  let reasonIfIneligible: string | undefined;
  if (alreadyEarned) {
    reasonIfIneligible = 'Degree Already Earned';
  } else if (!hasRequiredDegree) {
    reasonIfIneligible = `Requires ${school.requiredDegreeTitles[0]}`;
  } else if (!meetsGrades) {
    reasonIfIneligible = `Requires ${school.minGrades}% Grades`;
  } else if (!meetsSmarts) {
    reasonIfIneligible = `Requires ${school.minSmarts} Smarts`;
  } else if (!meetsHealth) {
    reasonIfIneligible = `Requires ${school.minHealth} Health (Physical Exam)`;
  }

  const qualifiesMeritScholarship =
    isAdmissible && edu.grades >= 90 && stats.smarts >= 80;

  return {
    isAdmissible,
    hasRequiredDegree,
    missingDegreeName,
    qualifiesMeritScholarship,
    alreadyEarned,
    reasonIfIneligible,
  };
}

/**
 * Enrolls the character into a Professional or Graduate School program.
 */
export function enrollInProfessionalSchool(
  character: CharacterProfile,
  schoolId: string,
  fundingMethod: 'scholarship' | 'parents' | 'student_loan'
): UniversityEnrollmentResult {
  const template = getProfessionalSchoolById(schoolId);
  if (!template) {
    return {
      character,
      enrolled: false,
      outcome: {
        title: 'School Not Found',
        message: 'Please select a valid professional school.',
        icon: '⚠️',
        appliedEffects: {},
      },
    };
  }

  const eligibility = evaluateProfessionalSchoolEligibility(character, template);
  if (!eligibility.isAdmissible) {
    return {
      character,
      enrolled: false,
      outcome: {
        title: 'Application Rejected',
        subtitle: template.name,
        message: `The admissions board declined your application for ${template.name} (${eligibility.reasonIfIneligible}).`,
        icon: '📩',
        appliedEffects: {},
      },
    };
  }

  const { parents, city, age, birthYear } = character;
  let resolvedFunding: TuitionFunding = 'student_loan';

  if (fundingMethod === 'scholarship') {
    if (eligibility.qualifiesMeritScholarship) {
      resolvedFunding = 'scholarship_merit';
    } else {
      return {
        character,
        enrolled: false,
        outcome: {
          title: 'Scholarship Denied',
          subtitle: template.name,
          message: `The scholarship committee declined your merit request (${character.education.grades}% Grades). Try asking your parents or using a Professional Student Loan!`,
          icon: '📋',
          appliedEffects: {},
        },
      };
    }
  }

  if (fundingMethod === 'parents') {
    const wealthChance: Record<typeof parents.wealth, number> = {
      wealthy: 0.95,
      comfortable: 0.72,
      modest: 0.25,
      struggling: 0.05,
    };
    const avgRel = (parents.father.relationship + parents.mother.relationship) / 2;
    const relMod = avgRel >= 80 ? 0.12 : avgRel < 45 ? -0.25 : 0;
    const approved = chance(Math.min(0.98, Math.max(0.04, wealthChance[parents.wealth] + relMod)));

    if (!approved) {
      return {
        character,
        enrolled: false,
        outcome: {
          title: 'Parents Declined Tuition',
          subtitle: `${parents.father.firstName} & ${parents.mother.firstName}`,
          message: `Your parents sighed: "We are so proud you were accepted into ${template.name}, but $${(template.tuitionPerYear * template.durationYears).toLocaleString()} is beyond our budget right now. Please consider a Student Loan."`,
          icon: '🙅',
          appliedEffects: {},
        },
      };
    }

    resolvedFunding = 'parents';
  }

  const schoolName = generateProfessionalSchoolName(city, template.id);
  const fundingMeta = getTuitionFundingMeta(resolvedFunding);
  const initialYearDebt = resolvedFunding === 'student_loan' ? template.tuitionPerYear : 0;

  const profProfile: ProfessionalSchoolProfile = {
    schoolId: template.id,
    schoolName,
    programName: template.name,
    degreeAwarded: template.degreeAwarded,
    year: 1,
    totalYears: template.durationYears,
    fundingType: resolvedFunding,
    tuitionPerYear: template.tuitionPerYear,
  };

  const rawEffects: StatEffects = {
    happiness: 6,
    smarts: 3,
    ...(resolvedFunding === 'parents' ? { parents: 5 } : {}),
  };
  const { character: updated, applied } = applyEffects(character, rawEffects);

  const fundingNarrative =
    resolvedFunding === 'scholarship_merit'
      ? `You were awarded a prestigious 100% Professional Merit Scholarship!`
      : resolvedFunding === 'parents'
      ? `Your parents proudly agreed to sponsor your entire tuition ($${(template.tuitionPerYear * template.durationYears).toLocaleString()})!`
      : `You secured a deferred professional student loan ($${template.tuitionPerYear.toLocaleString()}/yr).`;

  const message = `You enrolled at ${schoolName} to pursue your ${template.degreeAwarded}! ${fundingNarrative}`;

  const occupationLabel =
    template.id === 'med_school'
      ? 'Medical Student'
      : template.id === 'law_school'
      ? 'Law Student'
      : template.id === 'flight_school'
      ? 'Flight Student'
      : `${template.name} Student`;

  const journalEvent: LifeEvent = {
    id: createId(),
    age,
    year: birthYear + age,
    title: `Enrolled at ${schoolName}`,
    message,
    category: 'education',
    icon: template.icon,
  };

  return {
    enrolled: true,
    character: {
      ...updated,
      occupation: occupationLabel,
      education: {
        ...updated.education,
        currentStage: 'professional_school',
        schoolName,
        stageStartAge: age,
        yearInStage: 1,
        totalYearsInStage: template.durationYears,
        gradeLevelLabel: `Year 1 of ${template.durationYears} • ${template.name}`,
        yearActions: createEmptyYearActions(),
        activities: [],
        professionalSchool: profProfile,
        studentDebt: updated.education.studentDebt + initialYearDebt,
      },
      timeline: [...updated.timeline, journalEvent],
    },
    outcome: {
      title: `Accepted to ${template.name}!`,
      subtitle: `${schoolName} • ${fundingMeta.label}`,
      message,
      icon: template.icon,
      appliedEffects: applied,
    },
  };
}
