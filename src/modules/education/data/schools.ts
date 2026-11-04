import type { ActiveSchoolStage } from '../types'
import { pickRandom } from '../../../utils/random'

export interface SchoolStageConfig {
  stage: ActiveSchoolStage;
  label: string;
  shortLabel: string;
  icon: string;
  startAge: number;
  endAge: number;
  totalYears: number;
  occupationLabel: string;
  gradeLabelsByAge: Record<number, string>;
}

export const SCHOOL_STAGE_CONFIG: Record<ActiveSchoolStage, SchoolStageConfig> = {
  elementary: {
    stage: 'elementary',
    label: 'Elementary School',
    shortLabel: 'Elementary',
    icon: '🎒',
    startAge: 5,
    endAge: 10,
    totalYears: 6,
    occupationLabel: 'Elementary Student',
    gradeLabelsByAge: {
      5: 'Kindergarten',
      6: '1st Grade',
      7: '2nd Grade',
      8: '3rd Grade',
      9: '4th Grade',
      10: '5th Grade',
    },
  },
  middle_school: {
    stage: 'middle_school',
    label: 'Middle School',
    shortLabel: 'Middle School',
    icon: '🏫',
    startAge: 11,
    endAge: 13,
    totalYears: 3,
    occupationLabel: 'Middle School Student',
    gradeLabelsByAge: {
      11: '6th Grade',
      12: '7th Grade',
      13: '8th Grade',
    },
  },
  high_school: {
    stage: 'high_school',
    label: 'High School',
    shortLabel: 'High School',
    icon: '🎓',
    startAge: 14,
    endAge: 17,
    totalYears: 4,
    occupationLabel: 'High School Student',
    gradeLabelsByAge: {
      14: '9th Grade (Freshman)',
      15: '10th Grade (Sophomore)',
      16: '11th Grade (Junior)',
      17: '12th Grade (Senior)',
    },
  },
};

const SCHOOL_DESCRIPTORS: Record<ActiveSchoolStage, string[]> = {
  elementary: [
    'Oakridge Elementary',
    'Sunnyvale Primary School',
    'Meadowbrook Elementary',
    'Pinecrest Primary',
    'Maplewood Elementary',
    'Cedar Grove Primary School',
    'Riverside Elementary',
    'Starlight Primary Academy',
  ],
  middle_school: [
    'Central Middle School',
    'Westview Junior High',
    'Northgate Middle Academy',
    'Heritage Junior High',
    'crestview Middle School',
    'Valley Prep Middle School',
    'Parkside Junior High',
  ],
  high_school: [
    'Metropolitan High School',
    'Grammar High School',
    'Central High Academy',
    'Liberty High School',
    'Horizon Senior High',
    'St. Jude High School',
    'Heights Collegiate High',
  ],
};

/**
 * Generates a localized school name anchored to the player's city.
 * e.g. "Karachi Grammar High School" or "New York Oakridge Elementary".
 */
export function generateSchoolName(city: string, stage: ActiveSchoolStage): string {
  const rawDescriptor = pickRandom(SCHOOL_DESCRIPTORS[stage]);
  const descriptor = rawDescriptor.charAt(0).toUpperCase() + rawDescriptor.slice(1);
  return `${city} ${descriptor}`;
}

export interface LetterGradeMeta {
  letter: string;
  standing: string;
  badgeVariant: 'emerald' | 'sky' | 'amber' | 'rose';
}

/** Converts a 0-100 numerical grade into a letter grade and standing description. */
export function getLetterGradeMeta(grades: number): LetterGradeMeta {
  if (grades >= 95) return { letter: 'A+', standing: 'Top of the Class', badgeVariant: 'emerald' };
  if (grades >= 88) return { letter: 'A', standing: 'Honor Roll', badgeVariant: 'emerald' };
  if (grades >= 80) return { letter: 'B+', standing: 'Above Average', badgeVariant: 'sky' };
  if (grades >= 72) return { letter: 'B', standing: 'Good Standing', badgeVariant: 'sky' };
  if (grades >= 64) return { letter: 'C', standing: 'Average', badgeVariant: 'amber' };
  if (grades >= 50) return { letter: 'D', standing: 'Struggling', badgeVariant: 'rose' };
  return { letter: 'F', standing: 'Failing', badgeVariant: 'rose' };
}

