import type { LifeEventTemplate } from '../types';

/**
 * Context-aware interactive events centered around raising, mentoring, and staying
 * connected with the player's living children across toddler, school-age, teen, and adult years.
 */
export const CHILDREN_EVENTS: LifeEventTemplate[] = [
  // =========================================================================
  // INFANT & TODDLER YEARS (Child Age 1 - 4) — 9 Events
  // =========================================================================
  {
    id: 'child_first_words',
    title: 'First Clear Words',
    icon: '🗣️',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.4,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 1, childMaxAge: 4 },
    description:
      'While playing on the living room rug, {childFirstName} (age {childAge}) stares right at you, points excitedly at a picture book, and tries hard to form full words.',
    choices: [
      {
        id: 'cheer_and_read',
        label: 'Cheer joyfully and read three picture books together',
        icon: '📖',
        outcomes: [
          {
            message:
              'Your enthusiasm lit up the room! {childFirstName} repeated new words back to you and beamed with pride.',
            effects: { happiness: 6 },
            childDelta: { relationship: 10, smarts: 5, happiness: 8 },
          },
        ],
      },
      {
        id: 'record_video',
        label: 'Grab your phone to record the milestone',
        icon: '📱',
        outcomes: [
          {
            weight: 6,
            message:
              'You caught the sweetest clip on camera and replayed it until bedtime. {childFirstName} giggled every time!',
            effects: { happiness: 5 },
            childDelta: { relationship: 6, happiness: 6 },
          },
          {
            weight: 4,
            message:
              'The moment the camera came out, {childFirstName} got shy and hid behind a pillow instead.',
            effects: { happiness: 2 },
            childDelta: { relationship: 2 },
          },
        ],
      },
      {
        id: 'brush_past',
        label: 'Smile quickly and get back to chores',
        icon: '🧹',
        outcomes: [
          {
            message:
              'You checked off your to-do list, though {childFirstName} wandered back to building blocks quietly.',
            effects: { happiness: -2 },
            childDelta: { relationship: -5, happiness: -4 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_midnight_fever',
    title: '3 AM Fever Scare',
    icon: '🤒',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    repeatable: true,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 1, childMaxAge: 4 },
    description:
      'You wake up at 3 AM to soft crying down the hall. {childFirstName} feels warm to the touch and has spiked a sudden fever.',
    choices: [
      {
        id: 'urgent_care',
        label: 'Rush to late-night clinic ($120)',
        icon: '🏥',
        outcomes: [
          {
            message:
              'The pediatrician checked {childFirstName}, gave proper medicine, and cleared you to head home by dawn.',
            effects: { cash: -120, health: -2, happiness: 2 },
            childDelta: { health: 12, relationship: 9, happiness: 4 },
          },
        ],
      },
      {
        id: 'stay_up_care',
        label: 'Cool compress, fluids, and stay awake by the crib',
        icon: '🫧',
        outcomes: [
          {
            weight: 7,
            message:
              'You barely slept, soothing {childFirstName} through the night until the fever broke safely in the morning.',
            effects: { health: -3, happiness: 1 },
            childDelta: { health: 6, relationship: 8 },
          },
          {
            weight: 3,
            message:
              'It took longer to cool down, leaving both you and {childFirstName} exhausted all day.',
            effects: { health: -4, happiness: -3 },
            childDelta: { health: -3, relationship: 4 },
          },
        ],
      },
      {
        id: 'go_back_sleep',
        label: 'Give water and hope they sleep it off',
        icon: '😴',
        outcomes: [
          {
            message:
              '{childFirstName} cried off and on until sunrise, looking worn out and clingy.',
            effects: { happiness: -4, karma: -3 },
            childDelta: { health: -8, relationship: -7, happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_wall_crayon_mural',
    title: 'Living Room Crayon Mural',
    icon: '🖍️',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.3,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 1, childMaxAge: 4 },
    description:
      'You walk into the hallway and discover {childFirstName} holding a fistful of waxy crayons next to a giant purple dragon scribbled across the freshly painted wall.',
    choices: [
      {
        id: 'clean_together',
        label: 'Gently explain walls are not paper and scrub together',
        icon: '🧽',
        outcomes: [
          {
            message:
              'With warm soapy sponges and some teamwork, the wall was clean again and {childFirstName} promised to stick to sketchbooks.',
            effects: { karma: 2, happiness: 2 },
            childDelta: { relationship: 7, smarts: 3 },
          },
        ],
      },
      {
        id: 'buy_easel',
        label: 'Laugh it off, repaint later, and order a drawing easel ($65)',
        icon: '🎨',
        outcomes: [
          {
            message:
              'Once the easel arrived, {childFirstName} happily drew castles all week without touching another wall.',
            effects: { cash: -65, happiness: 5 },
            childDelta: { relationship: 10, happiness: 9, smarts: 4 },
          },
        ],
      },
      {
        id: 'lose_temper',
        label: 'Snap loudly and confiscate every crayon',
        icon: '😠',
        outcomes: [
          {
            message:
              '{childFirstName} burst into tears and retreated quietly into the bedroom.',
            effects: { happiness: -4, karma: -4 },
            childDelta: { relationship: -10, happiness: -10 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_grocery_tantrum',
    title: 'Grocery Aisle Meltdown',
    icon: '🛒',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 1, childMaxAge: 4 },
    description:
      'Right by the checkout lane, {childFirstName} spots a bright sugar cereal box, drops to the floor, and erupts into a full-volume meltdown as shoppers stare.',
    choices: [
      {
        id: 'calm_crouch',
        label: 'Kneel down, breathe calmly, and offer a healthy snack choice',
        icon: '🍎',
        outcomes: [
          {
            message:
              'Keeping your voice steady defused the storm. {childFirstName} picked a banana instead and held your hand to the car.',
            effects: { happiness: 3, karma: 2 },
            childDelta: { relationship: 6, happiness: 3, smarts: 2 },
          },
        ],
      },
      {
        id: 'cave_in',
        label: 'Toss the cereal in the cart to end the noise ($12)',
        icon: '🥣',
        outcomes: [
          {
            message:
              'Silence returned instantly, though {childFirstName} got a sugar rush before dinner.',
            effects: { cash: -12, happiness: 1 },
            childDelta: { relationship: 3, happiness: 6, health: -2 },
          },
        ],
      },
      {
        id: 'abandon_cart',
        label: 'Walk straight out and lecture them the entire drive home',
        icon: '🚗',
        outcomes: [
          {
            message:
              'You still had no groceries for dinner, and the ride home was tense and tearful.',
            effects: { happiness: -5 },
            childDelta: { relationship: -6, happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_preschool_drop_off',
    title: 'Tearful Preschool Drop-Off',
    icon: '🎒',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 2, childMaxAge: 4 },
    description:
      'At the preschool doorway, {childFirstName} clings tightly to your leg and refuses to let go while the teacher waves warmly inside.',
    choices: [
      {
        id: 'reassuring_ritual',
        label: 'Create a quick goodbye handshake and promise pickup after nap',
        icon: '🤝',
        outcomes: [
          {
            message:
              'After a deep breath and a special handshake, {childFirstName} bravely walked in and waved through the window.',
            effects: { happiness: 5 },
            childDelta: { relationship: 9, happiness: 7, smarts: 3 },
          },
        ],
      },
      {
        id: 'bribe_toy',
        label: 'Promise a surprise treat after school if they go in ($15)',
        icon: '🍦',
        outcomes: [
          {
            message:
              'That did the trick! {childFirstName} wiped away tears and sprinted toward the toy corner.',
            effects: { cash: -15, happiness: 2 },
            childDelta: { relationship: 5, happiness: 5 },
          },
        ],
      },
      {
        id: 'slip_out_fast',
        label: 'Wait until {childPronoun} looks away and slip out silently',
        icon: '🚪',
        outcomes: [
          {
            message:
              'The teacher later texted that {childFirstName} panicked looking for you for half the morning.',
            effects: { happiness: -4 },
            childDelta: { relationship: -7, happiness: -8 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_bedtime_monster',
    title: 'Monster Under the Bed',
    icon: '🧸',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    repeatable: true,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 2, childMaxAge: 4 },
    description:
      'Ten minutes after lights-out, {childFirstName} pads quietly back out into the living room clutching a stuffed bear, insisting there is a dragon in the closet.',
    choices: [
      {
        id: 'monster_spray',
        label: 'Do a dramatic "brave bear sweep" together and tuck back in',
        icon: '🔦',
        outcomes: [
          {
            message:
              'You inspected every corner with a flashlight and pronounced the room dragon-free. {childFirstName} drifted off smiling.',
            effects: { happiness: 4 },
            childDelta: { relationship: 8, happiness: 8 },
          },
        ],
      },
      {
        id: 'nightlight',
        label: 'Plug in a warm star projector nightlight ($20)',
        icon: '🌟',
        outcomes: [
          {
            message:
              'Soft blue stars bathed the ceiling, calming {childFirstName} down within minutes.',
            effects: { cash: -20, happiness: 3 },
            childDelta: { relationship: 6, happiness: 6 },
          },
        ],
      },
      {
        id: 'lock_routine',
        label: 'Firmly send {childObjective} straight back alone',
        icon: '🛏️',
        outcomes: [
          {
            message:
              '{childFirstName} stayed wide awake under the covers until midnight.',
            effects: { happiness: -2 },
            childDelta: { relationship: -4, happiness: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_playground_sharing',
    title: 'Sandbox Shovel Dispute',
    icon: '🏖️',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 1, childMaxAge: 4 },
    description:
      'At the neighborhood park, {childFirstName} snatches a bright red shovel right out of another toddler’s hands, triggering loud protests across the sandbox.',
    choices: [
      {
        id: 'coach_taking_turns',
        label: 'Coach {childFirstName} on asking nicely and taking turns',
        icon: '💬',
        outcomes: [
          {
            message:
              'After a shy apology, both kids ended up building a huge sandcastle side by side!',
            effects: { karma: 4, happiness: 3 },
            childDelta: { relationship: 6, smarts: 4, happiness: 4 },
          },
        ],
      },
      {
        id: 'leave_early',
        label: 'Pack up immediately and head home early',
        icon: '🏠',
        outcomes: [
          {
            message:
              'You avoided awkwardness with the other parent, though {childFirstName} pouted the whole walk back.',
            effects: { happiness: -2 },
            childDelta: { relationship: -3, happiness: -5 },
          },
        ],
      },
      {
        id: 'ignore_sandpit',
        label: 'Shrug it off — kids figure things out',
        icon: '🤷',
        outcomes: [
          {
            message:
              'The other parent gave you an icy glare before pulling their kid away to the swings.',
            effects: { karma: -4, happiness: -2 },
            childDelta: { relationship: -2, smarts: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_picky_eater',
    title: 'Dinner Table Broccoli Standoff',
    icon: '🥦',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 1, childMaxAge: 4 },
    description:
      '{childFirstName} pushes every green vegetable to the very edge of the highchair tray, crosses {childPossessive} arms, and shakes {childPossessive} head with toddler determination.',
    choices: [
      {
        id: 'playful_trees',
        label: 'Turn broccoli into "tiny dinosaur trees" and eat together',
        icon: '🦕',
        outcomes: [
          {
            message:
              'Making dinosaur stomping noises turned dinner into a game. Three whole florets vanished!',
            effects: { happiness: 4 },
            childDelta: { relationship: 7, health: 5, happiness: 5 },
          },
        ],
      },
      {
        id: 'swap_fruit',
        label: 'Compromise with sliced strawberries and cheese instead',
        icon: '🍓',
        outcomes: [
          {
            message:
              'The plate came back spotless, even if the greens stayed untouched.',
            effects: { happiness: 1 },
            childDelta: { relationship: 3, health: 2, happiness: 3 },
          },
        ],
      },
      {
        id: 'skip_dinner',
        label: 'Insist on "clean your plate or no bedtime story"',
        icon: '🍽️',
        outcomes: [
          {
            message:
              'Neither of you budged, ending dinner in grumpy silence.',
            effects: { happiness: -4 },
            childDelta: { relationship: -6, health: -3, happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_first_bike_tricycle',
    title: 'First Balance Bike Adventure',
    icon: '🚲',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 2, childMaxAge: 4 },
    description:
      'On a sunny Saturday morning, {childFirstName} eyes a brand-new balance bike in the driveway and tugs your sleeve to learn how to coast.',
    choices: [
      {
        id: 'buy_helmet_and_coach',
        label: 'Strap on safety gear ($45) and jog alongside cheering',
        icon: '⛑️',
        outcomes: [
          {
            message:
              'After two gentle tumbles on the grass, {childFirstName} lifted both feet and glided ten yards grinning ear to ear!',
            effects: { cash: -45, health: 2, happiness: 6 },
            childDelta: { relationship: 10, health: 6, happiness: 9 },
          },
        ],
      },
      {
        id: 'short_trial',
        label: 'Do five slow minutes on the sidewalk before errands',
        icon: '⏱️',
        outcomes: [
          {
            message:
              '{childFirstName} took a few tentative steps with the bike and enjoyed the fresh air.',
            effects: { happiness: 2 },
            childDelta: { relationship: 4, health: 3 },
          },
        ],
      },
      {
        id: 'too_risky',
        label: 'Put the bike away — too many scraped knees ahead',
        icon: '🛑',
        outcomes: [
          {
            message:
              '{childFirstName} watched the driveway sadly from the porch window.',
            effects: { happiness: -2 },
            childDelta: { relationship: -4, happiness: -5 },
          },
        ],
      },
    ],
  },

  // =========================================================================
  // CHILDHOOD & ELEMENTARY YEARS (Child Age 5 - 12) — 11 Events
  // =========================================================================
  {
    id: 'child_science_fair_volcano',
    title: 'Last-Minute Science Fair Project',
    icon: '🌋',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.3,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 5, childMaxAge: 12 },
    description:
      'At 8 PM on a Sunday night, {childFirstName} (age {childAge}) remembers that a working science fair display is due at 8 AM tomorrow.',
    choices: [
      {
        id: 'build_volcano_together',
        label: 'Buy baking soda, cardboard, and paint ($30) and guide {childObjective}',
        icon: '🧪',
        outcomes: [
          {
            weight: 7,
            message:
              'You kept the work in {childFirstName}’s hands while helping with cardboard cuts. Next day, {childPronoun} won 2nd place!',
            effects: { cash: -30, happiness: 6 },
            childDelta: { relationship: 10, smarts: 8, happiness: 9 },
          },
          {
            weight: 3,
            message:
              'Foam erupted right across the kitchen counter, but the display survived and {childFirstName} gave a confident presentation!',
            effects: { cash: -30, happiness: 3 },
            childDelta: { relationship: 8, smarts: 6, happiness: 5 },
          },
        ],
      },
      {
        id: 'do_it_for_them',
        label: 'Send {childObjective} to bed and build the whole thing yourself',
        icon: '🛠️',
        outcomes: [
          {
            message:
              'It looked museum-grade, though {childFirstName} stumbled when teachers asked how the circuit actually worked.',
            effects: { cash: -30, happiness: -2 },
            childDelta: { relationship: 2, smarts: -3, happiness: -2 },
          },
        ],
      },
      {
        id: 'natural_consequence',
        label: 'Tell {childFirstName} to improvise a poster on {childPossessive} own',
        icon: '📝',
        outcomes: [
          {
            message:
              'It was messy, but {childFirstName} learned a tough lesson about planning ahead.',
            effects: { happiness: -2 },
            childDelta: { relationship: -5, smarts: 2, happiness: -4 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_school_bully_confession',
    title: 'Bullied on the School Bus',
    icon: '🚌',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.3,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 5, childMaxAge: 12 },
    description:
      'When you ask why {childFirstName}’s backpack strap is ripped, your {childRole} quietly admits an older kid on the bus has been stealing {childPossessive} lunch all week.',
    choices: [
      {
        id: 'meet_principal_and_coach',
        label: 'Schedule a meeting with the principal and roleplay confident boundaries',
        icon: '🏫',
        outcomes: [
          {
            message:
              'The school reassigned bus seating immediately, and {childFirstName} walked in standing much taller the next morning.',
            effects: { karma: 4, happiness: 4 },
            childDelta: { relationship: 12, happiness: 10, smarts: 2 },
          },
        ],
      },
      {
        id: 'listen_and_pack_extra',
        label: 'Hug {childObjective} tight and start driving {childObjective} to school this month',
        icon: '🚘',
        outcomes: [
          {
            message:
              'Morning carpool talks became {childFirstName}’s favorite part of the day while things cooled down.',
            effects: { happiness: 3 },
            childDelta: { relationship: 9, happiness: 7 },
          },
        ],
      },
      {
        id: 'toughen_up',
        label: 'Tell {childObjective} to just ignore it and toughen up',
        icon: '😶',
        outcomes: [
          {
            message:
              '{childFirstName} stopped bringing up school problems around the dinner table.',
            effects: { karma: -4, happiness: -4 },
            childDelta: { relationship: -10, happiness: -10 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_little_league_tryout',
    title: 'Sports Team Tryout Jitters',
    icon: '⚽',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 5, childMaxAge: 12 },
    description:
      'Standing at the edge of the field before youth league tryouts, {childFirstName} freezes up and whispers that everyone else looks way faster.',
    choices: [
      {
        id: 'warmup_together',
        label: 'Toss passes for 20 minutes and focus on effort over trophies',
        icon: '👟',
        outcomes: [
          {
            weight: 7,
            message:
              'Once {childFirstName} loosened up, {childPronoun} hustled on every drill and made the squad!',
            effects: { health: 2, happiness: 6 },
            childDelta: { relationship: 9, health: 5, happiness: 10 },
          },
          {
            weight: 3,
            message:
              '{childFirstName} got placed on the developmental squad, proud of giving it {childPossessive} best shot anyway.',
            effects: { health: 2, happiness: 4 },
            childDelta: { relationship: 8, health: 4, happiness: 4 },
          },
        ],
      },
      {
        id: 'hire_private_coach',
        label: 'Sign {childObjective} up for a weekend skills clinic ($140)',
        icon: '📋',
        outcomes: [
          {
            message:
              'Sharp footwork drills gave {childFirstName} instant confidence on the turf.',
            effects: { cash: -140, happiness: 4 },
            childDelta: { relationship: 6, health: 6, happiness: 7 },
          },
        ],
      },
      {
        id: 'skip_tryouts',
        label: 'Head back home so {childPronoun} won’t feel embarrassed',
        icon: '🏡',
        outcomes: [
          {
            message:
              'Avoiding the risk kept tears away today, though {childFirstName} looked wistful passing the field later.',
            effects: { happiness: -2 },
            childDelta: { relationship: -2, happiness: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_tooth_fairy_negotiation',
    title: 'Tooth Fairy Bargaining',
    icon: '🦷',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 5, childMaxAge: 9 },
    description:
      '{childFirstName} just lost a wobbly front tooth and left an earnest handwritten invoice under the pillow asking the Tooth Fairy for "$50 or a puppy."',
    choices: [
      {
        id: 'sweet_note_and_five',
        label: 'Slip a $10 bill and a playful miniature Tooth Fairy receipt under the pillow',
        icon: '✨',
        outcomes: [
          {
            message:
              'Next morning {childFirstName} gasped at the glittery receipt and carried it around like treasure all day!',
            effects: { cash: -10, happiness: 6 },
            childDelta: { relationship: 8, happiness: 10 },
          },
        ],
      },
      {
        id: 'explain_budget',
        label: 'Gently explain fairy magic works in coins and give $2',
        icon: '🪙',
        outcomes: [
          {
            message:
              '{childFirstName} inspected the coins carefully and decided that was still pretty cool.',
            effects: { cash: -2, happiness: 3 },
            childDelta: { relationship: 5, happiness: 5, smarts: 2 },
          },
        ],
      },
      {
        id: 'forget_entirely',
        label: 'Forget completely before going to bed',
        icon: '🤦',
        outcomes: [
          {
            message:
              'Morning brought loud dismay when the tooth was still sitting untouched under the pillow.',
            effects: { happiness: -3 },
            childDelta: { relationship: -5, happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_piano_or_soccer',
    title: 'After-School Passion Request',
    icon: '🎹',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 6, childMaxAge: 12 },
    description:
      '{childFirstName} lights up after a school assembly and begs to join weekend music and robotics lessons ($220 for gear and semester fees).',
    choices: [
      {
        id: 'fund_and_encourage',
        label: 'Pay the $220 fee and attend every weekend showcase',
        icon: '🎶',
        outcomes: [
          {
            message:
              'With steady practice and you cheering from the second row, {childFirstName} blossomed all semester.',
            effects: { cash: -220, happiness: 5 },
            childDelta: { relationship: 10, smarts: 8, happiness: 9 },
          },
        ],
      },
      {
        id: 'used_keyboard',
        label: 'Pick up a second-hand kit ($75) to test commitment first',
        icon: '🔧',
        outcomes: [
          {
            message:
              'Practical and encouraging! {childFirstName} practiced every evening on the starter kit.',
            effects: { cash: -75, happiness: 3 },
            childDelta: { relationship: 7, smarts: 6, happiness: 5 },
          },
        ],
      },
      {
        id: 'decline_lessons',
        label: 'Say schedules and budgets are too tight this year',
        icon: '📉',
        outcomes: [
          {
            message:
              '{childFirstName} nodded quietly, though you caught {childObjective} humming melodies after dinner.',
            effects: { happiness: -2 },
            childDelta: { relationship: -5, happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_sleepover_homesick',
    title: 'Midnight Sleepover Pickup Call',
    icon: '🌙',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 6, childMaxAge: 12 },
    description:
      'Your phone buzzes at 11:45 PM. From a friend’s house across town, {childFirstName} whispers through sniffles, "I have a tummy ache… can you please come get me?"',
    choices: [
      {
        id: 'drive_now',
        label: 'Put on shoes immediately and drive over with zero judgment',
        icon: '🚗',
        outcomes: [
          {
            message:
              'Your quiet reassurance on the drive back made {childFirstName} trust you completely with anything.',
            effects: { happiness: 3 },
            childDelta: { relationship: 12, happiness: 8 },
          },
        ],
      },
      {
        id: 'talk_on_phone',
        label: 'Stay on speakerphone talking softly until {childPronoun} settles',
        icon: '📞',
        outcomes: [
          {
            weight: 6,
            message:
              'Hearing your voice calmed {childFirstName} enough to fall asleep with the host family.',
            effects: { happiness: 2 },
            childDelta: { relationship: 6, happiness: 4 },
          },
          {
            weight: 4,
            message:
              'An hour later {childFirstName} called back still miserable, and you ended up driving at 1 AM anyway.',
            effects: { health: -1, happiness: -2 },
            childDelta: { relationship: 5, happiness: -2 },
          },
        ],
      },
      {
        id: 'refuse_pickup',
        label: 'Insist {childPronoun} stick it out until morning',
        icon: '⏰',
        outcomes: [
          {
            message:
              'Next day {childFirstName} was quiet and hesitant to open up about how awful the night felt.',
            effects: { happiness: -4 },
            childDelta: { relationship: -9, happiness: -8 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_math_homework_tears',
    title: 'Fractions Homework Breakdown',
    icon: '📐',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    repeatable: true,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 6, childMaxAge: 12 },
    description:
      'An erased hole sits right in the middle of {childFirstName}’s worksheet. Frustrated tears well up as {childPronoun} mutters, "I’m just stupid at math!"',
    choices: [
      {
        id: 'pizza_fractions',
        label: 'Grab paper plates to slice "fractions pizzas" patiently together',
        icon: '🍕',
        outcomes: [
          {
            message:
              'Breaking denominators into visual slices clicked instantly! {childFirstName} finished the entire sheet grinning.',
            effects: { happiness: 5, smarts: 1 },
            childDelta: { relationship: 9, smarts: 7, happiness: 7 },
          },
        ],
      },
      {
        id: 'book_tutor',
        label: 'Hire a friendly after-school math tutor ($90)',
        icon: '👩‍🏫',
        outcomes: [
          {
            message:
              'Twice-weekly sessions turned math anxiety into one of {childFirstName}’s strongest subjects.',
            effects: { cash: -90, happiness: 3 },
            childDelta: { relationship: 5, smarts: 9, happiness: 5 },
          },
        ],
      },
      {
        id: 'scold_focus',
        label: 'Snap that it’s simple third-grade arithmetic and walk away',
        icon: '💢',
        outcomes: [
          {
            message:
              '{childFirstName} shoved the binder under the bed and stared at the wall.',
            effects: { happiness: -4, karma: -2 },
            childDelta: { relationship: -8, smarts: -3, happiness: -9 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_stray_kitten_plea',
    title: '"Can We Keep This Stray?"',
    icon: '🐱',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 5, childMaxAge: 12 },
    description:
      '{childFirstName} arrives at the back porch cradling a shivering gray stray cat wrapped in a hoodie, eyes wide with desperate hope.',
    choices: [
      {
        id: 'vet_and_poster',
        label: 'Take the cat to the vet ($85), check for a microchip, and help care for it',
        icon: '🩺',
        outcomes: [
          {
            weight: 6,
            message:
              'You reunited the kitten with a relieved neighbor down the block, who baked you cookies and thanked {childFirstName} like a hero!',
            effects: { cash: -85, karma: 8, happiness: 6 },
            childDelta: { relationship: 8, happiness: 7 },
          },
          {
            weight: 4,
            message:
              'No chip or owner turned up, so your family welcomed a clean bill of health and a grateful new housecat!',
            effects: { cash: -85, karma: 6, happiness: 8 },
            childDelta: { relationship: 12, happiness: 12 },
          },
        ],
      },
      {
        id: 'shelter_drop',
        label: 'Feed it warm food and drive together to a no-kill rescue shelter',
        icon: '🏡',
        outcomes: [
          {
            message:
              'You walked {childFirstName} through how rescues match pets with loving homes, turning goodbye into a kindness.',
            effects: { karma: 4, happiness: 2 },
            childDelta: { relationship: 5, smarts: 3, happiness: 2 },
          },
        ],
      },
      {
        id: 'shoo_away',
        label: 'Order {childObjective} to put it right back outside immediately',
        icon: '🚪',
        outcomes: [
          {
            message:
              '{childFirstName} sniffled all evening and barely touched dinner.',
            effects: { karma: -5, happiness: -4 },
            childDelta: { relationship: -9, happiness: -9 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_school_play_lead',
    title: 'School Play Stage Fright',
    icon: '🎭',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 6, childMaxAge: 12 },
    description:
      'Backstage before the school auditorium fills up, {childFirstName} freezes in costume and begs to drop out before the curtain opens.',
    choices: [
      {
        id: 'rehearse_front_row',
        label: 'Run the first two lines together and promise to sit right up front ($25 flowers)',
        icon: '💐',
        outcomes: [
          {
            message:
              '{childFirstName} locked eyes with you in the front row, nailed every line, and took a huge curtain-call bow!',
            effects: { cash: -25, happiness: 8 },
            childDelta: { relationship: 12, happiness: 12, smarts: 3 },
          },
        ],
      },
      {
        id: 'deep_breaths',
        label: 'Do box-breathing backstage until the nerves settle',
        icon: '🌬️',
        outcomes: [
          {
            message:
              'Voice a bit shaky at first, {childFirstName} finished the whole scene without forgetting a single cue.',
            effects: { happiness: 4 },
            childDelta: { relationship: 7, happiness: 6 },
          },
        ],
      },
      {
        id: 'pull_out',
        label: 'Agree immediately and take {childObjective} home early',
        icon: '🏠',
        outcomes: [
          {
            message:
              'Relief lasted ten minutes before regret crept in hearing classmates rave about the show Monday morning.',
            effects: { happiness: -2 },
            childDelta: { relationship: 2, happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_video_game_screen_time',
    title: 'Screen Time Rule Negotiation',
    icon: '🎮',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 7, childMaxAge: 12 },
    description:
      '{childFirstName} approaches with a hand-drawn chart proposing why weekend gaming limits should double in exchange for doing dishes and reading.',
    choices: [
      {
        id: 'accept_contract',
        label: 'Negotiate fair chores-for-playtime milestones together',
        icon: '🤝',
        outcomes: [
          {
            message:
              'Impressed by the structured pitch, you drafted a kitchen whiteboard tracker. Dishes sparkled all week!',
            effects: { happiness: 4 },
            childDelta: { relationship: 8, smarts: 4, happiness: 7 },
          },
        ],
      },
      {
        id: 'play_coop',
        label: 'Say no to extra hours, but grab a second controller to play co-op together',
        icon: '🕹️',
        outcomes: [
          {
            message:
              'Instead of arguing over timers, you spent an hour laughing through two-player levels side by side.',
            effects: { happiness: 6 },
            childDelta: { relationship: 10, happiness: 8 },
          },
        ],
      },
      {
        id: 'unplug_router',
        label: 'Shut down the negotiation and ban consoles for a week',
        icon: '🔌',
        outcomes: [
          {
            message:
              'A bedroom door slammed, leaving frosty tension over dinner.',
            effects: { happiness: -4 },
            childDelta: { relationship: -8, happiness: -7 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_report_card_pride',
    title: 'Parent-Teacher Conference',
    icon: '🏅',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 6, childMaxAge: 12 },
    description:
      'At parent-teacher night, {childFirstName}’s homeroom teacher slides a detailed semester folder across the desk with notes on curiosity and classroom focus.',
    choices: [
      {
        id: 'celebrate_effort',
        label: 'Take {childFirstName} out for ice cream to celebrate effort ($25)',
        icon: '🍨',
        outcomes: [
          {
            message:
              'Praising {childFirstName}’s persistence over raw perfection sparked genuine motivation for next term!',
            effects: { cash: -25, happiness: 6 },
            childDelta: { relationship: 9, happiness: 8, smarts: 4 },
          },
        ],
      },
      {
        id: 'set_study_plan',
        label: 'Build a calm weekly reading routine with the teacher’s tips',
        icon: '📚',
        outcomes: [
          {
            message:
              'Twenty quiet minutes of shared reading each night steadily lifted {childFirstName}’s comprehension.',
            effects: { happiness: 3 },
            childDelta: { relationship: 6, smarts: 7 },
          },
        ],
      },
      {
        id: 'compare_grades',
        label: 'Focus only on the lowest score and demand straight A’s',
        icon: '📉',
        outcomes: [
          {
            message:
              '{childFirstName} slouched in the car, feeling nothing {childPronoun} did would ever be enough.',
            effects: { happiness: -4 },
            childDelta: { relationship: -8, happiness: -8 },
          },
        ],
      },
    ],
  },

  // =========================================================================
  // TEENAGER YEARS (Child Age 13 - 17) — 9 Events
  // =========================================================================
  {
    id: 'child_teen_curfew_broken',
    title: 'Missed Midnight Curfew',
    icon: '🕰️',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.3,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 13, childMaxAge: 17 },
    description:
      'The front door clicks softly at 1:35 AM — 95 minutes past curfew. {childFirstName} (age {childAge}) freezes in the hallway carrying sneakers.',
    choices: [
      {
        id: 'fair_conversation',
        label: 'Take a breath, make sure {childPronoun} is safe, and set a clear phone-check-in consequence',
        icon: '📱',
        outcomes: [
          {
            message:
              'Next morning you talked honestly about trust and safety. {childFirstName} accepted weekend chores without resentment.',
            effects: { karma: 2, happiness: 1 },
            childDelta: { relationship: 5, smarts: 3 },
          },
        ],
      },
      {
        id: 'ground_month',
        label: 'Ground {childObjective} from all social outings for a full month',
        icon: '🔒',
        outcomes: [
          {
            message:
              'Curfews were followed strictly afterward, though {childFirstName} kept bedroom doors shut for weeks.',
            effects: { happiness: -4 },
            childDelta: { relationship: -9, happiness: -8 },
          },
        ],
      },
      {
        id: 'pretend_asleep',
        label: 'Pretend you were asleep and avoid the confrontation',
        icon: '🛌',
        outcomes: [
          {
            message:
              '{childFirstName} pushed curfew later twice more that semester thinking you didn’t notice.',
            effects: { karma: -2 },
            childDelta: { relationship: -3, smarts: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_first_heartbreak',
    title: 'First Teen Heartbreak',
    icon: '💔',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.3,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 13, childMaxAge: 17 },
    description:
      'You find {childFirstName} sitting on the back steps staring at a phone screen with red eyes after getting dumped over text right before the weekend.',
    choices: [
      {
        id: 'quiet_comfort_drive',
        label: 'Sit quietly together with hot takeout ($35) and just listen',
        icon: '🍜',
        outcomes: [
          {
            message:
              'Without rushing to fix it, you stayed close while {childFirstName} vented for an hour. By bedtime, the worst had passed.',
            effects: { cash: -35, happiness: 3 },
            childDelta: { relationship: 14, happiness: 9 },
          },
        ],
      },
      {
        id: 'share_wisdom',
        label: 'Share your own story of youthful heartbreak and resilience',
        icon: '💬',
        outcomes: [
          {
            message:
              'Hearing that even you survived awkward teen heartbreaks made {childFirstName} crack a small laugh.',
            effects: { happiness: 3 },
            childDelta: { relationship: 9, happiness: 6, smarts: 2 },
          },
        ],
      },
      {
        id: 'dismiss_puppy_love',
        label: 'Say "You’re just teenagers, get over it"',
        icon: '🙄',
        outcomes: [
          {
            message:
              '{childFirstName} went straight upstairs and stopped sharing personal life with you.',
            effects: { happiness: -4 },
            childDelta: { relationship: -12, happiness: -10 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_learning_to_drive',
    title: 'Parking Lot Driving Lesson',
    icon: '🚘',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.3,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 15, childMaxAge: 17 },
    description:
      'With a fresh learner’s permit in hand, {childFirstName} hops behind the steering wheel in an empty mall parking lot while you grip the passenger door handle.',
    choices: [
      {
        id: 'patient_instruction',
        label: 'Keep your voice calm through jerky braking and celebrate smooth turns',
        icon: '👍',
        outcomes: [
          {
            message:
              'After twenty shaky loops, {childFirstName} nailed a clean parallel park on the first try and beamed with independence!',
            effects: { happiness: 6 },
            childDelta: { relationship: 11, happiness: 10, smarts: 4 },
          },
        ],
      },
      {
        id: 'driving_school',
        label: 'Book a certified driving instructor package ($260)',
        icon: '🪪',
        outcomes: [
          {
            message:
              'Your blood pressure stayed intact, and {childFirstName} passed the road test with flying colors!',
            effects: { cash: -260, happiness: 4 },
            childDelta: { relationship: 6, smarts: 5, happiness: 6 },
          },
        ],
      },
      {
        id: 'yell_at_brakes',
        label: 'Panic and shout every time the car inches near a curb',
        icon: '😱',
        outcomes: [
          {
            message:
              'Two blocks in, {childFirstName} put the car in park and asked to switch seats.',
            effects: { happiness: -5 },
            childDelta: { relationship: -8, happiness: -8 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_teen_first_job',
    title: 'First After-School Paycheck',
    icon: '💵',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 14, childMaxAge: 17 },
    description:
      '{childFirstName} waves {childPossessive} very first $180 paycheck from working weekend shifts, torn between blowing it on designer sneakers or learning how to budget.',
    choices: [
      {
        id: 'budget_and_match',
        label: 'Teach the 50/30/20 rule and match $60 into savings',
        icon: '🏦',
        outcomes: [
          {
            message:
              'Proudly splitting taxes, spending cash, and savings gave {childFirstName} real financial confidence.',
            effects: { cash: -60, happiness: 5 },
            childDelta: { relationship: 9, smarts: 8, happiness: 7 },
          },
        ],
      },
      {
        id: 'let_them_decide',
        label: 'Congratulate {childObjective} — {childPronoun} earned it to spend or save freely',
        icon: '🎉',
        outcomes: [
          {
            message:
              '{childFirstName} bought headphones and treated you to coffee out of pure pride.',
            effects: { happiness: 4 },
            childDelta: { relationship: 6, happiness: 6 },
          },
        ],
      },
      {
        id: 'charge_board',
        label: 'Demand half of it toward household groceries immediately',
        icon: '🧾',
        outcomes: [
          {
            message:
              'You pocketed $90, though {childFirstName} cut back shifts in frustration.',
            effects: { cash: 90, happiness: -3 },
            childDelta: { relationship: -10, happiness: -8 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_peer_pressure_party',
    title: 'Unsupervised House Party Text',
    icon: '🚨',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 14, childMaxAge: 17 },
    description:
      'At 10:30 PM, {childFirstName} texts you secretly from a friend’s party: older teens showed up with alcohol and {childPronoun} feels uneasy staying.',
    choices: [
      {
        id: 'no_questions_rescue',
        label: 'Pick {childObjective} up right away with your standing "no-trouble-for-calling" promise',
        icon: '🛡️',
        outcomes: [
          {
            message:
              'Because you kept your word not to punish honesty, {childFirstName} told you everything on the drive home.',
            effects: { karma: 4, happiness: 5 },
            childDelta: { relationship: 14, smarts: 5, health: 4, happiness: 6 },
          },
        ],
      },
      {
        id: 'cab_fare_and_check',
        label: 'Send $35 rideshare fare and stay on call until {childPronoun} is home safe',
        icon: '🚕',
        outcomes: [
          {
            message:
              '{childFirstName} stepped out the front door safely five minutes later and thanked you for trusting {childPossessive} judgment.',
            effects: { cash: -35, happiness: 4 },
            childDelta: { relationship: 9, smarts: 4, health: 3 },
          },
        ],
      },
      {
        id: 'ground_for_going',
        label: 'Pick {childObjective} up and ground {childObjective} for going in the first place',
        icon: '⚖️',
        outcomes: [
          {
            message:
              'Safe at home, yes — but {childFirstName} muttered that next time {childPronoun} just won’t text you.',
            effects: { happiness: -3 },
            childDelta: { relationship: -10, happiness: -8 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_high_school_prom_budget',
    title: 'Prom Night Expenses',
    icon: '🪩',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 16, childMaxAge: 17 },
    description:
      'Senior prom is two weeks out, and {childFirstName} comes excitedly with photos of formalwear, corsages, and group limo tickets totaling $320.',
    choices: [
      {
        id: 'cover_prom_night',
        label: 'Splurge on the full outfit and take driveway photos ($320)',
        icon: '📸',
        outcomes: [
          {
            message:
              '{childFirstName} looked incredible stepping onto the porch and had one of the best nights of high school!',
            effects: { cash: -320, happiness: 7 },
            childDelta: { relationship: 11, happiness: 12, looks: 4 },
          },
        ],
      },
      {
        id: 'thrift_and_diy',
        label: 'Set a $90 budget and hunt thrift boutiques & tailor together',
        icon: '🪡',
        outcomes: [
          {
            message:
              'You found a standout vintage outfit together for a fraction of the price — half the class asked where it came from!',
            effects: { cash: -90, happiness: 5 },
            childDelta: { relationship: 9, happiness: 8, smarts: 3 },
          },
        ],
      },
      {
        id: 'say_skip_prom',
        label: 'Refuse any money — prom is overpriced hype',
        icon: '🚫',
        outcomes: [
          {
            message:
              '{childFirstName} missed prom while watching friends’ stories online.',
            effects: { happiness: -4 },
            childDelta: { relationship: -10, happiness: -12 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_college_major_clash',
    title: 'College & Future Career Debate',
    icon: '🎓',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.3,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 16, childMaxAge: 17 },
    description:
      'College applications are spread across the table. {childFirstName} lights up talking about studying a creative/passionate field, even though safer degrees pay more upfront.',
    choices: [
      {
        id: 'support_with_plan',
        label: 'Back {childPossessive} passion and help map out scholarships and backup minors',
        icon: '🗺️',
        outcomes: [
          {
            message:
              'Feeling trusted while thinking realistically energized {childFirstName} to write killer essays and win aid.',
            effects: { happiness: 6 },
            childDelta: { relationship: 12, smarts: 5, happiness: 10 },
          },
        ],
      },
      {
        id: 'campus_visits',
        label: 'Plan a weekend road trip to tour three campuses ($180)',
        icon: '🏛️',
        outcomes: [
          {
            message:
              'Walking real college quads together turned abstract stress into genuine excitement.',
            effects: { cash: -180, happiness: 5 },
            childDelta: { relationship: 10, smarts: 4, happiness: 8 },
          },
        ],
      },
      {
        id: 'force_safe_degree',
        label: 'Insist you’ll only respect high-paying corporate majors',
        icon: '💼',
        outcomes: [
          {
            message:
              'Applications got rushed out in silence, straining your bond heading into graduation.',
            effects: { happiness: -4 },
            childDelta: { relationship: -11, happiness: -9 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_teen_social_media_drama',
    title: 'Group Chat Drama at School',
    icon: '📲',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.1,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 13, childMaxAge: 17 },
    description:
      '{childFirstName} seems glued to a glowing phone at midnight after someone screenshot-leaked an embarrassing rumor in the class group chat.',
    choices: [
      {
        id: 'calm_perspective',
        label: 'Make tea, put phones in the kitchen, and unpack it calmly',
        icon: '🍵',
        outcomes: [
          {
            message:
              'Stepping away from the screen broke the spiral. Next week nobody even remembered the post.',
            effects: { happiness: 3 },
            childDelta: { relationship: 10, happiness: 7, smarts: 3 },
          },
        ],
      },
      {
        id: 'screen_detox_weekend',
        label: 'Plan an unplugged outdoor day hike together ($40)',
        icon: '🌲',
        outcomes: [
          {
            message:
              'Fresh air and zero notifications reset {childFirstName}’s mood completely.',
            effects: { cash: -40, health: 3, happiness: 5 },
            childDelta: { relationship: 9, health: 4, happiness: 8 },
          },
        ],
      },
      {
        id: 'confiscate_phone',
        label: 'Confiscate the phone indefinitely without hearing {childObjective} out',
        icon: '📵',
        outcomes: [
          {
            message:
              '{childFirstName} felt punished for being a victim and grew even more distant.',
            effects: { happiness: -4 },
            childDelta: { relationship: -10, happiness: -9 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_teen_late_night_talk',
    title: 'Late-Night Kitchen Heart-to-Heart',
    icon: '🌃',
    category: 'relationship',
    minAge: 16,
    maxAge: 95,
    weight: 1.0,
    repeatable: true,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 13, childMaxAge: 17 },
    description:
      'Making midnight toast in the dark kitchen, {childFirstName} opens up unexpectedly about feeling torn between fitting in with friends and figuring out who {childPronoun} wants to become.',
    choices: [
      {
        id: 'share_real_advice',
        label: 'Be vulnerable about your own doubts at that age and really listen',
        icon: '💛',
        outcomes: [
          {
            message:
              'That quiet kitchen hour became one of {childFirstName}’s favorite memories of growing up.',
            effects: { happiness: 7 },
            childDelta: { relationship: 12, happiness: 8, smarts: 3 },
          },
        ],
      },
      {
        id: 'cook_pancakes',
        label: 'Crack eggs and turn it into an impromptu midnight diner snack',
        icon: '🥞',
        outcomes: [
          {
            message:
              'Nothing beats chocolate-chip pancakes and unhurried conversation at midnight!',
            effects: { happiness: 6 },
            childDelta: { relationship: 10, happiness: 9 },
          },
        ],
      },
      {
        id: 'rush_bed',
        label: 'Cut it short — everybody needs sleep before morning',
        icon: '⏰',
        outcomes: [
          {
            message:
              '{childFirstName} shrugged, washed the plate, and headed back upstairs.',
            effects: { happiness: -1 },
            childDelta: { relationship: -4, happiness: -3 },
          },
        ],
      },
    ],
  },

  // =========================================================================
  // YOUNG ADULT & ADULT CHILD (Child Age 18+) — 7 Events
  // =========================================================================
  {
    id: 'child_moving_out_help',
    title: 'Moving Into Their First Apartment',
    icon: '📦',
    category: 'relationship',
    minAge: 34,
    maxAge: 105,
    weight: 1.3,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 18 },
    description:
      '{childFirstName} (age {childAge}) signed a lease on {childPossessive} very own place! Cardboard boxes fill the hallway while the U-Haul ramp creaks outside.',
    choices: [
      {
        id: 'gift_essentials',
        label: 'Spend all Saturday hauling couches and buy kitchen essentials ($450)',
        icon: '🛋️',
        outcomes: [
          {
            message:
              'After assembling the last bookshelf over pizza on the floor, {childFirstName} hugged you tight at the door.',
            effects: { cash: -450, health: -1, happiness: 8 },
            childDelta: { relationship: 14, happiness: 12 },
          },
        ],
      },
      {
        id: 'haul_only',
        label: 'Show up early with toolboxes and help carry boxes all afternoon',
        icon: '🧰',
        outcomes: [
          {
            message:
              'Saved {childFirstName} a fortune on movers and gave you a proud glimpse of {childPossessive} new independence.',
            effects: { health: -1, happiness: 6 },
            childDelta: { relationship: 10, happiness: 8 },
          },
        ],
      },
      {
        id: 'send_card',
        label: 'Skip moving day and send a housewarming text',
        icon: '✉️',
        outcomes: [
          {
            message:
              '{childFirstName} managed with friends, though {childPronoun} sounded slightly hurt you didn’t stop by.',
            effects: { happiness: -2 },
            childDelta: { relationship: -6, happiness: -4 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_adult_career_advice',
    title: 'Big Career Crossroads Call',
    icon: '💼',
    category: 'relationship',
    minAge: 34,
    maxAge: 105,
    weight: 1.1,
    repeatable: true,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 18 },
    description:
      '{childFirstName} calls after work torn between staying at a comfortable desk job or taking a risky leap to switch fields for better long-term growth.',
    choices: [
      {
        id: 'weigh_tradeoffs',
        label: 'Walk through salary, runway, and upside like trusted peers',
        icon: '📊',
        outcomes: [
          {
            weight: 7,
            message:
              'Your steady perspective helped {childFirstName} negotiate an awesome offer with confidence!',
            effects: { happiness: 6 },
            childDelta: { relationship: 10, smarts: 5, happiness: 7 },
          },
          {
            weight: 3,
            message:
              'Thinking it through helped {childFirstName} hold off on a sketchy startup and wait for a stronger opportunity.',
            effects: { happiness: 4 },
            childDelta: { relationship: 8, smarts: 4 },
          },
        ],
      },
      {
        id: 'cheer_risk',
        label: 'Tell {childObjective} life is short — take the bold leap!',
        icon: '🚀',
        outcomes: [
          {
            message:
              '{childFirstName} loved hearing your unconditional belief and went all in on the new path.',
            effects: { happiness: 5 },
            childDelta: { relationship: 8, happiness: 8 },
          },
        ],
      },
      {
        id: 'criticize_timing',
        label: 'Warn harshly that changing lanes now would be reckless',
        icon: '⚠️',
        outcomes: [
          {
            message:
              'The phone call wrapped up awkwardly in under five minutes.',
            effects: { happiness: -3 },
            childDelta: { relationship: -6, happiness: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_adult_startup_loan',
    title: 'Asking for a Family Seed Loan',
    icon: '🏪',
    category: 'relationship',
    minAge: 36,
    maxAge: 105,
    weight: 1.0,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 18, minCash: 5000 },
    description:
      'Over coffee, {childFirstName} slides over a tidy pitch deck asking if you could invest $5,000 toward getting a first small venture off the ground.',
    choices: [
      {
        id: 'invest_seed',
        label: 'Back the venture with $5,000 and mentor the launch',
        icon: '🤝',
        outcomes: [
          {
            weight: 6,
            message:
              'Within months the venture found real customers, and {childFirstName} started paying you back with massive gratitude!',
            effects: { cash: -5000, happiness: 8 },
            childDelta: { relationship: 14, smarts: 6, happiness: 12 },
          },
          {
            weight: 4,
            message:
              'The first concept struggled to break even, yet {childFirstName} learned priceless business lessons thanks to your support.',
            effects: { cash: -5000, happiness: 2 },
            childDelta: { relationship: 8, smarts: 5, happiness: 3 },
          },
        ],
      },
      {
        id: 'modest_gift',
        label: 'Gift $1,000 as goodwill without risking family tension over loans',
        icon: '🎁',
        outcomes: [
          {
            message:
              'Clear boundaries kept things healthy, and the starter boost helped cover registration fees.',
            effects: { cash: -1000, happiness: 4 },
            childDelta: { relationship: 8, happiness: 6 },
          },
        ],
      },
      {
        id: 'decline_cleanly',
        label: 'Decline politely — mixing family and startup risk isn’t wise',
        icon: '📋',
        outcomes: [
          {
            message:
              '{childFirstName} was disappointed at first, though {childPronoun} respected your financial caution.',
            effects: { happiness: -2 },
            childDelta: { relationship: -4, happiness: -3 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_adult_partner_dinner',
    title: 'Meeting Their Serious Partner',
    icon: '🍽️',
    category: 'relationship',
    minAge: 36,
    maxAge: 105,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 18 },
    description:
      '{childFirstName} is nervous tonight — your {childRole} invited you out to dinner to introduce someone really special for the very first time.',
    choices: [
      {
        id: 'warm_welcome',
        label: 'Pick up the dinner tab ($180), swap stories, and make them feel at home',
        icon: '🥂',
        outcomes: [
          {
            message:
              'Laughter lasted past dessert. On the way out, {childFirstName} whispered, "Thank you for being so welcoming!"',
            effects: { cash: -180, happiness: 8 },
            childDelta: { relationship: 12, happiness: 10 },
          },
        ],
      },
      {
        id: 'polite_grill',
        label: 'Stay polite, though quietly interrogate career plans and intentions',
        icon: '🧐',
        outcomes: [
          {
            message:
              'Their partner answered respectfully, though {childFirstName} looked tense the whole second half of dinner.',
            effects: { happiness: 1 },
            childDelta: { relationship: -3, happiness: -2 },
          },
        ],
      },
      {
        id: 'cancel_last_minute',
        label: 'Cancel dinner last minute claiming work ran late',
        icon: '📱',
        outcomes: [
          {
            message:
              '{childFirstName} stopped inviting you to major personal milestones for a while.',
            effects: { happiness: -4 },
            childDelta: { relationship: -10, happiness: -7 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_adult_holiday_hosting',
    title: 'Hosting the Holidays Together',
    icon: '🦃',
    category: 'relationship',
    minAge: 36,
    maxAge: 110,
    weight: 1.1,
    repeatable: true,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 18 },
    description:
      '{childFirstName} insists on hosting holiday dinner at {childPossessive} place this year so you can finally put your feet up as the guest of honor.',
    choices: [
      {
        id: 'accept_and_bring_dessert',
        label: 'Bring favorite family recipes ($75) and help plate in the kitchen',
        icon: '🥧',
        outcomes: [
          {
            message:
              'Watching {childFirstName} command the dinner table effortlessly made you realize how wonderfully {childPronoun} turned out.',
            effects: { cash: -75, happiness: 9 },
            childDelta: { relationship: 11, happiness: 10 },
          },
        ],
      },
      {
        id: 'let_them_host_fully',
        label: 'Show up empty-handed as asked and praise every single dish',
        icon: '👏',
        outcomes: [
          {
            message:
              '{childFirstName} practically floated around the dining room proud to spoil you for once.',
            effects: { happiness: 7 },
            childDelta: { relationship: 9, happiness: 9 },
          },
        ],
      },
      {
        id: 'criticize_tradition',
        label: 'Correct the gravy and remind everyone your version is better',
        icon: '🥄',
        outcomes: [
          {
            message:
              'Dinner tasted fine, though the kitchen cheer evaporated fast.',
            effects: { happiness: -3 },
            childDelta: { relationship: -7, happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_adult_burnout_visit',
    title: 'Burned Out Weekend Visit',
    icon: '☕',
    category: 'relationship',
    minAge: 36,
    maxAge: 105,
    weight: 1.1,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 18 },
    description:
      '{childFirstName} drives over unexpectedly looking exhausted after months of 60-hour workweeks, asking just to crash on the guest bed for a weekend.',
    choices: [
      {
        id: 'pamper_weekend',
        label: 'Cook comfort meals, keep mornings quiet, and skip unsolicited lectures ($65)',
        icon: '🍲',
        outcomes: [
          {
            message:
              'Two slow days of sleep, soup, and old movies left {childFirstName} looking human again by Sunday night.',
            effects: { cash: -65, happiness: 7 },
            childDelta: { relationship: 12, health: 8, happiness: 10 },
          },
        ],
      },
      {
        id: 'walk_and_talk',
        label: 'Take long morning walks together to decompress gently',
        icon: '🚶',
        outcomes: [
          {
            message:
              'Fresh air and honest talk gave {childFirstName} clarity to set boundaries at work Monday morning.',
            effects: { health: 2, happiness: 5 },
            childDelta: { relationship: 9, health: 5, happiness: 7 },
          },
        ],
      },
      {
        id: 'lecture_hustle',
        label: 'Lecture {childObjective} about how hard your generation worked',
        icon: '📢',
        outcomes: [
          {
            message:
              '{childFirstName} packed {childPossessive} overnight bag Saturday evening and drove home early.',
            effects: { happiness: -4 },
            childDelta: { relationship: -10, happiness: -8 },
          },
        ],
      },
    ],
  },
  {
    id: 'child_adult_parent_role_reversal',
    title: 'Taking Care of You',
    icon: '🩺',
    category: 'relationship',
    minAge: 55,
    maxAge: 115,
    weight: 1.2,
    prisonCompatible: false,
    requires: { minChildren: 1, childMinAge: 18 },
    description:
      'Now older, {childFirstName} drops by with groceries, checks your prescription bottles, and insists on driving you to your upcoming checkups.',
    choices: [
      {
        id: 'accept_graciously',
        label: 'Accept the help warmly and reminisce over coffee',
        icon: '🫶',
        outcomes: [
          {
            message:
              'Letting your {childRole} return all the care you gave for decades brought a deep peace to both of you.',
            effects: { health: 5, happiness: 8 },
            childDelta: { relationship: 12, happiness: 9 },
          },
        ],
      },
      {
        id: 'share_errands',
        label: 'Split the errands together and refuse to be treated as helpless',
        icon: '🛒',
        outcomes: [
          {
            message:
              '{childFirstName} laughed at your stubborn independence as you teamed up through the grocery list.',
            effects: { health: 3, happiness: 5 },
            childDelta: { relationship: 7, happiness: 5 },
          },
        ],
      },
      {
        id: 'push_away',
        label: 'Snap that you don’t need babysitting and wave {childObjective} out',
        icon: '😠',
        outcomes: [
          {
            message:
              'The house felt noticeably quieter after {childFirstName} left.',
            effects: { health: -2, happiness: -5 },
            childDelta: { relationship: -9, happiness: -7 },
          },
        ],
      },
    ],
  },
];
