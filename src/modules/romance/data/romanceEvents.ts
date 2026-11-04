import type { CharacterProfile } from '../../../types/game';

export interface RomanceDilemmaEvent {
  id: string;
  title: string;
  prompt: string;
  category: 'romance_school' | 'romance_dating' | 'romance_marriage' | 'romance_family';
  minAge: number;
  maxAge?: number;
  condition?: (char: CharacterProfile) => boolean;
  choices: {
    label: string;
    description: string;
    execute: (char: CharacterProfile) => {
      message: string;
      effects: {
        happiness?: number;
        cash?: number;
        partnerRel?: number;
        partnerRomance?: number;
        karma?: number;
      };
    };
  }[];
}

export const ROMANCE_EVENTS: RomanceDilemmaEvent[] = [
  // --- SCHOOL & TEEN CRUSHES ---
  {
    id: 'event_prom_invite',
    title: 'High School Prom Invitation',
    prompt: 'Your high school prom is around the corner! An attractive classmate with a nervous smile approaches your locker holding a handmade corsage and asks if you would go to prom with them!',
    category: 'romance_school',
    minAge: 16,
    maxAge: 18,
    condition: (char) => char.education.currentStage === 'high_school',
    choices: [
      {
        label: 'Say Yes Enthusiastically! 💃',
        description: 'Accept the invite, rent matching outfits, and dance all night.',
        execute: () => ({
          message: 'You accepted the prom invitation! You had an enchanting night under the sparkling disco ball, crowned best dressed couple!',
          effects: { happiness: 18, partnerRomance: 25, partnerRel: 20 },
        }),
      },
      {
        label: 'Politely Decline ("Going with friends")',
        description: 'Decline gently and attend prom with your close squad.',
        execute: () => ({
          message: 'You thanked them kindly but went with your friend group. You still had a memorable night tearing up the dance floor.',
          effects: { happiness: 10, karma: 5 },
        }),
      },
    ],
  },
  {
    id: 'event_secret_admirer',
    title: 'Secret Admirer Note',
    prompt: 'Between classes, you find a small origami heart slipped through the vents of your school locker. Inside is a sweet poem praising your smile and warm personality, signed only "- Secret Admirer".',
    category: 'romance_school',
    minAge: 14,
    maxAge: 18,
    choices: [
      {
        label: 'Investigate who wrote it 🔍',
        description: 'Ask friends and inspect handwriting to identify your admirer.',
        execute: () => ({
          message: 'After subtle detective work, you discovered a sweet classmate in your art class wrote it. You gave them a warm hug!',
          effects: { happiness: 12, partnerRomance: 15 },
        }),
      },
      {
        label: 'Keep it safely in your notebook ❤️',
        description: 'Smile flattered and cherish the mystery.',
        execute: () => ({
          message: 'You tucked the sweet origami heart into your notebook as a treasured memory.',
          effects: { happiness: 8 },
        }),
      },
    ],
  },
  {
    id: 'event_living_room_kiss',
    title: 'Awkward Living Room Interruption',
    prompt: 'While watching a late movie at home, you and your romantic interest are sharing a sweet, tender kiss on the sofa. Suddenly, the front door swings open and your parents walk in holding groceries!',
    category: 'romance_school',
    minAge: 15,
    maxAge: 19,
    choices: [
      {
        label: 'Play it cool and introduce them',
        description: 'Stand up casually and make polite introductions.',
        execute: () => ({
          message: 'Your parents exchanged amused glances. Your father cleared his throat while your mother asked if your friend wanted some dinner.',
          effects: { happiness: 5, partnerRel: 10 },
        }),
      },
      {
        label: 'Hide under the sofa cushions! 🙈',
        description: 'Dye of sheer teenage embarrassment.',
        execute: () => ({
          message: 'You both sprang 5 feet apart in sheer panic. Everyone burst out laughing at the cartoonish reaction.',
          effects: { happiness: 8, partnerRomance: 10 },
        }),
      },
    ],
  },

  // --- DATING & YOUNG ADULT ---
  {
    id: 'event_late_night_text',
    title: 'Suspicious Late-Night Notification',
    prompt: 'At 1:15 AM on a Saturday, your partner\'s phone buzzes on the nightstand. A preview notification pops up from their ex saying: "I saw you earlier today... I still miss us."',
    category: 'romance_dating',
    minAge: 19,
    condition: (char) => !!char.partner && char.partner.romanticStage === 'dating',
    choices: [
      {
        label: 'Confront them calmly in the morning',
        description: 'Have an honest conversation about setting healthy boundaries with exes.',
        execute: () => ({
          message: 'Your partner apologized profusely, showed you their reply shutting the ex down, and blocked the number on the spot.',
          effects: { happiness: 5, partnerRel: 12, partnerRomance: 10 },
        }),
      },
      {
        label: 'Pick an explosive argument right now! 💥',
        description: 'Demand answers in the heat of the moment.',
        execute: () => ({
          message: 'A screaming match erupted at 2 AM. While they swore nothing happened, mutual trust suffered a stinging blow.',
          effects: { happiness: -20, partnerRel: -25, partnerRomance: -15 },
        }),
      },
      {
        label: 'Ignore it and trust your partner',
        description: 'Decide that you trust their loyalty without being insecure.',
        execute: () => ({
          message: 'The next morning, your partner proactively mentioned their ex messaged them and laughed about how desperate it was.',
          effects: { happiness: 10, partnerRel: 15, karma: 10 },
        }),
      },
    ],
  },
  {
    id: 'event_meet_the_inlaws',
    title: 'Dinner with the In-Laws',
    prompt: 'You are invited to a formal Sunday dinner to meet your partner\'s parents for the first time. The dining table is set with antique silver and the parents look scrutinizing.',
    category: 'romance_dating',
    minAge: 20,
    condition: (char) => !!char.partner,
    choices: [
      {
        label: 'Bring a fine vintage wine and charm them 🍷',
        description: 'Dress sharply, bring a gift, and complement their hospitality.',
        execute: () => ({
          message: 'The dinner was a roaring triumph! Your partner\'s parents showered you with praise and whispered that you are a keeper.',
          effects: { happiness: 15, partnerRel: 20, partnerRomance: 15, cash: -60 },
        }),
      },
      {
        label: 'Be 100% candid and unabashedly yourself',
        description: 'Speak your mind without walking on eggshells.',
        execute: () => ({
          message: 'While slightly taken aback by your directness, they appreciated your genuine authenticity.',
          effects: { happiness: 8, partnerRel: 8 },
        }),
      },
    ],
  },

  // --- ENGAGEMENT & MARRIAGE ---
  {
    id: 'event_wedding_jitters',
    title: 'Pre-Wedding Cold Feet',
    prompt: 'On the eve of your wedding ceremony, your fiancé(e) knocks softly on your door with tears in their eyes. They confess they feel overwhelmed by the pressure of forever.',
    category: 'romance_marriage',
    minAge: 21,
    condition: (char) => !!char.partner && char.partner.romanticStage === 'engaged',
    choices: [
      {
        label: 'Hold them gently and reassure your eternal love ❤️',
        description: 'Remind them why you chose each other and that you are a team.',
        execute: () => ({
          message: 'You held each other close through the evening. Their tears turned to peaceful smiles, and they walked down the aisle with absolute certainty.',
          effects: { happiness: 25, partnerRel: 30, partnerRomance: 30 },
        }),
      },
      {
        label: 'Suggest postponing the wedding if needed',
        description: 'Put their mental health first without rushing.',
        execute: () => ({
          message: 'Deeply touched by your lack of ego, your fiancé(e) kissed you and said: "No, you\'re the one. Let\'s get married tomorrow."',
          effects: { happiness: 20, partnerRel: 25, partnerRomance: 20 },
        }),
      },
    ],
  },
  {
    id: 'event_milestone_anniversary',
    title: 'Surprise Romantic Anniversary',
    prompt: 'Today is your wedding anniversary! Your spouse surprises you with handwritten reservations for a private seaside candlelit dinner under the stars.',
    category: 'romance_marriage',
    minAge: 22,
    condition: (char) => !!char.partner && char.partner.romanticStage === 'married',
    choices: [
      {
        label: 'Present your own surprise luxury gift! 🎁',
        description: 'Exchange romantic gifts and celebrate your everlasting bond.',
        execute: () => ({
          message: 'You both laughed at having outdone each other with thoughtful surprises! The evening was magical.',
          effects: { happiness: 30, partnerRel: 25, partnerRomance: 30, cash: -250 },
        }),
      },
      {
        label: 'Toast to another year of love and laughter 🥂',
        description: 'Enjoy the wonderful food and reminisce over cherished memories.',
        execute: () => ({
          message: 'You toasted to your shared journey. Looking into each other\'s eyes, you felt as in love as day one.',
          effects: { happiness: 20, partnerRel: 18, partnerRomance: 20 },
        }),
      },
    ],
  },
];
