import type { PromotionTier } from '../types';

export const PROMOTION_LADDERS: Record<string, PromotionTier[]> = {
  // ==========================================================================
  // TECHNOLOGY
  // ==========================================================================
  ft_software_engineer: [
    {
      title: 'Senior Software Engineer',
      salary: 125000,
      minPerformance: 80,
      minYears: 2,
      minSmarts: 68,
      description:
        'Architect high-performance distributed systems, review pull requests, and mentor junior developers.',
    },
    {
      title: 'Principal AI Scientist & Tech Director',
      salary: 185000,
      minPerformance: 85,
      minYears: 2,
      minSmarts: 78,
      requiredDegreeTitles: ['Master of Science (M.S. / Ph.D.)'],
      requiredDegreeLabel: 'Master of Science (M.S. / Ph.D.)',
      description:
        'Direct algorithmic breakthroughs and lead the company’s core artificial intelligence division.',
    },
  ],
  ft_cybersecurity_analyst: [
    {
      title: 'Senior Threat Hunter & Lead Analyst',
      salary: 118000,
      minPerformance: 80,
      minYears: 2,
      minSmarts: 68,
      description:
        'Coordinate penetration testing teams and neutralize advanced persistent threats.',
    },
    {
      title: 'Chief Information Security Officer (CISO)',
      salary: 180000,
      minPerformance: 85,
      minYears: 2,
      minSmarts: 76,
      requiredDegreeTitles: ['Master of Science (M.S. / Ph.D.)'],
      requiredDegreeLabel: 'Master of Science (M.S. / Ph.D.)',
      description:
        'Direct enterprise-wide information security and defend infrastructure at the executive level.',
    },
  ],

  // ==========================================================================
  // BUSINESS & FINANCE
  // ==========================================================================
  ft_financial_analyst: [
    {
      title: 'Senior Investment Analyst',
      salary: 115000,
      minPerformance: 80,
      minYears: 2,
      minSmarts: 68,
      description:
        'Manage multi-asset portfolio models and lead high-yield institutional transactions.',
    },
    {
      title: 'Vice President of Capital & Managing Director',
      salary: 195000,
      minPerformance: 86,
      minYears: 2,
      minSmarts: 75,
      requiredDegreeTitles: ['Master of Business Administration (M.B.A.)'],
      requiredDegreeLabel: 'Master of Business Administration (M.B.A.)',
      description:
        'Lead major corporate mergers, private equity allocations, and firm strategy.',
    },
  ],
  ft_bank_teller: [
    {
      title: 'Senior Loan Underwriter',
      salary: 54000,
      minPerformance: 78,
      minYears: 1,
      minSmarts: 55,
      description:
        'Assess mortgage applications and structure commercial credit lines.',
    },
    {
      title: 'Branch Vice President & General Manager',
      salary: 88000,
      minPerformance: 84,
      minYears: 2,
      minSmarts: 65,
      requiredDegreeTitles: [
        'B.B.A. in Finance & Management',
        'Master of Business Administration (M.B.A.)',
      ],
      requiredDegreeLabel: 'B.B.A. in Finance or M.B.A.',
      description:
        'Direct total branch depository assets, commercial lending, and team growth.',
    },
  ],

  // ==========================================================================
  // MEDICINE & HEALTHCARE
  // ==========================================================================
  ft_registered_nurse: [
    {
      title: 'Charge Nurse & Clinical Ward Supervisor',
      salary: 108000,
      minPerformance: 80,
      minYears: 2,
      minSmarts: 68,
      description:
        'Oversee emergency floor operations, triage protocols, and ward nursing staff.',
    },
    {
      title: 'Chief Nursing Officer & Hospital Executive',
      salary: 162000,
      minPerformance: 86,
      minYears: 2,
      minSmarts: 75,
      requiredDegreeTitles: [
        'Master of Science (M.S. / Ph.D.)',
        'Doctor of Medicine (M.D.)',
      ],
      requiredDegreeLabel: 'Master of Science (M.S. / Ph.D.) or M.D.',
      description:
        'Direct hospital-wide clinical healthcare policies, accreditation, and patient care.',
    },
  ],
  ft_biotech_researcher: [
    {
      title: 'Senior Laboratory Project Lead',
      salary: 94000,
      minPerformance: 80,
      minYears: 2,
      minSmarts: 70,
      description:
        'Design drug target assays and manage junior research technicians.',
    },
    {
      title: 'Principal Investigator & Lab Director',
      salary: 155000,
      minPerformance: 85,
      minYears: 2,
      minSmarts: 78,
      requiredDegreeTitles: [
        'Master of Science (M.S. / Ph.D.)',
        'Doctor of Medicine (M.D.)',
      ],
      requiredDegreeLabel: 'Master of Science (M.S. / Ph.D.) or M.D.',
      description:
        'Spearhead multi-million-dollar clinical discovery programs and publish in top journals.',
    },
  ],
  ft_medical_physician: [
    {
      title: 'Chief of Clinical Medicine & Surgery',
      salary: 235000,
      minPerformance: 85,
      minYears: 3,
      minSmarts: 82,
      requiredDegreeTitles: ['Doctor of Medicine (M.D.)'],
      requiredDegreeLabel: 'Doctor of Medicine (M.D.)',
      description:
        'Direct surgical departments, establish patient care standards, and lead rounds.',
    },
  ],

  // ==========================================================================
  // LAW & GOVERNMENT
  // ==========================================================================
  ft_corporate_paralegal: [
    {
      title: 'Senior Regulatory Affairs Manager',
      salary: 86000,
      minPerformance: 80,
      minYears: 2,
      minSmarts: 65,
      description:
        'Manage regulatory filings, legal discovery schedules, and corporate compliance.',
    },
    {
      title: 'Associate Trial Attorney',
      salary: 140000,
      minPerformance: 85,
      minYears: 2,
      minSmarts: 75,
      requiredDegreeTitles: ['Juris Doctor (J.D.)'],
      requiredDegreeLabel: 'Juris Doctor (J.D.)',
      description:
        'Step up into full courtroom litigation as a licensed attorney representing clients.',
    },
  ],
  ft_associate_attorney: [
    {
      title: 'Senior Equity Partner & Head of Litigation',
      salary: 240000,
      minPerformance: 85,
      minYears: 3,
      minSmarts: 80,
      requiredDegreeTitles: ['Juris Doctor (J.D.)'],
      requiredDegreeLabel: 'Juris Doctor (J.D.)',
      description:
        'Lead high-stakes federal trial teams and share in firm partnership profits.',
    },
  ],

  // ==========================================================================
  // ARTS, DESIGN & MEDIA
  // ==========================================================================
  ft_graphic_designer: [
    {
      title: 'Senior Art Lead & Brand Strategist',
      salary: 90000,
      minPerformance: 80,
      minYears: 2,
      description:
        'Direct multi-platform design systems and guide agency creative teams.',
    },
    {
      title: 'Executive Creative Director',
      salary: 145000,
      minPerformance: 85,
      minYears: 2,
      requiredDegreeTitles: ['Master of Fine Arts (M.F.A.)'],
      requiredDegreeLabel: 'Master of Fine Arts (M.F.A.)',
      description:
        'Shape global brand campaigns and spearhead the agency’s flagship creative accounts.',
    },
  ],

  // ==========================================================================
  // HOSPITALITY & RETAIL
  // ==========================================================================
  ft_dishwasher: [
    {
      title: 'Kitchen Line Cook',
      salary: 34000,
      minPerformance: 78,
      minYears: 1,
      description:
        'Prepare hot appetizers and assist executive chefs during dinner rushes.',
    },
    {
      title: 'Sous Chef & Kitchen Supervisor',
      salary: 52000,
      minPerformance: 82,
      minYears: 2,
      description:
        'Manage daily kitchen operations, recipe standards, and shift cooks.',
    },
  ],
  ft_shelf_stocker: [
    {
      title: 'Inventory Shift Supervisor',
      salary: 38000,
      minPerformance: 78,
      minYears: 1,
      description:
        'Supervise nighttime replenishment crews and inventory receiving docks.',
    },
    {
      title: 'Assistant Store Manager',
      salary: 55000,
      minPerformance: 82,
      minYears: 2,
      description:
        'Manage department budgets, scheduling, and customer service standards.',
    },
    {
      title: 'Store General Manager',
      salary: 82000,
      minPerformance: 85,
      minYears: 2,
      requiredDegreeTitles: [
        'B.B.A. in Finance & Management',
        'Master of Business Administration (M.B.A.)',
      ],
      requiredDegreeLabel: 'B.B.A. in Finance or M.B.A.',
      description:
        'Direct total supercenter operations, annual P&L revenue, and staffing.',
    },
  ],
  ft_receptionist: [
    {
      title: 'Executive Office Coordinator',
      salary: 45000,
      minPerformance: 80,
      minYears: 1,
      description:
        'Manage VIP corporate visitor suites and coordinate executive travel.',
    },
    {
      title: 'Director of Corporate Operations',
      salary: 72000,
      minPerformance: 84,
      minYears: 2,
      description:
        'Oversee office facility logistics, vendor procurement, and administrative staff.',
    },
  ],

  // ==========================================================================
  // AVIATION & TRADES
  // ==========================================================================
  ft_delivery_courier: [
    {
      title: 'Dispatch & Fleet Logistics Lead',
      salary: 48000,
      minPerformance: 80,
      minYears: 1,
      description:
        'Optimize routing algorithms and coordinate metropolitan delivery vehicles.',
    },
    {
      title: 'Regional Logistics Hub Director',
      salary: 78000,
      minPerformance: 84,
      minYears: 2,
      description:
        'Direct regional sorting hubs, freight contracts, and delivery fleet operations.',
    },
  ],
  ft_airline_copilot: [
    {
      title: 'Senior Flight Captain',
      salary: 185000,
      minPerformance: 85,
      minYears: 3,
      minSmarts: 72,
      requiredDegreeTitles: ['Commercial Pilot License (CPL)'],
      requiredDegreeLabel: 'Commercial Pilot License (CPL)',
      description:
        'Command wide-body transatlantic passenger airliners with full flight authority.',
    },
  ],

  // ==========================================================================
  // FREELANCE
  // ==========================================================================
  fl_web_developer: [
    {
      title: 'Senior Technical Consultant',
      salary: 85000,
      minPerformance: 80,
      minYears: 1,
      description:
        'Command premium hourly retainers for bespoke enterprise software builds.',
    },
    {
      title: 'Principal Software Architect & Agency Owner',
      salary: 135000,
      minPerformance: 85,
      minYears: 2,
      minSmarts: 75,
      requiredDegreeTitles: [
        'B.S. in Computer Science',
        'Master of Science (M.S. / Ph.D.)',
      ],
      requiredDegreeLabel: 'B.S. in Computer Science or M.S.',
      description:
        'Direct your own boutique software engineering firm with high-profile corporate accounts.',
    },
  ],

  // ==========================================================================
  // TRADES, SERVICES & MEDIA
  // ==========================================================================
  ft_custodian: [
    {
      title: 'Lead Custodial Supervisor',
      salary: 44000,
      minPerformance: 75,
      minYears: 2,
      description:
        'Manage building sanitation crews, inspect safety protocols, and coordinate maintenance logistics.',
    },
    {
      title: 'Facilities Operations Director',
      salary: 68000,
      minPerformance: 80,
      minYears: 3,
      minSmarts: 55,
      description:
        'Oversee multi-site physical plant operations, capital budgets, and contractor contracts.',
    },
  ],
  ft_library_assistant: [
    {
      title: 'Senior Reference Librarian',
      salary: 52000,
      minPerformance: 75,
      minYears: 2,
      description:
        'Curate specialized research collections, host community literacy programs, and lead reference desks.',
    },
    {
      title: 'Head of Public Library Services',
      salary: 76000,
      minPerformance: 80,
      minYears: 3,
      requiredDegreeTitles: [
        'B.A. in Political Science',
        'B.A. in Journalism & Media',
        'B.S. in Computer Science',
      ],
      requiredDegreeLabel: 'B.A. or B.S. Degree',
      description:
        'Direct citywide municipal library systems, grant acquisitions, and digital archive initiatives.',
    },
  ],
  ft_electrician_apprentice: [
    {
      title: 'Journeyman Licensed Electrician',
      salary: 72000,
      minPerformance: 75,
      minYears: 2,
      description:
        'Install commercial high-voltage conduits, diagnose industrial switchgear, and certify building codes.',
    },
    {
      title: 'Master Electrical Contractor',
      salary: 105000,
      minPerformance: 80,
      minYears: 3,
      minSmarts: 62,
      description:
        'Run your own licensed electrical contracting outfit managing large-scale architectural infrastructure.',
    },
  ],
  ft_real_estate_agent: [
    {
      title: 'Senior Real Estate Broker',
      salary: 88000,
      minPerformance: 78,
      minYears: 2,
      description:
        'Close multi-million dollar luxury residential escrows and supervise junior real estate associates.',
    },
    {
      title: 'Managing Partner & Agency Owner',
      salary: 145000,
      minPerformance: 82,
      minYears: 3,
      requiredDegreeTitles: [
        'B.B.A. in Finance & Management',
        'Master of Business Administration (M.B.A.)',
      ],
      requiredDegreeLabel: 'B.B.A. or M.B.A.',
      description:
        'Own and direct a premier commercial and residential real estate brokerage with top regional market share.',
    },
  ],
  ft_staff_reporter: [
    {
      title: 'Senior Investigative Correspondent',
      salary: 78000,
      minPerformance: 78,
      minYears: 2,
      description:
        'Break front-page investigative exposés, interview government officials, and anchor investigative series.',
    },
    {
      title: 'Managing Editor & Bureau Chief',
      salary: 120000,
      minPerformance: 82,
      minYears: 3,
      requiredDegreeTitles: ['B.A. in Journalism & Media'],
      requiredDegreeLabel: 'B.A. in Journalism & Media',
      description:
        'Lead the entire editorial newsroom, set journalistic priorities, and direct Pulitzer-caliber coverage.',
    },
  ],
  ft_athletic_trainer: [
    {
      title: 'Head Strength & Conditioning Director',
      salary: 82000,
      minPerformance: 78,
      minYears: 2,
      description:
        'Design elite periodized training regimens and oversee sports science rehabilitation clinics.',
    },
    {
      title: 'Elite Sports Franchise General Manager',
      salary: 140000,
      minPerformance: 82,
      minYears: 3,
      requiredDegreeTitles: ['B.S. in Kinesiology & Sports'],
      requiredDegreeLabel: 'B.S. in Kinesiology & Sports',
      description:
        'Manage athletic performance operations and sports science departments for premier professional franchises.',
    },
  ],
  ft_stage_screen_actor: [
    {
      title: 'Lead Television & Feature Film Actor',
      salary: 110000,
      minPerformance: 80,
      minYears: 2,
      description:
        'Star as leading talent in major television drama series and theatrical feature releases.',
    },
    {
      title: 'A-List Hollywood Star & Executive Producer',
      salary: 280000,
      minPerformance: 85,
      minYears: 3,
      minLooks: 75,
      description:
        'Headlining box-office icon producing award-winning cinematic features with top international distributors.',
    },
  ],
  ft_dentist: [
    {
      title: 'Senior Cosmetic Dental Partner',
      salary: 195000,
      minPerformance: 80,
      minYears: 2,
      description:
        'Perform intricate prosthodontics, orthodontic smile design, and complex implant restorations.',
    },
    {
      title: 'Director of Oral Surgery & Clinic Owner',
      salary: 290000,
      minPerformance: 85,
      minYears: 3,
      requiredDegreeTitles: ['Doctor of Dental Surgery (D.D.S.)'],
      requiredDegreeLabel: 'Doctor of Dental Surgery (D.D.S.)',
      description:
        'Own and direct a premier maxillofacial and cosmetic dentistry surgical center.',
    },
  ],
  ft_veterinarian: [
    {
      title: 'Senior Clinical Veterinary Surgeon',
      salary: 140000,
      minPerformance: 80,
      minYears: 2,
      description:
        'Perform advanced veterinary orthopedic surgeries and oversee clinical diagnostics.',
    },
    {
      title: 'Chief of Veterinary Medicine & Hospital Director',
      salary: 210000,
      minPerformance: 85,
      minYears: 3,
      requiredDegreeTitles: ['Doctor of Veterinary Medicine (D.V.M.)'],
      requiredDegreeLabel: 'Doctor of Veterinary Medicine (D.V.M.)',
      description:
        'Direct a 24-hour emergency animal hospital and lead regional zoological wildlife medicine.',
    },
  ],
  ft_management_consultant: [
    {
      title: 'Engagement Director & Strategy Principal',
      salary: 185000,
      minPerformance: 82,
      minYears: 2,
      description:
        'Lead multi-million-dollar corporate turnaround teams and advise Fortune 500 c-suite executives.',
    },
    {
      title: 'Senior Equity Partner & Global Practice Leader',
      salary: 295000,
      minPerformance: 85,
      minYears: 3,
      requiredDegreeTitles: ['Master of Business Administration (M.B.A.)'],
      requiredDegreeLabel: 'Master of Business Administration (M.B.A.)',
      description:
        'Direct global practice groups and command top-tier strategic management consulting accounts.',
    },
  ],
  ft_research_scientist: [
    {
      title: 'Director of Advanced Scientific Research',
      salary: 170000,
      minPerformance: 82,
      minYears: 2,
      description:
        'Manage national scientific grant programs, published peer-reviewed journals, and patent discoveries.',
    },
    {
      title: 'Chief Scientific Officer (CSO)',
      salary: 250000,
      minPerformance: 85,
      minYears: 3,
      requiredDegreeTitles: ['Master of Science (M.S. / Ph.D.)'],
      requiredDegreeLabel: 'Master of Science (M.S. / Ph.D.)',
      description:
        'Direct enterprise scientific innovation and spearhead pioneering national research breakthroughs.',
    },
  ],
  ft_art_director: [
    {
      title: 'Chief Creative Officer (CCO)',
      salary: 180000,
      minPerformance: 82,
      minYears: 2,
      description:
        'Set artistic visions for global luxury brands, international cinema, and multi-platform media.',
    },
    {
      title: 'Studio Production Executive & Producer',
      salary: 275000,
      minPerformance: 85,
      minYears: 3,
      requiredDegreeTitles: ['Master of Fine Arts (M.F.A.)'],
      requiredDegreeLabel: 'Master of Fine Arts (M.F.A.)',
      description:
        'Greenlight cinematic productions, oversee entertainment studios, and direct major franchise properties.',
    },
  ],
  fl_rideshare_driver: [
    {
      title: 'Premier Black Car Chauffeur',
      salary: 48000,
      minPerformance: 75,
      minYears: 2,
      description:
        'Provide VIP executive transport, luxury airport service, and maintain five-star ratings.',
    },
    {
      title: 'Luxury Fleet & Executive Transport Owner',
      salary: 78000,
      minPerformance: 80,
      minYears: 3,
      description:
        'Own and operate a private fleet of executive sedans servicing corporate accounts.',
    },
  ],
  fl_event_photographer: [
    {
      title: 'Commercial Studio & Fashion Photographer',
      salary: 68000,
      minPerformance: 78,
      minYears: 2,
      description:
        'Shoot high-fashion magazine editorials, luxury brand campaigns, and celebrity red carpets.',
    },
    {
      title: 'Celebrity Photojournalist & Gallery Owner',
      salary: 120000,
      minPerformance: 82,
      minYears: 3,
      requiredDegreeTitles: ['B.F.A. in Visual & Digital Arts'],
      requiredDegreeLabel: 'B.F.A. in Visual & Digital Arts',
      description:
        'Curate international gallery exhibitions and command top-dollar art representation worldwide.',
    },
  ],
  fl_private_tutor: [
    {
      title: 'Master Academic Specialist',
      salary: 65000,
      minPerformance: 78,
      minYears: 2,
      description:
        'Coach students for top-percentile college entrance exams and Ivy League admissions.',
    },
    {
      title: 'Elite Prep Academy Founder & Director',
      salary: 115000,
      minPerformance: 82,
      minYears: 3,
      requiredDegreeTitles: [
        'B.S. in Computer Science',
        'B.S. in Biology (Pre-Med)',
        'B.A. in Political Science',
        'Master of Science (M.S. / Ph.D.)',
      ],
      requiredDegreeLabel: 'University Degree',
      description:
        'Found and direct a premier private test-prep and academic acceleration academy.',
    },
  ],
};

/**
 * Returns the promotion tiers available for a job, generating a standard
 * senior fallback progression if no custom ladder is configured.
 */
export function getPromotionLadderForJob(
  jobId: string,
  baseSalary: number,
  baseTitle: string
): PromotionTier[] {
  const custom = PROMOTION_LADDERS[jobId];
  if (custom && custom.length > 0) return custom;

  // Fallback 2-tier promotion ladder
  return [
    {
      title: `Senior ${baseTitle}`,
      salary: Math.round((baseSalary * 1.25) / 1000) * 1000,
      minPerformance: 80,
      minYears: 2,
      description: `Take on advanced leadership responsibilities and guide team members as a Senior ${baseTitle}.`,
    },
    {
      title: `Lead Director of ${baseTitle}`,
      salary: Math.round((baseSalary * 1.55) / 1000) * 1000,
      minPerformance: 85,
      minYears: 2,
      description: `Direct departmental strategy and represent executive leadership in your field.`,
    },
  ];
}

