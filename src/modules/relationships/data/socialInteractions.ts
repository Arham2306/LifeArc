import type { GiftOption } from '../types';

export const GIFT_CATALOG: GiftOption[] = [
  {
    id: 'gift_handmade_origami',
    name: 'Handcrafted Origami & Card',
    cost: 0,
    icon: '💌',
    tier: 'handmade',
    description: 'A personal handmade token of appreciation crafted with care.',
  },
  {
    id: 'gift_artisan_chocolates',
    name: 'Box of Artisan Chocolates',
    cost: 35,
    icon: '🍫',
    tier: 'thoughtful',
    description: 'Rich Belgian assorted truffles in a golden ribboned tin.',
  },
  {
    id: 'gift_smartwatch',
    name: 'Sleek Smartwatch',
    cost: 250,
    icon: '⌚',
    tier: 'luxury',
    description: 'A stylish OLED digital smartwatch with biometric tracking.',
  },
  {
    id: 'gift_designer_jewelry',
    name: 'Designer Diamond Pendant',
    cost: 1500,
    icon: '💎',
    tier: 'lavish',
    description: 'An exquisite 18-karat gold necklace studded with brilliant diamonds.',
  },
];

export const CONVERSATION_TOPICS: { topic: string; positiveLine: string; awkwardLine: string }[] = [
  {
    topic: 'childhood memories',
    positiveLine: 'reminiscing about mischievous childhood games and nostalgic cartoon shows.',
    awkwardLine: 'bringing up an embarrassing moment that made the room uncomfortably quiet.',
  },
  {
    topic: 'future dreams and ambitions',
    positiveLine: 'discussing grand life philosophies, ambitious bucket lists, and career hopes.',
    awkwardLine: 'debating unrealistic life plans that turned into a mildly tense philosophical clash.',
  },
  {
    topic: 'funny rumors & juicy gossip',
    positiveLine: 'laughing hysterically over unbelievable rumors and hilarious workplace gossip.',
    awkwardLine: 'realizing you were accidentally gossiping about someone they are close with.',
  },
  {
    topic: 'favorite music & movies',
    positiveLine: 'bonding passionately over shared musical tastes and classic cinematic favorites.',
    awkwardLine: 'criticizing their favorite band right before discovering how obsessed they are with them.',
  },
  {
    topic: 'travel bucket lists',
    positiveLine: 'exchanging dream vacation itineraries and daydreaming about tropical beaches.',
    awkwardLine: 'arguing over the best way to travel on a tight budget.',
  },
  {
    topic: 'deep life philosophy',
    positiveLine: 'pondering the mysteries of the universe, fate, and what makes life truly meaningful.',
    awkwardLine: 'getting tangled in an exhausting debate about ethics that left both of you bewildered.',
  },
];

export const COMPLIMENT_LINES: string[] = [
  'praised their unwavering work ethic and infectious positive energy.',
  'told them that their laughter always lights up the entire room.',
  'complimented their impeccable sense of style and sharp confidence.',
  'expressed deep admiration for how thoughtful and loyal they always are.',
  'applauded their quick wit and brilliant problem-solving instincts.',
  'told them they are one of the most trustworthy people you have ever known.',
];

export const INSULT_LINES: string[] = [
  'mocked their questionable life choices with a scathing remark.',
  'criticized their terrible haircut and said it looks like a blender accident.',
  'rolled your eyes and said their stories are the most boring thing on earth.',
  'accused them of being notoriously selfish and unreliable.',
  'told them their fashion sense was frozen in the worst decade possible.',
  'loudly pointed out an embarrassing mistake they made in front of everyone.',
];

export const HANGOUT_ACTIVITIES_BY_STAGE: Record<string, string[]> = {
  childhood: [
    'built a magnificent pillow fort in the living room and watched cartoons.',
    'raced bikes around the cul-de-sac until the streetlights flickered on.',
    'played an intense game of tag in the backyard.',
    'shared a bag of gummy bears while playing handheld video games.',
  ],
  teens: [
    'hung out at the local mall arcade and drank giant iced slushies.',
    'binge-watched an entire season of a gripping thriller show together.',
    'ordered extra cheesy pizza and talked late into the night.',
    'blasted music on a sunny afternoon walk through the neighborhood.',
  ],
  adulthood: [
    'enjoyed an artisanal coffee and talked at a cozy downtown café.',
    'cooked an elaborate homemade dinner while sharing stories and wine.',
    'went bowling and celebrated hilarious gutter balls together.',
    'took a relaxing weekend hike along scenic forest trails.',
  ],
};
