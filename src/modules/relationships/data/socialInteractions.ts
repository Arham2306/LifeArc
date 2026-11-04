import type { GiftOption, InteractiveOption } from '../types';

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

export interface ChatOptionDef extends InteractiveOption {
  positiveLine: string;
  awkwardLine: string;
}

export const CHAT_OPTIONS: ChatOptionDef[] = [
  {
    id: 'chat_nostalgia',
    title: 'Childhood Nostalgia',
    icon: '🧸',
    description: 'Reminisce about favorite childhood cartoons and playground games.',
    positiveLine: 'reminiscing about mischievous childhood games and nostalgic cartoon shows.',
    awkwardLine: 'bringing up an embarrassing memory that made the room uncomfortably quiet.',
  },
  {
    id: 'chat_ambitions',
    title: 'Future Ambitions',
    icon: '🚀',
    description: 'Discuss big life goals, career milestones, and dream bucket lists.',
    positiveLine: 'discussing grand life philosophies, ambitious bucket lists, and career hopes.',
    awkwardLine: 'debating unrealistic life plans that turned into a mildly tense disagreement.',
  },
  {
    id: 'chat_gossip',
    title: 'Juicy Gossip',
    icon: '🤫',
    description: 'Exchange unbelievable local rumors and funny stories.',
    positiveLine: 'laughing hysterically over unbelievable rumors and hilarious gossip.',
    awkwardLine: 'realizing you were accidentally gossiping about someone they are very close with.',
  },
  {
    id: 'chat_philosophy',
    title: 'Deep Philosophy',
    icon: '🌌',
    description: 'Ponder the meaning of life, fate, and mysteries of the universe.',
    positiveLine: 'pondering the mysteries of the universe, fate, and what makes life truly meaningful.',
    awkwardLine: 'getting tangled in an exhausting debate about ethics that left both of you bewildered.',
  },
];

export interface HangoutOptionDef extends InteractiveOption {
  activityNarrative: string;
}

export function getHangoutOptions(stage: string): HangoutOptionDef[] {
  if (stage === 'childhood') {
    return [
      {
        id: 'hangout_videogames',
        title: 'Video Games & Snacks',
        icon: '🎮',
        description: 'Play handheld games and share a pack of gummy bears.',
        activityNarrative: 'shared a bag of sweets while playing handheld video games.',
      },
      {
        id: 'hangout_bike_race',
        title: 'Bicycle Race',
        icon: '🚲',
        description: 'Race bikes around the cul-de-sac until sunset.',
        activityNarrative: 'raced bikes around the cul-de-sac until the streetlights flickered on.',
      },
      {
        id: 'hangout_pillow_fort',
        title: 'Build Pillow Fort',
        icon: '🏰',
        description: 'Construct a magnificent living room fortress.',
        activityNarrative: 'built a magnificent pillow fort in the living room and watched cartoons.',
      },
      {
        id: 'hangout_tag',
        title: 'Playground Tag',
        icon: '🏃',
        description: 'Run an energetic game of tag in the backyard.',
        activityNarrative: 'played an energetic and laughing game of tag in the backyard.',
      },
    ];
  }

  if (stage === 'teens') {
    return [
      {
        id: 'hangout_arcade',
        title: 'Arcade & Slushies',
        icon: '🕹️',
        description: 'Hit the local mall arcade and drink giant iced slushies.',
        activityNarrative: 'hung out at the local arcade and drank giant iced slushies.',
      },
      {
        id: 'hangout_pizza',
        title: 'Pizza & Show Binge',
        icon: '🍕',
        description: 'Order cheesy pizza and binge-watch a gripping thriller.',
        activityNarrative: 'ordered extra cheesy pizza and talked late into the night.',
      },
      {
        id: 'hangout_walk',
        title: 'Walk & Music Jam',
        icon: '🎧',
        description: 'Stroll around the neighborhood listening to favorite playlists.',
        activityNarrative: 'blasted music on a sunny afternoon walk through the neighborhood.',
      },
      {
        id: 'hangout_skatepark',
        title: 'Skatepark Hangout',
        icon: '🛹',
        description: 'Hang out at the skatepark chatting and watching stunts.',
        activityNarrative: 'chilled at the local skatepark watching cool tricks under the afternoon sun.',
      },
    ];
  }

  return [
    {
      id: 'hangout_cafe',
      title: 'Cozy Café Catch-up',
      icon: '☕',
      description: 'Sip artisanal coffee and talk at a downtown café.',
      activityNarrative: 'enjoyed an artisanal coffee and talked for hours at a cozy downtown café.',
    },
    {
      id: 'hangout_dinner',
      title: 'Cook Homemade Dinner',
      icon: '🍝',
      description: 'Prepare a delicious dinner with music and good wine.',
      activityNarrative: 'cooked an elaborate homemade dinner while sharing stories and laughter.',
    },
    {
      id: 'hangout_hike',
      title: 'Scenic Nature Hike',
      icon: '🌲',
      description: 'Take a revitalizing hike along scenic forest trails.',
      activityNarrative: 'took a relaxing weekend hike along scenic nature trails.',
    },
    {
      id: 'hangout_bowling',
      title: 'Bowling Night',
      icon: '🎳',
      description: 'Bowl a few frames and celebrate hilarious gutter balls.',
      activityNarrative: 'went bowling together and celebrated hilarious gutter balls.',
    },
  ];
}

export interface ComplimentOptionDef extends InteractiveOption {
  complimentText: string;
}

export const COMPLIMENT_OPTIONS: ComplimentOptionDef[] = [
  {
    id: 'comp_work_ethic',
    title: 'Dedication & Work Ethic',
    icon: '💼',
    description: 'Praise their incredible grit, determination, and reliability.',
    complimentText: 'praised their unwavering work ethic and inspiring drive.',
  },
  {
    id: 'comp_energy',
    title: 'Radiant Energy & Humor',
    icon: '✨',
    description: 'Tell them their laughter always lights up the entire room.',
    complimentText: 'told them that their laughter and positive energy always lights up the room.',
  },
  {
    id: 'comp_style',
    title: 'Sharp Style & Confidence',
    icon: '👗',
    description: 'Flatter their impeccable fashion sense and sharp confidence.',
    complimentText: 'complimented their impeccable sense of style and sharp confidence.',
  },
  {
    id: 'comp_loyalty',
    title: 'Loyalty & Big Heart',
    icon: '💖',
    description: 'Express deep appreciation for how loyal and thoughtful they are.',
    complimentText: 'expressed deep appreciation for how loyal, thoughtful, and caring they always are.',
  },
];

export interface InsultOptionDef extends InteractiveOption {
  insultText: string;
}

export const INSULT_OPTIONS: InsultOptionDef[] = [
  {
    id: 'insult_haircut',
    title: 'Terrible Haircut',
    icon: '✂️',
    description: 'Say their haircut looks like it survived a blender accident.',
    insultText: 'criticized their terrible haircut and said it looks like a blender accident.',
  },
  {
    id: 'insult_boring',
    title: 'Painfully Boring',
    icon: '🥱',
    description: 'Tell them their stories are the ultimate cure for insomnia.',
    insultText: 'rolled your eyes and said listening to their stories is the most painful cure for insomnia.',
  },
  {
    id: 'insult_fashion',
    title: 'Fashion Catastrophe',
    icon: '🧦',
    description: 'Ask which dumpster they rescued their outdated outfit from.',
    insultText: 'mocked their outfit and asked which dumpster they rescued it from.',
  },
  {
    id: 'insult_selfish',
    title: 'Selfish & Unreliable',
    icon: '🙄',
    description: 'Loudly call them out for being self-absorbed and flaky.',
    insultText: 'accused them of being notoriously self-absorbed, selfish, and unreliable.',
  },
];
