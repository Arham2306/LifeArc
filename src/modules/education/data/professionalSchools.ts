import type { ProfessionalSchoolTemplate } from '../types'
import { pickRandom } from '../../../utils/random'

export const PROFESSIONAL_SCHOOLS_CATALOG: ProfessionalSchoolTemplate[] = [
  {
    id: 'med_school',
    name: 'Medical School',
    icon: '🩺',
    degreeAwarded: 'Doctor of Medicine (M.D.)',
    durationYears: 4,
    requiredDegreeTitles: ['B.S. in Biology (Pre-Med)'],
    minGrades: 80,
    minSmarts: 75,
    tuitionPerYear: 24000,
    description: 'Intense clinical pathology, human surgery, pharmacotherapy, and hospital rotations.',
    careerUnlocks: 'Physician • Medical Surgeon • Chief of Medicine',
  },
  {
    id: 'law_school',
    name: 'Law School',
    icon: '⚖️',
    degreeAwarded: 'Juris Doctor (J.D.)',
    durationYears: 3,
    requiredDegreeTitles: [
      'B.A. in Political Science',
      'B.A. in Journalism & Media',
    ],
    minGrades: 74,
    minSmarts: 70,
    tuitionPerYear: 19500,
    description: 'Corporate jurisprudence, constitutional litigation, trial defense, and moot court.',
    careerUnlocks: 'Trial Attorney • Corporate Lawyer • Federal Judge',
  },
  {
    id: 'business_school',
    name: 'Business School',
    icon: '💼',
    degreeAwarded: 'Master of Business Administration (M.B.A.)',
    durationYears: 2,
    requiredDegreeTitles: [
      'B.B.A. in Finance & Management',
      'B.S. in Computer Science',
    ],
    minGrades: 68,
    minSmarts: 62,
    tuitionPerYear: 18000,
    description: 'Global venture capital, executive leadership, organizational strategy, and mergers.',
    careerUnlocks: 'Management Consultant • VP of Strategy • CEO',
  },
  {
    id: 'flight_school',
    name: 'Flight Academy & Pilot School',
    icon: '✈️',
    degreeAwarded: 'Commercial Pilot License (CPL)',
    durationYears: 2,
    requiredDegreeTitles: [], // Open with High School Diploma or any Bachelor's
    minGrades: 52,
    minSmarts: 64,
    minHealth: 78,
    tuitionPerYear: 16500,
    description: 'Aviation aerodynamics, multi-engine instrument rating, navigation, and simulator flight.',
    careerUnlocks: 'Commercial Airline Pilot • Cargo Captain • Flight Instructor',
  },
  {
    id: 'dental_school',
    name: 'Dental School',
    icon: '🦷',
    degreeAwarded: 'Doctor of Dental Surgery (D.D.S.)',
    durationYears: 4,
    requiredDegreeTitles: ['B.S. in Biology (Pre-Med)'],
    minGrades: 76,
    minSmarts: 70,
    tuitionPerYear: 22000,
    description: 'Oral surgery, orthodontics, periodontology, and clinical patient care.',
    careerUnlocks: 'General Dentist • Orthodontist • Oral Surgeon',
  },
  {
    id: 'vet_school',
    name: 'Veterinary School',
    icon: '🐾',
    degreeAwarded: 'Doctor of Veterinary Medicine (D.V.M.)',
    durationYears: 4,
    requiredDegreeTitles: ['B.S. in Biology (Pre-Med)'],
    minGrades: 75,
    minSmarts: 68,
    tuitionPerYear: 21000,
    description: 'Comparative animal physiology, clinical diagnostics, surgery, and pharmacology.',
    careerUnlocks: 'Veterinarian • Veterinary Surgeon • Wildlife Specialist',
  },
  {
    id: 'nursing_school',
    name: 'Nursing School',
    icon: '💉',
    degreeAwarded: 'Bachelor of Science in Nursing (B.S.N. / RN)',
    durationYears: 2,
    requiredDegreeTitles: [
      'B.S. in Biology (Pre-Med)',
      'B.S. in Kinesiology & Sports',
    ],
    minGrades: 64,
    minSmarts: 60,
    tuitionPerYear: 12000,
    description: 'Patient triage, acute clinical pharmacology, surgical nursing, and bedside diagnostics.',
    careerUnlocks: 'Registered Nurse • Nurse Practitioner • Clinical Supervisor',
  },
  {
    id: 'grad_school',
    name: 'Graduate School (Master / Ph.D.)',
    icon: '🎓',
    degreeAwarded: 'Master of Science (M.S. / Ph.D.)',
    durationYears: 2,
    requiredDegreeTitles: [
      'B.S. in Computer Science',
      'B.S. in Biology (Pre-Med)',
      'B.A. in Political Science',
      'B.B.A. in Finance & Management',
      'B.S. in Kinesiology & Sports',
      'B.F.A. in Visual & Digital Arts',
      'B.A. in Journalism & Media',
      'B.F.A. in Performing Arts',
    ],
    minGrades: 75,
    minSmarts: 72,
    tuitionPerYear: 14000,
    description: 'Postgraduate thesis research, peer-reviewed publications, and advanced scientific analysis.',
    careerUnlocks: 'University Professor • Senior Research Scientist • Laboratory Director',
  },
  {
    id: 'arts_conservatory',
    name: 'Fine Arts Conservatory',
    icon: '🎨',
    degreeAwarded: 'Master of Fine Arts (M.F.A.)',
    durationYears: 2,
    requiredDegreeTitles: [
      'B.F.A. in Visual & Digital Arts',
      'B.F.A. in Performing Arts',
    ],
    minGrades: 62,
    minSmarts: 52,
    tuitionPerYear: 13500,
    description: 'Master studio exhibitions, cinematic direction, orchestral composition, and performance.',
    careerUnlocks: 'Master Fine Artist • Lead Studio Animator • Film Director',
  },
];

export function getProfessionalSchoolById(id: string): ProfessionalSchoolTemplate | undefined {
  return PROFESSIONAL_SCHOOLS_CATALOG.find((s) => s.id === id);
}

const SCHOOL_NAME_TEMPLATES: Record<string, string[]> = {
  med_school: ['Medical College & Hospital', 'School of Medicine & Health Sciences'],
  law_school: ['School of Law', 'Faculty of Jurisprudence & Legal Studies'],
  business_school: ['Graduate School of Business', 'School of Management & Finance'],
  flight_school: ['Aviation Flight Academy', 'International Aero Training Center'],
  dental_school: ['College of Dentistry', 'Dental School & Oral Health Institute'],
  vet_school: ['College of Veterinary Medicine', 'Veterinary Sciences Institute'],
  nursing_school: ['School of Nursing', 'Institute of Nursing & Healthcare'],
  grad_school: ['School of Graduate Studies', 'Graduate Institute of Advanced Research'],
  arts_conservatory: ['Conservatory of Fine Arts', 'Academy of Dramatic Arts & Design'],
};

/** Generates a localized professional school name anchored to the city. */
export function generateProfessionalSchoolName(city: string, schoolId: string): string {
  const templates = SCHOOL_NAME_TEMPLATES[schoolId] || ['Institute of Professional Studies'];
  return `${city} ${pickRandom(templates)}`;
}

