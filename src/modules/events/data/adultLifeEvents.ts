import type { LifeEventTemplate } from '../types';

/**
 * Everyday interactive choice events for adults and seniors (ages 18+) so life stays
 * engaging even when unemployed, retired, single, or between major career/family milestones.
 */
export const ADULT_LIFE_EVENTS: LifeEventTemplate[] = [
  {
    id: 'adult_neighbor_lockout',
    title: 'Neighbor Locked Out',
    icon: '🔑',
    category: 'social',
    minAge: 18,
    maxAge: 85,
    weight: 1.1,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age', 'old_age'] },
    description:
      'While heading out with groceries, you spot your next-door neighbor shivering on the porch in slippers after accidentally locking themselves out.',
    choices: [
      {
        id: 'invite_and_locksmith',
        label: 'Invite them in for warm tea and help call a locksmith',
        icon: '☕',
        outcomes: [
          {
            message:
              'They warmed up in your kitchen until the locksmith arrived, and dropped off homemade lasagna the next evening!',
            effects: { karma: 6, happiness: 5 },
          },
        ],
      },
      {
        id: 'lend_phone_only',
        label: 'Hand over your phone politely from the doorway and keep moving',
        icon: '📱',
        outcomes: [
          {
            message:
              'They called a roommate right away and thanked you politely before heading back to their steps.',
            effects: { karma: 2, happiness: 1 },
          },
        ],
      },
      {
        id: 'ignore_neighbor',
        label: 'Pretend not to notice and head straight inside',
        icon: '🚪',
        outcomes: [
          {
            message:
              'You kept your evening strictly quiet, though you avoided eye contact by the mailboxes all week.',
            effects: { karma: -3, happiness: -1 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_flea_market_find',
    title: 'Flea Market Mystery Crate',
    icon: '🧰',
    category: 'money',
    minAge: 18,
    maxAge: 85,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age', 'old_age'], minCash: 60 },
    description:
      'Browsing a Sunday flea market stall, you spot a dusty locked wooden box of vintage electronics and records offered "as-is" for $60.',
    choices: [
      {
        id: 'buy_mystery_box',
        label: 'Buy the crate for $60 and inspect it at home',
        icon: '🎲',
        outcomes: [
          {
            weight: 4,
            message:
              'Jackpot! Beneath tangled cables sat a mint collector’s film camera that fetched $420 online!',
            effects: { cash: 360, happiness: 7 },
          },
          {
            weight: 6,
            message:
              'Mostly rusted cassette players — fun to tinker with for a weekend, though worth zero resale cash.',
            effects: { cash: -60, smarts: 2, happiness: 1 },
          },
        ],
      },
      {
        id: 'haggle_low',
        label: 'Offer $25 cash and walk if they refuse',
        icon: '🤝',
        outcomes: [
          {
            weight: 5,
            message:
              'The vendor shrugged and took your $25. You flipped a neat retro lamp inside for $95!',
            effects: { cash: 70, smarts: 2, happiness: 4 },
          },
          {
            weight: 5,
            message:
              'The vendor shook their head firm on $60, so you saved your cash and grabbed lunch instead.',
            effects: { happiness: 1 },
          },
        ],
      },
      {
        id: 'skip_junk',
        label: 'Save your cash — mystery crates are almost always junk',
        icon: '🚶',
        outcomes: [
          {
            message:
              'You strolled through the rest of the market window-shopping with a clear wallet.',
            effects: { smarts: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_old_friend_reunion',
    title: 'Unexpected Old Friend Reunion',
    icon: '🥂',
    category: 'social',
    minAge: 21,
    maxAge: 85,
    weight: 1.1,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age', 'old_age'] },
    description:
      'Waiting at a local bakery counter, someone calls out your name — it’s an old classmate you haven’t seen in years, in town for just this afternoon.',
    choices: [
      {
        id: 'lunch_catchup',
        label: 'Clear an hour, buy lunch ($35), and actually catch up',
        icon: '🥪',
        outcomes: [
          {
            message:
              'Stories poured out non-stop over sandwiches. Leaving with their number again felt genuinely uplifting!',
            effects: { cash: -35, happiness: 7 },
          },
        ],
      },
      {
        id: 'quick_hello',
        label: 'Chat warmly for five minutes and exchange numbers cleanly',
        icon: '👋',
        outcomes: [
          {
            message:
              'Short, sweet, and genuinely pleasant before getting back to your errands.',
            effects: { happiness: 3 },
          },
        ],
      },
      {
        id: 'duck_out',
        label: 'Give a tight wave and hurry out before conversation starts',
        icon: '🏃',
        outcomes: [
          {
            message:
              'You avoided awkward small talk, though you wondered later what they were up to.',
            effects: { happiness: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_charity_5k_run',
    title: 'Neighborhood Charity 5K',
    icon: '🏃',
    category: 'health',
    minAge: 18,
    maxAge: 75,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age', 'old_age'] },
    description:
      'Flyers around the park announce a weekend 5K fun run raising funds for the local community clinic ($25 registration).',
    choices: [
      {
        id: 'run_hard',
        label: 'Pay the $25 entry and push for a personal best time',
        icon: '🏅',
        outcomes: [
          {
            weight: 7,
            message:
              'Crossed the finish line drenched in sweat with a finisher medal and glowing runner’s high!',
            effects: { cash: -25, health: 6, happiness: 6, karma: 4 },
          },
          {
            weight: 3,
            message:
              'You pushed hard up the final hill and cramped your calf, though you finished proud for a good cause.',
            effects: { cash: -25, health: 2, happiness: 3, karma: 4 },
          },
        ],
      },
      {
        id: 'volunteer_water',
        label: 'Volunteer at the water station instead ($0)',
        icon: '🥤',
        outcomes: [
          {
            message:
              'Handing cups and cheering exhausted runners all morning filled the whole block with energy!',
            effects: { karma: 6, happiness: 5 },
          },
        ],
      },
      {
        id: 'sleep_in',
        label: 'Sleep through Saturday morning instead',
        icon: '🛌',
        outcomes: [
          {
            message:
              'You caught two extra hours of sleep while faint cheering echoed down the street.',
            effects: { happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_erroneous_refund',
    title: 'Surprise Store Over-Refund',
    icon: '🧾',
    category: 'money',
    minAge: 18,
    maxAge: 90,
    weight: 1.0,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age', 'old_age'] },
    description:
      'Checking your wallet receipt after returning a broken toaster, you realize the cashier accidentally handed you an extra $200 in cash.',
    choices: [
      {
        id: 'return_extra',
        label: 'Walk right back to the counter and return the $200',
        icon: '😇',
        outcomes: [
          {
            message:
              'The relieved cashier thanked you repeatedly, saving them from a register shortage warning.',
            effects: { karma: 10, happiness: 4 },
          },
        ],
      },
      {
        id: 'donate_split',
        label: 'Drop $50 in the local food bank jar and keep $150',
        icon: '🪙',
        outcomes: [
          {
            message:
              'Mixed feelings lingered a bit, though your wallet grew heavier.',
            effects: { cash: 150, karma: -2 },
          },
        ],
      },
      {
        id: 'pocket_all',
        label: 'Shrug quietly and pocket all $200',
        icon: '💵',
        outcomes: [
          {
            message:
              'Free windfall in your pocket — easy come, easy go.',
            effects: { cash: 200, karma: -8, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_cooking_class_invite',
    title: 'Weekend Culinary Workshop',
    icon: '👨‍🍳',
    category: 'health',
    minAge: 18,
    maxAge: 85,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age', 'old_age'] },
    description:
      'A small neighborhood kitchen studio has one last seat open tonight for a hands-on Mediterranean pasta & nutrition workshop ($75).',
    choices: [
      {
        id: 'join_class',
        label: 'Book the seat ($75) and master three fresh dishes',
        icon: '🍝',
        outcomes: [
          {
            message:
              'Knife skills, garlic aroma, and great table company turned cooking from chore into hobby!',
            effects: { cash: -75, health: 4, smarts: 3, happiness: 6 },
          },
        ],
      },
      {
        id: 'library_cookbook',
        label: 'Borrow a top chef cookbook from the library ($0) and practice home-style',
        icon: '📖',
        outcomes: [
          {
            message:
              'One smoky pan later, you nailed homemade roasted vegetables without spending a dime.',
            effects: { health: 3, smarts: 2, happiness: 3 },
          },
        ],
      },
      {
        id: 'order_takeout',
        label: 'Skip cooking entirely and order greasy takeout ($20)',
        icon: '🍔',
        outcomes: [
          {
            message:
              'Zero dishes to wash, though the heavy fries caught up with your energy.',
            effects: { cash: -20, happiness: 3, health: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_flat_tire_stranger',
    title: 'Stranded Motorist in the Rain',
    icon: '🌧️',
    category: 'social',
    minAge: 18,
    maxAge: 80,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age', 'old_age'] },
    description:
      'Walking back in pouring rain, you pass an anxious driver staring helplessly at a shredded flat tire on the shoulder with hazard lights blinking.',
    choices: [
      {
        id: 'help_change_tire',
        label: 'Roll up your sleeves and help swap the spare tire in the rain',
        icon: '🔧',
        outcomes: [
          {
            message:
              'Soaked to the bone in ten minutes, yet the driver shook your hand warmly and insisted you take $50 for dry cleaning!',
            effects: { cash: 50, health: -1, karma: 8, happiness: 6 },
          },
        ],
      },
      {
        id: 'call_roadside',
        label: 'Hold an umbrella over them and call roadside assistance',
        icon: '☔',
        outcomes: [
          {
            message:
              'Keeping them calm out of the downpour until the tow truck arrived made all the difference.',
            effects: { karma: 5, happiness: 3 },
          },
        ],
      },
      {
        id: 'keep_walking',
        label: 'Pull up your hood and hurry home dry',
        icon: '🧥',
        outcomes: [
          {
            message:
              'You stayed warm and dry inside before dinner.',
            effects: { karma: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_freelance_weekend_gig',
    title: 'Weekend Helping-Hands Offer',
    icon: '🛠️',
    category: 'money',
    minAge: 18,
    maxAge: 75,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age'] },
    description:
      'A local small shop owner on your block needs reliable extra hands setting up displays and inventory for a two-day sidewalk sale.',
    choices: [
      {
        id: 'work_full_weekend',
        label: 'Take the full weekend shift ($320)',
        icon: '💪',
        outcomes: [
          {
            message:
              'Sore shoulders on Sunday night, but $320 crisp cash in your pocket felt great!',
            effects: { cash: 320, health: -2, happiness: 3 },
          },
        ],
      },
      {
        id: 'help_half_day',
        label: 'Help just Saturday morning ($140) and keep your Sunday free',
        icon: '⏱️',
        outcomes: [
          {
            message:
              'Balanced effort: quick $140 earned and plenty of time left to recharge.',
            effects: { cash: 140, happiness: 2 },
          },
        ],
      },
      {
        id: 'pass_for_rest',
        label: 'Pass cleanly and guard your weekend rest',
        icon: '☕',
        outcomes: [
          {
            message:
              'You slept late and wandered the park unhurried all weekend.',
            effects: { health: 2, happiness: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_community_garden',
    title: 'Community Garden Plot Opening',
    icon: '🌻',
    category: 'health',
    minAge: 35,
    maxAge: 95,
    weight: 1.1,
    prisonCompatible: false,
    requires: { lifeStages: ['adulthood', 'middle_age', 'old_age'] },
    description:
      'A sunny raised bed just opened up at the neighborhood community garden ($40 seasonal fee for soil and heirloom seeds).',
    choices: [
      {
        id: 'claim_plot',
        label: 'Claim the plot ($40) and grow tomatoes, herbs, and sunflowers',
        icon: '🍅',
        outcomes: [
          {
            message:
              'Morning watering sessions and swapping recipes with regulars turned into the calmest ritual of your year!',
            effects: { cash: -40, health: 5, happiness: 7, karma: 3 },
          },
        ],
      },
      {
        id: 'windowsill_herbs',
        label: 'Pass on the big plot and plant basil on your windowsill ($10)',
        icon: '🌿',
        outcomes: [
          {
            message:
              'Fresh basil brightened up every home-cooked meal without the weeding.',
            effects: { cash: -10, health: 2, happiness: 3 },
          },
        ],
      },
      {
        id: 'skip_gardening',
        label: 'Leave it for someone else — dirt isn’t your thing',
        icon: '🧤',
        outcomes: [
          {
            message:
              'Zero muddy boots in your hallway, anyway.',
            effects: { happiness: 0 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_health_screening_fair',
    title: 'Free Health Screening Fair',
    icon: '🩺',
    category: 'health',
    minAge: 40,
    maxAge: 95,
    weight: 1.1,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['middle_age', 'old_age'] },
    description:
      'A mobile community health van is parked outside the civic center offering free blood pressure, vision, and nutrition consultations today.',
    choices: [
      {
        id: 'full_checkup_and_plan',
        label: 'Get screened and follow the nurse’s walking & hydration tips',
        icon: '📋',
        outcomes: [
          {
            message:
              'Catching minor numbers early and dialing in daily walks left you feeling noticeably steadier.',
            effects: { health: 6, smarts: 2, happiness: 3 },
          },
        ],
      },
      {
        id: 'quick_bp_only',
        label: 'Just take a quick blood pressure reading and grab a pamphlet',
        icon: '💓',
        outcomes: [
          {
            message:
              'Five minutes well spent for quick peace of mind.',
            effects: { health: 3, happiness: 1 },
          },
        ],
      },
      {
        id: 'skip_van',
        label: 'Wave it off — you feel fine anyway',
        icon: '🚶',
        outcomes: [
          {
            message:
              'You skipped the line, though slight afternoon fatigue stuck around.',
            effects: { health: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_mentor_young_local',
    title: 'Mentoring a Local Student',
    icon: '📚',
    category: 'social',
    minAge: 40,
    maxAge: 95,
    weight: 1.1,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['middle_age', 'old_age'] },
    description:
      'The neighborhood library asks experienced locals to spend an afternoon helping young adults polish resumes and practice interview skills.',
    choices: [
      {
        id: 'mentor_all_day',
        label: 'Host mock interviews all afternoon and share honest life lessons',
        icon: '🤝',
        outcomes: [
          {
            message:
              'Two nervous applicants landed callbacks the following week and sent you glowing thank-you cards!',
            effects: { karma: 8, happiness: 7, smarts: 2 },
          },
        ],
      },
      {
        id: 'donate_supplies',
        label: 'Drop off $40 worth of folders and interview guides instead',
        icon: '🎁',
        outcomes: [
          {
            message:
              'The librarians appreciated your thoughtful donation to the career shelf.',
            effects: { cash: -40, karma: 4, happiness: 3 },
          },
        ],
      },
      {
        id: 'decline_mentor',
        label: 'Decline — keep your quiet afternoon to yourself',
        icon: '☕',
        outcomes: [
          {
            message:
              'You enjoyed a peaceful afternoon reading at home.',
            effects: { happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'adult_bucket_list_trip',
    title: 'Spontaneous Bucket-List Train Trip',
    icon: '🚆',
    category: 'milestone',
    minAge: 45,
    maxAge: 95,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { lifeStages: ['middle_age', 'old_age'], minCash: 800 },
    description:
      'Spot a rare off-season scenic rail pass along coastal cliffs and mountain towns leaving tomorrow morning for $800.',
    choices: [
      {
        id: 'book_scenic_rail',
        label: 'Pack a light bag tonight and take the $800 scenic rail escape',
        icon: '🏔️',
        outcomes: [
          {
            message:
              'Watching sunsets glide past dining-car windows restored your spirit in a way no routine week ever could.',
            effects: { cash: -800, happiness: 14, health: 4 },
          },
        ],
      },
      {
        id: 'day_trip_nearby',
        label: 'Take a frugal $65 day train to a nearby historic harbor town',
        icon: '⛵',
        outcomes: [
          {
            message:
              'Fresh sea air, a harbor walk, and chowder gave you a miniature getaway on a budget.',
            effects: { cash: -65, happiness: 7, health: 2 },
          },
        ],
      },
      {
        id: 'stay_practical',
        label: 'Keep the $800 safely in reserve and stay home',
        icon: '🏦',
        outcomes: [
          {
            message:
              'Financially disciplined, even if you lingered slightly over the travel brochure.',
            effects: { smarts: 1 },
          },
        ],
      },
    ],
  },
];
