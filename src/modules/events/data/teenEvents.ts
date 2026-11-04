import type { LifeEventTemplate } from '../types'

/** Ages 13 - 17 (Teens cannot earn money yet; expenses require asking parents) */
export const TEEN_EVENTS: LifeEventTemplate[] = [
  {
    id: 'midnight_party',
    title: 'Midnight Party',
    icon: '🌙',
    category: 'social',
    minAge: 14,
    maxAge: 17,
    description: "Your friends are throwing a party tonight, but your parents said you have to be home by 10.",
    choices: [
      {
        id: 'sneak',
        label: 'Sneak out the window',
        icon: '🪟',
        outcomes: [
          { weight: 5, message: "Best night ever, and you made it back before sunrise.", effects: { happiness: 8, karma: -3 } },
          { weight: 5, message: "Your dad was waiting in the kitchen when you climbed back in. Grounded.", effects: { happiness: -6, karma: -3 } },
        ],
      },
      {
        id: 'ask',
        label: 'Ask to stay out later',
        icon: '🙏',
        outcomes: [
          { weight: 5, message: "They agreed to midnight! Trust earned.", effects: { happiness: 5, karma: 2 } },
          { weight: 5, message: "They said no. You sulked in your room all night.", effects: { happiness: -2, karma: 1 } },
        ],
      },
      {
        id: 'study',
        label: 'Stay home and study',
        icon: '📚',
        outcomes: [
          { message: "You aced your test the next week.", effects: { smarts: 4, happiness: -2 } },
        ],
      },
    ],
  },
  {
    id: 'first_crush',
    title: 'Crush Alert',
    icon: '💘',
    category: 'relationship',
    minAge: 13,
    maxAge: 17,
    description: "You can't stop thinking about someone in your class.",
    choices: [
      {
        id: 'ask',
        label: 'Ask them out',
        icon: '💐',
        outcomes: [
          { weight: 5, message: "They said yes! You've been smiling for days.", effects: { happiness: 10, looks: 1 } },
          { weight: 5, message: "They said they just want to be friends. Ouch.", effects: { happiness: -6 } },
        ],
      },
      {
        id: 'note',
        label: 'Leave an anonymous note',
        icon: '💌',
        outcomes: [
          { message: "They smiled when they read it. Your secret is safe... for now.", effects: { happiness: 3 } },
        ],
      },
      {
        id: 'secret',
        label: 'Keep it to yourself',
        icon: '🤐',
        outcomes: [
          { message: "You'll always wonder what might have been.", effects: { happiness: -1 } },
        ],
      },
    ],
  },
  {
    id: 'science_camp_trip',
    title: 'High School Science Camp',
    icon: '🔭',
    category: 'education',
    minAge: 14,
    maxAge: 17,
    description: 'Your high school is organizing a weekend astronomy and science camp in the mountains, and your parents need to cover the trip fee.',
    choices: [
      {
        id: 'ask_parents',
        label: 'Ask your parents to pay for the trip',
        icon: '🙏',
        outcomes: [
          { weight: 5, parentPaid: true, message: "{fatherName} and {motherName} gladly paid for the camp! You stargazed through telescopes and learned a ton.", effects: { smarts: 5, happiness: 6, parents: 4 } },
          { weight: 5, parentPaid: false, message: "{motherName} said it was too pricey this semester. You had to skip the trip.", effects: { happiness: -4 } },
        ],
      },
      {
        id: 'pitch_grades',
        label: 'Pitch how it will help your college applications',
        icon: '📈',
        outcomes: [
          { message: "Convinced by your argument, {fatherName} and {motherName} paid the fee right away. It was an awesome trip!", effects: { smarts: 6, happiness: 5, parents: 5 } },
        ],
      },
      {
        id: 'stay_home',
        label: 'Skip the camp and relax at home',
        icon: '🏠',
        outcomes: [
          { message: "You stayed home and caught up on sleep all weekend.", effects: { health: 2, happiness: 1 } },
        ],
      },
    ],
  },
  {
    id: 'leaked_exam',
    title: 'Leaked Exam',
    icon: '📄',
    category: 'education',
    minAge: 14,
    maxAge: 17,
    description: "Someone is passing around the answers to tomorrow's final exam.",
    choices: [
      {
        id: 'use',
        label: 'Use the answers',
        icon: '😏',
        outcomes: [
          { weight: 6, message: "You aced it without studying. Nobody found out.", effects: { happiness: 2, karma: -6 } },
          { weight: 4, message: "The school found out and gave everyone involved a zero.", effects: { happiness: -8, karma: -8 } },
        ],
      },
      {
        id: 'report',
        label: 'Report it',
        icon: '🚨',
        outcomes: [
          { weight: 6, message: "The exam was rewritten. The teachers thanked you privately.", effects: { karma: 6, smarts: 1 } },
          { weight: 4, message: "The exam was rewritten, and half the class figured out it was you.", effects: { karma: 6, happiness: -4 } },
        ],
      },
      {
        id: 'study',
        label: 'Ignore it and study hard',
        icon: '📖',
        outcomes: [
          { message: "You pulled an all-nighter and earned your grade honestly.", effects: { smarts: 5, health: -1 } },
        ],
      },
    ],
  },
  {
    id: 'going_viral',
    title: 'Going Viral?',
    icon: '📱',
    category: 'social',
    minAge: 13,
    maxAge: 17,
    description: 'You filmed a silly dance video. Your thumb hovers over the "Post" button.',
    choices: [
      {
        id: 'post',
        label: 'Post it',
        icon: '🚀',
        outcomes: [
          { weight: 3, message: "It went viral! A million views overnight.", effects: { happiness: 10, looks: 3 } },
          { weight: 5, message: "A handful of likes, mostly from your relatives.", effects: { happiness: -1 } },
          { weight: 2, message: "The comments roasted you mercilessly.", effects: { happiness: -6 } },
        ],
      },
      {
        id: 'delete',
        label: 'Delete it',
        icon: '🗑️',
        outcomes: [
          { message: "Some things are better left in the drafts.", effects: { smarts: 1 } },
        ],
      },
    ],
  },
  {
    id: 'fitness_phase',
    title: 'Fitness Phase',
    icon: '🏋️',
    category: 'health',
    minAge: 13,
    maxAge: 17,
    description: 'Tryouts for the school sports teams are this week.',
    choices: [
      {
        id: 'team',
        label: 'Try out for the team',
        icon: '🏀',
        outcomes: [
          { weight: 6, message: "You made the team! Practices are tough but you're getting fit.", effects: { health: 6, happiness: 4, looks: 2 } },
          { weight: 4, message: "You didn't make the cut, but you kept training anyway.", effects: { health: 3, happiness: -2 } },
        ],
      },
      {
        id: 'run',
        label: 'Start running every morning',
        icon: '🏃',
        outcomes: [
          { message: "You feel more energetic than ever.", effects: { health: 5, looks: 1 } },
        ],
      },
      {
        id: 'games',
        label: 'Play video games instead',
        icon: '🎮',
        outcomes: [
          { message: "You reached the top of the online leaderboard. Your back hurts.", effects: { happiness: 4, health: -3 } },
        ],
      },
    ],
  },
  {
    id: 'style_makeover',
    title: 'Style Makeover',
    icon: '💇',
    category: 'social',
    minAge: 13,
    maxAge: 17,
    description: "You're bored of your look and want a fresh new hairstyle.",
    choices: [
      {
        id: 'bold',
        label: 'Ask your parents to pay for hair dye',
        icon: '🌈',
        outcomes: [
          { weight: 5, message: "Your parents agreed! Everyone at school is talking about your bold new look.", effects: { looks: 6, happiness: 5 } },
          { weight: 5, message: "It came out a weird shade of green. You wore a hat for weeks.", effects: { looks: -4, happiness: -3 } },
        ],
      },
      {
        id: 'trim',
        label: 'Have your parents pay for a classic trim',
        icon: '✂️',
        outcomes: [
          { message: "Your parents covered the salon visit. Clean and sharp!", effects: { looks: 3, happiness: 2 } },
        ],
      },
      {
        id: 'diy',
        label: 'Cut it yourself in the bathroom mirror',
        icon: '🪞',
        outcomes: [
          { weight: 3, message: "Surprisingly, it looks great!", effects: { looks: 3, smarts: 1 } },
          { weight: 7, message: "It's... uneven. Very uneven.", effects: { looks: -5, happiness: -3 } },
        ],
      },
    ],
  },
  {
    id: 'peer_pressure',
    title: 'Peer Pressure',
    icon: '🚬',
    category: 'health',
    minAge: 14,
    maxAge: 17,
    description: 'Some older kids behind the school offer you a cigarette.',
    choices: [
      {
        id: 'decline',
        label: 'Say no thanks',
        icon: '🙅',
        outcomes: [
          { message: "They shrugged and moved on. Your lungs thank you.", effects: { health: 1, karma: 3 } },
        ],
      },
      {
        id: 'try',
        label: 'Try it',
        icon: '😶‍🌫️',
        outcomes: [
          { message: "You coughed so hard your eyes watered. Not cool at all.", effects: { health: -5, looks: -1, happiness: 1 } },
        ],
      },
      {
        id: 'leave',
        label: 'Walk away and find new friends',
        icon: '🚶',
        outcomes: [
          { message: "You joined the robotics club and found your people.", effects: { smarts: 3, karma: 2, happiness: -1 } },
        ],
      },
    ],
  },
  {
    id: 'volunteer_day',
    title: 'Volunteer Day',
    icon: '🤝',
    category: 'social',
    minAge: 13,
    maxAge: 17,
    description: 'The local animal shelter is looking for weekend volunteers.',
    choices: [
      {
        id: 'volunteer',
        label: 'Sign up to help',
        icon: '🐾',
        outcomes: [
          { message: "You spent the weekend walking dogs and cuddling kittens.", effects: { karma: 8, happiness: 4 } },
        ],
      },
      {
        id: 'sleep',
        label: 'Sleep in all weekend',
        icon: '🛌',
        outcomes: [
          { message: "You caught up on sleep. Your body thanks you.", effects: { health: 2 } },
        ],
      },
    ],
  },
  {
    id: 'promposal_extravaganza',
    title: 'Senior Promposal',
    icon: '👑',
    category: 'relationship',
    minAge: 16,
    maxAge: 17,
    requiredStage: 'high_school',
    weight: 2,
    description: 'During the high school spirit rally, your crush Isabella Hart steps forward with a giant painted banner that reads: "Will you go to Prom with me?" while the whole gym watches!',
    choices: [
      {
        id: 'say_yes_prom',
        label: 'Say YES with a huge hug as the whole gym roars!',
        icon: '💖',
        outcomes: [
          {
            message: 'Isabella threw her arms around you as confetti showered down! You became the talk of the entire high school and attended Prom together.',
            effects: { happiness: 14, popularity: 10, looks: 3 },
            personIntroduced: {
              firstName: 'Isabella',
              lastName: 'Hart',
              gender: 'female',
              age: 17,
              role: 'High School Prom Date & Sweetheart',
              relationshipType: 'dating',
              relationship: 92,
              originStory: 'Asked you to high school Prom with a giant painted banner in the gym.',
              stageMet: 'high_school',
              avatarEmoji: '👑',
            },
          },
        ],
      },
      {
        id: 'go_as_friends',
        label: 'Laugh and agree to go together as close friends',
        icon: '🤝',
        outcomes: [
          {
            message: 'She smiled: "Deal! Best friends forever." You had an unforgettable dance together without any romantic pressure.',
            effects: { happiness: 8, popularity: 4 },
            personIntroduced: {
              firstName: 'Isabella',
              lastName: 'Hart',
              gender: 'female',
              age: 17,
              role: 'High School Best Friend',
              relationshipType: 'best_friend',
              relationship: 82,
              originStory: 'Attended the high school prom together as best friends.',
              stageMet: 'high_school',
              avatarEmoji: '✨',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'high_school_first_car',
    title: 'Finn\'s Beater Car',
    icon: '🚗',
    category: 'social',
    minAge: 16,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'Your classmate Finn Gallagher just bought a clunky 2004 silver hatchback with squeaky brakes and offers to drive you to the drive-thru diner.',
    choices: [
      {
        id: 'ride_shotgun_finn',
        label: 'Hop in shotgun, blast the radio, and grab burgers',
        icon: '🍔',
        outcomes: [
          {
            message: 'The exhaust rattled, the heater blasted lukewarm air, but cruising down main street eating french fries felt like pure teenage freedom!',
            effects: { happiness: 9, popularity: 4 },
            personIntroduced: {
              firstName: 'Finn',
              lastName: 'Gallagher',
              gender: 'male',
              age: 16,
              role: 'High School Cruising Buddy',
              relationshipType: 'friend',
              relationship: 84,
              originStory: 'Cruised around town in his squeaky silver first car.',
              stageMet: 'high_school',
              avatarEmoji: '🚗',
            },
          },
        ],
      },
      {
        id: 'take_school_bus',
        label: 'Politely pass and take the safe school bus home',
        icon: '🚌',
        outcomes: [
          {
            message: 'You arrived home safely and on time.',
            effects: { happiness: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'ap_chem_titration_spark',
    title: 'Chemistry Lab Titration',
    icon: '🧪',
    category: 'relationship',
    minAge: 15,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'In AP Chemistry, you are paired with quiet student Elena Rostova. While watching the titration flask turn light pink, your hands accidentally touch.',
    choices: [
      {
        id: 'hold_her_gaze',
        label: 'Look into her eyes and whisper a playful chemistry joke',
        icon: '✨',
        outcomes: [
          {
            message: 'Elena blushed bright pink to match the flask and laughed softly. She asked for your phone number so you could "study titration formulas" together.',
            effects: { happiness: 10, looks: 2, smarts: 3 },
            personIntroduced: {
              firstName: 'Elena',
              lastName: 'Rostova',
              gender: 'female',
              age: 16,
              role: 'AP Chemistry Lab Partner & Crush',
              relationshipType: 'crush',
              relationship: 86,
              originStory: 'Shared a spark during an AP Chemistry titration lab experiment.',
              stageMet: 'high_school',
              avatarEmoji: '🧪',
            },
          },
        ],
      },
      {
        id: 'focus_strictly_formula',
        label: 'Focus strictly on recording the volume numbers',
        icon: '📝',
        outcomes: [
          {
            message: 'Your lab report received an A+ for precision.',
            effects: { smarts: 4, grades: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'detention_rebel_bonding',
    title: 'After-School Detention',
    icon: '🚪',
    category: 'social',
    minAge: 14,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'Serving an after-school detention for tardiness, you find yourself sitting across from school rebel Jack Sterling, who passes you a stick of gum.',
    choices: [
      {
        id: 'talk_with_jack',
        label: 'Whisper stories and make fun of the ticking wall clock',
        icon: '💬',
        outcomes: [
          {
            message: 'Jack proved to be remarkably witty and loyal under his tough leather jacket. You walked out of detention with an unexpected ally for life.',
            effects: { happiness: 7, popularity: 4, karma: -1 },
            personIntroduced: {
              firstName: 'Jack',
              lastName: 'Sterling',
              gender: 'male',
              age: 16,
              role: 'High School Rebel & Loyal Friend',
              relationshipType: 'friend',
              relationship: 82,
              originStory: 'Bonded during after-school detention sharing gum and stories.',
              stageMet: 'high_school',
              avatarEmoji: '⚡',
            },
          },
        ],
      },
      {
        id: 'stare_at_desk',
        label: 'Keep your head down and serve your hour in silence',
        icon: '🤐',
        outcomes: [
          {
            message: 'You served the hour peacefully and went straight home.',
            effects: { karma: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'high_school_tailgate_cheer',
    title: 'Friday Night Tailgate',
    icon: '🏈',
    category: 'social',
    minAge: 15,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'Under the stadium floodlights before the homecoming game, varsity athlete Lucas Hayes tosses you a football and invites you to the student bleacher section.',
    choices: [
      {
        id: 'cheer_with_lucas',
        label: 'Catch the pass, paint your face, and lead the student chants',
        icon: '📣',
        outcomes: [
          {
            message: 'Your school won in overtime! Lucas ran over to the bleachers and gave you a game ball! The atmosphere was electric.',
            effects: { happiness: 10, popularity: 8, health: 2 },
            personIntroduced: {
              firstName: 'Lucas',
              lastName: 'Hayes',
              gender: 'male',
              age: 17,
              role: 'Varsity Football Teammate & Buddy',
              relationshipType: 'friend',
              relationship: 85,
              originStory: 'Tossed you the game ball after a Friday night lights victory.',
              stageMet: 'high_school',
              avatarEmoji: '🏈',
            },
          },
        ],
      },
      {
        id: 'watch_quietly',
        label: 'Watch quietly from the back with a hot chocolate',
        icon: '☕',
        outcomes: [
          {
            message: 'You enjoyed the crisp autumn air and the band music.',
            effects: { happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'stargazing_lookout_confession',
    title: 'Scenic Lookout Stargazing',
    icon: '🌌',
    category: 'relationship',
    minAge: 16,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'On a warm summer evening, your classmate Kai Parker drives you up to the scenic city overlook. Sitting on the hood of the car under shooting stars, Kai looks at you tenderly.',
    choices: [
      {
        id: 'hold_hands_confess',
        label: 'Reach out, hold Kai\'s hand, and confess your feelings',
        icon: '💫',
        outcomes: [
          {
            message: 'Kai smiled softly, interlacing fingers with yours: "I\'ve been wanting to tell you for months." You shared a tender first kiss under the starry sky.',
            effects: { happiness: 14, looks: 3, popularity: 3 },
            personIntroduced: {
              firstName: 'Kai',
              lastName: 'Parker',
              gender: 'non-binary',
              age: 17,
              role: 'High School Sweetheart & First Love',
              relationshipType: 'dating',
              relationship: 92,
              originStory: 'Shared a tender first kiss under the stars at the city lookout.',
              stageMet: 'high_school',
              avatarEmoji: '💫',
            },
          },
        ],
      },
      {
        id: 'enjoy_view_friends',
        label: 'Talk about the constellation stars as close friends',
        icon: '🔭',
        outcomes: [
          {
            message: 'You traced the Big Dipper and talked about your hopes for the future.',
            effects: { happiness: 6, smarts: 2 },
            personIntroduced: {
              firstName: 'Kai',
              lastName: 'Parker',
              gender: 'non-binary',
              age: 17,
              role: 'Stargazing Best Friend',
              relationshipType: 'best_friend',
              relationship: 80,
              originStory: 'Stargazed together at the scenic city overlook.',
              stageMet: 'high_school',
              avatarEmoji: '🌌',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'school_newspaper_investigation',
    title: 'School Newspaper Scoop',
    icon: '📰',
    category: 'social',
    minAge: 15,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'Investigative student reporter Zoe Washington asks you to help her uncover the mystery behind where the missing prom ticket funds went.',
    choices: [
      {
        id: 'investigate_with_zoe',
        label: 'Investigate the ledgers and interview the student council',
        icon: '🔍',
        outcomes: [
          {
            message: 'You cracked the code! The school newspaper printed your front-page exposé, forcing the treasurer to refund everyone\'s tickets. Zoe declared you her star investigative partner!',
            effects: { smarts: 6, popularity: 7, karma: 5, happiness: 6 },
            personIntroduced: {
              firstName: 'Zoe',
              lastName: 'Washington',
              gender: 'female',
              age: 16,
              role: 'Investigative School Journalist',
              relationshipType: 'friend',
              relationship: 85,
              originStory: 'Cracked a front-page investigative school newspaper scoop together.',
              stageMet: 'high_school',
              avatarEmoji: '📰',
            },
          },
        ],
      },
      {
        id: 'avoid_drama',
        label: 'Stay out of school council gossip',
        icon: '🙅',
        outcomes: [
          {
            message: 'You avoided any crossfire with the student council officers.',
            effects: { happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'homecoming_rival_raid',
    title: 'Rival Mascot Prank',
    icon: '🦝',
    category: 'social',
    minAge: 15,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'Before the annual rivalry football game, rival high school student Marcus Vance is caught on your campus trying to spray-paint the school mascot statue.',
    choices: [
      {
        id: 'confront_marcus',
        label: 'Catch him in the act and confiscate his spray paint',
        icon: '🛑',
        outcomes: [
          {
            message: 'Marcus scoffed: "You got lucky this time!" Your school mascot was saved and your school spirit earned legendary praise!',
            effects: { popularity: 8, happiness: 5, karma: 4 },
            personIntroduced: {
              firstName: 'Marcus',
              lastName: 'Vance',
              gender: 'male',
              age: 17,
              role: 'Rival High School Competitor',
              relationshipType: 'rival',
              relationship: 30,
              originStory: 'Stopped him from vandalizing your high school mascot statue.',
              stageMet: 'high_school',
              avatarEmoji: '🦹',
            },
          },
        ],
      },
      {
        id: 'alert_security',
        label: 'Call campus security on him immediately',
        icon: '🚨',
        outcomes: [
          {
            message: 'Security escorted him off the premises before any damage was done.',
            effects: { karma: 3, popularity: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'spanish_class_study_date',
    title: 'AP Spanish Flashcards',
    icon: '🇪🇸',
    category: 'education',
    minAge: 14,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'Honor student Sophia Chen offers to quiz you with verb conjugation flashcards over horchata at the local taco spot.',
    choices: [
      {
        id: 'study_with_sophia',
        label: 'Practice your Spanish accent and buy her tacos',
        icon: '🌮',
        outcomes: [
          {
            message: 'Sophia giggled at your accent and patiently corrected your verbs. You aced your Spanish exam and she promised to tutor you every Thursday!',
            effects: { smarts: 5, grades: 6, happiness: 7, looks: 1 },
            personIntroduced: {
              firstName: 'Sophia',
              lastName: 'Chen',
              gender: 'female',
              age: 15,
              role: 'AP Spanish Tutor & Study Date',
              relationshipType: 'crush',
              relationship: 84,
              originStory: 'Tutored you in AP Spanish over tacos and horchata.',
              stageMet: 'high_school',
              avatarEmoji: '🌮',
            },
          },
        ],
      },
      {
        id: 'study_online_alone',
        label: 'Use an online flashcard app alone at home',
        icon: '💻',
        outcomes: [
          {
            message: 'You memorized 40 vocabulary words with your phone app.',
            effects: { smarts: 3, grades: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'high_school_battle_of_the_bands',
    title: 'Battle of the Bands',
    icon: '🎸',
    category: 'social',
    minAge: 15,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'The high school gymnasium is hosting the annual Battle of the Bands. Frontman Milo Sterling needs a bassist or backup vocalist for his garage rock band.',
    choices: [
      {
        id: 'rock_out_milo',
        label: 'Plug in and rock out with Milo on the gymnasium stage',
        icon: '🤘',
        outcomes: [
          {
            message: 'Your guitar solo sent shockwaves through the crowd! The students chanted your band\'s name and Milo lifted you up in triumph!',
            effects: { popularity: 9, looks: 2, happiness: 10 },
            personIntroduced: {
              firstName: 'Milo',
              lastName: 'Sterling',
              gender: 'male',
              age: 16,
              role: 'Garage Rock Band Frontman',
              relationshipType: 'best_friend',
              relationship: 88,
              originStory: 'Rocked out together to win the high school Battle of the Bands.',
              stageMet: 'high_school',
              avatarEmoji: '🎸',
            },
          },
        ],
      },
      {
        id: 'cheer_front_row',
        label: 'Cheer like crazy from the mosh pit front row',
        icon: '👏',
        outcomes: [
          {
            message: 'You sang along to every lyric and lost your voice cheering.',
            effects: { happiness: 5, popularity: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'high_school_math_whiz_rescue',
    title: 'Calculus Finals SOS',
    icon: '📐',
    category: 'education',
    minAge: 16,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'With the AP Calculus midterm tomorrow morning, math whiz Devon Chen hosts a late-night whiteboard review in the school cafeteria.',
    choices: [
      {
        id: 'study_with_devon',
        label: 'Pull up a chair and solve derivative equations with Devon',
        icon: '💡',
        outcomes: [
          {
            message: 'Devon broke down the chain rule so cleanly it felt like magic! You aced the exam with an A and Devon became your go-to study partner.',
            effects: { smarts: 6, grades: 8, happiness: 5 },
            personIntroduced: {
              firstName: 'Devon',
              lastName: 'Chen',
              gender: 'male',
              age: 16,
              role: 'Calculus Study Partner & Math Whiz',
              relationshipType: 'friend',
              relationship: 84,
              originStory: 'Taught you derivative shortcuts before the AP Calculus midterm.',
              stageMet: 'high_school',
              avatarEmoji: '📐',
            },
          },
        ],
      },
      {
        id: 'cram_alone_bedroom',
        label: 'Cram alone in your bedroom with highlighters',
        icon: '📖',
        outcomes: [
          {
            message: 'You studied hard and managed a respectable B+.',
            effects: { smarts: 3, grades: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'high_school_summer_heatwave',
    title: 'High School Heatwave',
    icon: '☀️',
    category: 'health',
    minAge: 14,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'A blistering 102-degree heatwave strikes the city, and the high school\'s aging air conditioning breaks down during afternoon finals.',
    choices: [
      {
        id: 'jump_in_community_pool',
        label: 'Sprint to the community pool with friends after the bell',
        icon: '🏊',
        outcomes: [
          {
            message: 'Cannonball! The cold pool water felt like absolute paradise. You splashed around until the sunset.',
            effects: { happiness: 9, health: 3, popularity: 4 },
          },
        ],
      },
      {
        id: 'air_conditioned_mall_movie',
        label: 'Cool off in the ice-cold air conditioning of the movie theater',
        icon: '🍿',
        outcomes: [
          {
            message: 'You watched an action blockbuster with extra butter popcorn in freezing AC comfort.',
            effects: { happiness: 7 },
          },
        ],
      },
      {
        id: 'box_fan_and_popsicles',
        label: 'Sit at home right in front of a giant box fan eating cherry popsicles',
        icon: '🍧',
        outcomes: [
          {
            message: 'Old school summer simplicity. The cool breeze and sweet popsicles did the trick.',
            effects: { happiness: 5, health: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'driver_permit_parallel_parking',
    title: 'DMV Parallel Parking Test',
    icon: '🚙',
    category: 'education',
    minAge: 16,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'During your official driver\'s license road exam, the stern DMV examiner gestures toward two orange cones on a hill: "Show me a reverse parallel park."',
    choices: [
      {
        id: 'check_mirrors_smooth_glide',
        label: 'Signal, check blind spots, and glide in smoothly at a 45-degree angle',
        icon: '🪞',
        outcomes: [
          {
            message: 'Flawless execution! Exactly 6 inches from the curb. The examiner stamped "PASSED" on your license with a rare smile!',
            effects: { happiness: 12, smarts: 4, popularity: 6 },
          },
        ],
      },
      {
        id: 'take_it_super_slow',
        label: 'Creep in inch-by-inch, re-adjusting multiple times',
        icon: '🐢',
        outcomes: [
          {
            message: 'A bit crooked, but inside the lines without tapping the curb. You earned your driver\'s license!',
            effects: { happiness: 8, smarts: 2 },
          },
        ],
      },
      {
        id: 'tap_the_cone_gently',
        label: 'Get nervous and nudge the rubber cone with your rear tire',
        icon: '⚠️',
        outcomes: [
          {
            message: 'The cone wobbled. The examiner sighed: "Minus two points, but your highway driving was good enough to pass."',
            effects: { happiness: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'found_fifty_dollar_bill',
    title: 'Found $50 on the Bleachers',
    icon: '💵',
    category: 'money',
    minAge: 14,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'While walking under the football stadium bleachers after school, you spot a folded, crisp $50 bill trapped between two wooden slats.',
    choices: [
      {
        id: 'turn_in_to_office',
        label: 'Hand the $50 bill into the school main lost-and-found office',
        icon: '😇',
        outcomes: [
          {
            message: 'A frantic freshman who had lost his lunch money for the month reclaimed it tearfully. The principal announced your honesty over the intercom!',
            effects: { karma: 10, popularity: 6, happiness: 6 },
          },
        ],
      },
      {
        id: 'deposit_into_savings',
        label: 'Tuck it into your wallet as lucky cash for gas and snacks',
        icon: '👛',
        outcomes: [
          {
            message: 'Finders keepers! You added $50 into your pocket money stash.',
            effects: { cash: 50, happiness: 6 },
          },
        ],
      },
      {
        id: 'treat_friends_to_pizza',
        label: 'Buy two giant pepperoni pizzas and share with everyone nearby',
        icon: '🍕',
        outcomes: [
          {
            message: 'You became the hero of the afternoon! Everyone devoured hot cheesy pizza in celebration.',
            effects: { popularity: 8, happiness: 8 },
          },
        ],
      },
    ],
  },
  {
    id: 'late_night_thunderstorm_blackout',
    title: 'Stormy Night Power Cut',
    icon: '⚡',
    category: 'social',
    minAge: 14,
    maxAge: 17,
    requiredStage: 'high_school',
    description: 'A ferocious autumn rainstorm knocks out the power on your street at 8 PM on a school night. The house is completely dark and quiet.',
    choices: [
      {
        id: 'light_candles_mystery_book',
        label: 'Light a candle and read an old Sherlock Holmes mystery novel',
        icon: '🕯️',
        outcomes: [
          {
            message: 'The rain against the window and the flickering candle created the coziest atmosphere. You solved the mystery before falling asleep.',
            effects: { smarts: 4, happiness: 7 },
          },
        ],
      },
      {
        id: 'family_board_games',
        label: 'Bring out Monopoly and play with your family by flashlight',
        icon: '🎲',
        outcomes: [
          {
            message: 'Everyone laughed and traded properties over potato chips. It was one of the warmest family memories in years.',
            effects: { parents: 8, happiness: 8 },
          },
        ],
      },
      {
        id: 'listen_to_rain_sleep',
        label: 'Snuggle under thick blankets and fall asleep to the rain',
        icon: '🌧️',
        outcomes: [
          {
            message: 'The steady sound of rain on the roof lulled you into a tranquil, deep slumber.',
            effects: { health: 4, happiness: 5 },
          },
        ],
      },
    ],
  },
];

