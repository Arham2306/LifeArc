import type { LifeEventTemplate } from '../types'

/**
 * University and Higher Education Events (Ages 18 - 25+)
 * Features a balanced mix of environmental occurrences, campus surprises,
 * academic dilemmas, and memorable personal relationships.
 */
export const UNIVERSITY_EVENTS: LifeEventTemplate[] = [
  // ==========================================================================
  // PART 1: ENVIRONMENTAL & CAMPUS SURPRISES (NO PERSON INTRODUCED)
  // ==========================================================================
  {
    id: 'campus_snowstorm_cancellation',
    title: 'Blizzard Campus Shutdown',
    icon: '❄️',
    category: 'education',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    weight: 2,
    description: 'A massive overnight blizzard dumps two feet of fluffy snow across the university. The dean sends an emergency email: all campus classes and lectures are officially canceled for the day!',
    choices: [
      {
        id: 'sleep_in_hot_cocoa',
        label: 'Sleep in until noon and sip hot cocoa in bed',
        icon: '☕',
        outcomes: [
          {
            message: 'You stayed warm under heavy blankets, watching the snow fall outside while sipping marshmallows and hot cocoa. Pure bliss!',
            effects: { happiness: 8, health: 3 },
          },
        ],
      },
      {
        id: 'build_quad_snow_fort',
        label: 'Bundle up and build a massive snow castle on the quad',
        icon: '🏰',
        outcomes: [
          {
            message: 'Dozens of students joined in! You constructed an 8-foot snow fortress with battlements and engaged in an epic campus snowball fight.',
            effects: { happiness: 10, popularity: 6, health: 2 },
          },
        ],
      },
      {
        id: 'study_ahead_library',
        label: 'Trek to the quiet library and get ahead on coursework',
        icon: '📚',
        outcomes: [
          {
            message: 'The snow-blanketed library was silent and warm. You knocked out two weeks of difficult reading with zero distractions.',
            effects: { smarts: 5, grades: 5, happiness: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'campus_blackout_power_cut',
    title: 'Stormy Night Campus Blackout',
    icon: '⚡',
    category: 'social',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    weight: 1.8,
    description: 'During a roaring thunderstorm, lightning strikes the university substation. Instantly, all dorm lights, Wi-Fi routers, and campus lampposts plunge into pitch-black darkness.',
    choices: [
      {
        id: 'hallway_acoustic_singalong',
        label: 'Light candles and join the acoustic sing-along in the dorm hallway',
        icon: '🕯️',
        outcomes: [
          {
            message: 'Someone brought an acoustic guitar, others brought snacks. The entire dorm floor sang 90s anthems by flickering candlelight until midnight.',
            effects: { happiness: 9, popularity: 5 },
          },
        ],
      },
      {
        id: 'stargaze_from_roof',
        label: 'Climb up to the rooftop terrace to view the dark city skyline',
        icon: '🌌',
        outcomes: [
          {
            message: 'Without city light pollution, the Milky Way glowed brilliantly across the sky. The breathtaking view took your breath away.',
            effects: { happiness: 8, looks: 1 },
          },
        ],
      },
      {
        id: 'go_to_sleep_early',
        label: 'Take advantage of the quiet and get a full 9 hours of sleep',
        icon: '🛌',
        outcomes: [
          {
            message: 'Without glowing screens or Wi-Fi notifications, you fell into the deepest, most refreshing sleep of the entire semester.',
            effects: { health: 6, happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'clocktower_attic_secret_door',
    title: 'The Hidden Clocktower Door',
    icon: '🕰️',
    category: 'education',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    weight: 1.5,
    description: 'While studying in the oldest wing of the campus library, you lean against a wooden oak panel and hear a click. A hidden door swings open, revealing a dusty spiral staircase leading into the clocktower attic!',
    choices: [
      {
        id: 'explore_clocktower_attic',
        label: 'Climb the spiral stairs with your phone flashlight to explore',
        icon: '🔦',
        outcomes: [
          {
            message: 'You discovered a stunning circular room with panoramic campus views, antique velvet armchairs, and old yearbooks from 1924! You made it your secret sanctuary.',
            effects: { smarts: 6, happiness: 8 },
          },
        ],
      },
      {
        id: 'report_door_librarian',
        label: 'Report the unlocked historical door to the head librarian',
        icon: '🗣️',
        outcomes: [
          {
            message: 'The head librarian thanked you for your vigilance and gave you a special rare-book archive viewing pass.',
            effects: { karma: 6, smarts: 3 },
          },
        ],
      },
      {
        id: 'close_door_leave',
        label: 'Pull the door shut and go back to your textbook',
        icon: '🚪',
        outcomes: [
          {
            message: 'You minded your own business and finished your homework in peace.',
            effects: { smarts: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'food_truck_quad_festival',
    title: 'Food Truck Quad Rally',
    icon: '🌮',
    category: 'health',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    weight: 1.7,
    description: 'Ten international food trucks park on the campus lawn for lunch, filling the afternoon breeze with irresistible aromas of smoked barbecue, street tacos, and fresh pastries.',
    choices: [
      {
        id: 'try_ghost_pepper_tacos',
        label: 'Bravely order the triple-spiced ghost pepper birria tacos',
        icon: '🌶️',
        outcomes: [
          {
            message: 'Your mouth was on fire! Tears streamed down your face, but you finished every bite as the surrounding crowd cheered your courage.',
            effects: { health: -1, happiness: 7, popularity: 4 },
          },
        ],
      },
      {
        id: 'order_belgian_waffles',
        label: 'Indulge in warm Belgian waffles topped with Nutella and strawberries',
        icon: '🧇',
        outcomes: [
          {
            message: 'Warm melted chocolate and sweet strawberries melted in your mouth. You felt an immediate rush of pure joy and sugar energy!',
            effects: { happiness: 8, health: -1 },
          },
        ],
      },
      {
        id: 'get_organic_green_smoothie',
        label: 'Grab a fresh green kale, mango, and ginger smoothie',
        icon: '🥤',
        outcomes: [
          {
            message: 'Clean, crisp, and revitalizing! The natural vitamins gave you a sustained afternoon boost of physical energy.',
            effects: { health: 5, happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'vending_machine_double_drop',
    title: 'Vending Machine Glitch',
    icon: '🍫',
    category: 'social',
    minAge: 18,
    maxAge: 23,
    requiredStage: 'university',
    weight: 1.4,
    description: 'You insert $1 into the dormitory basement vending machine for a snack. The coil spins, wobbles, and unexpectedly drops three candy bars and a bag of chips all at once!',
    choices: [
      {
        id: 'share_with_floor',
        label: 'Scoop up the extra snacks and share them with hallmates',
        icon: '🎁',
        outcomes: [
          {
            message: 'You distributed the surprise candy down the dorm hallway. Your neighbors cheered you on as the snack hero of Floor 3!',
            effects: { popularity: 6, happiness: 5, karma: 3 },
          },
        ],
      },
      {
        id: 'leave_on_tray',
        label: 'Take only the one candy bar you paid for and leave the rest',
        icon: '😇',
        outcomes: [
          {
            message: 'You left the extra snacks on the tray for a hungry student to find later. Your honest karma felt completely clean.',
            effects: { karma: 6, happiness: 3 },
          },
        ],
      },
      {
        id: 'hoard_snacks_room',
        label: 'Stash all four snacks in your mini-fridge for study fuel',
        icon: '🐿️',
        outcomes: [
          {
            message: 'You enjoyed a week of free late-night study munchies.',
            effects: { happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'pop_quiz_ambush_lecture',
    title: 'Unannounced Pop Quiz!',
    icon: '📝',
    category: 'education',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    weight: 1.6,
    description: 'The lecture hall doors click shut. The professor strides to the podium and announces with a smirk: "Put away your laptops. We are having a 25-question pop quiz on this week\'s readings."',
    choices: [
      {
        id: 'power_through_memory',
        label: 'Stay calm, focus deeply, and write methodical answers',
        icon: '🧠',
        outcomes: [
          {
            message: 'Your disciplined reading paid off! You breezed through the questions and received a solid 96% score.',
            effects: { smarts: 4, grades: 6, happiness: 5 },
          },
        ],
      },
      {
        id: 'use_educated_elimination',
        label: 'Use process of elimination and test-taking intuition',
        icon: '🎯',
        outcomes: [
          {
            message: 'Your instincts proved surprisingly sharp. You scraped together an 84% B grade.',
            effects: { smarts: 2, grades: 3 },
          },
        ],
      },
      {
        id: 'panic_and_guess',
        label: 'Second-guess every choice and rush through the bubbles',
        icon: '😰',
        outcomes: [
          {
            message: 'You guessed C on four straight questions and barely squeezed out a 68% passing mark.',
            effects: { grades: -3, happiness: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'stray_dog_on_campus_lawn',
    title: 'Friendly Campus Dog',
    icon: '🐕',
    category: 'social',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    weight: 1.5,
    description: 'A handsome, friendly golden retriever with a red collar trots happily across the campus lawn, carrying a yellow tennis ball and wagging its tail at everyone.',
    choices: [
      {
        id: 'call_phone_on_tag',
        label: 'Read the collar tag and call the owner on your phone',
        icon: '📱',
        outcomes: [
          {
            message: 'A relieved local professor answered! She hurried over with tears of gratitude, thanking you profusely and giving you a warm reward hug.',
            effects: { karma: 8, happiness: 8, popularity: 3 },
          },
        ],
      },
      {
        id: 'play_fetch_on_lawn',
        label: 'Toss the tennis ball and play fetch on the grass for an hour',
        icon: '🎾',
        outcomes: [
          {
            message: 'The dog bounded after the ball with pure uncontainable joy! A circle of students gathered to pet him, instantly curing all finals week stress.',
            effects: { happiness: 10, health: 3 },
          },
        ],
      },
      {
        id: 'lead_to_campus_security',
        label: 'Gently guide the dog by its collar to the campus safety desk',
        icon: '🏢',
        outcomes: [
          {
            message: 'Campus safety gave the dog a bowl of water and safely contacted the owner through the local registry.',
            effects: { karma: 4, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'finals_midnight_scream',
    title: 'Midnight Finals Scream',
    icon: '📢',
    category: 'social',
    minAge: 18,
    maxAge: 23,
    requiredStage: 'university',
    weight: 1.6,
    description: 'At exactly 11:59 PM on the Sunday before finals week, the campus goes quiet. Then the clocktower tolls midnight, and hundreds of students poke their heads out dorm windows for the annual collective primal scream!',
    choices: [
      {
        id: 'scream_lungs_out',
        label: 'Lean out your dorm window and scream at the top of your lungs',
        icon: '🗣️',
        outcomes: [
          {
            message: 'You released all your academic tension in one thunderous roar! The campus echoed with laughter, clanging pots, and collective solidarity.',
            effects: { happiness: 8, health: 2, popularity: 3 },
          },
        ],
      },
      {
        id: 'bang_pots_and_pans',
        label: 'Bang a metal pot with a wooden spoon out the window',
        icon: '🍳',
        outcomes: [
          {
            message: 'The rhythmic clanging echoed across the quad. It was wonderfully chaotic and hilarious.',
            effects: { happiness: 6, popularity: 2 },
          },
        ],
      },
      {
        id: 'wear_noise_headphones',
        label: 'Put on noise-cancelling headphones and keep typing your essay',
        icon: '🎧',
        outcomes: [
          {
            message: 'You didn\'t lose focus for a single second and completed your bibliography ahead of schedule.',
            effects: { smarts: 3, grades: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'found_vintage_ten_speed_bike',
    title: 'Abandoned Vintage Cruiser',
    icon: '🚲',
    category: 'social',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    weight: 1.4,
    description: 'Behind the chemistry building bike racks sits an unclaimed vintage teal 10-speed bicycle covered in fallen leaves with a cardboard sign: "Free to a good home - just needs tires pumped!"',
    choices: [
      {
        id: 'restore_the_bike',
        label: 'Roll it to the campus bike co-op, pump the tires, and oil the chain',
        icon: '🔧',
        outcomes: [
          {
            message: 'The gears clicked smoothly into place! You now had a gorgeous vintage campus cruiser to zip between lectures in style.',
            effects: { health: 4, happiness: 7, looks: 2 },
          },
        ],
      },
      {
        id: 'leave_for_someone_else',
        label: 'Leave it for a student who might need transportation more',
        icon: '🤝',
        outcomes: [
          {
            message: 'Later that afternoon you saw a happy freshman riding it away with a grin.',
            effects: { karma: 4, happiness: 3 },
          },
        ],
      },
      {
        id: 'take_parts_only',
        label: 'Take just the vintage brass bell and put it on your backpack',
        icon: '🔔',
        outcomes: [
          {
            message: 'The cheerful bell chimed with every step you took across the quad.',
            effects: { happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'guest_speaker_silicon_valley',
    title: 'Surprise Silicon Valley Keynote',
    icon: '🎤',
    category: 'education',
    minAge: 19,
    maxAge: 24,
    requiredStage: 'university',
    weight: 1.5,
    description: 'A celebrated tech pioneer and venture capitalist makes an unannounced appearance in the campus auditorium to give an intimate 1-hour keynote on the future of world industry.',
    choices: [
      {
        id: 'sit_front_ask_question',
        label: 'Grab a front-row seat and step to the Q&A microphone',
        icon: '🎙️',
        outcomes: [
          {
            message: 'You asked a brilliant question about ethical tech leadership. The speaker praised your insight and personally handed you their executive business card!',
            effects: { smarts: 7, popularity: 6, happiness: 7 },
          },
        ],
      },
      {
        id: 'take_meticulous_notes',
        label: 'Sit quietly and write three pages of strategic industry insights',
        icon: '📓',
        outcomes: [
          {
            message: 'The advice on venture strategy and leadership was pure gold. You gained invaluable career inspiration.',
            effects: { smarts: 5, grades: 3 },
          },
        ],
      },
      {
        id: 'watch_livestream_in_bed',
        label: 'Watch the campus livestream from your laptop in your pajamas',
        icon: '💻',
        outcomes: [
          {
            message: 'Comfortable, zero-effort learning without fighting the crowded auditorium.',
            effects: { smarts: 2, happiness: 2 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // PART 2: RELATIONSHIPS & ROMANCE (INTRODUCES A SPECIFIC PERSON)
  // ==========================================================================
  {
    id: 'dorm_roommate_first_day',
    title: 'Move-In Day Roommate',
    icon: '📦',
    category: 'social',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    weight: 2,
    description: 'You unpack your suitcases in dorm room 304 and meet your assigned roommate, Tyler Brooks, who has already decorated half the wall with vintage album covers.',
    choices: [
      {
        id: 'split_room_friendly',
        label: 'Order a welcome pizza and split refrigerator shelf space',
        icon: '🍕',
        outcomes: [
          {
            message: 'Tyler grinned and split the pizza with you. You stayed up talking about music and classes until 2 AM!',
            effects: { happiness: 8, popularity: 4 },
            personIntroduced: {
              firstName: 'Tyler',
              lastName: 'Brooks',
              gender: 'male',
              age: 18,
              role: 'College Roommate',
              relationshipType: 'roommate',
              relationship: 85,
              originStory: 'Assigned as dorm roommates on your first day of university.',
              stageMet: 'university',
              avatarEmoji: '🛋️',
            },
          },
        ],
      },
      {
        id: 'compromise_on_music',
        label: 'Suggest setting headphone hours so you can both study',
        icon: '🎧',
        outcomes: [
          {
            message: 'Tyler agreed cheerfully: "Totally reasonable, dude." You established a great balance of fun and quiet.',
            effects: { smarts: 3, happiness: 5 },
            personIntroduced: {
              firstName: 'Tyler',
              lastName: 'Brooks',
              gender: 'male',
              age: 18,
              role: 'College Roommate',
              relationshipType: 'roommate',
              relationship: 75,
              originStory: 'Agreed on study hours and dorm living rules.',
              stageMet: 'university',
              avatarEmoji: '🛋️',
            },
          },
        ],
      },
      {
        id: 'strict_boundaries',
        label: 'Draft a strict chore contract with dividing tape on the floor',
        icon: '📜',
        outcomes: [
          {
            message: 'Tyler laughed at the blue tape, but respected your need for personal space.',
            effects: { smarts: 2, happiness: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'campus_quad_art_crush',
    title: 'Sunny Quad Watercolor',
    icon: '🎨',
    category: 'relationship',
    minAge: 18,
    maxAge: 25,
    requiredStage: 'university',
    weight: 1.8,
    description: 'While sitting on the campus quad, you notice Maya Lin, a fine arts major, glancing up from her canvas and sketching your face in watercolor.',
    choices: [
      {
        id: 'compliment_painting',
        label: 'Walk over and compliment her artwork with a warm smile',
        icon: '💐',
        outcomes: [
          {
            message: 'Maya blushed and showed you the portrait. "You have really memorable features," she laughed, inviting you for iced matcha.',
            effects: { happiness: 10, looks: 2, popularity: 3 },
            personIntroduced: {
              firstName: 'Maya',
              lastName: 'Lin',
              gender: 'female',
              age: 19,
              role: 'Campus Crush',
              relationshipType: 'crush',
              relationship: 80,
              originStory: 'Sketched your portrait in watercolor on the sunny campus quad.',
              stageMet: 'university',
              avatarEmoji: '🎨',
            },
          },
        ],
      },
      {
        id: 'offer_to_model',
        label: 'Offer to hold a still pose so she can finish the lighting',
        icon: '✨',
        outcomes: [
          {
            message: 'She painted for twenty minutes in serene concentration. At the end, she gifted you the watercolor and asked for your number.',
            effects: { happiness: 9, looks: 3 },
            personIntroduced: {
              firstName: 'Maya',
              lastName: 'Lin',
              gender: 'female',
              age: 19,
              role: 'Fine Arts Sweetheart',
              relationshipType: 'dating',
              relationship: 85,
              originStory: 'Modeled for her watercolor painting under the campus willow tree.',
              stageMet: 'university',
              avatarEmoji: '🎨',
            },
          },
        ],
      },
      {
        id: 'shy_smile',
        label: 'Give her a polite wave from afar and look down',
        icon: '😊',
        outcomes: [
          {
            message: 'She returned a warm smile and slipped a little doodle into your book before packing up.',
            effects: { happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'acoustic_music_hall_date',
    title: 'Solo Cello Recital',
    icon: '🎻',
    category: 'relationship',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    description: 'Elena Rostova, a gifted cello student at the conservatory, invites you to her solo recital and asks if you would like to grab Italian food with her afterwards.',
    choices: [
      {
        id: 'attend_dinner_roses',
        label: 'Bring a single red rose and attend her recital in your best clothes',
        icon: '🌹',
        outcomes: [
          {
            message: 'Elena played breathtaking Bach sonatas. Over pasta afterwards by candlelight, she held your hand across the table.',
            effects: { happiness: 12, looks: 3, popularity: 2 },
            personIntroduced: {
              firstName: 'Elena',
              lastName: 'Rostova',
              gender: 'female',
              age: 19,
              role: 'Conservatory Cellist & Date',
              relationshipType: 'dating',
              relationship: 88,
              originStory: 'Invited you to her solo cello recital followed by a romantic Italian dinner.',
              stageMet: 'university',
              avatarEmoji: '🎻',
            },
          },
        ],
      },
      {
        id: 'casual_late_diner',
        label: 'Attend casually and take her for late-night diner pancakes',
        icon: '🥞',
        outcomes: [
          {
            message: 'You two shared blueberry pancakes and laughed about stage nerves until the diner closed.',
            effects: { happiness: 8, popularity: 2 },
            personIntroduced: {
              firstName: 'Elena',
              lastName: 'Rostova',
              gender: 'female',
              age: 19,
              role: 'Music Classmate & Friend',
              relationshipType: 'friend',
              relationship: 76,
              originStory: 'Ate late-night diner pancakes together after her cello recital.',
              stageMet: 'university',
              avatarEmoji: '🎻',
            },
          },
        ],
      },
      {
        id: 'politely_pass',
        label: 'Apologize and say you have an exam to study for',
        icon: '📖',
        outcomes: [
          {
            message: 'Elena looked disappointed: "Maybe next time." You spent the evening buried in course textbooks.',
            effects: { smarts: 4, happiness: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'undergrad_research_sterling',
    title: 'Distinguished Research Offer',
    icon: '🔬',
    category: 'education',
    minAge: 19,
    maxAge: 24,
    requiredStage: 'university',
    description: 'Renowned professor Alistair Sterling calls you into his mahogany-lined office. He noticed your exceptional marks and offers you a coveted research assistantship.',
    choices: [
      {
        id: 'accept_assistantship',
        label: 'Eagerly accept the assistant position and commit the lab hours',
        icon: '📑',
        outcomes: [
          {
            message: 'Professor Sterling nodded approvingly: "I expect absolute rigor." Working in his research lab boosted your academic credentials enormously!',
            effects: { smarts: 8, grades: 6, happiness: 3 },
            personIntroduced: {
              firstName: 'Alistair',
              lastName: 'Sterling',
              gender: 'male',
              age: 52,
              role: 'Distinguished Research Professor',
              relationshipType: 'mentor',
              relationship: 80,
              originStory: 'Hired you as an undergraduate research assistant in his private laboratory.',
              stageMet: 'university',
              avatarEmoji: '👨‍🏫',
            },
          },
        ],
      },
      {
        id: 'negotiate_co_author',
        label: 'Accept on the condition that your name is credited on papers',
        icon: '✍️',
        outcomes: [
          {
            message: 'Sterling smiled with deep respect: "I like ambition." He agreed to co-author credit on upcoming publications!',
            effects: { smarts: 9, grades: 5, popularity: 3 },
            personIntroduced: {
              firstName: 'Alistair',
              lastName: 'Sterling',
              gender: 'male',
              age: 52,
              role: 'Distinguished Research Professor',
              relationshipType: 'mentor',
              relationship: 84,
              originStory: 'Agreed to co-author academic papers with you in his research lab.',
              stageMet: 'university',
              avatarEmoji: '👨‍🏫',
            },
          },
        ],
      },
      {
        id: 'politely_decline_overload',
        label: 'Decline to avoid academic burnout and protect your free time',
        icon: '☕',
        outcomes: [
          {
            message: 'Professor Sterling respected your honesty. You preserved your free time and sanity.',
            effects: { happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'campus_hackathon_devon',
    title: '48-Hour Campus Hackathon',
    icon: '💻',
    category: 'education',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    description: 'The annual 48-Hour Collegiate Hackathon is underway. Fast-talking coder Devon Chen needs a partner to build an AI robotics interface before Sunday morning.',
    choices: [
      {
        id: 'hack_all_night',
        label: 'Chug cold brews and code together through the night',
        icon: '⚡',
        outcomes: [
          {
            message: 'At 6 AM your app demo ran flawlessly without bugs! The judges awarded your team First Place and Devon became your closest tech ally.',
            effects: { smarts: 7, happiness: 8, health: -2, grades: 3 },
            personIntroduced: {
              firstName: 'Devon',
              lastName: 'Chen',
              gender: 'male',
              age: 19,
              role: 'Hackathon Partner & Software Whiz',
              relationshipType: 'friend',
              relationship: 86,
              originStory: 'Coded through the night to win First Place at the campus hackathon.',
              stageMet: 'university',
              avatarEmoji: '💻',
            },
          },
        ],
      },
      {
        id: 'lead_presentation_ui',
        label: 'Let Devon handle the backend while you design the UI and pitch',
        icon: '🎨',
        outcomes: [
          {
            message: 'Your polished presentation wowed the venture capitalist judges! You won the Best Design prize.',
            effects: { smarts: 5, popularity: 5, happiness: 6 },
            personIntroduced: {
              firstName: 'Devon',
              lastName: 'Chen',
              gender: 'male',
              age: 19,
              role: 'Hackathon Teammate',
              relationshipType: 'friend',
              relationship: 78,
              originStory: 'Teamed up to win Best Design at the 48-hour hackathon.',
              stageMet: 'university',
              avatarEmoji: '💻',
            },
          },
        ],
      },
      {
        id: 'sleep_regular_hours',
        label: 'Help for two hours then go to bed at a reasonable time',
        icon: '😴',
        outcomes: [
          {
            message: 'You got a great 8 hours of sleep while the rest of the computer lab looked like zombies.',
            effects: { health: 4, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'coffee_shop_barista_crush',
    title: 'The Campus Cafe Barista',
    icon: '☕',
    category: 'relationship',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    description: 'At the campus espresso bar, barista Aria Montgomery hands you your usual cappuccino with a heart drawn in the foam and a phone number written on the cup.',
    choices: [
      {
        id: 'text_aria',
        label: 'Text her right away with a playful coffee joke',
        icon: '📱',
        outcomes: [
          {
            message: 'She replied in seconds with laughing emojis and invited you to an acoustic open mic night this Friday!',
            effects: { happiness: 10, looks: 2, popularity: 2 },
            personIntroduced: {
              firstName: 'Aria',
              lastName: 'Montgomery',
              gender: 'female',
              age: 19,
              role: 'Campus Barista Crush',
              relationshipType: 'crush',
              relationship: 82,
              originStory: 'Wrote her phone number on your morning cappuccino coffee cup.',
              stageMet: 'university',
              avatarEmoji: '☕',
            },
          },
        ],
      },
      {
        id: 'visit_next_morning',
        label: 'Order another cappuccino the next morning and ask her out in person',
        icon: '💐',
        outcomes: [
          {
            message: 'Aria blushed bright red behind the espresso machine and eagerly took off her apron to take her break with you.',
            effects: { happiness: 11, looks: 3 },
            personIntroduced: {
              firstName: 'Aria',
              lastName: 'Montgomery',
              gender: 'female',
              age: 19,
              role: 'Campus Sweetheart & Date',
              relationshipType: 'dating',
              relationship: 88,
              originStory: 'Asked her out across the coffee shop counter after she drew a heart on your cup.',
              stageMet: 'university',
              avatarEmoji: '☕',
            },
          },
        ],
      },
      {
        id: 'throw_cup_away',
        label: 'Toss the cup into recycling and keep things strictly professional',
        icon: '🗑️',
        outcomes: [
          {
            message: 'You drank your coffee in peaceful anonymity.',
            effects: { happiness: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'intramural_soccer_rival',
    title: 'Intramural Championship Rival',
    icon: '⚽',
    category: 'social',
    minAge: 18,
    maxAge: 24,
    requiredStage: 'university',
    description: 'During the heated intramural soccer finals under the stadium lights, opposing team captain Marcus Vance taunts you before penalty kicks.',
    choices: [
      {
        id: 'bury_the_penalty',
        label: 'Keep absolute focus and fire the penalty into the top corner',
        icon: '🥅',
        outcomes: [
          {
            message: 'GOAL! The ball hit the top corner net! Marcus glared at you with grudging respect, kicking the turf in frustration.',
            effects: { happiness: 9, popularity: 6, health: 3 },
            personIntroduced: {
              firstName: 'Marcus',
              lastName: 'Vance',
              gender: 'male',
              age: 21,
              role: 'Intramural Soccer Rival',
              relationshipType: 'rival',
              relationship: 35,
              originStory: 'Scored the championship-winning penalty against his intramural soccer team.',
              stageMet: 'university',
              avatarEmoji: '⚽',
            },
          },
        ],
      },
      {
        id: 'taunt_him_back',
        label: 'Point to the corner flag and call your shot before kicking',
        icon: '😏',
        outcomes: [
          {
            message: 'You scored and celebrated with a knee-slide across the turf! Marcus scowled as the crowd went wild.',
            effects: { popularity: 8, happiness: 8 },
            personIntroduced: {
              firstName: 'Marcus',
              lastName: 'Vance',
              gender: 'male',
              age: 21,
              role: 'Intramural Soccer Rival',
              relationshipType: 'rival',
              relationship: 25,
              originStory: 'Taunted and defeated him in the intramural championship penalty shootout.',
              stageMet: 'university',
              avatarEmoji: '⚽',
            },
          },
        ],
      },
      {
        id: 'let_teammate_kick',
        label: 'Let your teammate take the pressure penalty kick',
        icon: '🤝',
        outcomes: [
          {
            message: 'Your teammate scored! The whole squad dogpiled in celebration.',
            effects: { happiness: 6, popularity: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'frat_mixer_chad',
    title: 'Frat Row Quad Mixer',
    icon: '🍻',
    category: 'social',
    minAge: 18,
    maxAge: 23,
    requiredStage: 'university',
    description: 'You get invited to a massive backyard party on Frat Row. Social chair Chad Wellington hands you a red cup and challenges you to ping pong.',
    choices: [
      {
        id: 'play_pingpong',
        label: 'Team up and sink the game-winning shot',
        icon: '🏓',
        outcomes: [
          {
            message: 'The crowd erupted as your shot bounced clean into the final cup! Chad lifted you onto his shoulders: "Legendary status tonight!"',
            effects: { popularity: 8, happiness: 7, grades: -3 },
            personIntroduced: {
              firstName: 'Chad',
              lastName: 'Wellington',
              gender: 'male',
              age: 21,
              role: 'Fraternity Social Chair',
              relationshipType: 'friend',
              relationship: 78,
              originStory: 'Crowned you ping-pong champion at a crowded Frat Row mixer.',
              stageMet: 'university',
              avatarEmoji: '🧢',
            },
          },
        ],
      },
      {
        id: 'play_darts_patio',
        label: 'Challenge Chad to a game of darts on the covered patio',
        icon: '🎯',
        outcomes: [
          {
            message: 'You hit a bullseye on the third throw! Chad bought you a soda and talked about his business major.',
            effects: { popularity: 5, happiness: 5 },
            personIntroduced: {
              firstName: 'Chad',
              lastName: 'Wellington',
              gender: 'male',
              age: 21,
              role: 'Frat House Acquaintance',
              relationshipType: 'classmate',
              relationship: 68,
              originStory: 'Played darts together on the patio during a Greek quad party.',
              stageMet: 'university',
              avatarEmoji: '🧢',
            },
          },
        ],
      },
      {
        id: 'chill_patio',
        label: 'Hang out quietly by the fire pit and chat with fellow freshmen',
        icon: '🔥',
        outcomes: [
          {
            message: 'You met several friendly fellow undergraduates and had a great conversation without any beer spilling on your shoes.',
            effects: { happiness: 4, popularity: 2 },
          },
        ],
      },
    ],
  },
];
