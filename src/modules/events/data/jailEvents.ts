import type { LifeEventTemplate } from '../types'

/**
 * Interactive events that only happen while the character is serving prison time.
 *
 * Every template sets `requiresIncarcerated: true`, so the structural eligibility gate in
 * `eventEligibility.ts` keeps them out of the free world entirely (they never roll once the
 * character is released), while ordinary free-world events stay suppressed during custody.
 *
 * Most are repeatable because long sentences span many Age Ups; the event weighting service
 * already dampens recently seen titles/categories. The two person-introducing events are
 * one-time so a repeat can never overwrite an existing relationship score.
 *
 * Effects are intentionally modest: single outcomes never remove more than 15 health.
 */
const JAIL_BASE = {
  minAge: 18,
  maxAge: 120,
  requiresIncarcerated: true,
} as const

export const JAIL_EVENTS: LifeEventTemplate[] = [
  {
    ...JAIL_BASE,
    id: 'jail_commissary_day',
    title: 'Commissary Day',
    icon: '🛒',
    category: 'money',
    repeatable: true,
    description:
      'It is commissary day at the facility. You have a little money on your books to spend on something from the store.',
    choices: [
      {
        id: 'snacks',
        label: 'Stock up on snacks and toiletries',
        icon: '🍫',
        outcomes: [
          {
            message: 'Real soap and a candy bar made the cell feel a little more like home.',
            effects: { cash: -25, happiness: 4, health: 1 },
          },
        ],
      },
      {
        id: 'phone_card',
        label: 'Buy a phone card to call home',
        icon: '☎️',
        outcomes: [
          {
            message: 'Hearing a familiar voice, even for ten minutes, got you through the week.',
            effects: { cash: -20, happiness: 5 },
          },
        ],
      },
      {
        id: 'card_game',
        label: 'Gamble your commissary money in a card game',
        icon: '🃏',
        outcomes: [
          {
            weight: 4,
            message: 'You played it cool and walked away from the table with extra commissary credit.',
            effects: { cash: 35, happiness: 3 },
          },
          {
            weight: 6,
            message: 'The other inmates cleaned you out. Lesson learned.',
            effects: { cash: -30, happiness: -4, karma: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_yard_standoff',
    title: 'Yard Standoff',
    icon: '🥊',
    category: 'misfortune',
    repeatable: true,
    description:
      'Out in the yard, a rival inmate squares up to you in front of everyone and demands you back down.',
    choices: [
      {
        id: 'stand_ground',
        label: 'Stand your ground',
        icon: '💪',
        outcomes: [
          {
            weight: 5,
            message: 'Your calm stare was enough. He backed off and word got around that you are not to be tested.',
            effects: { happiness: 3, karma: -1 },
          },
          {
            weight: 4,
            message: 'It turned into a scuffle before the guards broke it up. You walked away bruised.',
            effects: { health: -10, happiness: -4, karma: -3 },
          },
        ],
      },
      {
        id: 'walk_away',
        label: 'Walk away and avoid trouble',
        icon: '🚶',
        outcomes: [
          {
            message: 'You kept your head down. It stung your pride, but you stayed out of the infirmary and the hole.',
            effects: { happiness: -3, karma: 1 },
          },
        ],
      },
      {
        id: 'call_guard',
        label: 'Signal a guard',
        icon: '🚨',
        outcomes: [
          {
            message: 'The guards defused it quickly. Some inmates whisper that you are a snitch, but you are safe.',
            effects: { happiness: -2, karma: 2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_contraband_offer',
    title: 'Contraband Offer',
    icon: '📦',
    category: 'misfortune',
    repeatable: true,
    description:
      'A fellow inmate quietly offers you smuggled contraband that would make time pass easier, if you are willing to risk it.',
    choices: [
      {
        id: 'refuse',
        label: 'Refuse politely',
        icon: '🙅',
        outcomes: [
          {
            message: 'You turned it down. Staying clean keeps your record spotless with the staff.',
            effects: { karma: 3, happiness: -1 },
          },
        ],
      },
      {
        id: 'accept',
        label: 'Take the offer',
        icon: '🤫',
        outcomes: [
          {
            weight: 5,
            message: 'You pulled it off without anyone noticing, and the stress melted away for a few hours.',
            effects: { happiness: 6, karma: -4 },
          },
          {
            weight: 5,
            message: 'A surprise search caught you red-handed. You spent days in solitary confinement.',
            effects: { happiness: -10, karma: -6, health: -4 },
          },
        ],
      },
      {
        id: 'report',
        label: 'Report it to the guards',
        icon: '📢',
        outcomes: [
          {
            message: 'The staff noted your cooperation. Not everyone on the block appreciates it.',
            effects: { karma: 2, happiness: -2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_library_hours',
    title: 'Library Hours',
    icon: '📚',
    category: 'education',
    repeatable: true,
    description:
      'The prison library is open this afternoon. It is one of the few places in the facility where it is actually quiet.',
    choices: [
      {
        id: 'law_books',
        label: 'Study law books',
        icon: '⚖️',
        outcomes: [
          {
            message: 'You dug into legal texts and left the library understanding the system a lot better.',
            effects: { smarts: 4, happiness: 2 },
          },
        ],
      },
      {
        id: 'novels',
        label: 'Escape into novels',
        icon: '📖',
        outcomes: [
          {
            message: 'For a few hours you were somewhere far away from these walls.',
            effects: { smarts: 2, happiness: 4 },
          },
        ],
      },
      {
        id: 'nap',
        label: 'Sneak a nap in the corner',
        icon: '😴',
        outcomes: [
          {
            message: 'A rare quiet nap. The librarian pretended not to notice.',
            effects: { health: 1, happiness: 1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_work_detail_offer',
    title: 'Work Detail Offer',
    icon: '🧺',
    category: 'money',
    repeatable: true,
    description:
      'A corrections officer asks if you want to pick up a paid work detail this week. The pay is tiny, but it breaks the monotony.',
    choices: [
      {
        id: 'laundry',
        label: 'Take the laundry detail',
        icon: '🧼',
        outcomes: [
          {
            message: 'Hot, boring, and steady. You earned a little commissary money and some respect from the staff.',
            effects: { cash: 45, health: -1, karma: 1 },
          },
        ],
      },
      {
        id: 'kitchen',
        label: 'Work in the kitchen',
        icon: '🍳',
        outcomes: [
          {
            weight: 7,
            message: 'You got extra food and a tiny paycheck for your trouble.',
            effects: { cash: 40, happiness: 2, health: 1 },
          },
          {
            weight: 3,
            message: 'A greasy burn on your forearm made the shift a long one.',
            effects: { cash: 40, health: -3 },
          },
        ],
      },
      {
        id: 'decline',
        label: 'Decline and stay in your cell',
        icon: '🛏️',
        outcomes: [
          {
            message: 'You skipped it. The days dragged by a little slower.',
            effects: { happiness: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_letter_from_mom',
    title: 'Letter From Mom',
    icon: '💌',
    category: 'relationship',
    repeatable: true,
    description:
      'Mail call. Your mother, {motherName}, wrote you a letter. You can tell by the handwriting before you even open it.',
    choices: [
      {
        id: 'write_back',
        label: 'Write back warmly',
        icon: '✍️',
        outcomes: [
          {
            message: 'You poured your heart out. Her reply was full of love and told you she was waiting for you.',
            effects: { motherRelationship: 8, happiness: 5 },
          },
        ],
      },
      {
        id: 'ask_money',
        label: 'Ask her for a little money for your books',
        icon: '💵',
        outcomes: [
          {
            weight: 5,
            message: '{motherName} slipped some money into your account and told you to stay strong.',
            effects: { cash: 50, motherRelationship: 2, happiness: 3 },
          },
          {
            weight: 5,
            message: '{motherName} could not afford to send anything and the letter ended coldly.',
            effects: { motherRelationship: -4, happiness: -2 },
          },
        ],
      },
      {
        id: 'ignore',
        label: 'Leave it unread',
        icon: '🚫',
        outcomes: [
          {
            message: 'You could not face it. Weeks later the guilt was heavier than the letter would ever have been.',
            effects: { motherRelationship: -6, happiness: -3 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_phone_call_dad',
    title: 'A Call From Dad',
    icon: '📞',
    category: 'relationship',
    repeatable: true,
    description:
      'Your father, {fatherName}, accepted the charges on the prison phone. The line is crackling and the clock is ticking.',
    choices: [
      {
        id: 'apologize',
        label: 'Apologize for everything',
        icon: '🙏',
        outcomes: [
          {
            weight: 7,
            message: '{fatherName} was quiet for a long time, then told you he still believed you could turn it around.',
            effects: { fatherRelationship: 8, happiness: 5 },
          },
          {
            weight: 3,
            message: '{fatherName} was not ready to forgive yet, but he stayed on the line until the call cut off.',
            effects: { fatherRelationship: 3, happiness: 1 },
          },
        ],
      },
      {
        id: 'small_talk',
        label: 'Keep it light and ask about home',
        icon: '🏡',
        outcomes: [
          {
            message: 'You talked about sports and the neighborhood. It felt almost normal for a few minutes.',
            effects: { fatherRelationship: 3, happiness: 3 },
          },
        ],
      },
      {
        id: 'blame',
        label: 'Blame him and others for how things turned out',
        icon: '😠',
        outcomes: [
          {
            message: '{fatherName} hung up on you. The silence afterwards was worse than the shouting.',
            effects: { fatherRelationship: -8, happiness: -4, karma: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_rehab_program',
    title: 'Rehabilitation Program',
    icon: '🕊️',
    category: 'milestone',
    repeatable: true,
    description:
      'A counselor invites you to join a rehabilitation and life-skills program that looks good on a future parole file.',
    choices: [
      {
        id: 'join',
        label: 'Join wholeheartedly',
        icon: '🤝',
        outcomes: [
          {
            message: 'You learned to manage your temper and plan for life outside. The staff took notice.',
            effects: { smarts: 3, karma: 3, happiness: 2 },
          },
        ],
      },
      {
        id: 'mock',
        label: 'Go along but mock it with the other inmates',
        icon: '🙄',
        outcomes: [
          {
            message: 'You got a few laughs from the back row, but the counselor noted your attitude.',
            effects: { happiness: 2, karma: -2 },
          },
        ],
      },
      {
        id: 'skip',
        label: 'Skip it',
        icon: '🛑',
        outcomes: [
          {
            message: 'You sat it out. Nothing changed, for better or worse.',
            effects: { happiness: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_yard_workout',
    title: 'Yard Workout',
    icon: '🏋️',
    category: 'health',
    repeatable: true,
    description:
      'A group of inmates runs a workout crew on the weight pile and has an open spot if you want in.',
    choices: [
      {
        id: 'join_crew',
        label: 'Train with the crew',
        icon: '💪',
        outcomes: [
          {
            weight: 8,
            message: 'You pushed hard with the crew and felt stronger and more respected by the end of the week.',
            effects: { health: 4, happiness: 3 },
          },
          {
            weight: 2,
            message: 'You overdid it on the bench and strained a shoulder.',
            effects: { health: -6, happiness: 1 },
          },
        ],
      },
      {
        id: 'solo_run',
        label: 'Run laps alone',
        icon: '🏃',
        outcomes: [
          {
            message: 'Round and round the track, your head cleared with every lap.',
            effects: { health: 2, happiness: 2 },
          },
        ],
      },
      {
        id: 'skip_workout',
        label: 'Skip it and lie on your bunk',
        icon: '🛏️',
        outcomes: [
          {
            message: 'You let another week slide by without moving much.',
            effects: { health: -1, happiness: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_cafeteria_mystery_meat',
    title: 'Mystery Meat Monday',
    icon: '🍖',
    category: 'health',
    repeatable: true,
    description:
      'The cafeteria is serving something gray and unidentifiable. Everyone on the line is eyeing their tray with suspicion.',
    choices: [
      {
        id: 'eat_it',
        label: 'Eat it anyway',
        icon: '😬',
        outcomes: [
          {
            weight: 7,
            message: 'It tasted exactly as bad as it looked, but your stomach survived.',
            effects: { happiness: -1 },
          },
          {
            weight: 3,
            message: 'You spent the night doubled over with food poisoning in the infirmary.',
            effects: { health: -8, happiness: -4 },
          },
        ],
      },
      {
        id: 'trade',
        label: 'Trade it for commissary ramen',
        icon: '🍜',
        outcomes: [
          {
            message: 'A little hot ramen and a small win in the prison economy.',
            effects: { cash: -10, happiness: 2 },
          },
        ],
      },
      {
        id: 'skip_meal',
        label: 'Skip the meal entirely',
        icon: '🚫',
        outcomes: [
          {
            message: 'You went to bed hungry and a little grumpy.',
            effects: { health: -2, happiness: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_cell_shakedown',
    title: 'Cell Shakedown',
    icon: '🔦',
    category: 'misfortune',
    repeatable: true,
    description:
      'Guards storm into your cell for a surprise search, flipping the mattress and dumping your belongings on the floor.',
    choices: [
      {
        id: 'cooperate',
        label: 'Stay calm and cooperate',
        icon: '🧘',
        outcomes: [
          {
            message: 'They found nothing and left a mess behind. You cleaned up and moved on.',
            effects: { happiness: -2, karma: 1 },
          },
        ],
      },
      {
        id: 'protest',
        label: 'Protest loudly',
        icon: '📣',
        outcomes: [
          {
            weight: 4,
            message: 'A guard let it slide and the search ended quickly.',
            effects: { happiness: 0 },
          },
          {
            weight: 6,
            message: 'You were written up for insubordination and lost a few privileges.',
            effects: { happiness: -6, karma: -2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_lockdown',
    title: 'Facility Lockdown',
    icon: '🔒',
    category: 'misfortune',
    repeatable: true,
    description:
      'An incident in another block triggers a facility-wide lockdown. You are confined to your cell for days with no yard time.',
    choices: [
      {
        id: 'read',
        label: 'Read and study to pass the time',
        icon: '📘',
        outcomes: [
          {
            message: 'You worked through every book in the cell twice. Your mind stayed sharp.',
            effects: { smarts: 2, happiness: -1 },
          },
        ],
      },
      {
        id: 'cell_exercise',
        label: 'Do push-ups and sit-ups in your cell',
        icon: '🤸',
        outcomes: [
          {
            message: 'You turned the cramped cell into a gym and kept your body moving.',
            effects: { health: 2, happiness: 0 },
          },
        ],
      },
      {
        id: 'brood',
        label: 'Stare at the ceiling and brood',
        icon: '😞',
        outcomes: [
          {
            message: 'The walls closed in and every regret came back to haunt you.',
            effects: { happiness: -5, health: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_riot',
    title: 'Cell Block Riot',
    icon: '🔥',
    category: 'misfortune',
    repeatable: true,
    weight: 0.5,
    description:
      'Shouting erupts and a riot breaks out on your cell block. Alarms are blaring and inmates are swarming the corridors.',
    choices: [
      {
        id: 'hide',
        label: 'Lock yourself in your cell and hide',
        icon: '🙈',
        outcomes: [
          {
            weight: 7,
            message: 'You stayed out of sight until the tactical team restored order.',
            effects: { happiness: -2 },
          },
          {
            weight: 3,
            message: 'The chaos spilled into your cell and you took a few hits before it was over.',
            effects: { health: -12, happiness: -5 },
          },
        ],
      },
      {
        id: 'join_riot',
        label: 'Join the chaos',
        icon: '😡',
        outcomes: [
          {
            message: 'You were hit with pepper spray and written up when the guards regained control.',
            effects: { health: -15, karma: -6, happiness: -4 },
          },
        ],
      },
      {
        id: 'help_injured',
        label: 'Help an injured inmate to safety',
        icon: '🩹',
        outcomes: [
          {
            message: 'You dragged him out of the crush. You took a bruise, but he will never forget it.',
            effects: { health: -6, karma: 6, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_counseling_session',
    title: 'Counseling Session',
    icon: '🛋️',
    category: 'health',
    repeatable: true,
    description:
      'The prison psychologist has a free slot this week and asks whether you want to talk about how you are holding up.',
    choices: [
      {
        id: 'open_up',
        label: 'Open up honestly',
        icon: '💬',
        outcomes: [
          {
            message: 'Saying it all out loud lifted a weight off your chest.',
            effects: { happiness: 6, karma: 1 },
          },
        ],
      },
      {
        id: 'stay_quiet',
        label: 'Stay guarded and say little',
        icon: '🤐',
        outcomes: [
          {
            message: 'The hour dragged by. Nothing changed.',
            effects: { happiness: -1 },
          },
        ],
      },
      {
        id: 'manipulate',
        label: 'Say whatever makes you look good for parole',
        icon: '🎭',
        outcomes: [
          {
            message: 'You played the game convincingly, but a small part of you felt hollow afterwards.',
            effects: { happiness: 1, karma: -2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_homemade_tattoo',
    title: 'Homemade Tattoo',
    icon: '🖋️',
    category: 'social',
    repeatable: true,
    description:
      'An inmate who is known for his improvised tattoo gun offers to give you some ink in exchange for a few commissary items.',
    choices: [
      {
        id: 'get_tattoo',
        label: 'Get the tattoo',
        icon: '🐍',
        outcomes: [
          {
            weight: 7,
            message: 'It came out better than expected and earned you some respect on the block.',
            effects: { looks: 3, happiness: 4, cash: -15 },
          },
          {
            weight: 3,
            message: 'The needle was dirty and the tattoo got infected, leaving an ugly scar.',
            effects: { looks: -2, health: -8, cash: -15 },
          },
        ],
      },
      {
        id: 'decline_tattoo',
        label: 'Politely decline',
        icon: '✋',
        outcomes: [
          {
            message: 'You passed. It is one less thing to explain to a future employer.',
            effects: { happiness: 0 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_inmate_debt',
    title: 'Inmate Debt',
    icon: '💸',
    category: 'misfortune',
    repeatable: true,
    description:
      'Another inmate corners you and claims you owe him for a favor you barely remember. He wants payment before the week is out.',
    choices: [
      {
        id: 'pay',
        label: 'Pay him to make it go away',
        icon: '💵',
        outcomes: [
          {
            message: 'You paid up. It stung, but it ended the problem for now.',
            effects: { cash: -30, happiness: -3 },
          },
        ],
      },
      {
        id: 'refuse_pay',
        label: 'Refuse to pay',
        icon: '🙅',
        outcomes: [
          {
            weight: 6,
            message: 'He thought twice and let it go. You earned a reputation as someone who cannot be pushed around.',
            effects: { happiness: -1 },
          },
          {
            weight: 4,
            message: 'He sent two friends to teach you a lesson in the shower room.',
            effects: { health: -9, happiness: -4 },
          },
        ],
      },
      {
        id: 'tell_guard',
        label: 'Tell a guard',
        icon: '🚨',
        outcomes: [
          {
            message: 'The guards moved him to another block, though people on the unit will talk.',
            effects: { karma: 1, happiness: -2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_pen_pal_letter',
    title: 'Pen Pal Letter',
    icon: '✉️',
    category: 'social',
    repeatable: true,
    description:
      'A stranger from a prison pen-pal program wrote to you, offering friendly conversation and encouragement.',
    choices: [
      {
        id: 'write_pen_pal',
        label: 'Write back',
        icon: '✍️',
        outcomes: [
          {
            message: 'Their kind words became something to look forward to every month.',
            effects: { happiness: 5, karma: 1 },
          },
        ],
      },
      {
        id: 'toss_letter',
        label: 'Toss it away',
        icon: '🗑️',
        outcomes: [
          {
            message: 'You did not want sympathy from a stranger. The cell felt a bit emptier afterwards.',
            effects: { happiness: -2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_new_cellmate',
    title: 'New Cellmate',
    icon: '🛏️',
    category: 'social',
    description:
      'A guard escorts a new inmate to your cell and says he will be sharing it with you. He sets down his bag and nods your way.',
    choices: [
      {
        id: 'befriend_cellmate',
        label: 'Introduce yourself and make him feel welcome',
        icon: '🤝',
        outcomes: [
          {
            message: 'He turned out to be decent company. You swapped stories late into the night.',
            effects: { happiness: 4, karma: 1 },
            personIntroduced: {
              firstName: 'Marcus',
              lastName: 'Hale',
              gender: 'male',
              age: 31,
              role: 'Cellmate',
              relationshipType: 'friend',
              relationship: 60,
              originStory: 'Assigned to share your cell during your prison sentence.',
              stageMet: 'adulthood',
              avatarEmoji: '🧔',
            },
          },
        ],
      },
      {
        id: 'keep_distance',
        label: 'Keep your distance and watch him',
        icon: '👀',
        outcomes: [
          {
            message: 'You slept lightly for weeks, never fully trusting him.',
            effects: { happiness: -2, health: -1 },
          },
        ],
      },
      {
        id: 'claim_territory',
        label: 'Make it clear who owns the lower bunk',
        icon: '😤',
        outcomes: [
          {
            weight: 5,
            message: 'He nodded and took the top bunk without a word.',
            effects: { happiness: 1, karma: -1 },
          },
          {
            weight: 5,
            message: 'It started a tense standoff that ended with a stern warning from the guards.',
            effects: { happiness: -3, karma: -2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_veteran_mentor',
    title: 'Advice From a Lifer',
    icon: '🧓',
    category: 'social',
    description:
      'An older inmate who has been inside for decades has been watching you. He offers to share what he has learned about surviving and using the time well.',
    choices: [
      {
        id: 'listen',
        label: 'Sit down and listen',
        icon: '👂',
        outcomes: [
          {
            message: 'His advice on routine, respect, and what to do after release stuck with you.',
            effects: { smarts: 3, karma: 1, happiness: 3 },
            personIntroduced: {
              firstName: 'Walter',
              lastName: 'Briggs',
              gender: 'male',
              age: 62,
              role: 'Prison Mentor',
              relationshipType: 'mentor',
              relationship: 55,
              originStory: 'A veteran inmate who took you under his wing during your sentence.',
              stageMet: 'adulthood',
              avatarEmoji: '🧓',
            },
          },
        ],
      },
      {
        id: 'brush_off',
        label: 'Brush him off',
        icon: '🙄',
        outcomes: [
          {
            message: 'He shrugged and walked away. You wondered later if you missed something valuable.',
            effects: { happiness: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_tv_dispute',
    title: 'Day Room TV Dispute',
    icon: '📺',
    category: 'social',
    repeatable: true,
    description:
      'The day room TV is the most valuable thing on the block, and two groups are arguing loudly over what to watch.',
    choices: [
      {
        id: 'compromise',
        label: 'Suggest a compromise',
        icon: '🤝',
        outcomes: [
          {
            message: 'Everyone took turns picking the channel. Peace held, and a few inmates owe you one.',
            effects: { karma: 1, happiness: 2 },
          },
        ],
      },
      {
        id: 'argue',
        label: 'Argue for your favorite show',
        icon: '🗣️',
        outcomes: [
          {
            message: 'The shouting match got you banned from the day room for a few days.',
            effects: { karma: -1, happiness: -2 },
          },
        ],
      },
      {
        id: 'watch_from_corner',
        label: 'Stay out of it and watch from the corner',
        icon: '🍿',
        outcomes: [
          {
            message: 'You enjoyed the show and the chaos from a safe distance.',
            effects: { happiness: 1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_vocational_workshop',
    title: 'Vocational Workshop',
    icon: '🛠️',
    category: 'education',
    repeatable: true,
    description:
      'The facility is offering a vocational workshop in carpentry, welding, and basic electrical work for inmates who want a trade.',
    choices: [
      {
        id: 'enroll_workshop',
        label: 'Enroll and take it seriously',
        icon: '🔧',
        outcomes: [
          {
            message: 'You picked up real skills that could help you find honest work after your release.',
            effects: { smarts: 3, happiness: 2, karma: 1 },
          },
        ],
      },
      {
        id: 'slack_workshop',
        label: 'Sign up but slack off',
        icon: '😴',
        outcomes: [
          {
            message: 'You mostly sat in the back and watched the clock.',
            effects: { happiness: 0, karma: -1 },
          },
        ],
      },
      {
        id: 'skip_workshop',
        label: 'Pass on it',
        icon: '🚪',
        outcomes: [
          {
            message: 'You decided it was not worth the effort. The weeks passed slowly.',
            effects: { happiness: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_holiday_behind_bars',
    title: 'Holiday Behind Bars',
    icon: '🎄',
    category: 'milestone',
    repeatable: true,
    description:
      'A holiday rolls around and the facility serves a special meal. It is hard not to think about where you would rather be.',
    choices: [
      {
        id: 'join_meal',
        label: 'Join the holiday meal and chapel service',
        icon: '🍽️',
        outcomes: [
          {
            message: 'The food was passable and the singing was off-key, but for an hour it felt a bit like home.',
            effects: { happiness: 3, health: 1 },
          },
        ],
      },
      {
        id: 'organize_game',
        label: 'Organize a card game for the block',
        icon: '🃏',
        outcomes: [
          {
            message: 'You turned a dull holiday into a lively evening and won some goodwill.',
            effects: { happiness: 4, karma: 1 },
          },
        ],
      },
      {
        id: 'isolate',
        label: 'Stay in your cell alone',
        icon: '🛏️',
        outcomes: [
          {
            message: 'You spent the whole day thinking about the people you were missing.',
            effects: { happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_guard_informant_offer',
    title: 'Guard Offers a Deal',
    icon: '🕵️',
    category: 'misfortune',
    repeatable: true,
    description:
      'A guard pulls you aside and hints that cooperating with him by passing along information about other inmates could earn you favors.',
    choices: [
      {
        id: 'refuse_informant',
        label: 'Refuse to inform',
        icon: '🙅',
        outcomes: [
          {
            message: 'You told him you do not do favors for the guards. He gave you a cold stare but dropped it.',
            effects: { karma: 2, happiness: -2 },
          },
        ],
      },
      {
        id: 'inform',
        label: 'Accept the deal',
        icon: '🗣️',
        outcomes: [
          {
            weight: 6,
            message: 'You got a few small privileges and nobody found out.',
            effects: { happiness: 3, karma: -4 },
          },
          {
            weight: 4,
            message: 'Word got out that you were talking to the guards, and a group of inmates made you pay for it.',
            effects: { health: -10, karma: -4, happiness: -5 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_counting_days',
    title: 'Counting the Days',
    icon: '🗓️',
    category: 'milestone',
    repeatable: true,
    description:
      'Another stretch of your sentence is behind you. Lying on your bunk, you scratch another mark on the wall and think about what comes next.',
    choices: [
      {
        id: 'plan_future',
        label: 'Write down a plan for life after release',
        icon: '📝',
        outcomes: [
          {
            message: 'Putting goals on paper gave the days some purpose and gave you something to work toward.',
            effects: { happiness: 3, smarts: 1 },
          },
        ],
      },
      {
        id: 'despair',
        label: 'Let the despair sink in',
        icon: '😔',
        outcomes: [
          {
            message: 'The weight of how much time is left was crushing, and you barely ate for days.',
            effects: { happiness: -6, health: -2 },
          },
        ],
      },
      {
        id: 'fantasize_escape',
        label: 'Daydream about escaping',
        icon: '🏃',
        outcomes: [
          {
            message: 'The fantasy was entertaining for a while, but reality always pulled you back.',
            effects: { happiness: 1, karma: -1 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_infirmary_checkup',
    title: 'Annual Medical Checkup',
    icon: '🩺',
    category: 'health',
    repeatable: true,
    description:
      'A prison nurse rounds through your block offering routine physical checkups, vitamins, and basic cold medicine.',
    choices: [
      {
        id: 'take_checkup',
        label: 'Get examined and take the vitamins',
        icon: '💊',
        outcomes: [
          {
            message: 'The checkup caught minor fatigue early, and the vitamins helped you bounce back.',
            effects: { health: 7, happiness: 2 },
          },
        ],
      },
      {
        id: 'rest_infirmary',
        label: 'Ask for a night of rest in the infirmary ward',
        icon: '🛌',
        outcomes: [
          {
            message: 'A quiet night away from the cellblock noise did wonders for your body.',
            effects: { health: 9, happiness: 3 },
          },
        ],
      },
      {
        id: 'give_spot',
        label: 'Let an older sick inmate go ahead of you',
        icon: '🤝',
        outcomes: [
          {
            message: 'He thanked you sincerely. The block noticed the decency.',
            effects: { karma: 4, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    ...JAIL_BASE,
    id: 'jail_restful_weekend',
    title: 'Quiet Weekend Recovery',
    icon: '☀️',
    category: 'health',
    repeatable: true,
    description:
      'For once, the cellblock is calm all weekend. You have time to stretch, hydrate, and catch up on real sleep.',
    choices: [
      {
        id: 'sleep_recover',
        label: 'Stretch, hydrate, and sleep early',
        icon: '🧘',
        outcomes: [
          {
            message: 'Two solid nights of uninterrupted sleep left you feeling noticeably healthier.',
            effects: { health: 7, happiness: 3 },
          },
        ],
      },
      {
        id: 'calisthenics',
        label: 'Do a light bodyweight routine',
        icon: '🤸',
        outcomes: [
          {
            message: 'Your energy came back and your posture felt stronger by Monday morning.',
            effects: { health: 6, happiness: 2 },
          },
        ],
      },
      {
        id: 'read_quietly',
        label: 'Spend the weekend reading',
        icon: '📖',
        outcomes: [
          {
            message: 'A peaceful weekend with a good book refreshed your mind.',
            effects: { smarts: 2, health: 2, happiness: 3 },
          },
        ],
      },
    ],
  },
]
