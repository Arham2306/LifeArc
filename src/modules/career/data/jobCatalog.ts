import type { CareerField, EmploymentType, JobTemplate } from '../types';
import { pickRandom } from '../../../utils/random';

export const EMPLOYMENT_TYPE_META: Record<
  EmploymentType,
  { label: string; badgeVariant: 'sky' | 'amber' | 'purple'; ageLabel: string }
> = {
  full_time: {
    label: 'Full-Time',
    badgeVariant: 'sky',
    ageLabel: 'Age 18+',
  },
  part_time: {
    label: 'Part-Time Gig',
    badgeVariant: 'amber',
    ageLabel: 'Age 16+',
  },
  freelance: {
    label: 'Freelance',
    badgeVariant: 'purple',
    ageLabel: 'Age 18+',
  },
};

export const CAREER_FIELD_LABELS: Record<CareerField, string> = {
  technology: 'Technology & Engineering',
  medicine_healthcare: 'Medicine & Healthcare',
  business_finance: 'Business & Finance',
  law_government: 'Law & Public Policy',
  arts_media: 'Arts, Design & Media',
  trades_services: 'Trades & Operations',
  hospitality_retail: 'Hospitality & Retail',
  aviation_transport: 'Aviation & Transport',
  education_science: 'Education & Research',
};

export const JOB_CATALOG: JobTemplate[] = [
  // ==========================================================================
  // 1. PART-TIME SMALL GIGS (UNLOCK AT AGE 16+ • NO DEGREE REQUIRED)
  // ==========================================================================
  {
    id: 'pt_grocery_bagger',
    title: 'Grocery Bagger & Cashier',
    field: 'hospitality_retail',
    type: 'part_time',
    credentialTier: 'open_entry',
    icon: '🛒',
    companyNameTemplates: ['{city} Fresh Mart', 'SuperValue Grocers', 'Cornerstone Market'],
    baseSalary: 14500,
    hourlyRateLabel: '$14/hr • 20 hrs/wk',
    minAge: 16,
    requiredDegreeTitles: [],
    description:
      'Scan barcodes, pack paper and reusable grocery bags with care, and wrangle runaway shopping carts in the parking lot.',
    interviewQuestion: {
      interviewerRole: 'Store Shift Manager',
      question:
        'A customer insists on putting a 20-pound watermelon in the same bag as a loaf of soft bread. What do you do?',
      options: [
        {
          label: 'Politely suggest a separate bag so their fresh bread stays fluffy and uncrushed.',
          isPass: true,
          feedback: 'The Shift Manager smiled: "Smart thinking and polite customer service! You start Saturday."',
        },
        {
          label: 'Double-bag the watermelon on the bottom and cradle the bread gently on top.',
          isPass: true,
          feedback: 'The Shift Manager nodded: "Practical bagging instincts! Welcome to the team."',
        },
        {
          label: 'Slam the watermelon directly on top of the bread to assert dominance.',
          isPass: false,
          feedback: 'The Shift Manager stared in horror: "We run a grocery store, not a demolition derby. Next applicant!"',
        },
      ],
    },
  },
  {
    id: 'pt_fast_food_crew',
    title: 'Fast Food Burger Crew',
    field: 'hospitality_retail',
    type: 'part_time',
    credentialTier: 'open_entry',
    icon: '🍔',
    companyNameTemplates: ['Burger Barn', 'Crispy Crown Chicken', '{city} Shake Shack'],
    baseSalary: 13800,
    hourlyRateLabel: '$13.50/hr • 20 hrs/wk',
    minAge: 16,
    requiredDegreeTitles: [],
    description:
      'Flip sizzling patties, work the drive-thru headset during the after-school rush, and salt baskets of golden fries.',
    interviewQuestion: {
      interviewerRole: 'Kitchen Supervisor',
      question:
        'The drive-thru line is wrapped around the building and the fry timer is beeping nonstop. How do you handle the rush?',
      options: [
        {
          label: 'Stay calm, pull the fries right on time, and communicate clearly with the grill line.',
          isPass: true,
          feedback: 'The Supervisor grinned: "Cool under pressure! Grab a visor and an apron."',
        },
        {
          label: 'Focus on accuracy one order at a time so we do not have to remake mistakes.',
          isPass: true,
          feedback: 'The Supervisor gave a thumbs-up: "Speed comes from accuracy. You are hired!"',
        },
        {
          label: 'Turn off the drive-thru speaker and pretend the restaurant is haunted.',
          isPass: false,
          feedback: 'The Supervisor sighed: "Creative, but terrible for burger sales. Application rejected."',
        },
      ],
    },
  },
  {
    id: 'pt_dog_walker',
    title: 'Neighborhood Dog Walker',
    field: 'trades_services',
    type: 'part_time',
    credentialTier: 'open_entry',
    icon: '🐕',
    companyNameTemplates: ['Happy Paws {city}', 'Wagging Tails Walkers', 'Bark & Stroll Co.'],
    baseSalary: 16000,
    hourlyRateLabel: '$16/hr • 20 hrs/wk',
    minAge: 16,
    requiredDegreeTitles: [],
    description:
      'Take energetic golden retrievers, pugs, and terriers on afternoon park walks while keeping leashes tangle-free.',
    interviewQuestion: {
      interviewerRole: 'Pet Care Coordinator',
      question:
        'You are walking three excited dogs when a squirrel dashes right across the sidewalk. What is your move?',
      options: [
        {
          label: 'Plant my feet firmly, shorten the leashes, and redirect their attention with treats.',
          isPass: true,
          feedback: 'The Coordinator clapped: "Spoken like a natural pack leader! Welcome aboard."',
        },
        {
          label: 'Use a calm command and steer the group toward the opposite side of the park.',
          isPass: true,
          feedback: 'The Coordinator nodded warmly: "Safety and calm control—the dogs will love you!"',
        },
        {
          label: 'Drop the leashes and chase the squirrel myself to see who is faster.',
          isPass: false,
          feedback: 'The Coordinator blinked twice: "I think our dogs are more mature than you. Pass!"',
        },
      ],
    },
  },
  {
    id: 'pt_movie_usher',
    title: 'Movie Theater Usher',
    field: 'arts_media',
    type: 'part_time',
    credentialTier: 'open_entry',
    icon: '🍿',
    companyNameTemplates: ['{city} Grand Cinema 14', 'Starlight Multiplex', 'SilverScreen Theaters'],
    baseSalary: 13200,
    hourlyRateLabel: '$13/hr • 20 hrs/wk',
    minAge: 16,
    requiredDegreeTitles: [],
    description:
      'Scan movie tickets, scoop buttery popcorn, and sweep up spilled candy between blockbuster screenings.',
    interviewQuestion: {
      interviewerRole: 'Cinema Manager',
      question:
        'Someone in Row G is loudly texting with their phone brightness at 100% during the climax of the movie. What do you do?',
      options: [
        {
          label: 'Walk down the aisle quietly and whisper a polite reminder to silence and dim their screen.',
          isPass: true,
          feedback: 'The Manager beamed: "Polite, discreet, and keeps the movie magic alive! You are hired."',
        },
        {
          label: 'Give a gentle wave from the side aisle to catch their eye without disrupting other guests.',
          isPass: true,
          feedback: 'The Manager nodded: "Great theater etiquette. Here is your usher vest!"',
        },
        {
          label: 'Shine my flashlight in their face and spoil the ending of the movie out loud.',
          isPass: false,
          feedback: 'The Manager groaned: "We would have to refund the whole auditorium! No thanks."',
        },
      ],
    },
  },
  {
    id: 'pt_cafe_barista',
    title: 'Part-Time Cafe Barista',
    field: 'hospitality_retail',
    type: 'part_time',
    credentialTier: 'open_entry',
    icon: '☕',
    companyNameTemplates: ['Bean & Leaf {city}', 'Morning Roast Roastery', 'Velvet Espresso Bar'],
    baseSalary: 15600,
    hourlyRateLabel: '$15/hr • 20 hrs/wk',
    minAge: 16,
    requiredDegreeTitles: [],
    description:
      'Steam velvety oat milk, pull rich espresso shots, and memorize hyper-specific iced caramel latte orders.',
    interviewQuestion: {
      interviewerRole: 'Head Barista',
      question:
        'A sleepy commuter orders a "half-caff iced oat milk vanilla latte with extra foam—actually make it hot." How do you respond?',
      options: [
        {
          label: 'Smile, repeat the final hot order back clearly to confirm, and ring it right up.',
          isPass: true,
          feedback: 'The Head Barista cheered: "Clear communication saves wasted espresso! You got the gig."',
        },
        {
          label: 'Stay friendly and patient—people before their morning coffee need a little grace!',
          isPass: true,
          feedback: 'The Head Barista laughed: "You understand the morning rush already. Welcome!"',
        },
        {
          label: 'Hand them a cup of tap water and tell them to figure out their life first.',
          isPass: false,
          feedback: 'The Head Barista winced: "Funny, but our Yelp rating would tank. Sorry!"',
        },
      ],
    },
  },
  {
    id: 'pt_lawn_mower',
    title: 'Lawn Care & Yard Crew',
    field: 'trades_services',
    type: 'part_time',
    credentialTier: 'open_entry',
    icon: '🌿',
    companyNameTemplates: ['GreenBlade {city}', 'Suburban Turf Pros', 'Emerald Yard Care'],
    baseSalary: 17500,
    hourlyRateLabel: '$17/hr • 20 hrs/wk',
    minAge: 16,
    requiredDegreeTitles: [],
    minHealth: 45,
    description:
      'Mow neighborhood lawns in crisp diagonal stripes, trim hedges, and blow grass clippings off front walkways.',
    interviewQuestion: {
      interviewerRole: 'Crew Foreman',
      question:
        'Before starting the riding mower on a client’s front lawn, what is the first thing you check?',
      options: [
        {
          label: 'Walk the yard first to clear rocks, toys, or branches that could hit the blades.',
          isPass: true,
          feedback: 'The Foreman nodded approvingly: "Safety first! That saves equipment and windows. Hired!"',
        },
        {
          label: 'Check the fuel, oil level, and blade guard before firing up the engine.',
          isPass: true,
          feedback: 'The Foreman smiled: "You know how to respect the tools. Welcome to the crew!"',
        },
        {
          label: 'See if the mower can pop a wheelie over the homeowner’s rose bushes.',
          isPass: false,
          feedback: 'The Foreman shook his head: "Stay twenty feet away from my mowers, kid."',
        },
      ],
    },
  },
  {
    id: 'pt_peer_tutor',
    title: 'After-School Peer Tutor',
    field: 'education_science',
    type: 'part_time',
    credentialTier: 'open_entry',
    icon: '✏️',
    companyNameTemplates: ['{city} Study Hub', 'BrightMinds Tutoring', 'Ace Prep Center'],
    baseSalary: 19200,
    hourlyRateLabel: '$19/hr • 20 hrs/wk',
    minAge: 16,
    requiredDegreeTitles: [],
    minSmarts: 60,
    description:
      'Help younger students master algebra fractions, grammar rules, and science fair projects after school.',
    interviewQuestion: {
      interviewerRole: 'Learning Center Director',
      question:
        'A student is frustrated because they keep getting the same geometry problem wrong. How do you help them?',
      options: [
        {
          label: 'Break the problem into smaller visual steps and praise their progress on each part.',
          isPass: true,
          feedback: 'The Director smiled warmly: "Patience and scaffolding—that is what great tutoring is all about!"',
        },
        {
          label: 'Try explaining the concept with a real-world example instead of repeating the textbook.',
          isPass: true,
          feedback: 'The Director nodded: "Adaptable teaching! Our students will thrive with you."',
        },
        {
          label: 'Write down all the answers for them so we can both play video games.',
          isPass: false,
          feedback: 'The Director frowned: "We are a tutoring center, not a homework-cheating service!"',
        },
      ],
    },
  },

  // ==========================================================================
  // 2. FULL-TIME ENTRY-LEVEL JOBS (AGE 18+ • OPEN TO EVERYONE / NO DEGREE)
  // ==========================================================================
  {
    id: 'ft_dishwasher',
    title: 'Restaurant Dishwasher',
    field: 'hospitality_retail',
    type: 'full_time',
    credentialTier: 'open_entry',
    icon: '🍽️',
    companyNameTemplates: ['Bistro {city}', 'The Golden Skillet', 'Harborview Grill'],
    baseSalary: 24000,
    minAge: 18,
    requiredDegreeTitles: [],
    description:
      'Keep the kitchen dish pit running at full steam, sanitize plates and silverware, and back up the prep cooks.',
    interviewQuestion: {
      interviewerRole: 'Executive Chef',
      question:
        'It is Friday night dinner service and a stack of 80 sauté pans just landed in the dish pit. What do you do?',
      options: [
        {
          label: 'Prioritize the pans and plates the line cooks need first and keep the sanitizer rack moving.',
          isPass: true,
          feedback: 'The Chef clapped you on the shoulder: "You understand kitchen flow! Grab an apron."',
        },
        {
          label: 'Pre-soak the toughest pans while running continuous racks of plates so service never stalls.',
          isPass: true,
          feedback: 'The Chef grinned: "Smart system! The kitchen cannot run without a sharp dishwasher."',
        },
        {
          label: 'Throw the dirty pans in the dumpster and tell the chef we are a finger-food restaurant now.',
          isPass: false,
          feedback: 'The Chef pointed to the exit: "Get out of my kitchen before I lose my temper!"',
        },
      ],
    },
  },
  {
    id: 'ft_shelf_stocker',
    title: 'Supermarket Shelf Stocker',
    field: 'hospitality_retail',
    type: 'full_time',
    credentialTier: 'open_entry',
    icon: '📦',
    companyNameTemplates: ['MegaMart {city}', 'OmniGrocer Supercenter', 'ValueMart Wholesale'],
    baseSalary: 26500,
    minAge: 18,
    requiredDegreeTitles: [],
    description:
      'Unload pallet jacks from delivery trucks, rotate fresh inventory using FIFO, and keep store aisles neatly faced.',
    interviewQuestion: {
      interviewerRole: 'Inventory Manager',
      question:
        'When restocking dairy or canned goods on the shelves, how do you arrange the new shipment?',
      options: [
        {
          label: 'Place newer dates in the back and bring older dates forward so nothing expires on the shelf.',
          isPass: true,
          feedback: 'The Manager nodded: "First-In, First-Out! You know retail fundamentals. You are hired!"',
        },
        {
          label: 'Keep heavy items stable on lower shelves and align labels neatly facing forward.',
          isPass: true,
          feedback: 'The Manager smiled: "Safe and presentation-ready. Welcome to the crew!"',
        },
        {
          label: 'Build a giant fortress out of toilet paper packs in Aisle 4 and nap inside it.',
          isPass: false,
          feedback: 'The Manager sighed: "Our last guy tried that. Security found him in twenty minutes. No!"',
        },
      ],
    },
  },
  {
    id: 'ft_custodian',
    title: 'Building Custodian & Janitor',
    field: 'trades_services',
    type: 'full_time',
    credentialTier: 'open_entry',
    icon: '🧹',
    companyNameTemplates: ['{city} Civic Towers', 'Metro Facility Services', 'SparkleClean Corp'],
    baseSalary: 27500,
    minAge: 18,
    requiredDegreeTitles: [],
    description:
      'Maintain spotless floors, handle minor building repairs, and keep commercial offices gleaming and safe.',
    interviewQuestion: {
      interviewerRole: 'Facilities Director',
      question:
        'You just mopped the main lobby tile floor during business hours. What is the most important step before walking away?',
      options: [
        {
          label: 'Place bright yellow Wet Floor caution signs around the perimeter so nobody slips.',
          isPass: true,
          feedback: 'The Director nodded: "Liability and safety awareness—spot on! Here are your master keys."',
        },
        {
          label: 'Leave a dry walking path on one side and post clear warning cones.',
          isPass: true,
          feedback: 'The Director smiled: "Thoughtful and professional. Welcome to the facilities team!"',
        },
        {
          label: 'Add extra dish soap so executives can slide across the lobby like penguins.',
          isPass: false,
          feedback: 'The Director rubbed their temples: "Our insurance company would faint. Pass!"',
        },
      ],
    },
  },
  {
    id: 'ft_receptionist',
    title: 'Front Desk Receptionist',
    field: 'business_finance',
    type: 'full_time',
    credentialTier: 'open_entry',
    icon: '🛎️',
    companyNameTemplates: ['{city} Executive Plaza', 'Pinnacle Office Suites', 'Horizon Partners'],
    baseSalary: 31000,
    minAge: 18,
    requiredDegreeTitles: [],
    description:
      'Greet visiting clients at the front desk, route multi-line phone calls, sign for courier packages, and manage meeting room calendars.',
    interviewQuestion: {
      interviewerRole: 'Office Manager',
      question:
        'A VIP client arrives ten minutes early while the phone is ringing and a courier needs a signature. How do you juggle all three?',
      options: [
        {
          label: 'Give the VIP a warm smile and nod, ask the caller to hold briefly, sign the package, then check the VIP in.',
          isPass: true,
          feedback: 'The Office Manager beamed: "Poised, organized, and welcoming! The front desk is yours."',
        },
        {
          label: 'Greet the guest immediately, offer them coffee while signing for the courier, and answer the phone smoothly.',
          isPass: true,
          feedback: 'The Office Manager clapped: "First-class hospitality! You start Monday morning."',
        },
        {
          label: 'Unplug the phone, hide under the desk, and wait for everyone to leave.',
          isPass: false,
          feedback: 'The Office Manager shook their head: "We need a receptionist, not a groundhog. Next!"',
        },
      ],
    },
  },
  {
    id: 'ft_library_assistant',
    title: 'Public Library Assistant',
    field: 'education_science',
    type: 'full_time',
    credentialTier: 'open_entry',
    icon: '📚',
    companyNameTemplates: ['{city} Central Library', 'Heritage Public Library', 'Oakwood Branch Library'],
    baseSalary: 30500,
    minAge: 18,
    requiredDegreeTitles: [],
    description:
      'Organize returned books using the catalog system, issue library cards, and help patrons locate rare reference books.',
    interviewQuestion: {
      interviewerRole: 'Head Librarian',
      question:
        'A patron asks for a book when they only remember that "the cover was blue and had a boat on it." How do you help?',
      options: [
        {
          label: 'Ask gentle questions about the plot, genre, or year they read it and search our catalog keywords.',
          isPass: true,
          feedback: 'The Head Librarian smiled: "A true reference detective! Welcome to the library staff."',
        },
        {
          label: 'Check our recent display lists and staff reading logs to narrow down matching titles.',
          isPass: true,
          feedback: 'The Head Librarian nodded: "Resourceful and patient! Patrons will appreciate your help."',
        },
        {
          label: 'Hand them a blue crayon and tell them to draw their own boat book.',
          isPass: false,
          feedback: 'The Head Librarian adjusted their glasses: "Shh! Please exit the building quietly."',
        },
      ],
    },
  },
  {
    id: 'ft_delivery_courier',
    title: 'City Delivery Courier',
    field: 'aviation_transport',
    type: 'full_time',
    credentialTier: 'open_entry',
    icon: '🚚',
    companyNameTemplates: ['SwiftDrop {city}', 'MetroExpress Logistics', 'PrimeParcel Van Co.'],
    baseSalary: 33500,
    minAge: 18,
    requiredDegreeTitles: [],
    description:
      'Navigate city traffic in a delivery van, scan express packages at doorsteps, and keep daily route schedules on time.',
    interviewQuestion: {
      interviewerRole: 'Fleet Dispatcher',
      question:
        'A sudden rainstorm hits and a fragile package is marked "Leave on Porch." The porch has no roof. What do you do?',
      options: [
        {
          label: 'Seal the box in a weatherproof plastic bag, tuck it by the doorframe, and ring the bell.',
          isPass: true,
          feedback: 'The Dispatcher grinned: "Going the extra mile protects our five-star rating. Hired!"',
        },
        {
          label: 'Knock to hand it directly to the resident or place it in their covered parcel box.',
          isPass: true,
          feedback: 'The Dispatcher nodded: "Smart judgement on the route! Here are the van keys."',
        },
        {
          label: 'Hurl it from the van window like a newspaper and floor the gas pedal.',
          isPass: false,
          feedback: 'The Dispatcher winced: "That is how viral complaint videos happen. Rejected!"',
        },
      ],
    },
  },

  // ==========================================================================
  // 3. MID-LEVEL FULL-TIME JOBS (AGE 18+ • HIGH SCHOOL DIPLOMA REQUIRED)
  // ==========================================================================
  {
    id: 'ft_bank_teller',
    title: 'Retail Bank Teller',
    field: 'business_finance',
    type: 'full_time',
    credentialTier: 'high_school',
    icon: '🏦',
    companyNameTemplates: ['First National Bank of {city}', 'Citizens Trust Bank', 'Union Savings & Loan'],
    baseSalary: 37500,
    minAge: 18,
    requiredDegreeTitles: [],
    requiresHighSchoolDiploma: true,
    minSmarts: 45,
    description:
      'Process customer deposits, verify cashier’s checks, balance your cash drawer to the exact penny, and spot counterfeit bills.',
    interviewQuestion: {
      interviewerRole: 'Branch Manager',
      question:
        'At the end of your shift, your cash drawer is off by $20. What is the proper procedure?',
      options: [
        {
          label: 'Recount every strap and receipt carefully and report the discrepancy to my supervisor immediately.',
          isPass: true,
          feedback: 'The Branch Manager nodded: "Honesty and strict audit protocol—essential in banking. Hired!"',
        },
        {
          label: 'Review the transaction log step-by-step with the lead teller to trace the error transparently.',
          isPass: true,
          feedback: 'The Branch Manager smiled: "Accuracy and integrity come first here. Welcome to the branch!"',
        },
        {
          label: 'Slip a Monopoly $20 bill into the drawer and hope nobody notices.',
          isPass: false,
          feedback: 'The Branch Manager stared coldly: "Security will escort you to the sidewalk."',
        },
      ],
    },
  },
  {
    id: 'ft_electrician_apprentice',
    title: 'Apprentice Electrician',
    field: 'trades_services',
    type: 'full_time',
    credentialTier: 'high_school',
    icon: '⚡',
    companyNameTemplates: ['{city} Spark & Wire', 'VoltMaster Electrical', 'Apex Trade Contractors'],
    baseSalary: 42000,
    minAge: 18,
    requiredDegreeTitles: [],
    requiresHighSchoolDiploma: true,
    minSmarts: 50,
    description:
      'Assist master electricians with wiring residential breaker panels, pulling conduit, and testing circuit voltage safely.',
    interviewQuestion: {
      interviewerRole: 'Master Electrician',
      question:
        'Before touching any exposed wiring inside a residential junction box, what must you always do?',
      options: [
        {
          label: 'Shut off the breaker, lock/tag the panel, and verify zero voltage with a multimeter.',
          isPass: true,
          feedback: 'The Master Electrician nodded: "Never trust a switch without testing voltage! You are hired."',
        },
        {
          label: 'Test the circuit with a non-contact voltage tester after flipping the main breaker off.',
          isPass: true,
          feedback: 'The Master Electrician smiled: "Good safety instincts. Grab your tool belt!"',
        },
        {
          label: 'Lick my fingers and tap the wire to see if it tingles.',
          isPass: false,
          feedback: 'The Master Electrician gasped: "Are you trying to turn into a toaster?! Out!"',
        },
      ],
    },
  },
  {
    id: 'ft_real_estate_agent',
    title: 'Real Estate Sales Agent',
    field: 'business_finance',
    type: 'full_time',
    credentialTier: 'high_school',
    icon: '🏡',
    companyNameTemplates: ['{city} Premier Realty', 'Skyline Homes Group', 'Golden Key Properties'],
    baseSalary: 44000,
    minAge: 18,
    requiredDegreeTitles: [],
    requiresHighSchoolDiploma: true,
    minLooks: 45,
    description:
      'Host weekend open houses, stage luxury apartments, and negotiate property offers for homebuyers across town.',
    interviewQuestion: {
      interviewerRole: 'Managing Broker',
      question:
        'You are showing a cozy starter home when the buyer points out that the kitchen is tiny. How do you frame it?',
      options: [
        {
          label: 'Highlight the efficient chef-triangle layout and point out the spacious dining room right next to it.',
          isPass: true,
          feedback: 'The Broker grinned: "Turn every objection into an opportunity! Welcome to the agency."',
        },
        {
          label: 'Acknowledge it honestly and show how removing a non-structural pantry wall could open the space.',
          isPass: true,
          feedback: 'The Broker nodded: "Vision and honesty build long-term client trust. You are hired!"',
        },
        {
          label: 'Tell them they look like they only eat microwave ramen anyway.',
          isPass: false,
          feedback: 'The Broker winced: "Insulting buyers is a bold strategy—for unemployment. Goodbye!"',
        },
      ],
    },
  },

  // ==========================================================================
  // 4. BACHELOR'S DEGREE PROFESSIONAL CAREERS (AGE 18+ • DEGREE MATCHED)
  // ==========================================================================
  {
    id: 'ft_software_engineer',
    title: 'Junior Software Engineer',
    field: 'technology',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '💻',
    companyNameTemplates: ['Apex Cybernetics {city}', 'CloudScale Systems', 'NovaTech Labs'],
    baseSalary: 86000,
    minAge: 18,
    requiredDegreeTitles: ['B.S. in Computer Science', 'Master of Science (M.S. / Ph.D.)'],
    requiredDegreeShortLabel: 'B.S. in Computer Science',
    minSmarts: 65,
    description:
      'Build scalable full-stack web applications, optimize distributed cloud databases, and ship clean production code.',
    interviewQuestion: {
      interviewerRole: 'VP of Engineering',
      question:
        'A critical production server crashes at 4:45 PM on a Friday after a deployment. What is your immediate response?',
      options: [
        {
          label: 'Roll back to the last stable release immediately, then inspect error logs in staging.',
          isPass: true,
          feedback: 'The VP of Engineering smiled: "Restore service first, debug second! Welcome to the engineering team."',
        },
        {
          label: 'Alert the on-call channel, isolate the failing microservice, and deploy a hotfix with unit tests.',
          isPass: true,
          feedback: 'The VP nodded: "Structured incident response! Here is your company laptop."',
        },
        {
          label: 'Delete the production database so there are no logs left to blame me.',
          isPass: false,
          feedback: 'The VP of Engineering went pale: "Please never touch a keyboard in this building again."',
        },
      ],
    },
  },
  {
    id: 'ft_cybersecurity_analyst',
    title: 'Cybersecurity Analyst',
    field: 'technology',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '🛡️',
    companyNameTemplates: ['Sentinel CyberDefense', '{city} InfoSec Group', 'IronWall Networks'],
    baseSalary: 82000,
    minAge: 18,
    requiredDegreeTitles: ['B.S. in Computer Science', 'Master of Science (M.S. / Ph.D.)'],
    requiredDegreeShortLabel: 'B.S. in Computer Science',
    minSmarts: 65,
    description:
      'Monitor enterprise network traffic for zero-day intrusions, run penetration tests, and harden cloud firewalls.',
    interviewQuestion: {
      interviewerRole: 'Chief Information Security Officer',
      question:
        'An employee reports clicking a suspicious link in an email claiming they won a free cruise. What do you do first?',
      options: [
        {
          label: 'Isolate their workstation from the network, revoke active session tokens, and scan for malware.',
          isPass: true,
          feedback: 'The CISO nodded: "Containment and credential rotation—textbook incident response! Hired."',
        },
        {
          label: 'Reset their credentials immediately and check firewall logs for any outbound data exfiltration.',
          isPass: true,
          feedback: 'The CISO smiled: "Sharp instincts. Welcome to the Security Operations Center!"',
        },
        {
          label: 'Click the link on my own computer to see if I can win a cruise too.',
          isPass: false,
          feedback: 'The CISO sighed: "You just failed the interview and the phishing test at the same time."',
        },
      ],
    },
  },
  {
    id: 'ft_financial_analyst',
    title: 'Corporate Financial Analyst',
    field: 'business_finance',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '📈',
    companyNameTemplates: ['{city} Capital Partners', 'Sterling Asset Management', 'Vanguard Horizon Corp'],
    baseSalary: 78000,
    minAge: 18,
    requiredDegreeTitles: [
      'B.B.A. in Finance & Management',
      'Master of Business Administration (M.B.A.)',
    ],
    requiredDegreeShortLabel: 'B.B.A. in Finance & Management',
    minSmarts: 62,
    description:
      'Build discounted cash-flow models, analyze quarterly earnings reports, and forecast market trends for institutional portfolios.',
    interviewQuestion: {
      interviewerRole: 'Managing Director',
      question:
        'When evaluating whether a company is a strong long-term investment, what metrics do you look at first?',
      options: [
        {
          label: 'Free cash flow growth, debt-to-equity ratio, and sustainable competitive moat.',
          isPass: true,
          feedback: 'The Managing Director nodded: "Fundamentals over hype! You have a bright future on our desk."',
        },
        {
          label: 'Operating margins, return on invested capital (ROIC), and leadership track record.',
          isPass: true,
          feedback: 'The Managing Director smiled: "Sharp analytical framework. Welcome to the firm!"',
        },
        {
          label: 'Flip a shiny quarter—heads we buy everything, tails we panic sell.',
          isPass: false,
          feedback: 'The Managing Director frowned: "We manage pension funds, not a casino table. Rejected!"',
        },
      ],
    },
  },
  {
    id: 'ft_biotech_researcher',
    title: 'Biotech Lab Associate',
    field: 'education_science',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '🧬',
    companyNameTemplates: ['Genomix {city} Labs', 'BioHorizon Therapeutics', 'Helix Life Sciences'],
    baseSalary: 68000,
    minAge: 18,
    requiredDegreeTitles: [
      'B.S. in Biology (Pre-Med)',
      'Master of Science (M.S. / Ph.D.)',
      'Doctor of Medicine (M.D.)',
    ],
    requiredDegreeShortLabel: 'B.S. in Biology (Pre-Med)',
    minSmarts: 65,
    description:
      'Culture cell lines, run PCR assays, and analyze protein samples in a state-of-the-art molecular biology laboratory.',
    interviewQuestion: {
      interviewerRole: 'Principal Investigator',
      question:
        'Your experimental assay produces a surprising result that contradicts your team’s hypothesis. What do you do?',
      options: [
        {
          label: 'Verify the controls, repeat the assay to confirm reproducibility, and document everything accurately.',
          isPass: true,
          feedback: 'The Principal Investigator beamed: "Scientific rigor at its finest! Grab a lab coat."',
        },
        {
          label: 'Log the raw data transparently and check for reagent contamination before drawing conclusions.',
          isPass: true,
          feedback: 'The Principal Investigator nodded: "Honest data is how breakthroughs happen. Welcome to the lab!"',
        },
        {
          label: 'Erase the numbers in Sharpie and write down whatever makes the graph look pretty.',
          isPass: false,
          feedback: 'The Principal Investigator gasped: "Data fabrication is a cardinal sin in science! Out!"',
        },
      ],
    },
  },
  {
    id: 'ft_corporate_paralegal',
    title: 'Legal & Policy Specialist',
    field: 'law_government',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '🏛️',
    companyNameTemplates: ['{city} Chambers & Associates', 'Civic Policy Institute', 'Lexington Legal Group'],
    baseSalary: 60000,
    minAge: 18,
    requiredDegreeTitles: ['B.A. in Political Science', 'Juris Doctor (J.D.)'],
    requiredDegreeShortLabel: 'B.A. in Political Science',
    minSmarts: 60,
    description:
      'Draft regulatory briefs, research constitutional case precedent, and prepare trial exhibits for senior litigation partners.',
    interviewQuestion: {
      interviewerRole: 'Senior Partner',
      question:
        'While preparing a legal brief due tomorrow morning, you discover a recent court ruling that weakens one of our minor arguments. What do you do?',
      options: [
        {
          label: 'Flag the ruling for the partner immediately and draft a way to distinguish our case from it.',
          isPass: true,
          feedback: 'The Senior Partner nodded: "Never get blindsided in court! Excellent legal instincts."',
        },
        {
          label: 'Disclose the precedent as required by ethics rules and pivot our brief to our strongest arguments.',
          isPass: true,
          feedback: 'The Senior Partner smiled: "Thorough and ethical. You are hired!"',
        },
        {
          label: 'Rip that page out of the law library book so the judge can never read it.',
          isPass: false,
          feedback: 'The Senior Partner stared: "Judges have computers now, and that is vandalism! Goodbye."',
        },
      ],
    },
  },
  {
    id: 'ft_staff_reporter',
    title: 'Investigative Staff Reporter',
    field: 'arts_media',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '📰',
    companyNameTemplates: ['The {city} Chronicle', 'Metro Daily Gazette', 'Global News Network'],
    baseSalary: 56000,
    minAge: 18,
    requiredDegreeTitles: ['B.A. in Journalism & Media'],
    requiredDegreeShortLabel: 'B.A. in Journalism & Media',
    minSmarts: 58,
    description:
      'Chase breaking city hall scoops, interview whistleblowers, fact-check sources, and publish front-page investigative stories.',
    interviewQuestion: {
      interviewerRole: 'Managing Editor',
      question:
        'An anonymous tipster sends you a bombshell rumor about the mayor twenty minutes before print deadline. How do you handle it?',
      options: [
        {
          label: 'Hold the story until we independently verify the claim with primary documents and at least two sources.',
          isPass: true,
          feedback: 'The Editor pounded the desk happily: "Accuracy beats speed every time! Welcome to the newsroom."',
        },
        {
          label: 'Reach out for official comment and corroborate the evidence before publishing a single word.',
          isPass: true,
          feedback: 'The Editor nodded: "Rock-solid journalistic integrity. Here is your press badge!"',
        },
        {
          label: 'Publish it immediately in giant bold letters and add space aliens to make it juicier.',
          isPass: false,
          feedback: 'The Editor groaned: "This is a newspaper of record, not a supermarket tabloid! Next!"',
        },
      ],
    },
  },
  {
    id: 'ft_graphic_designer',
    title: 'UI/UX & Brand Designer',
    field: 'arts_media',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '🎨',
    companyNameTemplates: ['PixelCraft Studio {city}', 'Chroma Creative Agency', 'Studio Vivid'],
    baseSalary: 62000,
    minAge: 18,
    requiredDegreeTitles: ['B.F.A. in Visual & Digital Arts', 'Master of Fine Arts (M.F.A.)'],
    requiredDegreeShortLabel: 'B.F.A. in Visual & Digital Arts',
    description:
      'Design sleek mobile app interfaces, craft memorable brand identities, and illustrate eye-catching digital campaigns.',
    interviewQuestion: {
      interviewerRole: 'Creative Director',
      question:
        'A client looks at your sleek minimalist logo concept and asks, "Can we make the logo three times bigger and use neon comic sans?"',
      options: [
        {
          label: 'Listen to their goal for visibility and present two refined options that pop while staying readable.',
          isPass: true,
          feedback: 'The Creative Director smiled: "Guiding clients with empathy and taste—that is a true pro!"',
        },
        {
          label: 'Show a side-by-side mockup explaining how balanced hierarchy strengthens their brand trust.',
          isPass: true,
          feedback: 'The Creative Director nodded: "Visual storytelling wins clients over. You are hired!"',
        },
        {
          label: 'Flip my monitor upside down and storm out of the Zoom call crying.',
          isPass: false,
          feedback: 'The Creative Director sighed: "Agency life requires thicker skin than that. Sorry!"',
        },
      ],
    },
  },
  {
    id: 'ft_athletic_trainer',
    title: 'Kinesiologist & Performance Coach',
    field: 'medicine_healthcare',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '🏋️',
    companyNameTemplates: ['{city} Pro Athletics Club', 'Peak Performance Institute', 'Victory Sports Medicine'],
    baseSalary: 58000,
    minAge: 18,
    requiredDegreeTitles: ['B.S. in Kinesiology & Sports'],
    requiredDegreeShortLabel: 'B.S. in Kinesiology & Sports',
    minHealth: 60,
    description:
      'Design biomechanics conditioning programs, oversee injury rehabilitation, and coach athletes to peak physical performance.',
    interviewQuestion: {
      interviewerRole: 'Head of Sports Performance',
      question:
        'A star sprinter complains of tightness in their hamstring right before a high-intensity speed session. What do you do?',
      options: [
        {
          label: 'Modify their workout immediately, assess range of motion, and focus on targeted recovery mobility.',
          isPass: true,
          feedback: 'The Performance Director nodded: "Preventing a tear saves the whole season! You are hired."',
        },
        {
          label: 'Switch them to low-impact neuromuscular drills and coordinate with the physical therapy staff.',
          isPass: true,
          feedback: 'The Performance Director smiled: "Smart, science-backed coaching. Welcome to the team!"',
        },
        {
          label: 'Tell them to sprint twice as hard with ankle weights until the pain goes numb.',
          isPass: false,
          feedback: 'The Performance Director gasped: "We train athletes, we do not break them! Rejected."',
        },
      ],
    },
  },
  {
    id: 'ft_stage_screen_actor',
    title: 'Stage & Screen Actor',
    field: 'arts_media',
    type: 'full_time',
    credentialTier: 'bachelors',
    icon: '🎭',
    companyNameTemplates: ['{city} Repertory Theatre', 'Starlight Casting Studios', 'Paramount Stage Co.'],
    baseSalary: 55000,
    minAge: 18,
    requiredDegreeTitles: ['B.F.A. in Performing Arts', 'Master of Fine Arts (M.F.A.)'],
    requiredDegreeShortLabel: 'B.F.A. in Performing Arts',
    description:
      'Perform lead roles in theatre productions, voice animated characters, and star in television dramas and commercials.',
    interviewQuestion: {
      interviewerRole: 'Casting Director',
      question:
        'During a live stage performance, your scene partner completely forgets their line and stares at you in panic. What do you do?',
      options: [
        {
          label: 'Stay in character and weave the key plot point into my next line to guide the scene forward seamlessly.',
          isPass: true,
          feedback: 'The Casting Director applauded: "True ensemble instincts! The audience will never know. Hired!"',
        },
        {
          label: 'Improvise a natural character moment that cues their next line without breaking the fourth wall.',
          isPass: true,
          feedback: 'The Casting Director beamed: "Grace under stage lights! Welcome to the company."',
        },
        {
          label: 'Pull out the script from my pocket and read both of our parts in a robot voice.',
          isPass: false,
          feedback: 'The Casting Director winced: "Thank you, don’t call us, we’ll call you."',
        },
      ],
    },
  },

  // ==========================================================================
  // 5. PROFESSIONAL & MASTER'S DEGREE CAREERS (AGE 18+ • ADVANCED CREDENTIALS)
  // ==========================================================================
  {
    id: 'ft_registered_nurse',
    title: 'Registered Hospital Nurse (RN)',
    field: 'medicine_healthcare',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '💉',
    companyNameTemplates: ['{city} General Hospital', 'Mercy Medical Center', 'St. Jude Regional Health'],
    baseSalary: 84000,
    minAge: 18,
    requiredDegreeTitles: ['Bachelor of Science in Nursing (B.S.N. / RN)'],
    requiredDegreeShortLabel: 'B.S.N. / RN (Nursing School)',
    minSmarts: 65,
    description:
      'Triage emergency patients, administer IV medications, monitor vital signs, and coordinate compassionate bedside care.',
    interviewQuestion: {
      interviewerRole: 'Chief Nursing Officer',
      question:
        'Before administering an IV medication to a patient in Room 302, what safety checks do you always perform?',
      options: [
        {
          label: 'Verify the Five Rights: right patient, right drug, right dose, right route, and right time.',
          isPass: true,
          feedback: 'The Chief Nursing Officer smiled: "Clinical excellence and patient safety first! Welcome to our ward."',
        },
        {
          label: 'Check two patient identifiers on their wristband, scan the chart, and confirm allergy history.',
          isPass: true,
          feedback: 'The Chief Nursing Officer nodded: "Thorough and dependable bedside care. You are hired!"',
        },
        {
          label: 'Eye-ball the syringe from across the room and hope for the best.',
          isPass: false,
          feedback: 'The Chief Nursing Officer gasped: "Please step away from the medical cart immediately!"',
        },
      ],
    },
  },
  {
    id: 'ft_airline_copilot',
    title: 'Commercial Airline Pilot',
    field: 'aviation_transport',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '✈️',
    companyNameTemplates: ['{city} International Airways', 'Skyward Global Airlines', 'Pacific Horizon Air'],
    baseSalary: 118000,
    minAge: 18,
    requiredDegreeTitles: ['Commercial Pilot License (CPL)'],
    requiredDegreeShortLabel: 'Commercial Pilot License (CPL)',
    minSmarts: 68,
    minHealth: 75,
    description:
      'Command commercial passenger jets across domestic and international flight routes at 36,000 feet.',
    interviewQuestion: {
      interviewerRole: 'Chief Flight Captain',
      question:
        'Weather radar shows a severe thunderstorm cell building directly along your planned approach path. What is your decision?',
      options: [
        {
          label: 'Coordinate with Air Traffic Control early to deviate around the cell or hold until conditions clear.',
          isPass: true,
          feedback: 'The Chief Captain saluted: "Aviate, navigate, communicate! Passenger safety is always #1. Hired!"',
        },
        {
          label: 'Brief the crew on our alternate airport fuel reserves and request a safe vector around the weather.',
          isPass: true,
          feedback: 'The Chief Captain nodded: "Disciplined cockpit resource management. Welcome to the flight deck!"',
        },
        {
          label: 'Put the jet into a barrel roll through the lightning for the thrill of it.',
          isPass: false,
          feedback: 'The Chief Captain stared in disbelief: "This is a commercial airliner, not an arcade game!"',
        },
      ],
    },
  },
  {
    id: 'ft_medical_physician',
    title: 'Attending Medical Physician',
    field: 'medicine_healthcare',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '🩺',
    companyNameTemplates: ['{city} University Hospital', 'Mount Sinai Health System', 'Pinnacle Medical Center'],
    baseSalary: 165000,
    minAge: 18,
    requiredDegreeTitles: ['Doctor of Medicine (M.D.)'],
    requiredDegreeShortLabel: 'Doctor of Medicine (M.D.)',
    minSmarts: 80,
    description:
      'Diagnose complex medical conditions, lead clinical hospital rounds, and perform life-saving treatments for patients.',
    interviewQuestion: {
      interviewerRole: 'Chief of Medicine',
      question:
        'A patient presents with atypical symptoms that could match either a common viral illness or a rare vascular condition. How do you proceed?',
      options: [
        {
          label: 'Take a detailed medical history, build a differential diagnosis, and order targeted labs to rule out the high-risk condition first.',
          isPass: true,
          feedback: 'The Chief of Medicine beamed: "Methodical clinical reasoning! We are proud to have you on staff, Doctor."',
        },
        {
          label: 'Monitor vital signs closely while running diagnostic imaging and consulting specialist colleagues.',
          isPass: true,
          feedback: 'The Chief of Medicine nodded: "Collaborative, evidence-based medicine. Welcome to the hospital!"',
        },
        {
          label: 'Tell them to rub an onion on their elbow and WebMD the rest.',
          isPass: false,
          feedback: 'The Chief of Medicine frowned: "Did you actually attend Medical School? Application denied!"',
        },
      ],
    },
  },
  {
    id: 'ft_associate_attorney',
    title: 'Associate Trial Attorney',
    field: 'law_government',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '⚖️',
    companyNameTemplates: ['Sterling, Vance & {city} LLP', 'Apex Law Partners', 'Crown & gavel Legal'],
    baseSalary: 140000,
    minAge: 18,
    requiredDegreeTitles: ['Juris Doctor (J.D.)'],
    requiredDegreeShortLabel: 'Juris Doctor (J.D.)',
    minSmarts: 78,
    description:
      'Represent high-stakes clients in court, argue motions before judges, and negotiate multi-million-dollar corporate settlements.',
    interviewQuestion: {
      interviewerRole: 'Managing Law Partner',
      question:
        'During cross-examination in court, what is the golden rule every trial lawyer should follow?',
      options: [
        {
          label: 'Ask leading questions you already know the answer to, backed by documented evidence.',
          isPass: true,
          feedback: 'The Managing Partner smiled: "Command of the courtroom! Welcome to the firm, Counselor."',
        },
        {
          label: 'Keep questions concise and disciplined so the witness cannot spin a surprise narrative.',
          isPass: true,
          feedback: 'The Managing Partner nodded: "Sharp litigation strategy. Your corner office is ready!"',
        },
        {
          label: 'Slam the table and yell "YOU CAN’T HANDLE THE TRUTH!" at a traffic court witness.',
          isPass: false,
          feedback: 'The Managing Partner sighed: "Too many movies, not enough case law. Next!"',
        },
      ],
    },
  },
  {
    id: 'ft_dentist',
    title: 'General & Cosmetic Dentist',
    field: 'medicine_healthcare',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '🦷',
    companyNameTemplates: ['{city} Bright Smile Dental', 'Pearl Dental Studio', 'Apex Orthodontics & Care'],
    baseSalary: 148000,
    minAge: 18,
    requiredDegreeTitles: ['Doctor of Dental Surgery (D.D.S.)'],
    requiredDegreeShortLabel: 'Doctor of Dental Surgery (D.D.S.)',
    minSmarts: 75,
    description:
      'Perform precision restorative dentistry, root canals, and cosmetic crown procedures while keeping anxious patients comfortable.',
    interviewQuestion: {
      interviewerRole: 'Lead Dental Partner',
      question:
        'A nervous patient grips the armrests tightly before a routine cavity filling. How do you put them at ease?',
      options: [
        {
          label: 'Explain each step gently beforehand, apply topical numbing gel, and agree on a hand-raise pause signal.',
          isPass: true,
          feedback: 'The Dental Partner beamed: "Compassionate chairside manner builds lifelong patients! Hired."',
        },
        {
          label: 'Take time to ensure complete local anesthesia before starting and check in throughout the procedure.',
          isPass: true,
          feedback: 'The Dental Partner nodded: "Gentle, painless dentistry! Welcome to the practice, Doctor."',
        },
        {
          label: 'Rev the dental drill like a chainsaw to show them how powerful it is.',
          isPass: false,
          feedback: 'The Dental Partner horrifiedly shook their head: "You will scare away every patient in town!"',
        },
      ],
    },
  },
  {
    id: 'ft_veterinarian',
    title: 'Doctor of Veterinary Medicine',
    field: 'medicine_healthcare',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '🐾',
    companyNameTemplates: ['{city} Animal Hospital', 'Paws & Claws Veterinary Clinic', 'Companion Vet Center'],
    baseSalary: 108000,
    minAge: 18,
    requiredDegreeTitles: ['Doctor of Veterinary Medicine (D.V.M.)'],
    requiredDegreeShortLabel: 'Doctor of Veterinary Medicine (D.V.M.)',
    minSmarts: 74,
    description:
      'Perform veterinary surgeries, diagnose pet illnesses, and care for dogs, cats, and exotic animals.',
    interviewQuestion: {
      interviewerRole: 'Clinic Medical Director',
      question:
        'A worried owner brings in a Labrador puppy that swallowed a rubber squeaky toy. What is your protocol?',
      options: [
        {
          label: 'Perform an abdominal palpation and take X-rays immediately to locate the obstruction and plan safe removal.',
          isPass: true,
          feedback: 'The Clinic Director smiled: "Calm, decisive veterinary medicine! Welcome to our animal hospital."',
        },
        {
          label: 'Stabilize the puppy, evaluate with diagnostic imaging, and walk the owner through endoscopic options.',
          isPass: true,
          feedback: 'The Clinic Director nodded: "Great care for both the pet and the pet parent. You are hired!"',
        },
        {
          label: 'Squeak the puppy’s belly like an accordion to play a song.',
          isPass: false,
          feedback: 'The Clinic Director gasped: "That is a medical emergency, not a musical instrument! Out!"',
        },
      ],
    },
  },
  {
    id: 'ft_management_consultant',
    title: 'Strategy Consultant & Executive',
    field: 'business_finance',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '💼',
    companyNameTemplates: ['McKinley & {city} Consulting', 'Bainbridge Global Advisors', 'Apex Strategy Group'],
    baseSalary: 135000,
    minAge: 18,
    requiredDegreeTitles: ['Master of Business Administration (M.B.A.)'],
    requiredDegreeShortLabel: 'M.B.A. (Business School)',
    minSmarts: 72,
    description:
      'Advise Fortune 500 CEOs on mergers, international expansion, and corporate turnarounds.',
    interviewQuestion: {
      interviewerRole: 'Senior Managing Partner',
      question:
        'A retail client’s profits dropped 15% this year despite steady store traffic. How do you diagnose the root cause?',
      options: [
        {
          label: 'Segment profitability by product line, supply-chain costs, and average basket size to isolate the margin leak.',
          isPass: true,
          feedback: 'The Senior Partner nodded: "Structured MECE problem-solving! Welcome to the firm."',
        },
        {
          label: 'Analyze unit economics and customer discounting trends before presenting actionable cost and pricing levers.',
          isPass: true,
          feedback: 'The Senior Partner smiled: "Executive-ready analysis. You start on the global team Monday!"',
        },
        {
          label: 'Make a 200-slide PowerPoint deck filled entirely with clipart of synergy.',
          isPass: false,
          feedback: 'The Senior Partner winced: "Even for consultants, that is too much buzzword soup. Pass!"',
        },
      ],
    },
  },
  {
    id: 'ft_research_scientist',
    title: 'Senior Research Scientist',
    field: 'education_science',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '🔬',
    companyNameTemplates: ['{city} Institute of Advanced Science', 'Quantum Frontier Labs', 'Aether Research Group'],
    baseSalary: 112000,
    minAge: 18,
    requiredDegreeTitles: ['Master of Science (M.S. / Ph.D.)'],
    requiredDegreeShortLabel: 'M.S. / Ph.D. (Graduate School)',
    minSmarts: 78,
    description:
      'Lead grant-funded scientific research, publish peer-reviewed breakthroughs, and mentor doctoral fellows.',
    interviewQuestion: {
      interviewerRole: 'Institute Director',
      question:
        'When designing a multi-year research study for peer-reviewed publication, what ensures your findings hold up?',
      options: [
        {
          label: 'Pre-registering clear hypotheses, using rigorous statistical power, and sharing reproducible methodology.',
          isPass: true,
          feedback: 'The Institute Director beamed: "Gold-standard scientific methodology! The lab is yours."',
        },
        {
          label: 'Designing blind control groups and welcoming independent replication from peer laboratories.',
          isPass: true,
          feedback: 'The Institute Director nodded: "True scholarly leadership. Welcome to the Institute!"',
        },
        {
          label: 'Making up cool-sounding Latin words until reviewers get too confused to ask questions.',
          isPass: false,
          feedback: 'The Institute Director frowned: "Peer reviewers read every equation, my friend. Rejected!"',
        },
      ],
    },
  },
  {
    id: 'ft_art_director',
    title: 'Executive Art & Film Director',
    field: 'arts_media',
    type: 'full_time',
    credentialTier: 'masters_professional',
    icon: '🎬',
    companyNameTemplates: ['{city} Lumina Studios', 'Vanguard Film & Design', 'Auteur Creative House'],
    baseSalary: 110000,
    minAge: 18,
    requiredDegreeTitles: ['Master of Fine Arts (M.F.A.)'],
    requiredDegreeShortLabel: 'Master of Fine Arts (M.F.A.)',
    description:
      'Direct visual storytelling across major film sets, gallery exhibitions, and flagship creative productions.',
    interviewQuestion: {
      interviewerRole: 'Studio Executive Producer',
      question:
        'Your production crew is halfway through a shoot when weather ruins the outdoor lighting setup. How do you adapt?',
      options: [
        {
          label: 'Work with the cinematographer to embrace the moody diffused light or pivot to interior coverage.',
          isPass: true,
          feedback: 'The Producer clapped: "Creative vision meets practical leadership! Welcome to the director’s chair."',
        },
        {
          label: 'Adjust the shooting schedule on the fly so the crew stays productive and on budget.',
          isPass: true,
          feedback: 'The Producer smiled: "An artist who respects the schedule—you are hired!"',
        },
        {
          label: 'Yell at the clouds through a megaphone until it stops raining.',
          isPass: false,
          feedback: 'The Producer sighed: "Even the greatest directors cannot boss around the sky. Next!"',
        },
      ],
    },
  },

  // ==========================================================================
  // 6. FREELANCE & INDEPENDENT GIGS (UNLOCK AT AGE 18+)
  // ==========================================================================
  {
    id: 'fl_rideshare_driver',
    title: 'Freelance Rideshare Driver',
    field: 'aviation_transport',
    type: 'freelance',
    credentialTier: 'open_entry',
    icon: '🚗',
    companyNameTemplates: ['ZoomRide {city}', 'HopIn Mobility App', 'CityCab Independent'],
    baseSalary: 32000,
    hourlyRateLabel: 'Flexible Hours • 100% Independent',
    minAge: 18,
    requiredDegreeTitles: [],
    description:
      'Pick up passengers across town on your own schedule, earn airport surge bonuses, and keep aux-cord vibes immaculate.',
    interviewQuestion: {
      interviewerRole: 'Platform Onboarding Specialist',
      question:
        'A passenger hops into the back seat with headphones on and clearly wants a quiet ride to the airport. What do you do?',
      options: [
        {
          label: 'Confirm their destination politely, keep the cabin temperature comfortable, and drive smoothly in peace.',
          isPass: true,
          feedback: 'Onboarding Approved: "Reading the room is the secret to a 5.0-star driver rating!"',
        },
        {
          label: 'Offer a quick greeting, load their suitcase carefully, and let them relax for the trip.',
          isPass: true,
          feedback: 'Onboarding Approved: "Professional and courteous—your driver profile is now live!"',
        },
        {
          label: 'Blast polka music at max volume and ask them about their taxes.',
          isPass: false,
          feedback: 'Onboarding Denied: "Instant 1-star rating speedrun. Application declined."',
        },
      ],
    },
  },
  {
    id: 'fl_web_developer',
    title: 'Freelance Web & App Developer',
    field: 'technology',
    type: 'freelance',
    credentialTier: 'open_entry',
    icon: '🌐',
    companyNameTemplates: ['Self-Employed Digital Studio', 'IndieStack {city}', 'Remote Code Collective'],
    baseSalary: 54000,
    hourlyRateLabel: 'Project Contracts • Remote',
    minAge: 18,
    requiredDegreeTitles: ['B.S. in Computer Science'],
    minSmarts: 60,
    description:
      'Build custom e-commerce websites and landing pages for startups and local businesses from your laptop.',
    interviewQuestion: {
      interviewerRole: 'Startup Client',
      question:
        'A client asks you to add 14 new features mid-project without changing the deadline or budget. How do you handle scope creep?',
      options: [
        {
          label: 'Refer politely to our signed scope of work and offer a Phase 2 quote for the new features.',
          isPass: true,
          feedback: 'The Client nodded: "Fair, clear, and professional! Let’s sign the contract."',
        },
        {
          label: 'Help them prioritize what launches in v1 on time and price the add-ons transparently.',
          isPass: true,
          feedback: 'The Client smiled: "I appreciate the clear roadmap! You are hired."',
        },
        {
          label: 'Ghost their emails and move to a cabin in the woods.',
          isPass: false,
          feedback: 'The Client frowned: "And that is why we interview freelancers first. Pass!"',
        },
      ],
    },
  },
  {
    id: 'fl_event_photographer',
    title: 'Freelance Event Photographer',
    field: 'arts_media',
    type: 'freelance',
    credentialTier: 'open_entry',
    icon: '📸',
    companyNameTemplates: ['Golden Hour {city} Photo', 'Shutter & Lens Studio', 'Candid Moments Co.'],
    baseSalary: 42000,
    hourlyRateLabel: 'Weekend Bookings • Creative',
    minAge: 18,
    requiredDegreeTitles: ['B.F.A. in Visual & Digital Arts'],
    description:
      'Shoot weddings, graduations, and portrait sessions around the city and edit vibrant high-resolution galleries.',
    interviewQuestion: {
      interviewerRole: 'Wedding Planner',
      question:
        'When shooting a once-in-a-lifetime wedding ceremony, how do you protect the client’s photos from technical failure?',
      options: [
        {
          label: 'Shoot on dual SD card slots simultaneously, bring backup camera bodies, and back up files that night.',
          isPass: true,
          feedback: 'The Wedding Planner breathed a sigh of relief: "Redundancy is everything! You are booked."',
        },
        {
          label: 'Carry spare batteries, lenses, and dual-slot memory cards so not a single moment is lost.',
          isPass: true,
          feedback: 'The Wedding Planner smiled: "True professional preparation! Welcome to our vendor list."',
        },
        {
          label: 'Take all the photos on a 2009 flip phone with 2% battery left.',
          isPass: false,
          feedback: 'The Wedding Planner gasped: "The bride would faint on the spot. Absolutely not!"',
        },
      ],
    },
  },
  {
    id: 'fl_private_tutor',
    title: 'Independent Exam Prep Specialist',
    field: 'education_science',
    type: 'freelance',
    credentialTier: 'open_entry',
    icon: '📐',
    companyNameTemplates: ['{city} Elite Prep', 'ScholarTrack Independent', 'Summit Test Coaching'],
    baseSalary: 48000,
    hourlyRateLabel: '1-on-1 Sessions • High Demand',
    minAge: 18,
    requiredDegreeTitles: [
      'B.S. in Biology (Pre-Med)',
      'B.A. in Political Science',
      'B.S. in Computer Science',
      'Master of Science (M.S. / Ph.D.)',
    ],
    minSmarts: 70,
    description:
      'Coach ambitious high school and college students for standardized entrance exams with custom study plans.',
    interviewQuestion: {
      interviewerRole: 'Parent Client',
      question:
        'My teenager has their big entrance exam in six weeks and gets anxious during timed practice tests. What is your approach?',
      options: [
        {
          label: 'Start with untimed diagnostic sections to build confidence, then gradually introduce pacing strategies.',
          isPass: true,
          feedback: 'The Parent smiled: "Structured and encouraging! When can we schedule the first session?"',
        },
        {
          label: 'Focus on their highest-yield weak spots first and teach calm test-day time management habits.',
          isPass: true,
          feedback: 'The Parent nodded: "That sounds like a winning plan. You are hired!"',
        },
        {
          label: 'Blow an airhorn every three minutes during their study session to "build toughness."',
          isPass: false,
          feedback: 'The Parent hung up: "We want a tutor, not a drill sergeant with an airhorn!"',
        },
      ],
    },
  },
];

export function getJobTemplateById(jobId: string): JobTemplate | undefined {
  return JOB_CATALOG.find((j) => j.id === jobId);
}

export function generateCompanyName(city: string, job: JobTemplate): string {
  const raw = pickRandom(job.companyNameTemplates);
  return raw.replace('{city}', city || 'Metro');
}

