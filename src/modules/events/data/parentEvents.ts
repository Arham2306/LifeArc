import type { LifeEventTemplate } from '../types'

/**
 * Interactive events centered around the player's relationship with their Mother and Father
 * across toddler, childhood, and teen years.
 */
export const PARENT_EVENTS: LifeEventTemplate[] = [
  {
    id: 'helping_mom_cook',
    title: 'Helping in the Kitchen',
    icon: '🍳',
    category: 'relationship',
    minAge: 4,
    maxAge: 9,
    weight: 1.4,
    description: 'Your mother, {motherName}, is baking cookies in the kitchen and asks if you want to help mix the batter.',
    choices: [
      {
        id: 'help',
        label: 'Help her carefully',
        icon: '🥣',
        outcomes: [
          {
            message: 'You and {motherName} baked a warm batch of chocolate chip cookies together. She gave you the biggest one!',
            effects: { motherRelationship: 8, happiness: 5, smarts: 2 },
          },
        ],
      },
      {
        id: 'lick_spoon',
        label: 'Sneak a huge scoop of raw dough',
        icon: '😋',
        outcomes: [
          {
            weight: 6,
            message: '{motherName} laughed when she saw chocolate all over your cheeks.',
            effects: { motherRelationship: 4, happiness: 6 },
          },
          {
            weight: 4,
            message: 'You ate way too much raw dough and got a mild tummy ache.',
            effects: { health: -3, happiness: 2 },
          },
        ],
      },
      {
        id: 'flour_mess',
        label: 'Toss flour in the air like snow',
        icon: '❄️',
        outcomes: [
          {
            message: 'The kitchen looked like a blizzard hit it. {motherName} made you help sweep the floor.',
            effects: { motherRelationship: -6, happiness: 3, karma: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'dad_flashlight_duty',
    title: 'Flashlight Duty with Dad',
    icon: '🔦',
    category: 'relationship',
    minAge: 5,
    maxAge: 12,
    weight: 1.4,
    description: 'Your father, {fatherName}, is fixing the kitchen sink and asks you to hold the flashlight steady for him.',
    choices: [
      {
        id: 'steady',
        label: 'Hold it laser-steady and hand him tools',
        icon: '🔧',
        outcomes: [
          {
            message: '{fatherName} ruffled your hair and called you his best little mechanic. You learned how pipes work!',
            effects: { fatherRelationship: 9, smarts: 4, happiness: 4 },
          },
        ],
      },
      {
        id: 'wander',
        label: 'Point the light at the ceiling and daydream',
        icon: '🌀',
        outcomes: [
          {
            message: '{fatherName} sighed and asked {firstName} to focus five times before finishing the job himself.',
            effects: { fatherRelationship: -4, happiness: -1 },
          },
        ],
      },
      {
        id: 'questions',
        label: 'Ask a million questions about every tool',
        icon: '❓',
        outcomes: [
          {
            message: '{fatherName} patiently explained every wrench and bolt in the toolbox.',
            effects: { fatherRelationship: 6, smarts: 5, happiness: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'family_road_trip',
    title: 'Family Road Trip',
    icon: '🚗',
    category: 'relationship',
    minAge: 6,
    maxAge: 13,
    weight: 1.3,
    description: '{fatherName} and {motherName} pack up the car for a long weekend road trip. Three hours in, traffic comes to a standstill.',
    choices: [
      {
        id: 'games',
        label: 'Start a game of "I Spy" with your parents',
        icon: '🕵️',
        outcomes: [
          {
            message: 'The whole car ended up laughing for an hour, turning the traffic jam into the best part of the drive.',
            effects: { parents: 7, happiness: 6 },
          },
        ],
      },
      {
        id: 'complain',
        label: 'Ask "Are we there yet?" every two minutes',
        icon: '😩',
        outcomes: [
          {
            message: '{fatherName} threatened to turn the car around. The rest of the ride was dead silent.',
            effects: { parents: -7, happiness: -3 },
          },
        ],
      },
      {
        id: 'nap',
        label: 'Put your head against the window and nap',
        icon: '😴',
        outcomes: [
          {
            message: 'You slept the whole way there and woke up refreshed when your parents arrived.',
            effects: { health: 2, happiness: 3, parents: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'report_card_dinner',
    title: 'Report Card Night',
    icon: '📋',
    category: 'education',
    minAge: 8,
    maxAge: 15,
    weight: 1.4,
    description: 'Your semester report card arrived in the mail, and {motherName} and {fatherName} open it at the dinner table.',
    choices: [
      {
        id: 'proud',
        label: 'Show them your best subjects proudly',
        icon: '🌟',
        outcomes: [
          {
            weight: 7,
            message: '{motherName} and {fatherName} beamed with pride and took you out for ice cream to celebrate!',
            effects: { parents: 8, happiness: 7, smarts: 2 },
          },
          {
            weight: 3,
            message: 'They praised your good grades, though {fatherName} reminded you to keep studying hard.',
            effects: { parents: 4, smarts: 3 },
          },
        ],
      },
      {
        id: 'promise',
        label: 'Promise to study harder next term',
        icon: '📖',
        outcomes: [
          {
            message: 'Your parents appreciated your maturity and helped you set up a quiet study corner.',
            effects: { parents: 5, smarts: 5, happiness: 2 },
          },
        ],
      },
      {
        id: 'hide',
        label: 'Try to hide the envelope under your plate',
        icon: '🙈',
        outcomes: [
          {
            message: '{motherName} spotted it immediately. Your parents were more upset about the hiding than the grades.',
            effects: { parents: -8, happiness: -5, karma: -3 },
          },
        ],
      },
    ],
  },
  {
    id: 'caught_past_bedtime',
    title: 'Caught Past Bedtime',
    icon: '🌙',
    category: 'childhood',
    minAge: 6,
    maxAge: 11,
    description: "It's 11 PM on a school night and you hear {motherName}'s footsteps approaching your bedroom door.",
    choices: [
      {
        id: 'pretend_sleep',
        label: 'Dive under the covers and fake a snore',
        icon: '😴',
        outcomes: [
          {
            weight: 6,
            message: '{motherName} peeked in, smiled, and softly closed the door.',
            effects: { happiness: 4, smarts: 1 },
          },
          {
            weight: 4,
            message: 'Your comic book poked out from under the pillow. {motherName} confiscated it for the night.',
            effects: { motherRelationship: -3, happiness: -2 },
          },
        ],
      },
      {
        id: 'water',
        label: 'Tell her you could not sleep and ask for warm milk',
        icon: '🥛',
        outcomes: [
          {
            message: '{motherName} warmed up a cup of milk and tucked you in with a story.',
            effects: { motherRelationship: 7, happiness: 5, health: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'trendy_sneakers',
    title: 'The Trendy Sneakers',
    icon: '👟',
    category: 'social',
    minAge: 11,
    maxAge: 16,
    weight: 1.4,
    description: 'Everyone at school is wearing a brand-new pair of expensive sneakers. You really want a pair, so you ask {fatherName} and {motherName}.',
    choices: [
      {
        id: 'ask_politely',
        label: 'Ask your parents politely if they can buy them',
        icon: '🙏',
        outcomes: [
          {
            weight: 5,
            parentPaid: true,
            message: '{fatherName} and {motherName} surprised you with the sneakers on Saturday! You walked into school feeling like royalty.',
            effects: { happiness: 9, looks: 4, parents: 5 },
          },
          {
            weight: 5,
            parentPaid: false,
            message: '{motherName} explained that those sneakers cost way too much right now and bought a regular pair instead.',
            effects: { happiness: -3, parents: 1 },
          },
        ],
      },
      {
        id: 'argue',
        label: 'Complain that everyone else has them',
        icon: '😤',
        outcomes: [
          {
            message: '{fatherName} gave you a long lecture on gratitude and definitely said no.',
            effects: { parents: -8, happiness: -5, karma: -2 },
          },
        ],
      },
      {
        id: 'accept',
        label: 'Clean up your old shoes instead',
        icon: '🧼',
        outcomes: [
          {
            message: 'You scrubbed your sneakers until they looked fresh. {motherName} was impressed by how sensible you were.',
            effects: { parents: 6, karma: 4, looks: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'family_game_night',
    title: 'Family Board Game Night',
    icon: '🎲',
    category: 'relationship',
    minAge: 7,
    maxAge: 16,
    description: '{fatherName} pulls out a classic board game on Friday evening and challenges you and {motherName}.',
    choices: [
      {
        id: 'strategize',
        label: 'Play to win with clever strategy',
        icon: '🧠',
        outcomes: [
          {
            message: 'You bankrupted both {fatherName} and {motherName}! They couldn’t believe how sharp you were.',
            effects: { parents: 6, smarts: 4, happiness: 6 },
          },
        ],
      },
      {
        id: 'team_mom',
        label: 'Make a secret alliance with your mom',
        icon: '🤝',
        outcomes: [
          {
            message: 'You and {motherName} teamed up to defeat {fatherName}. Everyone laughed all night.',
            effects: { motherRelationship: 8, fatherRelationship: 3, happiness: 6 },
          },
        ],
      },
      {
        id: 'flip_board',
        label: 'Flip the board when you start losing',
        icon: '💥',
        outcomes: [
          {
            message: 'Game pieces flew everywhere. Your parents made you pick up every single card.',
            effects: { parents: -8, happiness: -3, karma: -4 },
          },
        ],
      },
    ],
  },
  {
    id: 'forgotten_chores',
    title: 'Forgotten Chores',
    icon: '🧺',
    category: 'relationship',
    minAge: 10,
    maxAge: 17,
    description: '{motherName} asked you to tidy the living room before relatives came over, and you completely forgot until the doorbell rang.',
    choices: [
      {
        id: 'apologize_rush',
        label: 'Apologize and speed-clean in record time',
        icon: '⚡',
        outcomes: [
          {
            message: 'You cleared the room in two minutes flat and helped {motherName} serve tea. Crisis averted!',
            effects: { motherRelationship: 4, happiness: 2, karma: 3 },
          },
        ],
      },
      {
        id: 'excuses',
        label: 'Make up an excuse about homework',
        icon: '🤥',
        outcomes: [
          {
            weight: 4,
            message: '{motherName} bought the excuse, though she still looked stressed.',
            effects: { karma: -3 },
          },
          {
            weight: 6,
            message: '{fatherName} saw your game controller still warm on the couch. Both parents were disappointed.',
            effects: { parents: -9, happiness: -4, karma: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 'teen_heart_to_heart',
    title: 'Heart-to-Heart Talk',
    icon: '💬',
    category: 'relationship',
    minAge: 13,
    maxAge: 17,
    weight: 1.4,
    description: 'Late one evening, {fatherName} and {motherName} sit down with you to ask about your plans and dreams for adulthood.',
    choices: [
      {
        id: 'open_up',
        label: 'Share your big ambitions with them',
        icon: '🚀',
        outcomes: [
          {
            message: '{fatherName} and {motherName} listened closely and promised to support you no matter what path you choose.',
            effects: { parents: 10, happiness: 7, smarts: 2 },
          },
        ],
      },
      {
        id: 'joke',
        label: 'Crack a joke to keep the mood light',
        icon: '😄',
        outcomes: [
          {
            message: 'Your parents laughed and shared stories from when they were your age.',
            effects: { parents: 6, happiness: 5 },
          },
        ],
      },
      {
        id: 'shrug',
        label: 'Shrug and go back to your room',
        icon: '🚪',
        outcomes: [
          {
            message: 'Your parents exchanged a worried look as you closed your bedroom door.',
            effects: { parents: -5, happiness: -2 },
          },
        ],
      },
    ],
  },
];

