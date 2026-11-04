import type { BusinessSector, BusinessTemplate } from '../types';
import { pickRandom } from '../../../utils/random';

export interface SectorMeta {
  label: string;
  icon: string;
  badgeVariant: 'amber' | 'emerald' | 'sky' | 'purple' | 'rose' | 'slate';
  description: string;
}

export const BUSINESS_SECTOR_META: Record<BusinessSector, SectorMeta> = {
  food_hospitality: {
    label: 'Food & Hospitality',
    icon: '☕',
    badgeVariant: 'amber',
    description: 'High customer footfall, steady everyday demand, and approachable seed capital.',
  },
  services: {
    label: 'Personal & Professional Services',
    icon: '✂️',
    badgeVariant: 'emerald',
    description: 'Service-driven client retention with low equipment overhead and healthy margins.',
  },
  retail_commerce: {
    label: 'Retail & Commerce',
    icon: '📦',
    badgeVariant: 'sky',
    description: 'Global reach, product branding, supply-chain logistics, and digital consumer sales.',
  },
  media_creative: {
    label: 'Media & Creative Agencies',
    icon: '📢',
    badgeVariant: 'purple',
    description: 'High talent leverage, client retainers, visual campaigns, and viral growth.',
  },
  software_tech: {
    label: 'Software & Technology',
    icon: '💻',
    badgeVariant: 'sky',
    description: 'High operating margins, cloud scalability, intellectual property, and high upside.',
  },
  industrial_logistics: {
    label: 'Industrial & Supply Chain',
    icon: '🚚',
    badgeVariant: 'slate',
    description: 'Asset-heavy B2B contracts, fleet operations, commercial routes, and high barriers to entry.',
  },
  deep_tech_pharma: {
    label: 'Deep Tech & Life Sciences',
    icon: '🧬',
    badgeVariant: 'rose',
    description: 'Massive capital requirements, groundbreaking clinical or robotic R&D, and billion-dollar exit upside.',
  },
};

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'biz_coffee_shop',
    title: 'Artisan Coffee Roasters',
    sector: 'food_hospitality',
    icon: '☕',
    minAge: 18,
    minSeedCapital: 20000,
    recommendedDegrees: ['High School Diploma', 'B.B.A. in Finance & Management'],
    recommendedDisciplines: ['visual_arts'],
    baseAnnualRevenue: 95000,
    baseMarginPct: 0.22,
    volatility: 'low',
    description:
      'A cozy third-wave specialty espresso and pour-over café with house-roasted beans, locally baked pastries, and loyal neighborhood regulars.',
    suggestedLogos: ['☕', '🥐', '🥯', '🧁', '🌱', '🫖'],
    nameTemplates: [
      '{city} Coffee Roasters',
      'The Daily Grind Cafe',
      '{lastName} Artisan Espresso',
      'Velvet Bean Coffeehouse',
      'Metro Hearth & Brew',
      'Sunburst Coffee Co.',
    ],
  },
  {
    id: 'biz_food_truck',
    title: 'Gourmet Street Food Truck',
    sector: 'food_hospitality',
    icon: '🍔',
    minAge: 18,
    minSeedCapital: 35000,
    recommendedDegrees: ['High School Diploma'],
    recommendedDisciplines: [],
    baseAnnualRevenue: 140000,
    baseMarginPct: 0.25,
    volatility: 'medium',
    description:
      'A fully outfitted mobile culinary truck serving handcrafted smash burgers, fusion tacos, and loaded fries across city lunch spots and weekend music festivals.',
    suggestedLogos: ['🍔', '🌮', '🍟', '🚚', '🔥', '🌯'],
    nameTemplates: [
      '{lastName} Smoke & Fire Truck',
      '{city} Street Bites Co.',
      'Rolling Gourmet Kitchen',
      'Craving Cartel Food Truck',
      'The Wandering Grill',
      'Urban Skillet Mobile',
    ],
  },
  {
    id: 'biz_salon_spa',
    title: 'Luxury Hair & Wellness Spa',
    sector: 'services',
    icon: '✂️',
    minAge: 18,
    minSeedCapital: 45000,
    recommendedDegrees: ['High School Diploma'],
    recommendedDisciplines: ['visual_arts'],
    baseAnnualRevenue: 175000,
    baseMarginPct: 0.26,
    volatility: 'low',
    description:
      'An upscale urban styling studio offering designer haircuts, balayage coloring, skincare treatments, and recurring monthly beauty memberships.',
    suggestedLogos: ['✂️', '💆', '✨', '💅', '🪞', '🌿'],
    nameTemplates: [
      '{lastName} Atelier Salon',
      '{city} Glow & Spa Bar',
      'Luxe Hair & Botanical Spa',
      'Velvet Shears Studio',
      'Pure Serenity Wellness & Hair',
      'The Crown Beauty Lounge',
    ],
  },
  {
    id: 'biz_marketing_agency',
    title: 'Digital Growth Agency',
    sector: 'media_creative',
    icon: '📢',
    minAge: 20,
    minSeedCapital: 40000,
    recommendedDegrees: ['B.A. in Journalism & Digital Media', 'B.B.A. in Finance & Management', 'B.F.A. in Visual Arts & Design'],
    recommendedDisciplines: ['journalism', 'visual_arts', 'debate'],
    baseAnnualRevenue: 220000,
    baseMarginPct: 0.32,
    volatility: 'medium',
    description:
      'A performance marketing and creative agency managing paid ad campaigns, influencer marketing, viral short-form video content, and SEO for high-growth brands.',
    suggestedLogos: ['📢', '🚀', '📈', '💡', '🎯', '✨'],
    nameTemplates: [
      '{lastName} Digital Group',
      '{city} Catalyst Media',
      'Apex Growth Agency',
      'Verve Social Collective',
      'NorthStar Brand Labs',
      'Hyperion Creative Partners',
    ],
  },
  {
    id: 'biz_ecommerce',
    title: 'Direct-to-Consumer Brand',
    sector: 'retail_commerce',
    icon: '📦',
    minAge: 18,
    minSeedCapital: 50000,
    recommendedDegrees: ['B.B.A. in Finance & Management'],
    recommendedDisciplines: ['visual_arts'],
    baseAnnualRevenue: 260000,
    baseMarginPct: 0.24,
    volatility: 'medium',
    description:
      'An e-commerce brand selling premium lifestyle goods, sustainable apparel, and minimalist accessories worldwide via custom storefront and automated fulfillment.',
    suggestedLogos: ['📦', '🛍️', '🧢', '🕶️', '🏷️', '💎'],
    nameTemplates: [
      '{lastName} Supply Goods',
      '{city} Standard Apparel',
      'Aura Lifestyle Co.',
      'Nomad Minimalist Goods',
      'Kite & Timber Store',
      'Origin Goods Co.',
    ],
  },
  {
    id: 'biz_fitness_studio',
    title: 'Boutique Fitness Studio',
    sector: 'services',
    icon: '🏋️',
    minAge: 18,
    minSeedCapital: 60000,
    recommendedDegrees: ['B.S. in Sports Science & Kinesiology'],
    recommendedDisciplines: ['soccer', 'basketball'],
    baseAnnualRevenue: 240000,
    baseMarginPct: 0.22,
    volatility: 'low',
    description:
      'A state-of-the-art strength and HIIT studio featuring heart-rate tracked group classes, personal training packages, and custom athletic recovery spaces.',
    suggestedLogos: ['🏋️', '⚡', '🥊', '💪', '🏆', '🔥'],
    nameTemplates: [
      'Iron & Grit Athletic Club',
      '{city} Peak Performance Studio',
      '{lastName} Functional Fitness',
      'Pulse Strength & Conditioning',
      'Titan Health & Athletic Lounge',
      'Vanguard Training Lab',
    ],
  },
  {
    id: 'biz_game_studio',
    title: 'Indie Video Game Studio',
    sector: 'software_tech',
    icon: '🎮',
    minAge: 20,
    minSeedCapital: 75000,
    recommendedDegrees: ['B.S. in Computer Science', 'B.F.A. in Visual Arts & Design'],
    recommendedDisciplines: ['robotics', 'visual_arts', 'music'],
    baseAnnualRevenue: 310000,
    baseMarginPct: 0.45,
    volatility: 'high',
    description:
      'A creative indie games company designing story-driven adventures and cross-platform multiplayer hits for PC, console, and mobile gaming storefronts.',
    suggestedLogos: ['🎮', '👾', '🕹️', '⚔️', '🪐', '🎲'],
    nameTemplates: [
      'PixelForge Interactive',
      '{city} Moonshot Games',
      '{lastName} Byte Studios',
      'Neon Kraken Interactive',
      'Aether Realms Gaming',
      'Cosmic Cartridge Games',
    ],
  },
  {
    id: 'biz_logistics',
    title: 'Freight & Fleet Logistics',
    sector: 'industrial_logistics',
    icon: '🚚',
    minAge: 21,
    minSeedCapital: 150000,
    recommendedDegrees: ['Journeyman Trade License', 'B.B.A. in Finance & Management'],
    recommendedDisciplines: [],
    baseAnnualRevenue: 580000,
    baseMarginPct: 0.16,
    volatility: 'low',
    description:
      'A commercial freight transport enterprise operating a fleet of regional semi-trucks, automated dispatch software, and temperature-controlled distribution warehouses.',
    suggestedLogos: ['🚚', '⚓', '📦', '🌐', '🛡️', '🚛'],
    nameTemplates: [
      '{city} Continental Freight',
      '{lastName} Logistics & Hauling',
      'Crossroads Express Fleet',
      'Keystone Interstate Transport',
      'Horizon Global Logistics',
      'Vanguard Hauling Co.',
    ],
  },
  {
    id: 'biz_saas_platform',
    title: 'Cloud Enterprise SaaS',
    sector: 'software_tech',
    icon: '💻',
    minAge: 21,
    minSeedCapital: 180000,
    recommendedDegrees: ['B.S. in Computer Science', 'Master of Science (M.S. / Ph.D.)', 'Master of Business Administration (M.B.A.)'],
    recommendedDisciplines: ['robotics', 'debate'],
    baseAnnualRevenue: 720000,
    baseMarginPct: 0.58,
    volatility: 'high',
    description:
      'A cloud B2B software platform delivering workflow automation, enterprise security, and AI analytics on annual recurring subscription contracts (ARR).',
    suggestedLogos: ['💻', '⚡', '🌐', '☁️', '🔒', '🚀'],
    nameTemplates: [
      'Apex Cybernetics',
      '{city} DataStream Cloud',
      '{lastName} Software Solutions',
      'HyperScale Systems',
      'OmniSync AI',
      'NovaCloud Enterprise',
    ],
  },
  {
    id: 'biz_real_estate_dev',
    title: 'Real Estate Development Firm',
    sector: 'retail_commerce',
    icon: '🏗️',
    minAge: 23,
    minSeedCapital: 400000,
    recommendedDegrees: ['Juris Doctor (J.D.)', 'Master of Business Administration (M.B.A.)', 'B.B.A. in Finance & Management'],
    recommendedDisciplines: ['debate'],
    baseAnnualRevenue: 1250000,
    baseMarginPct: 0.22,
    volatility: 'medium',
    description:
      'An urban property investment syndicate acquiring land parcels, developing modern residential townhomes, and leasing commercial retail plazas.',
    suggestedLogos: ['🏗️', '🏢', '🏛️', '🌆', '🔑', '📐'],
    nameTemplates: [
      '{lastName} Heritage Properties',
      '{city} Urban Developers',
      'Summit Crest Holdings',
      'Crown & Pillar Realty Dev',
      'Skyline Horizon Investments',
      'Sterling Trust Properties',
    ],
  },
  {
    id: 'biz_robotics_labs',
    title: 'Autonomous Robotics Labs',
    sector: 'deep_tech_pharma',
    icon: '🤖',
    minAge: 22,
    minSeedCapital: 500000,
    recommendedDegrees: ['B.S. in Computer Science', 'Master of Science (M.S. / Ph.D.)'],
    recommendedDisciplines: ['robotics'],
    baseAnnualRevenue: 1600000,
    baseMarginPct: 0.38,
    volatility: 'high',
    description:
      'A deep-tech hardware laboratory engineering autonomous industrial mobile robots, computer vision navigation, and next-generation warehouse logistics units.',
    suggestedLogos: ['🤖', '🦾', '⚡', '🔬', '⚙️', '🛸'],
    nameTemplates: [
      'AeroBot Dynamics',
      '{city} Robotics Labs',
      '{lastName} Autonomous Tech',
      'Cortex Mechatronics',
      'CyberKinetic Systems',
      'OmniBot Robotics Co.',
    ],
  },
  {
    id: 'biz_biotech_pharma',
    title: 'Genomics & Biotech Lab',
    sector: 'deep_tech_pharma',
    icon: '🧬',
    minAge: 24,
    minSeedCapital: 750000,
    recommendedDegrees: ['Doctor of Medicine (M.D.)', 'Master of Science (M.S. / Ph.D.)', 'B.S. in Biology (Pre-Med Track)'],
    recommendedDisciplines: [],
    baseAnnualRevenue: 2400000,
    baseMarginPct: 0.42,
    volatility: 'extreme',
    description:
      'A pharmaceutical research pioneer advancing targeted mRNA vaccines, gene therapies, and cellular longevity treatments through clinical trial validation.',
    suggestedLogos: ['🧬', '🔬', '💊', '🧪', '🩸', '✨'],
    nameTemplates: [
      'Helios BioTherapeutics',
      '{city} Genomics Institute',
      '{lastName} BioSciences',
      'Synapse Gene Therapeutics',
      'Apex ImmunoPharma',
      'Curator BioLabs',
    ],
  },
];

export function getBusinessTemplateById(templateId: string): BusinessTemplate | null {
  return BUSINESS_TEMPLATES.find((b) => b.id === templateId) || null;
}

/** Generates a tailored, authentic company name suggestion from template patterns. */
export function generateSuggestedBusinessName(
  city: string,
  lastName: string,
  template: BusinessTemplate
): string {
  const chosenTemplate = pickRandom(template.nameTemplates) || `${template.title} of ${city}`;
  return chosenTemplate
    .replace(/\{city\}/g, city || 'Metro')
    .replace(/\{lastName\}/g, lastName || 'Vanguard');
}
