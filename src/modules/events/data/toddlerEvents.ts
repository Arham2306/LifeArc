import type { LifeEventTemplate } from '../types'

/** Ages 3 - 6 */
export const TODDLER_EVENTS: LifeEventTemplate[] = [
  {
    id: 'broccoli_standoff',
    title: 'Broccoli Standoff',
    icon: '🥦',
    category: 'childhood',
    minAge: 3,
    maxAge: 5,
    description: "Your parents put a mountain of broccoli on your plate and won't let you leave the table until it's gone.",
    choices: [
      {
        id: 'eat',
        label: 'Eat every last tree',
        icon: '😋',
        outcomes: [
          { message: "You ate it all. Your parents were so stunned they took a photo.", effects: { health: 4, happiness: -2 } },
        ],
      },
      {
        id: 'throw',
        label: 'Launch it onto the floor',
        icon: '💥',
        outcomes: [
          { message: "Broccoli everywhere. The dog was thrilled. Your parents were not.", effects: { happiness: 3, karma: -3 } },
        ],
      },
      {
        id: 'hide',
        label: 'Hide it in your napkin',
        icon: '🤫',
        outcomes: [
          { weight: 6, message: "Nobody noticed. A criminal mastermind in the making.", effects: { smarts: 2, happiness: 3 } },
          { weight: 4, message: "Your mom unfolded the napkin. Busted, and no dessert.", effects: { happiness: -4 } },
        ],
      },
    ],
  },
  {
    id: 'neighbor_dog',
    title: 'A Big Fluffy Dog',
    icon: '🐕',
    category: 'childhood',
    minAge: 3,
    maxAge: 6,
    description: "Your neighbor's giant fluffy dog trots right up to you, tail wagging.",
    choices: [
      {
        id: 'pet',
        label: 'Pet it gently',
        icon: '🤗',
        outcomes: [
          { weight: 7, message: "The dog rolled over for belly rubs. You've made a best friend for life.", effects: { happiness: 6, karma: 2 } },
          { weight: 3, message: "The dog licked your entire face. You giggled for ten minutes.", effects: { happiness: 3 } },
        ],
      },
      {
        id: 'run',
        label: 'Run away screaming',
        icon: '😱',
        outcomes: [
          { message: "You tripped while running and cried all the way home.", effects: { happiness: -3, health: -1 } },
        ],
      },
      {
        id: 'tail',
        label: 'Pull its tail',
        icon: '😈',
        outcomes: [
          { weight: 5, message: "The dog nipped your hand. Lesson learned the hard way.", effects: { health: -5, happiness: -4, karma: -3 } },
          { weight: 5, message: "The dog gave you a disappointed look and walked away.", effects: { karma: -4 } },
        ],
      },
    ],
  },
  {
    id: 'crayon_wall',
    title: 'A Blank Canvas',
    icon: '🖍️',
    category: 'childhood',
    minAge: 3,
    maxAge: 5,
    description: 'You found a box of crayons right next to a big, clean, white wall.',
    choices: [
      {
        id: 'wall',
        label: 'Draw a masterpiece on the wall',
        icon: '🎨',
        outcomes: [
          { message: "Your parents spent the whole weekend repainting. Art has a price.", effects: { happiness: 5, karma: -2 } },
        ],
      },
      {
        id: 'paper',
        label: 'Ask for some paper',
        icon: '📄',
        outcomes: [
          { message: "Your drawing got a permanent spot on the fridge.", effects: { smarts: 3, happiness: 2, karma: 2 } },
        ],
      },
      {
        id: 'eat',
        label: 'Eat a crayon',
        icon: '🤢',
        outcomes: [
          { message: "It tasted like wax and regret.", effects: { health: -2, happiness: 1 } },
        ],
      },
    ],
  },
  {
    id: 'sandbox_showdown',
    title: 'Sandbox Showdown',
    icon: '🪣',
    category: 'social',
    minAge: 3,
    maxAge: 6,
    description: 'Another kid at the playground snatched your favorite shovel right out of your hands.',
    choices: [
      {
        id: 'share',
        label: 'Offer to share it',
        icon: '🤝',
        outcomes: [
          { message: "You built the biggest sandcastle in the park together. New friend unlocked!", effects: { happiness: 4, karma: 4 } },
        ],
      },
      {
        id: 'grab',
        label: 'Grab it back',
        icon: '✊',
        outcomes: [
          { weight: 5, message: "You got your shovel back. Victory!", effects: { happiness: 3, karma: -2 } },
          { weight: 5, message: "You both tumbled into the sand. Now everyone is crying.", effects: { happiness: -3, health: -1 } },
        ],
      },
      {
        id: 'tell',
        label: 'Tell a grown-up',
        icon: '🙋',
        outcomes: [
          { message: "A parent stepped in and returned your shovel.", effects: { smarts: 1, happiness: 1 } },
        ],
      },
    ],
  },
  {
    id: 'bed_monster',
    title: 'Monster Under the Bed',
    icon: '👻',
    category: 'childhood',
    minAge: 3,
    maxAge: 6,
    description: 'In the middle of the night, you hear a scratching noise coming from under your bed.',
    choices: [
      {
        id: 'parents',
        label: 'Call for your parents',
        icon: '📢',
        outcomes: [
          { message: "Dad checked under the bed with a flashlight. All clear.", effects: { happiness: 2 } },
        ],
      },
      {
        id: 'investigate',
        label: 'Investigate bravely',
        icon: '🔦',
        outcomes: [
          { message: "It was just the cat. You feel incredibly brave.", effects: { smarts: 2, happiness: 3 } },
        ],
      },
      {
        id: 'hide',
        label: 'Hide under the blanket all night',
        icon: '🫣',
        outcomes: [
          { message: "You didn't sleep a wink and were grumpy all day.", effects: { health: -3, happiness: -2 } },
        ],
      },
    ],
  },
  {
    id: 'candy_aisle',
    title: 'The Candy Aisle',
    icon: '🍭',
    category: 'childhood',
    minAge: 3,
    maxAge: 6,
    description: 'At the grocery store, you spot a giant rainbow lollipop at the checkout.',
    choices: [
      {
        id: 'tantrum',
        label: 'Throw a tantrum',
        icon: '😤',
        outcomes: [
          { weight: 4, message: "Your embarrassed parent bought it just to make you stop.", effects: { happiness: 4, karma: -3 } },
          { weight: 6, message: "You were carried out of the store kicking and screaming.", effects: { happiness: -4, karma: -1 } },
        ],
      },
      {
        id: 'ask',
        label: 'Ask nicely',
        icon: '🥺',
        outcomes: [
          { weight: 5, message: "Your politeness paid off. Sweet victory!", effects: { happiness: 4, karma: 2 } },
          { weight: 5, message: "The answer was no, but your parent said they were proud of you.", effects: { smarts: 1, karma: 2 } },
        ],
      },
    ],
  },
  {
    id: 'show_and_tell',
    title: 'Show and Tell',
    icon: '🧸',
    category: 'education',
    minAge: 4,
    maxAge: 6,
    description: "It's your turn for Show and Tell tomorrow. What will you bring?",
    choices: [
      {
        id: 'teddy',
        label: 'Your favorite teddy bear',
        icon: '🧸',
        outcomes: [
          { message: "Everyone said your bear was adorable.", effects: { happiness: 3 } },
        ],
      },
      {
        id: 'bug',
        label: 'A beetle in a jar',
        icon: '🪲',
        outcomes: [
          { weight: 6, message: "The class thought it was the coolest thing ever!", effects: { happiness: 5, smarts: 2 } },
          { weight: 4, message: "The beetle escaped and your teacher screamed.", effects: { happiness: -1, karma: -1 } },
        ],
      },
      {
        id: 'nothing',
        label: 'Forget to bring anything',
        icon: '🙈',
        outcomes: [
          { message: "You made up a story about an invisible dragon. Bold move.", effects: { smarts: 1, happiness: -1 } },
        ],
      },
    ],
  },
  {
    id: 'first_steps_wobble',
    title: 'First Wobbly Steps',
    icon: '👣',
    category: 'childhood',
    minAge: 1,
    maxAge: 2,
    description: 'You pull yourself up using the coffee table, let go of the wood, and wobble forward across the living room rug on two tiny feet!',
    choices: [
      {
        id: 'waddle_to_mom',
        label: 'Waddle bravely toward {motherName} with outstretched hands',
        icon: '🤱',
        outcomes: [
          {
            message: '{motherName} clapped her hands with joyful tears and scooped you into a warm hug! You took four whole steps!',
            effects: { happiness: 7, health: 2, parents: 5 },
          },
        ],
      },
      {
        id: 'dive_into_dad',
        label: 'Giggle and dive straight into {fatherName}\'s waiting arms',
        icon: '👨',
        outcomes: [
          {
            message: '{fatherName} caught you in midair, swung you over his shoulders like an airplane, and celebrated your new mobility!',
            effects: { happiness: 7, parents: 5, looks: 1 },
          },
        ],
      },
      {
        id: 'flop_on_pillow',
        label: 'Take three quick steps and flop face-first onto a plush pillow',
        icon: '🛋️',
        outcomes: [
          {
            message: 'You landed safely with a muffled squeak and burst out laughing into the soft velvet pillow cushion.',
            effects: { happiness: 5, health: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'smash_cake_chaos',
    title: 'Birthday Smash Cake',
    icon: '🎂',
    category: 'childhood',
    minAge: 1,
    maxAge: 2,
    description: 'Your family gathers around your high chair with cameras ready, setting down a brightly frosted personal birthday smash cake!',
    choices: [
      {
        id: 'two_fist_smash',
        label: 'Slam both fists right into the blue buttercream frosting',
        icon: '✊',
        outcomes: [
          {
            message: 'Frosting flew everywhere! You smeared sweet icing across your cheeks, nose, and bib while your family snapped hilarious keepsake photos.',
            effects: { happiness: 8, parents: 4, looks: 1 },
          },
        ],
      },
      {
        id: 'dainty_finger_taste',
        label: 'Pinch a tiny crumb of cake with two fingers and taste it delicately',
        icon: '✨',
        outcomes: [
          {
            message: 'So sweet! You licked your lips thoughtfully, proving your sophisticated culinary palate at a remarkably young age.',
            effects: { smarts: 3, happiness: 5 },
          },
        ],
      },
      {
        id: 'spoon_feed_only',
        label: 'Fold your arms and wait for your parents to feed you neatly with a baby spoon',
        icon: '🥄',
        outcomes: [
          {
            message: 'A clean baby is a happy baby. Your parents fed you delicious bites without a single speck of mess.',
            effects: { happiness: 4, parents: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'first_word_debate',
    title: 'The First Spoken Word',
    icon: '🗣️',
    category: 'childhood',
    minAge: 1,
    maxAge: 2,
    description: '{fatherName} is gently whispering "Dada" in your left ear while {motherName} is urgently whispering "Mama" in your right ear!',
    choices: [
      {
        id: 'say_mama',
        label: 'Look straight at {motherName} and say "Ma-ma!"',
        icon: '👩',
        outcomes: [
          {
            message: '{motherName} beamed with pride and covered your forehead with kisses: "I knew it! Mommy\'s favorite!"',
            effects: { happiness: 6, parents: 6, smarts: 2 },
          },
        ],
      },
      {
        id: 'say_dada',
        label: 'Point your tiny finger at {fatherName} and say "Da-da!"',
        icon: '👨',
        outcomes: [
          {
            message: '{fatherName} pumped his fist in pure triumph: "Yes!! That\'s my champion!"',
            effects: { happiness: 6, parents: 6, smarts: 2 },
          },
        ],
      },
      {
        id: 'yell_banana',
        label: 'Point toward the fruit bowl on the counter and shout "BA-NA-NA!"',
        icon: '🍌',
        outcomes: [
          {
            message: 'Both parents stopped in stunned disbelief, then erupted into hysterical laughter. A baby of pure substance!',
            effects: { happiness: 8, smarts: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'remote_in_the_couch',
    title: 'The Secret Remote Stash',
    icon: '📺',
    category: 'childhood',
    minAge: 2,
    maxAge: 4,
    description: 'You spot the shiny black television remote control sitting unattended on the coffee table while your parents are busy folding laundry.',
    choices: [
      {
        id: 'hide_in_cushions',
        label: 'Slip it deep into the crevice between the sofa cushions',
        icon: '🛋️',
        outcomes: [
          {
            message: 'A perfect covert drop! Your parents searched under the rug, in the fridge, and behind the TV for forty-five minutes before finding it.',
            effects: { smarts: 3, karma: -1, happiness: 4 },
          },
        ],
      },
      {
        id: 'mash_all_buttons',
        label: 'Mash every rubber button simultaneously with both palms',
        icon: '💥',
        outcomes: [
          {
            message: 'The TV blared static rock music at 100% volume! You danced on the rug while {fatherName} sprinted across the living room in panic.',
            effects: { happiness: 6, health: -1 },
          },
        ],
      },
      {
        id: 'hand_to_parents',
        label: 'Carry it carefully over and hand it politely to your parents',
        icon: '😇',
        outcomes: [
          {
            message: 'Your parents praised what an obedient, helpful toddler you are and rewarded you with a fresh fruit pouch.',
            effects: { parents: 6, karma: 5, happiness: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'bubble_bath_pirate',
    title: 'Bubble Bath High Seas',
    icon: '🛁',
    category: 'childhood',
    minAge: 2,
    maxAge: 5,
    description: 'The porcelain bathtub is piled high with a three-foot mountain of warm, lavender-scented sudsy foam and floating yellow rubber ducks!',
    choices: [
      {
        id: 'bubble_beard_pirate',
        label: 'Sculpt a giant white bubble beard and roar like Captain Blackbeard',
        icon: '🏴‍☠️',
        outcomes: [
          {
            message: 'Ahoy matey! You commanded your rubber duck fleet across the warm waters and made {motherName} laugh uncontrollably.',
            effects: { happiness: 7, looks: 1 },
          },
        ],
      },
      {
        id: 'tidal_wave_splash',
        label: 'Kick your feet with turbo power to launch tidal waves onto the tile floor',
        icon: '🌊',
        outcomes: [
          {
            message: 'Water splashed three feet outside the tub! You had the time of your life, though {fatherName} had to mop the entire bathroom.',
            effects: { happiness: 6, karma: -2, parents: -3 },
          },
        ],
      },
      {
        id: 'scrub_duckies_clean',
        label: 'Lather up each rubber ducky with baby shampoo until squeaky clean',
        icon: '🐥',
        outcomes: [
          {
            message: 'Every duck in your armada was polished to yellow perfection. Good hygiene habits established early!',
            effects: { karma: 4, parents: 4, happiness: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'park_pigeon_stampede',
    title: 'Pigeon Stampede in the Park',
    icon: '🐦',
    category: 'childhood',
    minAge: 2,
    maxAge: 5,
    description: 'While at the sunny municipal park, a flock of fifty plump city pigeons gathers on the brick pathway pecking at cracker crumbs.',
    choices: [
      {
        id: 'charge_flapping_arms',
        label: 'Charge straight at them waving your arms and squawking at the top of your lungs!',
        icon: '🏃',
        outcomes: [
          {
            message: 'FLAP-FLAP-FLAP! The pigeons scattered into the blue sky in an explosion of grey feathers! Pure unfiltered toddler adrenaline.',
            effects: { happiness: 7, health: 2 },
          },
        ],
      },
      {
        id: 'feed_gently_bench',
        label: 'Sit quietly on the wooden park bench and toss breadcrumbs with gentle care',
        icon: '🍞',
        outcomes: [
          {
            message: 'Three gentle pigeons pecked crumbs right by your sneakers. An elderly couple watching from across the fountain smiled at your gentleness.',
            effects: { karma: 6, smarts: 2, happiness: 5 },
          },
        ],
      },
      {
        id: 'sneak_up_behind',
        label: 'Drop into a low stealth crawl to try and pet one from behind',
        icon: '🐾',
        outcomes: [
          {
            message: 'The pigeon casually sidestepped your outstretched hand and cooed at you with mild pity. Nice try, little hunter.',
            effects: { smarts: 1, happiness: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'potty_training_trophy',
    title: 'Big Kid Potty Training',
    icon: '🚽',
    category: 'childhood',
    minAge: 2,
    maxAge: 4,
    description: 'Your parents hang a colorful cardboard sticker chart on the bathroom wall and announce it is officially time to say goodbye to diapers!',
    choices: [
      {
        id: 'earn_star_stickers',
        label: 'Follow the routine with laser focus to collect shiny gold foil star stickers',
        icon: '⭐',
        outcomes: [
          {
            message: 'You filled seven rows of gold stars in record time! Your parents bought you a set of big kid superhero underwear in celebration.',
            effects: { smarts: 4, parents: 6, happiness: 6 },
          },
        ],
      },
      {
        id: 'rebel_in_protest',
        label: 'Flatly refuse and run around the living room in defiance',
        icon: '🚼',
        outcomes: [
          {
            message: 'Your rebellious streak tested your parents\' patience to the absolute limit. Diaper duty continued a bit longer.',
            effects: { happiness: 2, parents: -4, karma: -2 },
          },
        ],
      },
      {
        id: 'negotiate_sweet_treats',
        label: 'Demand one gummy bear treat for every successful bathroom visit',
        icon: '🍬',
        outcomes: [
          {
            message: 'An astute business negotiation at age 3. You enjoyed sweet rewards and successfully mastered the porcelain throne.',
            effects: { smarts: 3, happiness: 5, parents: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'ice_cream_truck_melody',
    title: 'The Ice Cream Truck Jingle',
    icon: '🍦',
    category: 'childhood',
    minAge: 3,
    maxAge: 6,
    description: 'That unmistakable, tinny nursery tune echoes down your suburban street: the white neighborhood ice cream truck is approaching the corner!',
    choices: [
      {
        id: 'plead_for_popsicle',
        label: 'Tug urgently on {fatherName}\'s shirt and plead for a character popsicle with gumball eyes',
        icon: '🙏',
        outcomes: [
          {
            weight: 7,
            parentPaid: true,
            message: '{fatherName} pulled out a crisp $5 bill and bought you the frozen superhero pop! The gumball eyes were delightfully misaligned.',
            effects: { happiness: 8, parents: 3 },
          },
          {
            weight: 3,
            parentPaid: false,
            message: '{fatherName} said: "We have popsicles in the freezer at home!" The freezer popsicles weren\'t shaped like a superhero, but they were still cold.',
            effects: { happiness: 2 },
          },
        ],
      },
      {
        id: 'cute_front_lawn_dance',
        label: 'Perform your happiest, cutest victory dance on the front lawn to charm your parents',
        icon: '💃',
        outcomes: [
          {
            message: 'Your adorable choreography was completely irresistible. {motherName} bought two soft-serve vanilla cones with rainbow sprinkles!',
            effects: { looks: 2, happiness: 7, parents: 4 },
          },
        ],
      },
      {
        id: 'wave_politely',
        label: 'Wave enthusiastically to the friendly driver as the truck rolls by',
        icon: '👋',
        outcomes: [
          {
            message: 'The ice cream man tapped his horn twice: "BEEP-BEEP!" and tossed you a complimentary cherry fruit pop.',
            effects: { karma: 4, happiness: 6 },
          },
        ],
      },
    ],
  },
  {
    id: 'blanket_fort_kingdom',
    title: 'The Living Room Blanket Fort',
    icon: '🏰',
    category: 'childhood',
    minAge: 3,
    maxAge: 6,
    description: 'On a stormy Saturday afternoon, you drag all the wool quilts, couch cushions, and broom handles into the living room to construct a fortress.',
    choices: [
      {
        id: 'pillow_monarch',
        label: 'Crown yourself Ruler of the Cushion Empire and defend against imaginary shadow dragons',
        icon: '👑',
        outcomes: [
          {
            message: 'Your kingdom stood undefeated! {fatherName} crawled inside through the secret blanket tunnel to serve royal graham crackers.',
            effects: { happiness: 8, smarts: 3, parents: 4 },
          },
        ],
      },
      {
        id: 'flashlight_reading_nook',
        label: 'Sneak a warm flashlight and your favorite picture books inside for a secret cozy den',
        icon: '🔦',
        outcomes: [
          {
            message: 'You read through three illustrated dinosaur adventures under the warm golden glow of the beam. A peaceful, magical afternoon.',
            effects: { smarts: 5, happiness: 6 },
          },
        ],
      },
      {
        id: 'tactical_fort_collapse',
        label: 'Kick out the central sofa support cushion to cause an epic, joyful fortress avalanche!',
        icon: '💥',
        outcomes: [
          {
            message: 'Soft pillows tumbled down on top of you! You rolled around giggling in a mountain of fluffy cotton.',
            effects: { happiness: 7, health: 1 },
          },
        ],
      },
    ],
  },
];

