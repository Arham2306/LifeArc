export const MALE_NAMES = [
  'Leo', 'Milo', 'Toby', 'Finn', 'Noah', 'Liam', 'Oliver', 'Lucas', 'Ethan', 'Ezra', 
  'Theo', 'Jack', 'James', 'Alexander', 'Henry', 'Arthur', 'Sebastian', 'Kai'
];

export const FEMALE_NAMES = [
  'Chloe', 'Luna', 'Mia', 'Ruby', 'Emma', 'Olivia', 'Sophia', 'Ava', 'Isabella', 'Maya',
  'Aria', 'Harper', 'Lily', 'Zoe', 'Elena', 'Grace', 'Ivy', 'Aurora'
];

export const NON_BINARY_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Sam', 'Rowan', 'River', 'Casey'
];

export const LAST_NAMES = [
  'Bennett', 'Vance', 'Brooks', 'Sterling', 'Parker', 'Hart', 'Diaz', 'Campbell', 'Chen', 'Watson',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor'
];

export function getRandomName(gender: 'male' | 'female' | 'non-binary') {
  let firstList = NON_BINARY_NAMES;
  if (gender === 'male') firstList = MALE_NAMES;
  if (gender === 'female') firstList = FEMALE_NAMES;

  const firstName = firstList[Math.floor(Math.random() * firstList.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { firstName, lastName };
}

