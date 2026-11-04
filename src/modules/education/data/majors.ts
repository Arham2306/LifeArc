import type { TuitionFunding, UniversityMajor } from '../types'
import { pickRandom } from '../../../utils/random'

export const UNIVERSITY_TOTAL_YEARS = 4;

export const UNIVERSITY_YEAR_LABELS: Record<number, string> = {
  1: 'Freshman (Year 1)',
  2: 'Sophomore (Year 2)',
  3: 'Junior (Year 3)',
  4: 'Senior (Year 4)',
};

const UNIVERSITY_SUFFIXES = [
  'State University',
  'Metropolitan University',
  'Institute of Technology & Sciences',
  'National University',
  'City University',
  'Grand Collegiate University',
];

/** Generates a localized university name anchored to the player's city. */
export function generateUniversityName(city: string): string {
  return `${city} ${pickRandom(UNIVERSITY_SUFFIXES)}`;
}

export const UNIVERSITY_MAJORS: UniversityMajor[] = [
  {
    id: 'cs',
    name: 'Computer Science',
    icon: '💻',
    disciplineId: 'robotics',
    degreeTitle: 'B.S. in Computer Science',
    tuitionPerYear: 11500,
    minGrades: 68,
    minSmarts: 62,
    description: 'Algorithms, software architecture, artificial intelligence, and systems engineering.',
    careerUnlocks: 'Software Engineer • AI Researcher • Tech Founder',
  },
  {
    id: 'pre_med',
    name: 'Biology & Pre-Med',
    icon: '🩺',
    degreeTitle: 'B.S. in Biology (Pre-Med)',
    tuitionPerYear: 13500,
    minGrades: 80,
    minSmarts: 72,
    description: 'Human anatomy, organic chemistry, genetics, and clinical foundations.',
    careerUnlocks: 'Medical Doctor • Surgeon • Biotech Scientist',
  },
  {
    id: 'pre_law',
    name: 'Political Science & Pre-Law',
    icon: '⚖️',
    disciplineId: 'debate',
    degreeTitle: 'B.A. in Political Science',
    tuitionPerYear: 12000,
    minGrades: 72,
    minSmarts: 66,
    description: 'Constitutional law, public policy, jurisprudence, and persuasive rhetoric.',
    careerUnlocks: 'Corporate Lawyer • Prosecutor • Politician',
  },
  {
    id: 'business',
    name: 'Business & Finance',
    icon: '💼',
    degreeTitle: 'B.B.A. in Finance & Management',
    tuitionPerYear: 11000,
    minGrades: 62,
    minSmarts: 55,
    description: 'Corporate finance, economics, venture strategy, and executive leadership.',
    careerUnlocks: 'Investment Banker • Financial Analyst • CEO',
  },
  {
    id: 'sports_science',
    name: 'Kinesiology & Sports Science',
    icon: '🏃',
    disciplineId: 'soccer',
    degreeTitle: 'B.S. in Kinesiology & Sports',
    tuitionPerYear: 9500,
    minGrades: 56,
    minSmarts: 45,
    minHealth: 62,
    description: 'Athletic conditioning, biomechanics, sports medicine, and coaching.',
    careerUnlocks: 'Pro Athlete • Head Coach • Physical Therapist',
  },
  {
    id: 'fine_arts',
    name: 'Fine Arts & Graphic Design',
    icon: '🎨',
    disciplineId: 'visual_arts',
    degreeTitle: 'B.F.A. in Visual & Digital Arts',
    tuitionPerYear: 9800,
    minGrades: 55,
    minSmarts: 45,
    description: 'Studio illustration, UI/UX design, 3D animation, and creative direction.',
    careerUnlocks: 'Creative Director • Product Designer • Animator',
  },
  {
    id: 'journalism',
    name: 'Journalism & Media Studies',
    icon: '📰',
    disciplineId: 'journalism',
    degreeTitle: 'B.A. in Journalism & Media',
    tuitionPerYear: 9200,
    minGrades: 60,
    minSmarts: 55,
    description: 'Investigative reporting, broadcast media, digital publishing, and literature.',
    careerUnlocks: 'Investigative Reporter • Editor-in-Chief • Author',
  },
  {
    id: 'performing_arts',
    name: 'Performing Arts & Music',
    icon: '🎭',
    disciplineId: 'drama',
    degreeTitle: 'B.F.A. in Performing Arts',
    tuitionPerYear: 10200,
    minGrades: 55,
    minSmarts: 48,
    description: 'Stage acting, film production, musical composition, and conservatory performance.',
    careerUnlocks: 'Film & Stage Actor • Musician • Music Producer',
  },
];

export function getUniversityMajorById(id: string): UniversityMajor | undefined {
  return UNIVERSITY_MAJORS.find((m) => m.id === id);
}

export function getTuitionFundingMeta(funding: TuitionFunding): {
  label: string;
  badgeVariant: 'emerald' | 'sky' | 'amber' | 'slate';
} {
  switch (funding) {
    case 'scholarship_merit':
      return { label: '🏆 Academic Merit Scholarship', badgeVariant: 'emerald' };
    case 'scholarship_athletic':
      return { label: '⚽ Full Athletic Scholarship', badgeVariant: 'emerald' };
    case 'parents':
      return { label: '👨‍👩‍👧 Paid by Parents', badgeVariant: 'sky' };
    case 'self_paid':
      return { label: '💵 Paid in Cash', badgeVariant: 'emerald' };
    case 'student_loan':
      return { label: '💳 Student Loan', badgeVariant: 'amber' };
  }
}

