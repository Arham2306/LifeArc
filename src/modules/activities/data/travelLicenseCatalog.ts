import type {
  DriversQuizQuestion,
  EmigrationDestinationTemplate,
  LicenseId,
  LicenseTemplate,
  VacationCabinClass,
  VacationCabinClassId,
  VacationDestinationId,
  VacationDestinationTemplate,
} from '../types';

export const VACATION_MIN_AGE = 18;
export const EMIGRATION_MIN_AGE = 18;
export const EMIGRATION_VISA_DENIAL_FEE = 150;

export const LICENSE_CATALOG: readonly LicenseTemplate[] = [
  {
    id: 'drivers',
    name: "Driver's License",
    minAge: 16,
    fee: 75,
    minSmarts: 0,
    description: 'Pass a 3-question road-rules quiz (2/3 required) to drive legally.',
  },
  {
    id: 'boating',
    name: 'Boating License',
    minAge: 18,
    fee: 350,
    minSmarts: 0,
    description: 'Maritime navigation and watercraft safety certification.',
  },
  {
    id: 'pilot',
    name: "Pilot's License",
    minAge: 21,
    fee: 4500,
    minSmarts: 60,
    description: 'Multi-hour aviation ground and flight checkride (Requires 60+ Smarts).',
  },
] as const;

export const DRIVERS_QUIZ_POOL: readonly DriversQuizQuestion[] = [
  {
    id: 'dq-1',
    prompt: 'What should you do when approaching a flashing red traffic light?',
    options: [
      'Slow down and proceed if clear',
      'Come to a complete stop, yield, then go when safe',
      'Maintain speed because flashing red means caution',
    ],
    correctIndex: 1,
  },
  {
    id: 'dq-2',
    prompt: 'When two vehicles reach an uncontrolled 4-way stop at the same time, who yields?',
    options: [
      'The driver on the left yields to the driver on the right',
      'The smaller vehicle yields to the larger vehicle',
      'The driver going straight yields to turning traffic',
    ],
    correctIndex: 0,
  },
  {
    id: 'dq-3',
    prompt: 'What does a solid yellow line on your side of the center lane mean?',
    options: [
      'Passing is encouraged when traffic is light',
      'Minimum speed zone ahead',
      'Do not pass from your lane',
    ],
    correctIndex: 2,
  },
  {
    id: 'dq-4',
    prompt: 'When an emergency vehicle approaches with sirens and flashing lights, you must:',
    options: [
      'Speed up to clear the lane ahead of it',
      'Pull over safely to the right edge and stop',
      'Stop immediately in the middle of the intersection',
    ],
    correctIndex: 1,
  },
  {
    id: 'dq-5',
    prompt: 'Under normal dry highway conditions, what is the standard safe following distance?',
    options: ['1 car length', 'At least a 3-second gap', '10 seconds regardless of speed'],
    correctIndex: 1,
  },
  {
    id: 'dq-6',
    prompt: 'When parking uphill on a street with a curb, which way should you turn your front wheels?',
    options: [
      'Away from the curb',
      'Toward the curb',
      'Keep them completely straight',
    ],
    correctIndex: 0,
  },
  {
    id: 'dq-7',
    prompt: 'When a school bus stops with flashing red lights on an undivided road, you must:',
    options: [
      'Pass slowly under 15 mph',
      'Honk once and pass on the left',
      'Stop until the red lights turn off and children are clear',
    ],
    correctIndex: 2,
  },
  {
    id: 'dq-8',
    prompt: 'What should you do first if your vehicle begins to hydroplane on a wet road?',
    options: [
      'Slam the brakes hard',
      'Ease off the accelerator and steer steadily straight',
      'Jerk the wheel toward the shoulder',
    ],
    correctIndex: 1,
  },
  {
    id: 'dq-9',
    prompt: 'Who has the right-of-way inside a traffic roundabout?',
    options: [
      'Traffic already circulating inside the roundabout',
      'Vehicles entering from the right',
      'Whichever vehicle signals first',
    ],
    correctIndex: 0,
  },
  {
    id: 'dq-10',
    prompt: 'At dusk, fog, or heavy rain, when should low-beam headlights be switched on?',
    options: [
      'High beams are always safer in fog',
      'Parking lights only inside city limits',
      'Whenever visibility drops or wipers are needed',
    ],
    correctIndex: 2,
  },
  {
    id: 'dq-11',
    prompt: 'Before changing lanes on a multilane road, the safest final check is:',
    options: [
      'Mirror check only',
      'Signal, check mirrors, and glance over your shoulder at the blind spot',
      'Tap the brakes so traffic behind slows down',
    ],
    correctIndex: 1,
  },
  {
    id: 'dq-12',
    prompt: 'What does an inverted red-and-white triangular sign require?',
    options: [
      'Yield right-of-way to cross traffic or pedestrians',
      'Railroad crossing immediately ahead',
      'Dead-end street',
    ],
    correctIndex: 0,
  },
] as const;

export const VACATION_DESTINATIONS: readonly VacationDestinationTemplate[] = [
  {
    id: 'coastal_road_trip',
    name: 'Coastal Road Trip',
    description: 'Scenic highway overlooks, seaside diners, and ocean breeze.',
    baseCost: 400,
    healthGain: 2,
    happinessGain: 7,
    looksGain: 0,
  },
  {
    id: 'tropical_resort',
    name: 'Tropical Beach Resort',
    description: 'Sunlit cabanas, warm surf, and all-day poolside rest.',
    baseCost: 2200,
    healthGain: 4,
    happinessGain: 12,
    looksGain: 2,
  },
  {
    id: 'european_capitals',
    name: 'European Capitals Tour',
    description: 'Historic plazas, museums, rail hops, and late-night cafes.',
    baseCost: 4800,
    healthGain: 3,
    happinessGain: 16,
    looksGain: 2,
  },
  {
    id: 'private_island',
    name: 'Private Island Getaway',
    description: 'Chartered sanctuary with crystal water and total privacy.',
    baseCost: 12000,
    healthGain: 6,
    happinessGain: 22,
    looksGain: 3,
  },
] as const;

export const VACATION_CABIN_CLASSES: readonly VacationCabinClass[] = [
  { id: 'economy', name: 'Economy', priceMultiplier: 1.0, bonusHappiness: 0 },
  { id: 'business', name: 'Business Class', priceMultiplier: 1.5, bonusHappiness: 4 },
  { id: 'first_class', name: 'First Class', priceMultiplier: 2.4, bonusHappiness: 8 },
] as const;

export const EMIGRATION_DESTINATIONS: readonly EmigrationDestinationTemplate[] = [
  { country: 'United States', city: 'New York', flag: '🇺🇸', movingCost: 3800, baseApproval: 0.84, strictnessLabel: 'Strict' },
  { country: 'United Kingdom', city: 'London', flag: '🇬🇧', movingCost: 3400, baseApproval: 0.85, strictnessLabel: 'Strict' },
  { country: 'Canada', city: 'Toronto', flag: '🇨🇦', movingCost: 3000, baseApproval: 0.90, strictnessLabel: 'Moderate' },
  { country: 'Australia', city: 'Sydney', flag: '🇦🇺', movingCost: 4200, baseApproval: 0.86, strictnessLabel: 'Strict' },
  { country: 'Japan', city: 'Tokyo', flag: '🇯🇵', movingCost: 4800, baseApproval: 0.80, strictnessLabel: 'Strict' },
  { country: 'Germany', city: 'Berlin', flag: '🇩🇪', movingCost: 2800, baseApproval: 0.88, strictnessLabel: 'Moderate' },
  { country: 'France', city: 'Paris', flag: '🇫🇷', movingCost: 3200, baseApproval: 0.87, strictnessLabel: 'Moderate' },
  { country: 'Italy', city: 'Rome', flag: '🇮🇹', movingCost: 2600, baseApproval: 0.89, strictnessLabel: 'Moderate' },
  { country: 'Spain', city: 'Madrid', flag: '🇪🇸', movingCost: 2200, baseApproval: 0.91, strictnessLabel: 'Moderate' },
  { country: 'Brazil', city: 'São Paulo', flag: '🇧🇷', movingCost: 1500, baseApproval: 0.92, strictnessLabel: 'Moderate' },
] as const;

export function getLicenseTemplate(id: LicenseId): LicenseTemplate | undefined {
  return LICENSE_CATALOG.find((item) => item.id === id);
}

export function getVacationDestination(id: VacationDestinationId): VacationDestinationTemplate | undefined {
  return VACATION_DESTINATIONS.find((item) => item.id === id);
}

export function getVacationCabinClass(id: VacationCabinClassId): VacationCabinClass {
  return VACATION_CABIN_CLASSES.find((item) => item.id === id) ?? VACATION_CABIN_CLASSES[0];
}

export function getEmigrationDestination(country: string): EmigrationDestinationTemplate | undefined {
  return EMIGRATION_DESTINATIONS.find((item) => item.country === country);
}
