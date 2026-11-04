import type { LifeEventTemplate } from '../types'

/**
 * Middle School Events (Ages 11 - 13)
 * Balanced collection of environmental days, school dilemmas,
 * surprises, and memorable first friendships & crushes.
 */
export const MIDDLE_SCHOOL_EVENTS: LifeEventTemplate[] = [
  // ==========================================================================
  // PART 1: ENVIRONMENTAL & SCHOOL SURPRISES (NO PERSON INTRODUCED)
  // ==========================================================================
  {
    id: 'snow_day_blizzard_announcement',
    title: 'Winter Blizzard Snow Day',
    icon: '❄️',
    category: 'education',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    weight: 2,
    description: 'At 6:30 AM, your radio buzzes with static: all middle schools in the district are closed today due to heavy snowfall and ice!',
    choices: [
      {
        id: 'sledding_big_hill',
        label: 'Grab your plastic sled and head to the big park hill',
        icon: '🛷',
        outcomes: [
          {
            message: 'You flew down the snowy hill at breakneck speed, catching air over a snowbank! You returned home pink-cheeked and exhausted.',
            effects: { happiness: 9, health: 3, popularity: 3 },
          },
        ],
      },
      {
        id: 'indoor_blanket_fort',
        label: 'Build an epic living room blanket fort and play games',
        icon: '🏰',
        outcomes: [
          {
            message: 'Equipped with pillows, fairy lights, and hot cocoa, your fortress was the coziest place in the world all afternoon.',
            effects: { happiness: 8 },
          },
        ],
      },
      {
        id: 'sleep_in_until_noon',
        label: 'Roll back over and sleep until 11:30 AM',
        icon: '🛌',
        outcomes: [
          {
            message: 'You got nearly 12 hours of sleep and felt completely recharged.',
            effects: { health: 4, happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'middle_school_fire_drill_rain',
    title: 'Downpour Fire Drill',
    icon: '🌧️',
    category: 'education',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    weight: 1.6,
    description: 'The piercing fire alarm blares right in the middle of third period! Outside, it is pouring freezing rain, and everyone has to evacuate to the muddy soccer field.',
    choices: [
      {
        id: 'share_umbrella_group',
        label: 'Huddle with classmates under a shared rain umbrella',
        icon: '☂️',
        outcomes: [
          {
            message: 'You squeezed six people under one umbrella, shivering and laughing through the rain. Everyone appreciated your teamwork.',
            effects: { popularity: 5, happiness: 4, karma: 3 },
          },
        ],
      },
      {
        id: 'splash_in_mud_puddles',
        label: 'Stomp in the giant puddles and make everyone laugh',
        icon: '👟',
        outcomes: [
          {
            message: 'Mud splashed everywhere! Your shoes were soaked, but you were the entertainment of the entire grade.',
            effects: { popularity: 6, happiness: 6, health: -1 },
          },
        ],
      },
      {
        id: 'huddle_gym_overhang',
        label: 'Stand quietly under the gymnasium brick roof overhang',
        icon: '🏢',
        outcomes: [
          {
            message: 'You stayed relatively dry while the alarm bells stopped ringing.',
            effects: { health: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'cafeteria_mystery_casserole',
    title: 'Cafeteria Mystery Casserole',
    icon: '🍲',
    category: 'health',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    weight: 1.5,
    description: 'The school cafeteria lunch board lists today\'s hot entree as "Chef\'s Surprise Casserole." It is glowing an unusual shade of neon yellow-green.',
    choices: [
      {
        id: 'eat_it_bravely',
        label: 'Take a giant forkful and chew it down like a champion',
        icon: '🍴',
        outcomes: [
          {
            message: 'To your shock, it was just cheesy broccoli bake! It actually tasted pretty decent, and your table hailed your culinary bravery.',
            effects: { happiness: 6, popularity: 4, health: 1 },
          },
        ],
      },
      {
        id: 'trade_for_apple',
        label: 'Trade the mystery plate with someone for an apple and pretzels',
        icon: '🍎',
        outcomes: [
          {
            message: 'You enjoyed a crisp red apple and crunchy pretzels without any stomach worries.',
            effects: { health: 3, happiness: 3 },
          },
        ],
      },
      {
        id: 'skip_entree_snack',
        label: 'Skip the hot tray and buy chocolate milk from the vending line',
        icon: '🥛',
        outcomes: [
          {
            message: 'Cold chocolate milk hit the spot, even if your stomach grumbled a little during 6th period.',
            effects: { happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'forgotten_gym_uniform',
    title: 'Forgotten Gym Uniform',
    icon: '🩳',
    category: 'education',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    weight: 1.5,
    description: 'You open your locker for 5th period gym class and realize your gym shorts and sneakers are still sitting by your bedroom closet at home!',
    choices: [
      {
        id: 'run_in_school_clothes',
        label: 'Run the mile in your jeans and button-up shirt anyway',
        icon: '🏃',
        outcomes: [
          {
            message: 'You sweat through your nice school clothes, but Coach praised your relentless hustle and gave you full participation points!',
            effects: { popularity: 4, grades: 3, happiness: 3 },
          },
        ],
      },
      {
        id: 'borrow_lost_and_found',
        label: 'Dig through the gym lost-and-found bin for a loaner shirt',
        icon: '🧺',
        outcomes: [
          {
            message: 'The oversized vintage track shirt smelled like mothballs, but it got the job done without getting your clothes dirty.',
            effects: { happiness: 1, grades: 2 },
          },
        ],
      },
      {
        id: 'claim_stubbed_toe',
        label: 'Tell the coach you have a minor stubbed toe and sit on the bleachers',
        icon: '🤕',
        outcomes: [
          {
            message: 'Coach let you sit out with a clipboard to keep track of basketball fouls.',
            effects: { karma: -1, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'frog_dissection_biology',
    title: '7th Grade Frog Dissection',
    icon: '🐸',
    category: 'education',
    minAge: 12,
    maxAge: 13,
    requiredStage: 'middle_school',
    weight: 1.6,
    description: 'The science lab smells faintly of preservative solution. On your metal tray rests a preserved bullfrog, with a diagram worksheet waiting to be completed.',
    choices: [
      {
        id: 'make_careful_incisions',
        label: 'Put on safety goggles, take the scalpel, and make precise cuts',
        icon: '🔬',
        outcomes: [
          {
            message: 'Your steady surgical hands impressed the science teacher! You labeled every organ with 100% textbook accuracy.',
            effects: { smarts: 5, grades: 6, happiness: 4 },
          },
        ],
      },
      {
        id: 'handle_magnifying_glass',
        label: 'Handle the magnifying glass and anatomy notebook while your partner cuts',
        icon: '🔍',
        outcomes: [
          {
            message: 'Great division of labor! You sketched the frog heart and lungs clearly without getting your hands dirty.',
            effects: { smarts: 3, grades: 4 },
          },
        ],
      },
      {
        id: 'ask_for_virtual_model',
        label: 'Politely request the computer simulation model due to a squeamish stomach',
        icon: '💻',
        outcomes: [
          {
            message: 'The teacher happily let you use the 3D computer anatomy simulator at the lab desk.',
            effects: { smarts: 3, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'school_library_quiet_escape',
    title: 'Library Air-Conditioned Haven',
    icon: '📖',
    category: 'social',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    weight: 1.4,
    description: 'During a chaotic 85-degree afternoon recess, the school library doors are open with cool air-conditioning and rows of quiet book aisles.',
    choices: [
      {
        id: 'read_fantasy_graphic_novels',
        label: 'Curl up in a beanbag chair with a fantasy graphic novel',
        icon: '🧙',
        outcomes: [
          {
            message: 'You got lost in an incredible story about dragons and magical realms. It was the most relaxing 40 minutes of your week.',
            effects: { happiness: 7, smarts: 3 },
          },
        ],
      },
      {
        id: 'finish_math_homework_early',
        label: 'Sit at an oak desk and finish all your math homework early',
        icon: '📐',
        outcomes: [
          {
            message: 'You completed your entire assignment before the final bell! Your evening at home was 100% free of homework stress.',
            effects: { smarts: 4, grades: 4, happiness: 5 },
          },
        ],
      },
      {
        id: 'browse_nature_encyclopedia',
        label: 'Flip through giant illustrated encyclopedias of deep ocean creatures',
        icon: '🐙',
        outcomes: [
          {
            message: 'Bioluminescent jellyfish and giant squids fascinated your imagination.',
            effects: { smarts: 4, happiness: 3 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // PART 2: RELATIONSHIPS & FIRST CRUSHES (INTRODUCES A SPECIFIC PERSON)
  // ==========================================================================
  {
    id: 'middle_school_locker_neighbor',
    title: 'Locker 142 Jammed',
    icon: '🔐',
    category: 'social',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    weight: 2,
    description: 'On your first week of middle school, your locker gets stuck. Ethan Brooks, who has the locker right above yours, notices and gives it a well-timed kick to pop it open.',
    choices: [
      {
        id: 'trade_snack_thank',
        label: 'Thank him and trade a bag of chips from your lunch',
        icon: '🥨',
        outcomes: [
          {
            message: 'Ethan grinned and shared half his chocolate bar with you. You two walked to homeroom together and became locker buddies!',
            effects: { happiness: 6, popularity: 3 },
            personIntroduced: {
              firstName: 'Ethan',
              lastName: 'Brooks',
              gender: 'male',
              age: 11,
              role: 'Middle School Locker Buddy',
              relationshipType: 'friend',
              relationship: 82,
              originStory: 'Helped you kick open your jammed middle school locker.',
              stageMet: 'middle_school',
              avatarEmoji: '🎒',
            },
          },
        ],
      },
      {
        id: 'trade_comic_books',
        label: 'Ask what superhero comic he has sticking out of his backpack',
        icon: '🦸',
        outcomes: [
          {
            message: 'Ethan\'s eyes lit up! You spent the whole break debating superhero villains and agreed to swap comic issues tomorrow.',
            effects: { happiness: 7, popularity: 2 },
            personIntroduced: {
              firstName: 'Ethan',
              lastName: 'Brooks',
              gender: 'male',
              age: 11,
              role: 'Comic Book Buddy',
              relationshipType: 'friend',
              relationship: 86,
              originStory: 'Bonded over superhero comic books by your middle school lockers.',
              stageMet: 'middle_school',
              avatarEmoji: '🦸',
            },
          },
        ],
      },
      {
        id: 'say_thanks_hurry',
        label: 'Mumble thanks and rush to class so you aren\'t late',
        icon: '🏃',
        outcomes: [
          {
            message: 'You arrived just before the bell rang.',
            effects: { grades: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'middle_school_gym_dance',
    title: 'Gymnasium Winter Ball',
    icon: '🪩',
    category: 'relationship',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    weight: 1.8,
    description: 'Paper streamers hang from the gymnasium basketball hoops. As a slow song plays over the echoing speakers, your classmate Lily Davis taps your shoulder with a shy smile.',
    choices: [
      {
        id: 'slow_dance_lily',
        label: 'Step onto the wooden court and dance with Lily',
        icon: '💃',
        outcomes: [
          {
            message: 'You swayed under the glittery gym lights, your heart pounding. Lily giggled and rested her hands on your shoulders. It felt magical!',
            effects: { happiness: 10, popularity: 5, looks: 2 },
            personIntroduced: {
              firstName: 'Lily',
              lastName: 'Davis',
              gender: 'female',
              age: 12,
              role: 'Middle School Crush & Dance Partner',
              relationshipType: 'crush',
              relationship: 88,
              originStory: 'Slow danced with you under the gymnasium paper streamers.',
              stageMet: 'middle_school',
              avatarEmoji: '🌸',
            },
          },
        ],
      },
      {
        id: 'go_get_punch_together',
        label: 'Offer to walk over and get cups of fruit punch together first',
        icon: '🥤',
        outcomes: [
          {
            message: 'You two laughed about the cheesy decorations while drinking punch by the bleachers. She gave you a warm, lingering smile.',
            effects: { happiness: 7, popularity: 3 },
            personIntroduced: {
              firstName: 'Lily',
              lastName: 'Davis',
              gender: 'female',
              age: 12,
              role: 'School Dance Friend & Crush',
              relationshipType: 'crush',
              relationship: 78,
              originStory: 'Drank punch and laughed together by the gym bleachers during the winter dance.',
              stageMet: 'middle_school',
              avatarEmoji: '🌸',
            },
          },
        ],
      },
      {
        id: 'hide_punch_bowl',
        label: 'Get too nervous, mumble an excuse, and walk away',
        icon: '😶',
        outcomes: [
          {
            message: 'You drank fruit punch by yourself while watching the dance floor from the bleachers.',
            effects: { happiness: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'middle_school_cafeteria_clique',
    title: 'Cafeteria Table Politics',
    icon: '🥪',
    category: 'social',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    description: 'Carrying your lunch tray through the roaring middle school cafeteria, artsy classmate Ruby Martinez waves you over to a table covered in sketchbooks and colored markers.',
    choices: [
      {
        id: 'join_creative_table',
        label: 'Sit with Ruby and draw funny cartoons together',
        icon: '🎨',
        outcomes: [
          {
            message: 'Ruby shared her colored markers and laughed at your doodles. You found your true lunch crew!',
            effects: { happiness: 7, popularity: 3 },
            personIntroduced: {
              firstName: 'Ruby',
              lastName: 'Martinez',
              gender: 'female',
              age: 12,
              role: 'Cafeteria Sketch Partner',
              relationshipType: 'best_friend',
              relationship: 86,
              originStory: 'Invited you to the creative comic table in the middle school cafeteria.',
              stageMet: 'middle_school',
              avatarEmoji: '🎨',
            },
          },
        ],
      },
      {
        id: 'share_cookies_ruby',
        label: 'Share your dessert cookies with her table',
        icon: '🍪',
        outcomes: [
          {
            message: 'The whole table cheered and gave you the best seat by the window!',
            effects: { happiness: 6, popularity: 4 },
            personIntroduced: {
              firstName: 'Ruby',
              lastName: 'Martinez',
              gender: 'female',
              age: 12,
              role: 'Lunchroom Friend',
              relationshipType: 'friend',
              relationship: 80,
              originStory: 'Shared chocolate chip cookies at the middle school art table.',
              stageMet: 'middle_school',
              avatarEmoji: '🎨',
            },
          },
        ],
      },
      {
        id: 'eat_alone_library',
        label: 'Slip into the quiet school library to read in peace',
        icon: '📖',
        outcomes: [
          {
            message: 'You enjoyed a quiet peaceful lunch reading adventure novels.',
            effects: { smarts: 3, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'middle_school_science_fair',
    title: 'Science Fair Volcano Partner',
    icon: '🌋',
    category: 'education',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    description: 'Mr. Henderson assigns you to be science fair partners with quiet whiz-kid Oliver Chen. He wants to build a dual-chamber erupting baking soda volcano with LED magma.',
    choices: [
      {
        id: 'build_epic_volcano',
        label: 'Spend the weekend at Oliver\'s house engineering the volcano',
        icon: '🧪',
        outcomes: [
          {
            message: 'Red food dye erupted 6 feet in the air! The judges cheered and awarded you two the First Place Blue Ribbon!',
            effects: { smarts: 6, grades: 8, happiness: 6 },
            personIntroduced: {
              firstName: 'Oliver',
              lastName: 'Chen',
              gender: 'male',
              age: 12,
              role: 'Science Fair Partner',
              relationshipType: 'friend',
              relationship: 85,
              originStory: 'Won First Place together at the middle school science fair.',
              stageMet: 'middle_school',
              avatarEmoji: '🧪',
            },
          },
        ],
      },
      {
        id: 'add_dry_ice_smoke',
        label: 'Suggest adding dry ice smoke effects to the crater',
        icon: '💨',
        outcomes: [
          {
            message: 'Oliver was thrilled with the idea! Thick smoke spilled across the display table. You won the "Most Creative Display" trophy!',
            effects: { smarts: 7, grades: 7, popularity: 4 },
            personIntroduced: {
              firstName: 'Oliver',
              lastName: 'Chen',
              gender: 'male',
              age: 12,
              role: 'Science Whiz Teammate',
              relationshipType: 'friend',
              relationship: 88,
              originStory: 'Engineered a smoking volcano science fair project together.',
              stageMet: 'middle_school',
              avatarEmoji: '🧪',
            },
          },
        ],
      },
      {
        id: 'basic_poster',
        label: 'Convince him to just do a simple poster board instead',
        icon: '📋',
        outcomes: [
          {
            message: 'You earned a solid B grade with minimal weekend effort.',
            effects: { grades: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'middle_school_bully_bleachers',
    title: 'Behind the Bleachers',
    icon: '🥊',
    category: 'social',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    description: 'After PE class, middle school bully Marcus Vance corners you behind the gym bleachers, demanding your dessert snack.',
    choices: [
      {
        id: 'stand_ground_firm',
        label: 'Stand tall, look him in the eyes, and firmly refuse',
        icon: '😤',
        outcomes: [
          {
            message: 'Surprised that you didn\'t back down, Marcus scowled and walked away. Classmates who saw it whispered in awe of your courage!',
            effects: { popularity: 8, happiness: 5, karma: 3 },
            personIntroduced: {
              firstName: 'Marcus',
              lastName: 'Vance',
              gender: 'male',
              age: 13,
              role: 'Schoolyard Bully & Rival',
              relationshipType: 'rival',
              relationship: 25,
              originStory: 'You stood your ground against him behind the middle school bleachers.',
              stageMet: 'middle_school',
              avatarEmoji: '🤼',
            },
          },
        ],
      },
      {
        id: 'tell_teacher',
        label: 'Report him immediately to the school counselor',
        icon: '🗣️',
        outcomes: [
          {
            message: 'The counselor called Marcus\'s parents and gave him detention. He steered clear of you for the rest of the year.',
            effects: { karma: 4, happiness: 2 },
          },
        ],
      },
      {
        id: 'de_escalate_with_humor',
        label: 'Make a quick witty joke to disarm the tension',
        icon: '😄',
        outcomes: [
          {
            message: 'Marcus was so caught off guard by the joke that he chuckled and told you to scram. Crisis avoided!',
            effects: { popularity: 4, happiness: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'middle_school_secret_admirer',
    title: 'Origami Note in Class',
    icon: '💌',
    category: 'relationship',
    minAge: 11,
    maxAge: 13,
    requiredStage: 'middle_school',
    description: 'During social studies class, a beautifully folded paper crane lands on your desk. Inside, neat handwriting from Aria Hart reads: "I think you\'re really cool. Do you like me? [ ] Yes  [ ] No"',
    choices: [
      {
        id: 'check_yes_aria',
        label: 'Check [x] Yes, draw a little smiley face, and pass it back',
        icon: '💌',
        outcomes: [
          {
            message: 'Aria unfolded the crane, beamed with pure joy, and gave you a sweet wave from across the classroom.',
            effects: { happiness: 9, looks: 2, popularity: 3 },
            personIntroduced: {
              firstName: 'Aria',
              lastName: 'Hart',
              gender: 'female',
              age: 12,
              role: 'Secret Admirer & Middle School Sweetheart',
              relationshipType: 'crush',
              relationship: 86,
              originStory: 'Passed you a folded paper crane note in middle school social studies class.',
              stageMet: 'middle_school',
              avatarEmoji: '💌',
            },
          },
        ],
      },
      {
        id: 'write_sweet_note_back',
        label: 'Write back: "Let\'s hang out by the lockers after school!"',
        icon: '✏️',
        outcomes: [
          {
            message: 'Aria met you after the bell and you shared ice cream together on the walk home. It felt like the start of something special.',
            effects: { happiness: 10, looks: 2, popularity: 2 },
            personIntroduced: {
              firstName: 'Aria',
              lastName: 'Hart',
              gender: 'female',
              age: 12,
              role: 'After-School Sweetheart',
              relationshipType: 'dating',
              relationship: 90,
              originStory: 'Met by the lockers after school following an origami crane love note.',
              stageMet: 'middle_school',
              avatarEmoji: '💌',
            },
          },
        ],
      },
      {
        id: 'keep_it_safe_friend',
        label: 'Check [x] As Friends, and smile warmly at her',
        icon: '😊',
        outcomes: [
          {
            message: 'She smiled gratefully. You two became great classroom buddies.',
            effects: { happiness: 5 },
            personIntroduced: {
              firstName: 'Aria',
              lastName: 'Hart',
              gender: 'female',
              age: 12,
              role: 'Classmate & Friend',
              relationshipType: 'friend',
              relationship: 75,
              originStory: 'Agreed to be friends after an origami paper crane note.',
              stageMet: 'middle_school',
              avatarEmoji: '🌸',
            },
          },
        ],
      },
    ],
  },
];
