import type { LifeEventTemplate } from '../types';

/**
 * Interactive Business & Entrepreneurship Events
 * Triggers specifically for characters who own and operate an active business.
 * Choices directly impact Corporate Brand Reputation, Treasury Cash, Team Morale,
 * and Product Quality, as well as the founder's personal wealth and karma.
 */
export const BUSINESS_EVENTS: LifeEventTemplate[] = [
  // 1. Supplier Quality Crisis
  {
    id: 'biz_raw_materials_dilemma',
    title: 'The Discount Materials Dilemma',
    icon: '📦',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.2,
    requiresBusiness: true,
    description:
      'A new wholesale supplier approaches {companyName} offering a 40% discount on core inventory and materials, but their manufacturing facility lacks certified safety and quality standards.',
    choices: [
      {
        id: 'refuse_discount',
        label: 'Refuse the discount and insist on certified grade-A materials',
        icon: '🛡️',
        outcomes: [
          {
            message:
              'You stood firm on quality. When other local businesses experienced supplier recalls, {companyName} was praised for uncompromising standards!',
            effects: { businessBrand: 8, businessQuality: 6, karma: 4, happiness: 3 },
          },
        ],
      },
      {
        id: 'take_cheap_batch',
        label: 'Sign the discount contract to maximize immediate profit margins',
        icon: '💰',
        outcomes: [
          {
            weight: 6,
            message:
              'The cheap materials arrived and sales were high! You pocketed a massive boost to company treasury without immediate issues.',
            effects: { businessTreasury: 35000, karma: -3 },
          },
          {
            weight: 4,
            message:
              'Disaster! Customers immediately noticed the cheap quality and posted scathing 1-star reviews online. Defective batches cost thousands to replace.',
            effects: { businessBrand: -16, businessQuality: -12, businessTreasury: -15000, karma: -5 },
          },
        ],
      },
      {
        id: 'audit_factory',
        label: 'Send a QA inspector to personally audit the supplier’s warehouse',
        icon: '🔍',
        outcomes: [
          {
            message:
              'The inspection fee cost $4,000, but the supplier agreed to upgrade their testing line to earn your business at a 20% discount!',
            effects: { businessTreasury: 12000, businessQuality: 4, smarts: 2 },
          },
        ],
      },
    ],
  },

  // 2. Rival Slander & Attack Ads
  {
    id: 'biz_rival_attack_ads',
    title: 'Competitor Smear Campaign',
    icon: '📢',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.1,
    requiresBusiness: true,
    description:
      'An aggressive local competitor has launched a smear campaign on social media, posting manipulated comparison videos claiming {companyName} rips off customers.',
    choices: [
      {
        id: 'high_road_video',
        label: 'Post an honest, transparent behind-the-scenes video showing your team and process',
        icon: '🎥',
        outcomes: [
          {
            message:
              'Your transparent video resonated deeply with the public! The rival looked petty, and {companyName} saw a wave of sympathetic new customers.',
            effects: { businessBrand: 14, businessMorale: 8, karma: 5, happiness: 4 },
          },
        ],
      },
      {
        id: 'hire_lawyers',
        label: 'File an immediate defamation and false advertising lawsuit',
        icon: '⚖️',
        outcomes: [
          {
            weight: 7,
            message:
              'Your legal team presented undeniable evidence of defamation! The rival surrendered in a settlement, issuing a public apology and paying damages.',
            effects: { businessTreasury: 28000, businessBrand: 8, happiness: 5 },
          },
          {
            weight: 3,
            message:
              'The court case dragged on for months, costing $15,000 in attorney retainers with inconclusive results.',
            effects: { businessTreasury: -15000, happiness: -3 },
          },
        ],
      },
      {
        id: 'slash_prices',
        label: 'Ignore the noise and slash prices to steal their customer base',
        icon: '🏷️',
        outcomes: [
          {
            message:
              'Customers flooded {companyName} for the bargains. You crushed the rival’s sales, but your profit margins took a temporary hit.',
            effects: { businessBrand: 6, businessTreasury: 10000, businessMorale: -4 },
          },
        ],
      },
    ],
  },

  // 3. Viral Customer Moment
  {
    id: 'biz_viral_customer_moment',
    title: 'The Viral Customer Request',
    icon: '📱',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.0,
    requiresBusiness: true,
    description:
      'A sweet grandmother asks {companyName} for an eccentric custom order to celebrate her golden anniversary, but it requires hours of custom overtime work.',
    choices: [
      {
        id: 'grand_gesture',
        label: 'Mobilize the team to craft a breathtaking custom masterwork for free',
        icon: '🌟',
        outcomes: [
          {
            message:
              'Her tearful reaction video blew up with 14 million views! National news featured {companyName}, creating a massive surge of brand prestige.',
            effects: { businessBrand: 22, businessMorale: 14, karma: 8, happiness: 6 },
          },
        ],
      },
      {
        id: 'fulfill_standard',
        label: 'Deliver the order at standard price with high craftsmanship',
        icon: '🤝',
        outcomes: [
          {
            message:
              'The customer was delighted with the quality and left a glowing 5-star review on Google.',
            effects: { businessBrand: 5, businessTreasury: 2500, happiness: 2 },
          },
        ],
      },
      {
        id: 'rush_surcharge',
        label: 'Charge a steep expedited rush fee for the extra overtime labor',
        icon: '💵',
        outcomes: [
          {
            message:
              'They paid the bill, but grumbled about the price tag. The treasury took in extra cash, but earned no goodwill.',
            effects: { businessTreasury: 6000, karma: -3 },
          },
        ],
      },
    ],
  },

  // 4. Star Employee Poaching Threat
  {
    id: 'biz_employee_poaching',
    title: 'Headhunter Infiltration',
    icon: '💼',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.1,
    requiresBusiness: true,
    description:
      'A well-funded corporate rival has made a lucrative compensation offer to your most talented team leader at {companyName}, threatening to drain institutional knowledge.',
    choices: [
      {
        id: 'counter_offer',
        label: 'Counter-offer with a pay raise, spot bonus, and leadership title',
        icon: '🤝',
        outcomes: [
          {
            message:
              'Your team leader rejected the rival and recommitted with passion! The entire team felt valued knowing you invest in top talent.',
            effects: { businessTreasury: -8000, businessMorale: 16, businessQuality: 6, happiness: 3 },
          },
        ],
      },
      {
        id: 'promote_within',
        label: 'Wish them well and promote a hungry junior colleague to take their place',
        icon: '🚀',
        outcomes: [
          {
            weight: 7,
            message:
              'The newly promoted junior colleague stepped up with incredible drive, injecting fresh creativity and saving company cash!',
            effects: { businessMorale: 6, businessQuality: 4, smarts: 2 },
          },
          {
            weight: 3,
            message:
              'The transition was rocky. It took months to train the replacement, leading to slight hiccups in operational output.',
            effects: { businessQuality: -5, businessMorale: -4 },
          },
        ],
      },
      {
        id: 'threaten_noncompete',
        label: 'Threaten them with an aggressive non-compete lawsuit if they leave',
        icon: '📄',
        outcomes: [
          {
            message:
              'They stayed, but morale across the company plummeted. Staff felt trapped and whispered nervously around the water cooler.',
            effects: { businessMorale: -18, businessBrand: -6, karma: -6 },
          },
        ],
      },
    ],
  },

  // 5. Lucrative Government Tender / Enterprise Contract
  {
    id: 'biz_enterprise_tender',
    title: 'The Multi-Year Master Contract',
    icon: '🏛️',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.0,
    requiresBusiness: true,
    description:
      'A regional enterprise consortium opens bidding for a prestigious 3-year commercial contract. Bidding requires a non-refundable application audit fee.',
    choices: [
      {
        id: 'bid_solo',
        label: 'Invest $10,000 into a comprehensive, high-tier formal proposal',
        icon: '📊',
        outcomes: [
          {
            weight: 7,
            message:
              'Contract awarded! The evaluation committee praised {companyName} for unparalleled technical rigor. Millions in long-term sales unlocked!',
            effects: { businessTreasury: 65000, businessBrand: 16, happiness: 8 },
          },
          {
            weight: 3,
            message:
              'You finished in second place. The $10,000 preparation fee was lost, but you gained valuable enterprise bidding experience.',
            effects: { businessTreasury: -10000, smarts: 4 },
          },
        ],
      },
      {
        id: 'joint_venture',
        label: 'Form a joint consortium bid with a friendly peer business to split costs',
        icon: '🤝',
        outcomes: [
          {
            message:
              'The joint bid was approved! You share responsibilities with your partner, securing guaranteed recurring cash flow at minimal risk.',
            effects: { businessTreasury: 30000, businessBrand: 8, businessMorale: 6 },
          },
        ],
      },
      {
        id: 'pass_bid',
        label: 'Pass on the bureaucratic tender to focus on direct consumer customers',
        icon: '⏩',
        outcomes: [
          {
            message:
              'You stayed focused on your core clientele. Cash reserves remained stable without the distraction of red tape.',
            effects: { happiness: 1 },
          },
        ],
      },
    ],
  },

  // 6. Pre-Shipment Defect Dilemma
  {
    id: 'biz_defect_recall_dilemma',
    title: 'The Quality Defect Discovery',
    icon: '⚠️',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.0,
    requiresBusiness: true,
    description:
      'Late on a Friday evening, your QA manager detects a flaw in a large inventory batch that could cause minor malfunctions in about 8% of units sold.',
    choices: [
      {
        id: 'halt_and_scrap',
        label: 'Immediately halt distribution, scrap the flawed batch, and remake it from scratch',
        icon: '🛑',
        outcomes: [
          {
            message:
              'It cost $18,000 to replace the units, but word leaked of your integrity. Customers and industry reviewers praised {companyName} for honesty!',
            effects: { businessTreasury: -18000, businessBrand: 18, businessQuality: 10, karma: 8 },
          },
        ],
      },
      {
        id: 'quiet_fix',
        label: 'Ship the batch and prepare a silent replacement kit for customers who complain',
        icon: '🤫',
        outcomes: [
          {
            weight: 6,
            message:
              'Most customers never noticed. Only a few requested replacements, saving the company from a costly recall.',
            effects: { businessTreasury: -3000, businessQuality: -3 },
          },
          {
            weight: 4,
            message:
              'The defect malfunctioned publicly on a customer’s stream! A minor scandal forced emergency refunds and damaged product reputation.',
            effects: { businessBrand: -14, businessQuality: -8, businessTreasury: -12000, karma: -4 },
          },
        ],
      },
      {
        id: 'clearance_discount',
        label: 'Label the batch as "Factory B-Stock Clearance" and sell it at a steep discount',
        icon: '🏷️',
        outcomes: [
          {
            message:
              'Bargain hunters snapped up the discounted B-stock immediately! You recovered all costs while being totally transparent with buyers.',
            effects: { businessTreasury: 8000, businessBrand: 6, smarts: 2 },
          },
        ],
      },
    ],
  },

  // 7. Shady Tax Loophole Proposal
  {
    id: 'biz_tax_loophole_offer',
    title: 'The Aggressive Accountant',
    icon: '📑',
    category: 'business',
    minAge: 20,
    maxAge: 85,
    weight: 0.9,
    requiresBusiness: true,
    description:
      'A sharp tax advisor proposes routing {companyName}’s licensing intellectual property through an offshore shell entity, promising to save $45,000 on corporate taxes.',
    choices: [
      {
        id: 'honest_taxes',
        label: 'Reject the offshore scheme and pay domestic taxes with clean books',
        icon: '🏛️',
        outcomes: [
          {
            message:
              'You slept peacefully at night with flawless financial integrity. Your clean audit history became a major asset when speaking to banks.',
            effects: { karma: 8, smarts: 2, happiness: 3 },
          },
        ],
      },
      {
        id: 'take_loophole',
        label: 'Authorize the offshore shell structure to pocket the tax savings',
        icon: '🏝️',
        outcomes: [
          {
            weight: 7,
            message:
              'The structure held up. {companyName} saved $45,000 in cash, significantly padding the corporate treasury reserves.',
            effects: { businessTreasury: 45000, karma: -6 },
          },
          {
            weight: 3,
            message:
              'Audit penalty! Tax inspectors flagged the shell arrangement, slapping {companyName} with back taxes, penalties, and interest.',
            effects: { businessTreasury: -35000, businessBrand: -10, karma: -8, happiness: -5 },
          },
        ],
      },
    ],
  },

  // 8. Celebrity / Influencer Endorsement Pitch
  {
    id: 'biz_celebrity_pitch',
    title: 'The Celebrity Endorsement Opportunity',
    icon: '✨',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.0,
    requiresBusiness: true,
    description:
      'A world-renowned lifestyle celebrity genuinely enjoyed your product and their management agency proposes an official 1-year brand ambassador contract.',
    choices: [
      {
        id: 'sign_celebrity',
        label: 'Pay the $25,000 upfront sponsorship fee for exclusive promotional posts',
        icon: '🌟',
        outcomes: [
          {
            message:
              'Their endorsement went viral across millions of followers! Website traffic crashed your servers with orders, catapulting {companyName} into national fame!',
            effects: { businessTreasury: 40000, businessBrand: 25, businessMorale: 10, happiness: 6 },
          },
        ],
      },
      {
        id: 'gift_basket',
        label: 'Send a luxurious custom thank-you gift basket instead of signing a paid deal',
        icon: '🎁',
        outcomes: [
          {
            message:
              'They appreciated your classy gesture and gave {companyName} an organic shoutout on their personal Instagram story for free!',
            effects: { businessBrand: 12, businessTreasury: -1500, happiness: 4 },
          },
        ],
      },
      {
        id: 'decline_pitch',
        label: 'Politely pass to preserve company cash for operations',
        icon: '🙅',
        outcomes: [
          {
            message:
              'You stayed disciplined with marketing spend and avoided commercializing the brand prematurely.',
            effects: { smarts: 1 },
          },
        ],
      },
    ],
  },

  // 9. Workforce Culture & Benefits Demands
  {
    id: 'biz_workforce_benefits',
    title: 'Workforce Wellness & Healthcare Petition',
    icon: '👥',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.0,
    requiresBusiness: true,
    description:
      'Your employees at {companyName} present a petition requesting upgraded health coverage, ergonomic workstations, and paid parental leave.',
    choices: [
      {
        id: 'grant_benefits',
        label: 'Approve the comprehensive wellness & benefits package wholeheartedly',
        icon: '💖',
        outcomes: [
          {
            message:
              'The team erupted in celebration! Employee turnover dropped to zero and Glassdoor named {companyName} one of the best workplaces in the city.',
            effects: { businessMorale: 26, businessBrand: 10, businessTreasury: -12000, karma: 8, happiness: 5 },
          },
        ],
      },
      {
        id: 'compromise_perks',
        label: 'Compromise with ergonomic desk stipends and flexible work hours',
        icon: '🤝',
        outcomes: [
          {
            message:
              'Staff appreciated the practical compromise. Morale improved steadily at minimal cost to company finances.',
            effects: { businessMorale: 10, businessTreasury: -3500, smarts: 2 },
          },
        ],
      },
      {
        id: 'reject_petition',
        label: 'Reject the petition firmly, citing fiscal responsibility',
        icon: '📉',
        outcomes: [
          {
            message:
              'Discontent simmered among staff. A few key employees handed in their resignations and team productivity suffered.',
            effects: { businessMorale: -20, businessQuality: -8, karma: -5, happiness: -3 },
          },
        ],
      },
    ],
  },

  // 10. Commercial Lease & Landlord Extortion
  {
    id: 'biz_landlord_rent_hike',
    title: 'The Commercial Landlord’s Rent Hike',
    icon: '🏢',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 0.9,
    requiresBusiness: true,
    description:
      'Seeing {companyName}’s growing success, your commercial landlord demands an extortionate 30% rent increase upon annual lease renewal.',
    choices: [
      {
        id: 'negotiate_term',
        label: 'Negotiate a long-term 5-year lease lock with a modest 8% increase',
        icon: '🤝',
        outcomes: [
          {
            message:
              'Your diplomatic negotiation succeeded! You secured predictable facility overhead for the next five years, stabilizing operations.',
            effects: { businessBrand: 4, smarts: 4, happiness: 3 },
          },
        ],
      },
      {
        id: 'relocate_space',
        label: 'Pack up and move to a modern commercial park with better rent terms',
        icon: '🚚',
        outcomes: [
          {
            message:
              'Moving caused a week of disruption ($10,000 moving costs), but your new facility is brighter, larger, and cuts monthly overhead permanently!',
            effects: { businessTreasury: -10000, businessQuality: 8, businessMorale: 6 },
          },
        ],
      },
      {
        id: 'accept_hike',
        label: 'Cave in and pay the full 30% rent increase to avoid moving hassle',
        icon: '💸',
        outcomes: [
          {
            message:
              'You stayed in place, but the bloated lease drained $14,000 in excess cash from corporate profits.',
            effects: { businessTreasury: -14000, happiness: -2 },
          },
        ],
      },
    ],
  },

  // 11. Stolen Trade Secrets Temptation
  {
    id: 'biz_stolen_secrets_temptation',
    title: 'The Industrial Espionage Offer',
    icon: '🕵️',
    category: 'business',
    minAge: 21,
    maxAge: 85,
    weight: 0.8,
    requiresBusiness: true,
    description:
      'A disgruntled former executive from your biggest industry rival contacts you privately on Telegram, offering to sell their entire unreleased product roadmap and client list for $20,000.',
    choices: [
      {
        id: 'report_rival',
        label: 'Decline firmly and alert the rival company’s legal counsel of the breach',
        icon: '🛡️',
        outcomes: [
          {
            message:
              'The rival’s CEO personally called you to express eternal gratitude for your high ethical standards. An industry alliance was born!',
            effects: { businessBrand: 16, karma: 10, happiness: 5 },
          },
        ],
      },
      {
        id: 'buy_secrets',
        label: 'Wire the $20,000 in crypto to acquire their trade secrets secretly',
        icon: '💾',
        outcomes: [
          {
            weight: 6,
            message:
              'The leaked files gave {companyName} an insurmountable competitive edge! You beat them to market on 3 major accounts.',
            effects: { businessTreasury: 60000, businessQuality: 10, karma: -12 },
          },
          {
            weight: 4,
            message:
              'Sting operation! Federal trade investigators traced the transfer. {companyName} faced a crushing corporate espionage indictment.',
            effects: { businessBrand: -30, businessTreasury: -40000, karma: -15, happiness: -8 },
          },
        ],
      },
      {
        id: 'delete_message',
        label: 'Block the sender immediately and delete the messages',
        icon: '🗑️',
        outcomes: [
          {
            message:
              'You kept your hands clean and stayed focused on your own authentic business merits.',
            effects: { smarts: 2, karma: 3 },
          },
        ],
      },
    ],
  },

  // 12. Green Eco-Friendly Sustainability Drive
  {
    id: 'biz_eco_certification',
    title: 'Green Sustainability Certification',
    icon: '🌱',
    category: 'business',
    minAge: 18,
    maxAge: 85,
    weight: 1.0,
    requiresBusiness: true,
    description:
      'An environmental agency offers a certified "100% Zero-Carbon & Sustainable" accreditation if {companyName} transitions to recyclable packaging and solar grid offsets.',
    choices: [
      {
        id: 'go_green',
        label: 'Invest $12,000 to overhaul supply chains and earn the eco-badge',
        icon: '🌿',
        outcomes: [
          {
            message:
              'The Green seal earned {companyName} viral love among eco-conscious millennials and Gen-Z customers! Wholesale retailers placed massive new orders.',
            effects: { businessBrand: 18, businessQuality: 8, businessTreasury: 15000, karma: 8, happiness: 4 },
          },
        ],
      },
      {
        id: 'partial_green',
        label: 'Switch to biodegradable packaging without paying for official certification',
        icon: '♻️',
        outcomes: [
          {
            message:
              'A sensible green move! Customers appreciated the recyclable materials at a low cost of $3,000.',
            effects: { businessBrand: 6, businessTreasury: -3000, karma: 4 },
          },
        ],
      },
      {
        id: 'skip_green',
        label: 'Keep existing suppliers to prioritize lowest possible unit costs',
        icon: '📦',
        outcomes: [
          {
            message:
              'You maintained your lowest manufacturing costs, though eco-advocates occasionally left comments on your social posts.',
            effects: { happiness: 1 },
          },
        ],
      },
    ],
  },
];

