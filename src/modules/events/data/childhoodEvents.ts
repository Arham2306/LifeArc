import type { LifeEventTemplate } from '../types'

/** Ages 6 - 12 (No money can be earned or spent by the player; expenses go through parents) */
export const CHILDHOOD_EVENTS: LifeEventTemplate[] = [
  {
    id: 'museum_field_trip',
    title: 'School Museum Trip',
    icon: '🏛️',
    category: 'education',
    minAge: 6,
    maxAge: 12,
    description: 'Your school is organizing a trip to the Natural History Museum, and the permission slip requires your parents to pay the fee.',
    choices: [
      {
        id: 'ask_parents',
        label: 'Ask your parents to pay for the trip',
        icon: '🙏',
        outcomes: [
          { weight: 5, parentPaid: true, message: "{fatherName} and {motherName} happily paid the fee! You saw giant dinosaur skeletons and had an unforgettable day.", effects: { smarts: 5, happiness: 6, parents: 3 } },
          { weight: 5, parentPaid: false, message: "{fatherName} and {motherName} said money was tight this month and couldn't pay. You spent the day in study hall.", effects: { happiness: -4, smarts: 1 } },
        ],
      },
      {
        id: 'promise_chores',
        label: 'Promise to do extra chores if they pay',
        icon: '🧹',
        outcomes: [
          { message: "Impressed by your initiative, {motherName} and {fatherName} signed the slip and paid. The planetarium show was amazing!", effects: { smarts: 5, happiness: 5, karma: 3, parents: 6 } },
        ],
      },
      {
        id: 'skip_trip',
        label: "Don't bother asking and stay behind",
        icon: '😶',
        outcomes: [
          { message: "You never handed in the slip and sat in a quiet classroom while your friends toured the museum.", effects: { happiness: -3 } },
        ],
      },
    ],
  },
  {
    id: 'found_wallet',
    title: 'Found a Lost Wallet',
    icon: '👛',
    category: 'social',
    minAge: 7,
    maxAge: 12,
    description: 'While walking home from school, you spot a leather wallet dropped on the sidewalk.',
    choices: [
      {
        id: 'principal',
        label: 'Hand it to the school principal',
        icon: '😇',
        outcomes: [
          { message: "The principal praised your honesty in front of the whole school assembly.", effects: { karma: 10, happiness: 4 } },
        ],
      },
      {
        id: 'parents',
        label: 'Bring it home so your parents can return it',
        icon: '🏡',
        outcomes: [
          { message: "Your parents contacted the owner, who dropped off a box of fresh pastries to thank your family!", effects: { karma: 8, smarts: 2, happiness: 5 } },
        ],
      },
      {
        id: 'leave',
        label: 'Kick it into the bushes and keep walking',
        icon: '😈',
        outcomes: [
          { message: "You walked away pretending you saw nothing, but your conscience bothered you all evening.", effects: { karma: -8, happiness: -2 } },
        ],
      },
    ],
  },
  {
    id: 'playground_bully',
    title: 'Playground Bully',
    icon: '😠',
    category: 'social',
    minAge: 6,
    maxAge: 12,
    description: 'An older kid corners you at recess and demands your packed lunch.',
    choices: [
      {
        id: 'stand',
        label: 'Stand up to them',
        icon: '💪',
        outcomes: [
          { weight: 5, message: "You stood your ground and the bully backed off. Everyone saw it!", effects: { happiness: 7, karma: 2 } },
          { weight: 5, message: "The bully shoved you to the ground. You got a scraped knee, but you didn't back down.", effects: { health: -6, happiness: -3 } },
        ],
      },
      {
        id: 'teacher',
        label: 'Tell a teacher on duty',
        icon: '🧑‍🏫',
        outcomes: [
          { weight: 7, message: "The bully got detention for a week.", effects: { smarts: 2, karma: 2 } },
          { weight: 3, message: "The bully got detention, but now some kids call you a tattle-tale.", effects: { smarts: 2, happiness: -3 } },
        ],
      },
      {
        id: 'give',
        label: 'Hand over your lunch',
        icon: '😔',
        outcomes: [
          { message: "You went hungry at lunch and felt awful all afternoon.", effects: { happiness: -5, health: -2 } },
        ],
      },
    ],
  },
  {
    id: 'pop_quiz',
    title: 'Surprise Pop Quiz',
    icon: '📝',
    category: 'education',
    minAge: 7,
    maxAge: 12,
    description: 'Your teacher announces a surprise math quiz. You barely studied.',
    choices: [
      {
        id: 'try',
        label: 'Try your best',
        icon: '✏️',
        outcomes: [
          { weight: 6, message: "You passed! Turns out you knew more than you thought.", effects: { smarts: 4, happiness: 2 } },
          { weight: 4, message: "You failed, but you learned where you need to improve.", effects: { smarts: 1, happiness: -3 } },
        ],
      },
      {
        id: 'copy',
        label: "Copy your neighbor's answers",
        icon: '👀',
        outcomes: [
          { weight: 5, message: "You got an A. It doesn't feel quite as good as you hoped.", effects: { happiness: 2, karma: -4 } },
          { weight: 5, message: "The teacher caught you and called your parents.", effects: { happiness: -6, karma: -6 } },
        ],
      },
      {
        id: 'sick',
        label: 'Fake a stomach ache',
        icon: '🤒',
        outcomes: [
          { weight: 4, message: "The nurse called your parents to pick you up early. Freedom!", effects: { happiness: 3, karma: -2 } },
          { weight: 6, message: "The nurse wasn't fooled and walked you right back to class.", effects: { happiness: -3, karma: -2 } },
        ],
      },
    ],
  },
  {
    id: 'book_fair',
    title: 'School Book Fair',
    icon: '📚',
    category: 'education',
    minAge: 7,
    maxAge: 12,
    description: 'The annual Scholastic Book Fair has arrived in the school library with shiny posters, comics, and adventure novels.',
    choices: [
      {
        id: 'ask_parents',
        label: 'Ask your parents to buy you a book',
        icon: '🙋',
        outcomes: [
          { weight: 5, parentPaid: true, message: "{motherName} and {fatherName} gave you enough for a novel and a cool bookmark! You read it all week.", effects: { smarts: 5, happiness: 4, parents: 3 } },
          { weight: 5, parentPaid: false, message: "{fatherName} told you to borrow books from the library for free instead.", effects: { smarts: 2, happiness: -2 } },
        ],
      },
      {
        id: 'browse',
        label: 'Just browse with your friends',
        icon: '👀',
        outcomes: [
          { message: "You flipped through the comic books with your friends during library period.", effects: { happiness: 2, smarts: 1 } },
        ],
      },
    ],
  },
  {
    id: 'class_hamster',
    title: 'Class Pet Weekend',
    icon: '🐹',
    category: 'childhood',
    minAge: 6,
    maxAge: 10,
    description: "It's your turn to take the class hamster, Mr. Nibbles, home for the weekend.",
    choices: [
      {
        id: 'care',
        label: 'Take great care of him',
        icon: '🥕',
        outcomes: [
          { message: "Mr. Nibbles returned happy and well fed. Your teacher was impressed.", effects: { karma: 4, happiness: 3 } },
        ],
      },
      {
        id: 'roam',
        label: 'Let him roam the house',
        icon: '🏃',
        outcomes: [
          { weight: 5, message: "He had a blast exploring and came back to his cage on his own.", effects: { happiness: 3 } },
          { weight: 5, message: "He escaped behind the fridge. It took four hours to get him out.", effects: { happiness: -4, karma: -1 } },
        ],
      },
      {
        id: 'tricks',
        label: 'Teach him tricks',
        icon: '🎪',
        outcomes: [
          { message: "Mr. Nibbles can now spin on command. The class was amazed.", effects: { smarts: 3, happiness: 3 } },
        ],
      },
    ],
  },
  {
    id: 'sleepover',
    title: 'Sleepover Invite',
    icon: '🛏️',
    category: 'social',
    minAge: 8,
    maxAge: 12,
    description: "Your best friend invited you to a sleepover this Friday.",
    choices: [
      {
        id: 'allnight',
        label: 'Go and stay up all night',
        icon: '🍿',
        outcomes: [
          { message: "Pillow fights, scary movies and zero sleep. Legendary night.", effects: { happiness: 6, health: -2 } },
        ],
      },
      {
        id: 'early',
        label: 'Go, but sleep early',
        icon: '😴',
        outcomes: [
          { message: "You had fun and woke up well rested.", effects: { happiness: 3, health: 1 } },
        ],
      },
      {
        id: 'decline',
        label: 'Stay home',
        icon: '🏠',
        outcomes: [
          { message: "You saw the stories on Monday and felt a little left out.", effects: { happiness: -2 } },
        ],
      },
    ],
  },
  {
    id: 'broken_window',
    title: 'Broken Window',
    icon: '⚾',
    category: 'misfortune',
    minAge: 8,
    maxAge: 12,
    description: "Your baseball just smashed straight through your neighbor's window.",
    choices: [
      {
        id: 'confess',
        label: 'Tell your parents and apologize',
        icon: '🙇',
        outcomes: [
          { message: "Your parents paid the neighbor for the glass, and you had to do yard chores for a month.", effects: { karma: 6, happiness: -2 } },
        ],
      },
      {
        id: 'run',
        label: 'Run for it',
        icon: '🏃',
        outcomes: [
          { weight: 6, message: "You got away. Nobody ever found out... yet.", effects: { karma: -6, happiness: 1 } },
          { weight: 4, message: "Your neighbor recognized you and called your parents. Grounded for a month.", effects: { karma: -8, happiness: -6 } },
        ],
      },
      {
        id: 'blame',
        label: 'Blame your friend',
        icon: '👉',
        outcomes: [
          { message: "Your friend got in trouble. They haven't spoken to you since.", effects: { karma: -10, happiness: -2 } },
        ],
      },
    ],
  },
  {
    id: 'talent_show',
    title: 'School Talent Show',
    icon: '🎤',
    category: 'education',
    minAge: 9,
    maxAge: 12,
    description: 'Sign-ups for the school talent show close today.',
    choices: [
      {
        id: 'sing',
        label: 'Sing a song',
        icon: '🎶',
        outcomes: [
          { weight: 5, message: "You got a standing ovation!", effects: { happiness: 8, looks: 2 } },
          { weight: 5, message: "Your voice cracked on the high note. Everyone heard it.", effects: { happiness: -4 } },
        ],
      },
      {
        id: 'magic',
        label: 'Perform a magic trick',
        icon: '🎩',
        outcomes: [
          { message: "You pulled a coin from the principal's ear. The crowd went wild.", effects: { smarts: 2, happiness: 4 } },
        ],
      },
      {
        id: 'watch',
        label: 'Watch from the audience',
        icon: '👏',
        outcomes: [
          { message: "You cheered for your friends and had a relaxing evening.", effects: { happiness: 1 } },
        ],
      },
    ],
  },
  {
    id: 'elementary_monkey_bars_leo',
    title: 'Monkey Bars Champion',
    icon: '🐒',
    category: 'childhood',
    minAge: 6,
    maxAge: 10,
    requiredStage: 'elementary',
    description: 'During elementary recess, energetic classmate Leo Bennett hangs upside-down from the monkey bars and challenges you to a crossing race.',
    choices: [
      {
        id: 'race_leo_bars',
        label: 'Swing bar-to-bar and race him to the other side',
        icon: '🤸',
        outcomes: [
          {
            message: 'You both swung across in a dead heat and landed in the woodchips laughing! Leo taught you his secret high-five handshake.',
            effects: { health: 3, happiness: 6, popularity: 3 },
            personIntroduced: {
              firstName: 'Leo',
              lastName: 'Bennett',
              gender: 'male',
              age: 7,
              role: 'Playground Best Friend',
              relationshipType: 'best_friend',
              relationship: 88,
              originStory: 'Swung bar-to-bar on the playground monkey bars together.',
              stageMet: 'childhood',
              avatarEmoji: '🐒',
            },
          },
        ],
      },
      {
        id: 'watch_from_swings',
        label: 'Cheer him on while kicking on the swings',
        icon: '🎠',
        outcomes: [
          {
            message: 'You swung high into the air and felt the wind in your hair.',
            effects: { happiness: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'recess_foursquare_ava',
    title: 'Four-Square Recess Crown',
    icon: '🔴',
    category: 'childhood',
    minAge: 7,
    maxAge: 10,
    requiredStage: 'elementary',
    description: 'The King square on the asphalt four-square court is ruled by Ava Diaz, who has defended her throne for three straight weeks.',
    choices: [
      {
        id: 'challenge_ava',
        label: 'Step into the challenger square with your best spin bounce',
        icon: '🎯',
        outcomes: [
          {
            message: 'With a trick spin shot off the white chalk line, you knocked the ball past her! Ava clapped with huge respect: "Good game, new champ!"',
            effects: { popularity: 6, happiness: 7, health: 2 },
            personIntroduced: {
              firstName: 'Ava',
              lastName: 'Diaz',
              gender: 'female',
              age: 8,
              role: 'Playground Four-Square Competitor',
              relationshipType: 'friend',
              relationship: 80,
              originStory: 'Challenged her for the recess four-square court championship.',
              stageMet: 'childhood',
              avatarEmoji: '🔴',
            },
          },
        ],
      },
      {
        id: 'play_hopscotch',
        label: 'Play hopscotch with other classmates instead',
        icon: '👟',
        outcomes: [
          {
            message: 'You hopped across the chalk numbers and had a fun, gentle recess.',
            effects: { happiness: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'trading_cards_noah',
    title: 'Holographic Card Swap',
    icon: '🃏',
    category: 'childhood',
    minAge: 7,
    maxAge: 10,
    requiredStage: 'elementary',
    description: 'Behind the school oak tree, classmate Noah Miller opens his metallic binder and shows off a super rare holographic dragon card.',
    choices: [
      {
        id: 'fair_trade_noah',
        label: 'Offer two of your favorite cards for an honest trade',
        icon: '🤝',
        outcomes: [
          {
            message: 'Noah smiled: "Deal!" You traded cards and spent the rest of lunch comparing your battle decks together.',
            effects: { happiness: 6, smarts: 2 },
            personIntroduced: {
              firstName: 'Noah',
              lastName: 'Miller',
              gender: 'male',
              age: 8,
              role: 'Trading Card Pal',
              relationshipType: 'friend',
              relationship: 82,
              originStory: 'Traded shiny holographic cards under the elementary oak tree.',
              stageMet: 'childhood',
              avatarEmoji: '🃏',
            },
          },
        ],
      },
      {
        id: 'keep_cards_safe',
        label: 'Keep your cards tucked safely in your backpack',
        icon: '🎒',
        outcomes: [
          {
            message: 'Your cards stayed in mint condition without any bends.',
            effects: { happiness: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'laser_tag_party_harper',
    title: 'Laser Tag Birthday Party',
    icon: '🔫',
    category: 'childhood',
    minAge: 8,
    maxAge: 10,
    requiredStage: 'elementary',
    description: 'Cheerful classmate Harper Diaz hands you a colorful envelope inviting you to her 9th birthday party at the local neon laser tag arena!',
    choices: [
      {
        id: 'attend_party_harper',
        label: 'Attend the party, eat arcade pizza, and team up with Harper',
        icon: '🍕',
        outcomes: [
          {
            message: 'You and Harper back-to-back swept the arena in neon fog! She gave you the biggest slice of birthday cake.',
            effects: { happiness: 9, popularity: 5 },
            personIntroduced: {
              firstName: 'Harper',
              lastName: 'Diaz',
              gender: 'female',
              age: 9,
              role: 'Elementary Birthday Friend',
              relationshipType: 'friend',
              relationship: 86,
              originStory: 'Teamed up to win the arena championship at her laser tag birthday party.',
              stageMet: 'childhood',
              avatarEmoji: '🎂',
            },
          },
        ],
      },
      {
        id: 'decline_politely',
        label: 'Stay home and play with your toys',
        icon: '🧸',
        outcomes: [
          {
            message: 'You spent a cozy afternoon building block towers in your room.',
            effects: { happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'crayon_valentine_milo',
    title: 'Crayon Valentine Card',
    icon: '💌',
    category: 'relationship',
    minAge: 6,
    maxAge: 9,
    requiredStage: 'elementary',
    description: 'On Valentine\'s Day at school, sweet classmate Milo Sterling drops a hand-drawn construction paper heart with a strawberry candy into your decorated shoebox.',
    choices: [
      {
        id: 'smile_thank_milo',
        label: 'Give Milo a big smile and hand him a sweet candy heart back',
        icon: '🍬',
        outcomes: [
          {
            message: 'Milo\'s face lit up bright red with happiness! He shared his crayons with you all afternoon.',
            effects: { happiness: 8, looks: 1, popularity: 2 },
            personIntroduced: {
              firstName: 'Milo',
              lastName: 'Sterling',
              gender: 'male',
              age: 7,
              role: 'Elementary School Crush',
              relationshipType: 'crush',
              relationship: 85,
              originStory: 'Gave you a sweet hand-drawn crayon Valentine\'s card in elementary school.',
              stageMet: 'childhood',
              avatarEmoji: '💌',
            },
          },
        ],
      },
      {
        id: 'eat_candy_quietly',
        label: 'Eat the strawberry candy and color by yourself',
        icon: '🍭',
        outcomes: [
          {
            message: 'The candy tasted delicious.',
            effects: { happiness: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'treehouse_detective_club',
    title: 'Backyard Detective Club',
    icon: '🔍',
    category: 'childhood',
    minAge: 7,
    maxAge: 10,
    requiredStage: 'elementary',
    description: 'Neighborhood kids Emma Watson and Jack Sterling recruit you to join their secret backyard detective club to investigate mysterious dog footprints in the alley.',
    choices: [
      {
        id: 'join_detectives',
        label: 'Grab a magnifying glass and take the secret detective oath',
        icon: '🕵️',
        outcomes: [
          {
            message: 'You tracked the paw prints straight to Mrs. Higgins\' lost golden retriever! The neighbors rewarded you with cookies and the trio became legendary pals.',
            effects: { smarts: 5, karma: 5, happiness: 8 },
            personIntroduced: {
              firstName: 'Emma',
              lastName: 'Watson',
              gender: 'female',
              age: 8,
              role: 'Treehouse Detective Partner',
              relationshipType: 'friend',
              relationship: 84,
              originStory: 'Solved neighborhood pet mysteries together in the treehouse detective club.',
              stageMet: 'childhood',
              avatarEmoji: '🕵️‍♀️',
            },
          },
        ],
      },
      {
        id: 'watch_cartoons',
        label: 'Go back inside and watch Saturday morning cartoons',
        icon: '📺',
        outcomes: [
          {
            message: 'You relaxed on the living room rug with a bowl of sugary cereal.',
            effects: { happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'first_winter_snowstorm_elementary',
    title: 'First Winter Snowfall',
    icon: '☃️',
    category: 'childhood',
    minAge: 6,
    maxAge: 10,
    requiredStage: 'elementary',
    description: 'You wake up on a Saturday morning to find your backyard completely buried in six inches of fresh, pristine white snow!',
    choices: [
      {
        id: 'build_three_tier_snowman',
        label: 'Roll three giant snowballs and build a classic carrot-nose snowman',
        icon: '⛄',
        outcomes: [
          {
            message: 'Equipped with a wool scarf, button eyes, and a carrot nose, your snowman stood proudly on the front lawn for two weeks!',
            effects: { happiness: 8, health: 2 },
          },
        ],
      },
      {
        id: 'catch_snowflakes_tongue',
        label: 'Stick out your tongue and try to catch as many snowflakes as possible',
        icon: '👅',
        outcomes: [
          {
            message: 'Cold, crystalline flakes melted on your tongue. You laughed as snow settled on your woolen mittens and eyelashes.',
            effects: { happiness: 6 },
          },
        ],
      },
      {
        id: 'make_snow_angels',
        label: 'Drop backwards into the deep powder and wave your arms to make snow angels',
        icon: '❄️',
        outcomes: [
          {
            message: 'You made five beautiful winged snow angels across the undisturbed white grass.',
            effects: { happiness: 7, looks: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'lost_in_supermarket',
    title: 'Lost in the Supermarket',
    icon: '🛒',
    category: 'childhood',
    minAge: 6,
    maxAge: 9,
    requiredStage: 'elementary',
    description: 'While admiring a mountain of colorful fruit snacks in aisle 4, you look around and realize your parents have walked to another part of the grocery store!',
    choices: [
      {
        id: 'wait_customer_service',
        label: 'Walk calmly to the front customer service desk and tell the manager',
        icon: '📢',
        outcomes: [
          {
            message: 'The manager made a gentle announcement over the store speakers. Your mother rushed over within thirty seconds and gave you a hug of relief!',
            effects: { smarts: 4, karma: 3, parents: 5, happiness: 4 },
          },
        ],
      },
      {
        id: 'stay_put_cereal_aisle',
        label: 'Freeze right where you are and wait for them to retrace their steps',
        icon: '🧍',
        outcomes: [
          {
            message: 'Sure enough, your dad came rushing down the aisle calling your name. Good thinking not wandering off!',
            effects: { smarts: 3, parents: 3, happiness: 2 },
          },
        ],
      },
      {
        id: 'search_the_bakery',
        label: 'Walk toward the smell of freshly baked cookies in the bakery aisle',
        icon: '🍪',
        outcomes: [
          {
            message: 'The friendly baker gave you a free chocolate chip cookie just as your parents caught up with you!',
            effects: { happiness: 6 },
          },
        ],
      },
    ],
  },
  {
    id: 'puddle_jumping_summer_rain',
    title: 'Summer Rain Puddle Jumping',
    icon: '🌧️',
    category: 'childhood',
    minAge: 6,
    maxAge: 10,
    requiredStage: 'elementary',
    description: 'A warm summer afternoon thunderstorm passes over, leaving giant glassy rain puddles all along the sidewalk outside your front porch.',
    choices: [
      {
        id: 'cannonball_boots_puddle',
        label: 'Put on your bright yellow rain boots and stomp right in the center',
        icon: '👢',
        outcomes: [
          {
            message: 'SPLASH! A three-foot wave of water erupted into the air! You jumped in every puddle on the block until your boots were soaked.',
            effects: { happiness: 8, health: 2 },
          },
        ],
      },
      {
        id: 'race_paper_boats',
        label: 'Fold three newspaper boats and race them down the running gutter stream',
        icon: '⛵',
        outcomes: [
          {
            message: 'Your lead paper boat navigated the curb corner like a champion frigate and sailed fifty yards down the sidewalk!',
            effects: { smarts: 3, happiness: 7 },
          },
        ],
      },
      {
        id: 'hunt_for_earthworms',
        label: 'Rescue stranded earthworms from the wet asphalt and place them on grass',
        icon: '🪱',
        outcomes: [
          {
            message: 'You carefully moved a dozen earthworms back into the soft garden soil. Nature thanks you!',
            effects: { karma: 8, happiness: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'loose_baby_tooth',
    title: 'Wiggly Baby Tooth',
    icon: '🦷',
    category: 'childhood',
    minAge: 6,
    maxAge: 9,
    requiredStage: 'elementary',
    description: 'Your top front baby tooth has been wiggling for three days. While eating an apple, it turns sideways and is hanging by a tiny thread!',
    choices: [
      {
        id: 'give_firm_pull',
        label: 'Grip it with a clean tissue and give it one quick gentle pull',
        icon: '✨',
        outcomes: [
          {
            message: 'POP! Out it came without any pain! You rinsed with water, tucked it under your pillow, and found a shiny $2 coin from the Tooth Fairy in the morning.',
            effects: { happiness: 8, cash: 2 },
          },
        ],
      },
      {
        id: 'numb_with_ice_pop',
        label: 'Eat a cold strawberry popsicle to numb your gums before wiggling it',
        icon: '🍧',
        outcomes: [
          {
            message: 'The cold popsicle numbed your mouth completely. The tooth popped out easily into a paper napkin.',
            effects: { happiness: 6, cash: 1 },
          },
        ],
      },
      {
        id: 'ask_dad_for_help',
        label: 'Ask your dad to help wiggle it free',
        icon: '👨',
        outcomes: [
          {
            message: 'Your dad told a funny joke and distracted you while smoothly pulling it free. "Look at that gap!" he chuckled proudly.',
            effects: { parents: 5, happiness: 6, cash: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'spelling_bee_finals',
    title: 'Elementary Spelling Bee Finals',
    icon: '🐝',
    category: 'education',
    minAge: 7,
    maxAge: 11,
    requiredStage: 'elementary',
    description: 'You\'ve advanced to the final round of the schoolwide spelling bee in the gymnasium! The pronouncer leans into the microphone: "Your word is: C-A-T-A-S-T-R-O-P-H-E."',
    choices: [
      {
        id: 'spell_slowly_careful',
        label: 'Spell it out deliberately, visualizing each syllable: C-A-T-A-S-T-R-O-P-H-E',
        icon: '🏆',
        outcomes: [
          {
            message: '"That is correct!" The entire auditorium erupted into applause as Principal Higgins handed you the gleaming golden bumblebee trophy!',
            effects: { smarts: 7, popularity: 6, happiness: 9 },
          },
        ],
      },
      {
        id: 'ask_origin_definition',
        label: 'Ask for the definition and language of origin first to buy time',
        icon: '🧐',
        outcomes: [
          {
            message: 'The judge explained the Greek root word. Armed with the clue, you nailed the spelling and earned 2nd place runner-up honors!',
            effects: { smarts: 6, happiness: 6 },
          },
        ],
      },
      {
        id: 'guess_quickly',
        label: 'Blurt out the first spelling that pops into your head',
        icon: '⚡',
        outcomes: [
          {
            message: 'DING! The judge rang the bell: "Incorrect. C-A-T-A-S-T-R-O-P-H-E." You took a polite bow and collected a nice participation ribbon.',
            effects: { smarts: 2, happiness: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'baking_soda_volcano',
    title: 'Science Fair Volcano Eruption',
    icon: '🌋',
    category: 'education',
    minAge: 7,
    maxAge: 11,
    requiredStage: 'elementary',
    description: 'It\'s annual science fair day! You and your lab partner set up your painted papier-mâché volcano just as the stern panel of judges approaches your tri-fold board.',
    choices: [
      {
        id: 'pour_measured_formula',
        label: 'Pour the precisely measured red vinegar and baking soda solution',
        icon: '🧪',
        outcomes: [
          {
            message: 'A perfect cascade of bubbling crimson lava foamed down the crater slopes! The science judges awarded you the 1st Place Blue Ribbon!',
            effects: { smarts: 7, happiness: 8, popularity: 4 },
          },
        ],
      },
      {
        id: 'dump_extra_catalyst',
        label: 'Secretly dump in triple the baking soda for a volcanic mega-blast!',
        icon: '💥',
        outcomes: [
          {
            weight: 5,
            message: 'KABOOM! A geyser of red foam shot three feet into the air! The crowd went wild with cheering, though red mist coated your glasses.',
            effects: { happiness: 9, popularity: 7, smarts: 3 },
          },
          {
            weight: 5,
            message: 'The red foam geyser erupted sideways and splattered right across Principal Higgins\' white dress shirt. Detention avoided, but you had to clean up.',
            effects: { happiness: -4, karma: -3 },
          },
        ],
      },
      {
        id: 'explain_chemical_reaction',
        label: 'Deliver a thorough academic speech explaining the chemical reaction',
        icon: '📊',
        outcomes: [
          {
            message: 'The judges were thoroughly impressed by your articulate chemistry terminology and praised your deep understanding.',
            effects: { smarts: 8, happiness: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'school_picture_day_bedhead',
    title: 'Picture Day Bedhead Calamity',
    icon: '📸',
    category: 'childhood',
    minAge: 6,
    maxAge: 11,
    requiredStage: 'elementary',
    description: 'It\'s annual school portrait day! You wake up ten minutes before the yellow bus arrives and look in the mirror to discover an enormous rooster-tail cowlick sticking straight up.',
    choices: [
      {
        id: 'sink_water_comb',
        label: 'Douse your head in the bathroom sink and comb it flat into a crisp side part',
        icon: '💧',
        outcomes: [
          {
            message: 'By the time you sat on the swivel stool in front of the laser backdrop, your hair was sleek and camera-ready. Perfect portrait!',
            effects: { looks: 4, smarts: 2, happiness: 5 },
          },
        ],
      },
      {
        id: 'rock_wild_bedhead',
        label: 'Embrace the chaotic spikes and flash a huge, radiant toothy grin!',
        icon: '😎',
        outcomes: [
          {
            message: 'The photographer laughed: "Now that\'s rock and roll!" Your school picture became an instant family classic and won best smile.',
            effects: { popularity: 6, looks: 2, happiness: 8 },
          },
        ],
      },
      {
        id: 'ask_mother_hair_rescue',
        label: 'Sprint downstairs and beg {motherName} for an emergency styling rescue',
        icon: '🧴',
        outcomes: [
          {
            message: '{motherName} worked styling pomade miracles in forty-five seconds flat, kissing your forehead before you ran to the bus stop.',
            effects: { parents: 5, looks: 3, happiness: 6 },
          },
        ],
      },
    ],
  },
  {
    id: 'lemonade_stand_hustle',
    title: 'Summer Sidewalk Lemonade Stand',
    icon: '🍋',
    category: 'money',
    minAge: 7,
    maxAge: 12,
    description: 'On a sweltering 92°F July afternoon, you set up a wooden card table on the front sidewalk with a giant pitcher of fresh squeezed lemonade and paper cups.',
    choices: [
      {
        id: 'fifty_cent_cups_stickers',
        label: 'Price cups at 50¢ each and hand out free smiley face stickers with every purchase',
        icon: '🥤',
        outcomes: [
          {
            message: 'Parched neighbors loved the cute presentation! You sold out three full pitchers and counted $14 in shiny quarters and dollar bills.',
            effects: { cash: 14, smarts: 4, happiness: 8 },
          },
        ],
      },
      {
        id: 'free_cups_mail_carriers',
        label: 'Offer free ice-cold cups to mail carriers, delivery drivers, and passing joggers',
        icon: '❤️',
        outcomes: [
          {
            message: 'The neighborhood mail carrier beamed with gratitude: "You\'re a lifesaver, kid!" Several joggers returned later and dropped generous $5 tips.',
            effects: { karma: 9, popularity: 5, cash: 10, happiness: 8 },
          },
        ],
      },
      {
        id: 'cookie_combo_upsell',
        label: 'Upsell homemade chocolate chip cookies for an extra dollar per cup',
        icon: '🍪',
        outcomes: [
          {
            message: 'A stroke of junior entrepreneurship! Customers couldn\'t resist the sweet pairing, netting you $22 in pure profit.',
            effects: { cash: 22, smarts: 5, happiness: 9 },
          },
        ],
      },
    ],
  },
  {
    id: 'lost_library_book_panic',
    title: 'The Overdue Library Mystery',
    icon: '📚',
    category: 'education',
    minAge: 6,
    maxAge: 11,
    requiredStage: 'elementary',
    description: 'Stern school librarian Mrs. Gable announces your checkout card is suspended because an illustrated book titled "Secrets of the Deep Sea" is three weeks overdue!',
    choices: [
      {
        id: 'deep_room_search',
        label: 'Turn your bedroom upside down searching under the bed, inside toy bins, and behind the desk',
        icon: '🔍',
        outcomes: [
          {
            message: 'Success! It was wedged between your mattress and the wooden wall. You returned it without a scratch and Mrs. Gable smiled warmly.',
            effects: { smarts: 4, karma: 4, happiness: 6 },
          },
        ],
      },
      {
        id: 'volunteer_shelving_apology',
        label: 'Confess honestly and offer to shelve picture books during recess to make amends',
        icon: '😇',
        outcomes: [
          {
            message: 'Mrs. Gable was so impressed by your mature honesty that she forgave the late fine on the spot and made you an honorary library helper.',
            effects: { karma: 8, smarts: 5, parents: 3, happiness: 5 },
          },
        ],
      },
      {
        id: 'check_locker_cubby',
        label: 'Check the bottom of your school cubby locker just in case',
        icon: '🎒',
        outcomes: [
          {
            message: 'Tucked beneath your winter mittens was the shiny blue sea book! You handed it to the counter before the afternoon bell.',
            effects: { smarts: 3, happiness: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'stray_kitten_porch',
    title: 'A Shivering Kitten on the Porch',
    icon: '🐱',
    category: 'childhood',
    minAge: 6,
    maxAge: 12,
    description: 'On a chilly autumn twilight, you hear faint meowing at your front doorstep. A tiny orange tabby kitten with big emerald eyes is curled up on the welcome mat.',
    choices: [
      {
        id: 'warm_milk_plead_adopt',
        label: 'Bring out warm food, wrap it in a towel, and beg your parents to adopt it',
        icon: '🐾',
        outcomes: [
          {
            message: 'Your parents looked at the tiny kitten purring in your lap and melted: "Welcome to the family, Clementine!" A loyal pet unlocked!',
            effects: { happiness: 10, karma: 8, parents: 4 },
            personIntroduced: {
              firstName: 'Clementine',
              lastName: 'the Cat',
              gender: 'female',
              age: 1,
              role: 'Beloved Pet Cat',
              relationshipType: 'best_friend',
              relationship: 95,
              originStory: 'Rescued as a shivering stray kitten on your front porch on an autumn evening.',
              stageMet: 'childhood',
              avatarEmoji: '🐱',
            },
          },
        ],
      },
      {
        id: 'make_porch_shelter_check_flyers',
        label: 'Build a warm cardboard porch shelter and check neighborhood bulletin boards for lost flyers',
        icon: '📦',
        outcomes: [
          {
            message: 'Two days later, an elderly neighbor down the block burst into tears of gratitude when you safely reunited her with her lost kitten.',
            effects: { karma: 10, smarts: 4, happiness: 8, cash: 15 },
          },
        ],
      },
      {
        id: 'call_local_animal_rescue',
        label: 'Help your parents call the city animal shelter so it gets vaccinated and fostered',
        icon: '📞',
        outcomes: [
          {
            message: 'The volunteer shelter worker thanked you for taking care of the stray. The kitten was adopted into a loving home the next weekend.',
            effects: { karma: 7, smarts: 3, happiness: 6 },
          },
        ],
      },
    ],
  },
  {
    id: 'recess_kickball_clutch',
    title: 'Bottom of the Ninth Kickball',
    icon: '⚽',
    category: 'social',
    minAge: 7,
    maxAge: 11,
    requiredStage: 'elementary',
    description: 'It\'s the final inning of lunchtime kickball with bases loaded. Athletic classmate Maya Lin rolls the big red rubber ball toward home plate with wicked topspin!',
    choices: [
      {
        id: 'power_kick_fence',
        label: 'Swing your sneaker with everything you have for a grand slam over the chain-link fence!',
        icon: '💥',
        outcomes: [
          {
            message: 'THWACK! The red ball launched into the stratosphere, clearing the outfield fence by twenty feet! Maya Lin ran over and gave you huge props!',
            effects: { popularity: 7, happiness: 9, health: 3 },
            personIntroduced: {
              firstName: 'Maya',
              lastName: 'Lin',
              gender: 'female',
              age: 8,
              role: 'Recess Sports Partner',
              relationshipType: 'friend',
              relationship: 85,
              originStory: 'Hit a walk-off grand slam off her pitch in the legendary fifth-grade kickball showdown.',
              stageMet: 'childhood',
              avatarEmoji: '⚽',
            },
          },
        ],
      },
      {
        id: 'tactical_third_base_bunt',
        label: 'Lay down a gentle, tricky bunt rolling softly along the third-base chalk line',
        icon: '🎯',
        outcomes: [
          {
            message: 'Maya sprinted off the pitcher\'s mound, but your bunt was too sneaky! The runner crossed home plate for the walk-off victory.',
            effects: { smarts: 5, popularity: 5, happiness: 7 },
          },
        ],
      },
      {
        id: 'cheer_the_team',
        label: 'Take the walk on four outside balls and let your cleanup hitter kick',
        icon: '🚶',
        outcomes: [
          {
            message: 'Patience paid off! You trotted to first base and scored the tying run on the next play.',
            effects: { smarts: 3, happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'sidewalk_chalk_metropolis',
    title: 'Chalk City Metropolis',
    icon: '🖍️',
    category: 'childhood',
    minAge: 6,
    maxAge: 10,
    requiredStage: 'elementary',
    description: 'Armed with a jumbo plastic tub of 64 rainbow sidewalk chalks, you and the cul-de-sac kids have a blank, freshly swept concrete street all to yourselves.',
    choices: [
      {
        id: 'build_highway_system',
        label: 'Draw a massive interconnecting miniature city with multi-lane highways for scooters',
        icon: '🛣️',
        outcomes: [
          {
            message: 'You engineered roundabouts, gas stations, and helicopter landing pads! The entire street spent three hours riding scooters through your city.',
            effects: { smarts: 5, happiness: 8, popularity: 5 },
          },
        ],
      },
      {
        id: 'giant_chalk_dragon',
        label: 'Sketch an epic 30-foot rainbow dragon breathing neon purple flames across the asphalt',
        icon: '🐉',
        outcomes: [
          {
            message: 'Neighbors out walking their dogs stopped in awe to take pictures of your pavement masterpiece before the rain washed it away.',
            effects: { looks: 3, happiness: 8, karma: 3 },
          },
        ],
      },
      {
        id: 'century_hopscotch_course',
        label: 'Design a legendary 100-square hopscotch endurance obstacle course',
        icon: '👟',
        outcomes: [
          {
            message: 'Every kid on the block tried to complete the 100-step hopscotch gauntlet. You crowned yourself hopscotch grandmaster!',
            effects: { health: 4, popularity: 4, happiness: 7 },
          },
        ],
      },
    ],
  },
  {
    id: 'first_bicycle_no_training_wheels',
    title: 'Wrenching Off the Training Wheels',
    icon: '🚲',
    category: 'childhood',
    minAge: 6,
    maxAge: 10,
    description: '{fatherName} brings out the socket wrench on the back patio and unbolts both small training wheels from your bicycle. "You don\'t need these anymore," he says with a smile.',
    choices: [
      {
        id: 'pedal_solo_driveway',
        label: 'Push off the driveway curb with your sneakers and pedal with fearless momentum!',
        icon: '🚀',
        outcomes: [
          {
            message: 'Wobble... wobble... STABLE! The wind rushed through your helmet as you cruised smoothly down the entire sidewalk block on two wheels!',
            effects: { health: 4, happiness: 10, parents: 5, smarts: 2 },
          },
        ],
      },
      {
        id: 'seat_hold_assistance',
        label: 'Ask {fatherName} to jog alongside holding the rear saddle until you find your balance',
        icon: '👨',
        outcomes: [
          {
            message: 'He ran alongside you, quietly letting go halfway down the street. When you looked back, you realized you were riding completely on your own!',
            effects: { parents: 7, health: 3, happiness: 8 },
          },
        ],
      },
      {
        id: 'soft_grass_tumble',
        label: 'Steer toward the front lawn grass just in case you lose your balance',
        icon: '🌱',
        outcomes: [
          {
            message: 'You coasted twenty yards before tumbling softly into the cool green clover lawn, laughing as your helmet tapped the turf.',
            effects: { health: 1, happiness: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'dentist_treasure_chest',
    title: 'The Dental Checkup & Golden Token',
    icon: '🪥',
    category: 'health',
    minAge: 6,
    maxAge: 11,
    description: 'The pediatric dentist polishes your teeth with bubblegum paste and announces: "Zero cavities! Absolutely spotless!" She hands you a shiny gold brass token for the toy machine.',
    choices: [
      {
        id: 'glow_bouncy_ball',
        label: 'Turn the chrome knob to drop the capsule with the super-bouncy glow-in-the-dark neon ball',
        icon: '🔮',
        outcomes: [
          {
            message: 'That ball bounced higher than the living room ceiling fan! You practiced trick bank shots off hallway doors all evening.',
            effects: { happiness: 7, health: 2 },
          },
        ],
      },
      {
        id: 'plastic_vampire_fangs',
        label: 'Choose the goofy plastic vampire fangs and flash a spooky grin in the waiting room',
        icon: '🧛',
        outcomes: [
          {
            message: 'Your parents and the dental receptionist burst into laughter. You kept the fangs in all the way through the pharmacy drive-thru.',
            effects: { happiness: 6, looks: 1 },
          },
        ],
      },
      {
        id: 'floss_promise_serious',
        label: 'Listen attentively to the hygienist and pledge to floss every single night before bed',
        icon: '✨',
        outcomes: [
          {
            message: 'Your dental diligence earned you a free pack of glitter toothbrushes and a glowing review from your proud parents.',
            effects: { health: 6, smarts: 3, parents: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'cafeteria_snack_swap_heist',
    title: 'The Great Lunchbox Economy',
    icon: '🥪',
    category: 'social',
    minAge: 7,
    maxAge: 12,
    requiredStage: 'elementary',
    description: 'The cafeteria table is buzzing like Wall Street. Classmate Tyler Vance has a giant bakery double-fudge chocolate cookie and is eyeing your crisp Honeycrisp apple slices.',
    choices: [
      {
        id: 'master_snack_swap',
        label: 'Negotiate a shrewd trade: apple slices and half a juice pouch for the giant fudge cookie',
        icon: '🤝',
        outcomes: [
          {
            message: 'Tyler shook your hand: "Deal!" The cookie was rich and decadent, and Tyler became your go-to cafeteria trade partner.',
            effects: { smarts: 4, happiness: 7 },
            personIntroduced: {
              firstName: 'Tyler',
              lastName: 'Vance',
              gender: 'male',
              age: 8,
              role: 'Cafeteria Trading Buddy',
              relationshipType: 'friend',
              relationship: 82,
              originStory: 'Broker of the legendary fifth-grade apple-for-fudge-cookie cafeteria trade.',
              stageMet: 'childhood',
              avatarEmoji: '🍪',
            },
          },
        ],
      },
      {
        id: 'eat_healthy_lunch',
        label: 'Politely decline the sugary trade and enjoy your crisp, healthy apple slices',
        icon: '🍎',
        outcomes: [
          {
            message: 'Crunchy and delicious! Your healthy nutrition gave you plenty of clean energy for afternoon gym class.',
            effects: { health: 5, karma: 2, smarts: 2 },
          },
        ],
      },
      {
        id: 'share_sandwich_extra',
        label: 'Notice a classmate who forgot their lunch and share half of your turkey sandwich for free',
        icon: '❤️',
        outcomes: [
          {
            message: 'The grateful classmate thanked you with genuine relief. The lunch monitor noticed and gave you a golden ticket for good citizenship.',
            effects: { karma: 10, popularity: 6, happiness: 7 },
          },
        ],
      },
    ],
  },
  {
    id: 'backyard_camping_ghost_stories',
    title: 'Backyard Tent Expedition',
    icon: '⛺',
    category: 'childhood',
    minAge: 7,
    maxAge: 12,
    description: 'On a warm summer Friday night, you and your neighborhood friends pitch a blue dome tent in your backyard under a sky filled with twinkling stars.',
    choices: [
      {
        id: 'giggling_ghost_tale',
        label: 'Shine a flashlight under your chin and tell the eerie tale of the "Giggling Ghost of Maple Street"',
        icon: '🔦',
        outcomes: [
          {
            message: 'Everyone gasped in suspense! Right as you yelled the punchline, a neighborhood raccoon scurried across the lawn, making everyone jump!',
            effects: { popularity: 5, happiness: 8, smarts: 3 },
          },
        ],
      },
      {
        id: 'smores_over_burner',
        label: 'Roast golden marshmallows over the portable patio burner and sandwich them with chocolate',
        icon: '🍫',
        outcomes: [
          {
            message: 'Gooey, caramelized perfection! You ate three s\'mores each and stayed awake whispering jokes until 1:00 AM.',
            effects: { happiness: 9, parents: 3 },
          },
        ],
      },
      {
        id: 'stargazing_constellations',
        label: 'Lie on your sleeping bags outside the tent and trace the Big Dipper and Orion\'s belt',
        icon: '✨',
        outcomes: [
          {
            message: 'You spotted two shooting stars streaking across the Milky Way. A peaceful, awe-inspiring night you\'ll never forget.',
            effects: { smarts: 6, happiness: 7 },
          },
        ],
      },
    ],
  },
  {
    id: 'secret_agent_club',
    title: 'Secret Agent Society',
    icon: '🕶️',
    category: 'social',
    minAge: 7,
    maxAge: 11,
    requiredStage: 'elementary',
    description: 'You and your schoolyard pals create a top-secret clandestine agency with alias code names, cipher code rings, and a classified eight-step handshake.',
    choices: [
      {
        id: 'lemon_juice_invisible_ink',
        label: 'Write secret mission orders using lemon juice invisible ink to pass between desks',
        icon: '🍋',
        outcomes: [
          {
            message: 'Holding the paper over a desk lamp revealed the golden brown hidden message! The espionage squad was operating at peak efficiency.',
            effects: { smarts: 6, happiness: 7, popularity: 4 },
          },
        ],
      },
      {
        id: 'recruit_shy_classmate',
        label: 'Recruit a quiet, shy classmate sitting alone on the swings as Chief Cryptographer',
        icon: '🤝',
        outcomes: [
          {
            message: 'Chloe\'s eyes lit up with joy! She invented a brilliant secret alphabet for the agency and quickly became one of your closest confidants.',
            effects: { karma: 9, popularity: 6, happiness: 8 },
            personIntroduced: {
              firstName: 'Chloe',
              lastName: 'Park',
              gender: 'female',
              age: 8,
              role: 'Secret Agent Club Partner',
              relationshipType: 'best_friend',
              relationship: 90,
              originStory: 'Recruited to decode classified secret agent cipher codes on the elementary playground.',
              stageMet: 'childhood',
              avatarEmoji: '🕵️‍♀️',
            },
          },
        ],
      },
      {
        id: 'cardboard_periscope_gadget',
        label: 'Build a cardboard periscope with two angled pocket mirrors to peek over the kickball wall',
        icon: '📦',
        outcomes: [
          {
            message: 'Engineering success! Your periscope worked like a submarine optic, earning admiration from the playground monitors.',
            effects: { smarts: 5, happiness: 6 },
          },
        ],
      },
    ],
  },
  {
    id: 'overdue_homework_morning_rush',
    title: 'The 7:15 AM Math Sheet Panic',
    icon: '🏃',
    category: 'education',
    minAge: 7,
    maxAge: 12,
    requiredStage: 'elementary',
    description: 'As your cereal bowl clinks and the school bus horn sounds down the street, cold dread washes over you: you left your 25-problem long-division worksheet completely blank!',
    choices: [
      {
        id: 'speed_calculate_bus',
        label: 'Speed-calculate all 25 division problems on the bumpy bus ride using pure mental math',
        icon: '⚡',
        outcomes: [
          {
            message: 'Your pencil was flying at supersonic speed! You filled the final box right as the bus doors hissed open. Miraculously, you scored 92%!',
            effects: { smarts: 6, happiness: 6, health: -1 },
          },
        ],
      },
      {
        id: 'confess_honest_teacher',
        label: 'Walk up to Mrs. Gable before morning bell, confess truthfully, and ask to finish it at recess',
        icon: '🙋',
        outcomes: [
          {
            message: 'Your teacher appreciated your maturity and accountability: "Thank you for being upfront. Finish it by lunch and no late penalty."',
            effects: { karma: 8, smarts: 3, parents: 3 },
          },
        ],
      },
      {
        id: 'copy_desk_neighbor',
        label: 'Frantically ask your bus seatmate to let you copy their answers before homeroom',
        icon: '👀',
        outcomes: [
          {
            weight: 5,
            message: 'You scribbled the answers down in the nick of time. You got credit, but a twinge of guilt remained.',
            effects: { karma: -5, happiness: 1 },
          },
          {
            weight: 5,
            message: 'The teacher spotted the identical smudged handwriting on both papers and gave you both a stern warning.',
            effects: { karma: -7, happiness: -4, parents: -3 },
          },
        ],
      },
    ],
  },
  {
    id: 'roller_skate_driveway_tumble',
    title: 'Speeding on Quad Roller Skates',
    icon: '🛼',
    category: 'childhood',
    minAge: 6,
    maxAge: 11,
    description: 'You strap into a bright pair of retro four-wheel quad roller skates and practice gliding across the freshly paved neighborhood cul-de-sac.',
    choices: [
      {
        id: 'figure_eight_spin',
        label: 'Attempt a graceful figure-eight glide with a single-leg coast in the center',
        icon: '✨',
        outcomes: [
          {
            message: 'You carved a flawless figure-eight! Classmates riding bikes on the street applauded your balancing poise.',
            effects: { health: 4, looks: 3, happiness: 7 },
          },
        ],
      },
      {
        id: 'protective_gear_speed_run',
        label: 'Strap on full elbow pads, wrist guards, and helmet before attempting speed runs',
        icon: '🛡️',
        outcomes: [
          {
            message: 'Safety first! You zoomed downhill at top speed, feeling confident and secure inside your protective armor.',
            effects: { health: 5, smarts: 3, parents: 4 },
          },
        ],
      },
      {
        id: 'curb_jump_leap',
        label: 'Build up maximum speed toward the driveway lip and leap over the grass border!',
        icon: '🚀',
        outcomes: [
          {
            message: 'You caught two feet of air and stuck the landing on the soft grass with a triumphant yell!',
            effects: { happiness: 8, health: 3, popularity: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'school_choir_high_note',
    title: 'Spring Concert Choir Solo',
    icon: '🎤',
    category: 'education',
    minAge: 7,
    maxAge: 12,
    requiredStage: 'elementary',
    description: 'During spring concert dress rehearsal, choir director Mrs. Vance asks: "Who wants to step up to the center microphone for the opening high melody solo?"',
    choices: [
      {
        id: 'step_forward_solo',
        label: 'Step up to the center mic, take a deep diaphragmatic breath, and sing with pure clarity',
        icon: '🎶',
        outcomes: [
          {
            message: 'Your high note soared through the auditorium acoustics like a golden bell! The audience sat in hushed wonder before bursting into a standing ovation.',
            effects: { looks: 3, popularity: 8, happiness: 10 },
          },
        ],
      },
      {
        id: 'choral_harmony_front',
        label: 'Sing in the front row of the chorus, providing rich four-part harmony',
        icon: '🎵',
        outcomes: [
          {
            message: 'Your dependable harmony anchored the entire soprano section. The concert sounded rich and angelic.',
            effects: { smarts: 4, happiness: 6 },
          },
        ],
      },
      {
        id: 'play_percussion_xylophone',
        label: 'Offer to play the triangle and xylophone glockenspiel chimes instead',
        icon: '🔔',
        outcomes: [
          {
            message: 'DING! Your crisp metallic accents kept perfect rhythmic time throughout the performance.',
            effects: { smarts: 4, happiness: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'four_leaf_clover_meadow',
    title: 'The Lucky Four-Leaf Clover',
    icon: '🍀',
    category: 'childhood',
    minAge: 6,
    maxAge: 11,
    description: 'While resting in the shaded clover patch behind the elementary baseball field, your sharp eyes catch a rare genetic miracle: an authentic, perfect four-leaf clover!',
    choices: [
      {
        id: 'press_inside_textbook',
        label: 'Press it carefully inside your heaviest hardcover encyclopedia to preserve it forever',
        icon: '📖',
        outcomes: [
          {
            message: 'Pressed flat between pages 204 and 205, your emerald clover dried into an exquisite lucky talisman. Good fortune followed you all month!',
            effects: { karma: 8, smarts: 3, happiness: 8 },
          },
        ],
      },
      {
        id: 'gift_to_sad_classmate',
        label: 'Hand it with a warm smile to a classmate who is having a difficult week',
        icon: '🎁',
        outcomes: [
          {
            message: 'Their gloomy expression instantly transformed into a bright, teary smile: "For me? Thank you so much!" True kindness rewarded.',
            effects: { karma: 10, popularity: 6, happiness: 9 },
          },
        ],
      },
      {
        id: 'tape_to_pencil_case',
        label: 'Laminate it with clear Scotch tape and affix it to your pencil case for test luck',
        icon: '✏️',
        outcomes: [
          {
            message: 'Your lucky pencil case became legendary. Whether by magic or confidence, your quiz scores received a noticeable boost!',
            effects: { smarts: 4, happiness: 6 },
          },
        ],
      },
    ],
  },
  {
    id: 'april_fools_whoopee_cushion',
    title: 'April Fools Homeroom Capers',
    icon: '🎈',
    category: 'childhood',
    minAge: 7,
    maxAge: 12,
    requiredStage: 'elementary',
    description: 'It\'s morning on April 1st! You enter the classroom with a classic pink rubber whoopee cushion and a gag plastic ice cube in your jacket pocket.',
    choices: [
      {
        id: 'substitute_whoopee_cushion',
        label: 'Discreetly slip the whoopee cushion onto the substitute teacher\'s swivel chair',
        icon: '💨',
        outcomes: [
          {
            weight: 6,
            message: 'PFFFFT! The sound echoed across thirty silent desks. The substitute grinned and broke out laughing: "Happy April Fools, you rascals!" Legendary prank!',
            effects: { popularity: 8, happiness: 8, karma: -1 },
          },
          {
            weight: 4,
            message: 'PFFFFT! The substitute teacher was not amused in the slightest: "Who is responsible for this?" You confessed and had to erase chalkboards at 3:00 PM.',
            effects: { happiness: -3, karma: -3 },
          },
        ],
      },
      {
        id: 'plastic_ice_cube_friend',
        label: 'Drop the gag fake-fly plastic ice cube into your friend\'s juice cup at lunch',
        icon: '🧊',
        outcomes: [
          {
            message: 'Your friend shrieked, then saw it was plastic and spat out their milk laughing! The whole table cracked up.',
            effects: { popularity: 5, happiness: 7 },
          },
        ],
      },
      {
        id: 'harmless_shoe_untied_prank',
        label: 'Stick to the gentle classic: "Hey look! Your shoes are untied!" and point down',
        icon: '👟',
        outcomes: [
          {
            message: 'Got \'em! Even your teacher fell for it once. Innocent, lighthearted laughter all around.',
            effects: { happiness: 5, karma: 2 },
          },
        ],
      },
    ],
  },
];

