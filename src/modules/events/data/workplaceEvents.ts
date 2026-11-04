import type { LifeEventTemplate } from '../types';

export const WORKPLACE_EVENTS: LifeEventTemplate[] = [
  // ==========================================================================
  // 1. UNIVERSAL WORKPLACE EVENTS (ANY EMPLOYED CHARACTER • AGE 16+)
  // ==========================================================================
  {
    id: 'wp_stolen_lunch_mystery',
    title: 'The Breakroom Lunch Bandit',
    icon: '🥪',
    minAge: 16,
    maxAge: 70,
    weight: 1.1,
    category: 'career',
    requiresEmployed: true,
    description:
      'For the second time this month at {companyName}, someone has stolen your packed lunch straight out of the communal breakroom refrigerator!',
    choices: [
      {
        id: 'polite_warning_note',
        label: 'Stick a polite but firm handwritten note on the fridge asking the culprit to stop',
        icon: '📝',
        outcomes: [
          {
            message:
              'Your polite note touched someone’s conscience! The next morning, a fresh replacement meal and a bakery muffin were waiting in your cubby.',
            effects: { happiness: 4, karma: 3 },
          },
          {
            message:
              'Someone drew funny doodles on your note with a red Sharpie. The office chuckled, but your lunch is still gone.',
            effects: { happiness: -2 },
          },
        ],
      },
      {
        id: 'spicy_hot_sauce_trap',
        label: 'Pack a dummy sandwich drenched in ghost-pepper hot sauce as a spicy trap',
        icon: '🌶️',
        outcomes: [
          {
            message:
              'At 12:15 PM, an accounting supervisor sprinted across the hallway with tears in their eyes gulping a carton of milk! The bandit was unmasked!',
            effects: { happiness: 8, karma: -2, jobPerformance: 5 },
          },
          {
            message:
              'The ghost pepper trap worked, but the culprit coughed all over the breakroom and caused a mini scene with HR.',
            effects: { happiness: 3, karma: -4 },
          },
        ],
      },
      {
        id: 'insulated_lunch_bag',
        label: 'Shrug it off, buy lunch from a cafe, and start keeping an insulated cooler at your desk',
        icon: '🍱',
        outcomes: [
          {
            message:
              'You enjoyed a delicious cafe bowl and never had to deal with the fridge bandit again.',
            effects: { cash: -15, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_overtime_volunteer',
    title: 'Urgent Weekend Overtime Request',
    icon: '⏳',
    minAge: 16,
    maxAge: 65,
    weight: 1.2,
    category: 'career',
    requiresEmployed: true,
    description:
      'A surprise surge in orders arrives at {companyName}. Management asks for dedicated volunteers to put in extra hours this weekend.',
    choices: [
      {
        id: 'volunteer_overtime',
        label: 'Step up and volunteer for the weekend shift with extra hustle',
        icon: '💪',
        outcomes: [
          {
            message:
              'You crushed the backlog over the weekend! Management praised your loyalty and added a generous overtime bonus to your paycheck.',
            effects: { jobPerformance: 15, cash: 650, happiness: -3, health: -2 },
          },
          {
            message:
              'It was an exhausting shift, but your team delivered ahead of schedule. Your supervisor made a note of your great work ethic.',
            effects: { jobPerformance: 10, cash: 400, happiness: -4 },
          },
        ],
      },
      {
        id: 'decline_politely',
        label: 'Politely decline so you can protect your personal rest and weekend plans',
        icon: '🛋️',
        outcomes: [
          {
            message:
              'You enjoyed a peaceful weekend relaxing at home, feeling recharged and refreshed on Monday morning.',
            effects: { happiness: 6, health: 4 },
          },
        ],
      },
      {
        id: 'split_half_day',
        label: 'Offer to work a focused half-day Saturday morning to help without burning out',
        icon: '⚖️',
        outcomes: [
          {
            message:
              'Smart compromise! You helped clear the morning rush, earned extra pay, and still had Sunday entirely to yourself.',
            effects: { jobPerformance: 8, cash: 250, happiness: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_supportive_coworker_intro',
    title: 'A New Desk Neighbor',
    icon: '👋',
    minAge: 18,
    maxAge: 65,
    weight: 1.0,
    category: 'career',
    requiresEmployed: true,
    description:
      'A warm, enthusiastic colleague named Jordan sits at the workstation next to you at {companyName} and offers to show you the best coffee spot nearby.',
    choices: [
      {
        id: 'grab_coffee_together',
        label: 'Walk with Jordan to grab coffee and swap tips about working here',
        icon: '☕',
        outcomes: [
          {
            message:
              'You and Jordan hit it off immediately over iced caramel macchiatos! Jordan shared several invaluable inside tips on navigating the department.',
            effects: { happiness: 6, jobPerformance: 6 },
            personIntroduced: {
              firstName: 'Jordan',
              lastName: 'Vance',
              gender: 'non-binary',
              role: 'Coworker',
              relationshipType: 'friend',
              relationship: 80,
              originStory: 'Bonded over coffee on your shift at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '🧑‍💼',
            },
          },
        ],
      },
      {
        id: 'share_desk_snack',
        label: 'Welcome Jordan warmly and share your secret stash of desk cookies',
        icon: '🍪',
        outcomes: [
          {
            message:
              'Jordan beamed with delight! You now have a loyal ally in the department who always watches your back.',
            effects: { happiness: 5, jobPerformance: 4 },
            personIntroduced: {
              firstName: 'Jordan',
              lastName: 'Vance',
              gender: 'non-binary',
              role: 'Coworker',
              relationshipType: 'friend',
              relationship: 75,
              originStory: 'Shared desk snacks on your first week together at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '🧑‍💼',
            },
          },
        ],
      },
      {
        id: 'keep_it_brief',
        label: 'Give a quick, polite nod and keep your headphones on to stay laser-focused on work',
        icon: '🎧',
        outcomes: [
          {
            message:
              'Jordan took the hint and respected your focus. You powered through your daily tasks without any social distractions.',
            effects: { jobPerformance: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_demanding_supervisor_intro',
    title: 'The Tough Performance Review',
    icon: '📋',
    minAge: 18,
    maxAge: 65,
    weight: 1.1,
    category: 'career',
    requiresEmployed: true,
    description:
      'Your department supervisor, Marcus Sterling, calls you into their glass office at {companyName} to scrutinize your latest deliverables with a red pen.',
    choices: [
      {
        id: 'listen_and_iterate',
        label: 'Listen attentively, take thorough notes on the feedback, and submit polished revisions',
        icon: '✍️',
        outcomes: [
          {
            message:
              'Marcus looked over your revised work, raised an eyebrow, and smiled: "Now that is executive quality. Exceptional turnaround!"',
            effects: { jobPerformance: 14, smarts: 2, happiness: 4 },
            personIntroduced: {
              firstName: 'Marcus',
              lastName: 'Sterling',
              gender: 'male',
              role: 'Department Supervisor',
              relationshipType: 'mentor',
              relationship: 75,
              originStory: 'Impressed by your work ethic during a rigorous review at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '👔',
            },
          },
        ],
      },
      {
        id: 'defend_choices',
        label: 'Professionally explain the strategic rationale behind your original decisions',
        icon: '🗣️',
        outcomes: [
          {
            message:
              'Marcus respected your spine and confidence: "I like someone who stands behind their work with logic. Let us find a middle ground."',
            effects: { jobPerformance: 6, smarts: 1 },
            personIntroduced: {
              firstName: 'Marcus',
              lastName: 'Sterling',
              gender: 'male',
              role: 'Department Supervisor',
              relationshipType: 'coworker',
              relationship: 58,
              originStory: 'Debated strategic decisions in their office at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '👔',
            },
          },
          {
            message:
              'Marcus was unimpressed: "I do not pay you for excuses, I pay you for perfection." Your performance score took a minor hit.',
            effects: { jobPerformance: -8, happiness: -4 },
          },
        ],
      },
      {
        id: 'complain_to_peers',
        label: 'Nod along in silence, then vent angrily to everyone in the breakroom about micromanagement',
        icon: '😤',
        outcomes: [
          {
            message:
              'Word of your breakroom venting reached management. Marcus called you in for a formal reprimand regarding workplace professionalism.',
            effects: { jobPerformance: -14, happiness: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_office_prankster_intro',
    title: 'Rubber Ducks on the Keyboard',
    icon: '🦆',
    minAge: 18,
    maxAge: 60,
    weight: 0.95,
    category: 'career',
    requiresEmployed: true,
    description:
      'You arrive at your desk at {companyName} to find twenty tiny yellow rubber ducks arranged in military formation across your keyboard and monitor!',
    choices: [
      {
        id: 'laugh_counter_prank',
        label: 'Laugh out loud, name them your executive squad, and leave a comical ransom note',
        icon: '😂',
        outcomes: [
          {
            message:
              'Chloe Diaz from across the aisle burst out laughing: "You passed the initiation!" You both became fast friends and lunch partners.',
            effects: { happiness: 8, jobPerformance: 3 },
            personIntroduced: {
              firstName: 'Chloe',
              lastName: 'Diaz',
              gender: 'female',
              role: 'Senior Coworker',
              relationshipType: 'friend',
              relationship: 82,
              originStory: 'Pranked your workstation with rubber ducks at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '👩‍💻',
            },
          },
        ],
      },
      {
        id: 'keep_one_duck',
        label: 'Smile, place one lucky duck on your desk, and donate the rest to the office supply bin',
        icon: '✨',
        outcomes: [
          {
            message:
              'Your new rubber duck desk mascot became a conversation starter for visiting colleagues.',
            effects: { happiness: 4, popularity: 3 },
          },
        ],
      },
      {
        id: 'file_hr_complaint',
        label: 'Frown and report the desktop clutter to Human Resources as an unprofessional distraction',
        icon: '📜',
        outcomes: [
          {
            message:
              'HR sent out a stern reminder about desk clutter. The rest of the office thought you overreacted and avoided inviting you to happy hour.',
            effects: { happiness: -4, popularity: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_workplace_rival_intro',
    title: 'The Credit-Stealing Rival',
    icon: '🤼',
    minAge: 18,
    maxAge: 65,
    weight: 0.9,
    category: 'career',
    requiresEmployed: true,
    description:
      'During an all-hands meeting at {companyName}, an ambitious colleague named Devon Price subtly tries to claim credit for an efficiency idea you proposed last week.',
    choices: [
      {
        id: 'chime_in_with_data',
        label: 'Politely speak up with detailed data metrics showing you originally spearheaded the initiative',
        icon: '📊',
        outcomes: [
          {
            message:
              'The leadership team was impressed by your detailed knowledge and thanked you by name! Devon glared across the table, thoroughly outmaneuvered.',
            effects: { jobPerformance: 12, smarts: 2, happiness: 5 },
            personIntroduced: {
              firstName: 'Devon',
              lastName: 'Price',
              gender: 'male',
              role: 'Department Colleague',
              relationshipType: 'rival',
              relationship: 30,
              originStory: 'Attempted to claim credit for your project at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '😒',
            },
          },
        ],
      },
      {
        id: 'confront_privately',
        label: 'Pull Devon aside after the meeting and establish firm professional boundaries',
        icon: '🤝',
        outcomes: [
          {
            message:
              'Devon apologized awkwardly and agreed to co-credit you on the official slide deck going forward.',
            effects: { jobPerformance: 6, happiness: 2 },
            personIntroduced: {
              firstName: 'Devon',
              lastName: 'Price',
              gender: 'male',
              role: 'Department Colleague',
              relationshipType: 'coworker',
              relationship: 50,
              originStory: 'Resolved a project credit dispute at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '😐',
            },
          },
        ],
      },
      {
        id: 'say_nothing',
        label: 'Stay silent and let Devon have the spotlight while keeping your head down',
        icon: '🤐',
        outcomes: [
          {
            message:
              'Devon got public praise for your idea. You felt slighted, but avoided any confrontation.',
            effects: { happiness: -6, jobPerformance: -4 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_office_crush_intro',
    title: 'A Warm Invitation from Elena',
    icon: '💌',
    minAge: 18,
    maxAge: 55,
    weight: 0.85,
    category: 'career',
    requiresEmployed: true,
    description:
      'Elena Rostova, a stylish and talented project lead on the fourth floor at {companyName}, catches your eye by the lobby elevators and asks if you want to grab lunch at the sushi bar across the street.',
    choices: [
      {
        id: 'accept_sushi_date',
        label: 'Smile warmly, accept the invitation, and enjoy a lively sushi lunch together',
        icon: '🍣',
        outcomes: [
          {
            message:
              'You two had a wonderful time sharing spicy tuna rolls and laughing about workplace quirks! Spark flew across the table.',
            effects: { happiness: 10, looks: 3 },
            personIntroduced: {
              firstName: 'Elena',
              lastName: 'Rostova',
              gender: 'female',
              role: 'Lead Project Coordinator',
              relationshipType: 'crush',
              relationship: 85,
              originStory: 'Bonded over sushi during a memorable lunch at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '💃',
            },
          },
        ],
      },
      {
        id: 'polite_quick_bite',
        label: 'Join Elena for a quick lunch while keeping conversation strictly focused on work',
        icon: '🥗',
        outcomes: [
          {
            message:
              'You had an engaging professional conversation and formed a valuable collaborative bridge between departments.',
            effects: { happiness: 4, jobPerformance: 6 },
            personIntroduced: {
              firstName: 'Elena',
              lastName: 'Rostova',
              gender: 'female',
              role: 'Lead Project Coordinator',
              relationshipType: 'friend',
              relationship: 70,
              originStory: 'Connected over lunch discussing cross-department work at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '👩‍💼',
            },
          },
        ],
      },
      {
        id: 'decline_crush',
        label: 'Politely decline, explaining you have a packed afternoon of deadlines',
        icon: '💼',
        outcomes: [
          {
            message:
              'Elena smiled understandingly and told you to keep crushing your goals. You powered through your inbox.',
            effects: { jobPerformance: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_ergonomics_wellness',
    title: 'The Posture & Ergonomics Check',
    icon: '🪑',
    minAge: 18,
    maxAge: 65,
    weight: 0.9,
    category: 'career',
    requiresEmployed: true,
    description:
      'Human Resources at {companyName} is offering a subsidized workplace wellness and ergonomics package for all staff.',
    choices: [
      {
        id: 'get_standing_desk',
        label: 'Request an adjustable electric standing desk and high-end ergonomic lumbar chair',
        icon: '⚡',
        outcomes: [
          {
            message:
              'Your posture improved drastically! Your chronic lower back stiffness disappeared and your daily energy skyrocketed.',
            effects: { health: 6, jobPerformance: 6, happiness: 4 },
          },
        ],
      },
      {
        id: 'request_gym_stipend',
        label: 'Sign up for the company gym membership reimbursement to work out before shifts',
        icon: '🏋️',
        outcomes: [
          {
            message:
              'Hitting the gym regularly kept you sharp, active, and energized throughout your shifts.',
            effects: { health: 7, looks: 2, happiness: 4 },
          },
        ],
      },
      {
        id: 'ignore_wellness',
        label: 'Decline the paperwork and continue slouching in your squeaky swivel chair',
        icon: '😴',
        outcomes: [
          {
            message:
              'You continued your legendary slouch. By Friday afternoon, your neck muscles were aching.',
            effects: { health: -3, happiness: -2 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 2. TECHNOLOGY & ENGINEERING EVENTS (`technology`)
  // ==========================================================================
  {
    id: 'wp_tech_server_crash',
    title: 'Critical Production Outage',
    icon: '💥',
    minAge: 18,
    maxAge: 65,
    weight: 1.4,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'technology',
    description:
      'At 3:45 PM on a Friday, the primary production cluster at {companyName} crashes! Thousands of active users are getting 500 error screens.',
    choices: [
      {
        id: 'rollback_and_isolate',
        label: 'Immediately roll back the canary deployment, isolate the memory leak, and hotfix it',
        icon: '🛠️',
        outcomes: [
          {
            message:
              'Service was restored in 7 minutes flat! The VP of Engineering sent a company-wide email praising your calm diagnostic heroism.',
            effects: { jobPerformance: 18, smarts: 3, cash: 800, happiness: 6 },
          },
          {
            message:
              'The rollback stabilized traffic, though the root cause took until 9:00 PM to patch. A tough save, but a successful one!',
            effects: { jobPerformance: 10, smarts: 2, happiness: -2 },
          },
        ],
      },
      {
        id: 'restart_cluster_cold',
        label: 'Perform a cold reboot of the database server and pray the error caches clear',
        icon: '🔄',
        outcomes: [
          {
            message:
              'Miraculously, the reboot cleared the hung threads and traffic resumed normal latency. You breathed a huge sigh of relief.',
            effects: { jobPerformance: 4, karma: -1 },
          },
          {
            message:
              'The cold reboot corrupted three indexing tables! The outage lasted three hours while emergency backups were restored.',
            effects: { jobPerformance: -16, happiness: -8 },
          },
        ],
      },
      {
        id: 'blame_cloud_provider',
        label: 'Post an announcement blaming the cloud host and wait for their status page to update',
        icon: '☁️',
        outcomes: [
          {
            message:
              'The cloud provider confirmed zero downtime on their end, exposing that the bug was 100% internal. Leadership was not amused.',
            effects: { jobPerformance: -14, smarts: -1, happiness: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_tech_security_phish',
    title: 'Zero-Day Intrusion Attempt',
    icon: '🛡️',
    minAge: 18,
    maxAge: 65,
    weight: 1.2,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'technology',
    description:
      'You spot an abnormal outbound traffic spike on port 443 originating from an executive laptop at {companyName}. It matches a novel phishing malware footprint.',
    choices: [
      {
        id: 'contain_and_revoke',
        label: 'Quarantine the workstation immediately, revoke API tokens, and initiate forensic analysis',
        icon: '🔒',
        outcomes: [
          {
            message:
              'Incredible vigilance! You prevented a massive corporate data breach before any customer data was compromised. You were awarded a cyber defense bonus!',
            effects: { jobPerformance: 20, cash: 1200, smarts: 3, happiness: 8 },
          },
        ],
      },
      {
        id: 'email_the_executive',
        label: 'Send a polite email asking the executive if they clicked anything strange recently',
        icon: '📧',
        outcomes: [
          {
            message:
              'While waiting four hours for an email reply, the malware encrypted several internal folders before automated firewalls kicked in.',
            effects: { jobPerformance: -10, smarts: -1 },
          },
        ],
      },
      {
        id: 'ignore_as_glitch',
        label: 'Assume it is just a routine Windows update downloading and ignore the alert',
        icon: '🤷',
        outcomes: [
          {
            message:
              'External auditors caught the intrusion the following week. An emergency audit ensued and your performance rating suffered severely.',
            effects: { jobPerformance: -20, happiness: -8 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 3. MEDICINE & HEALTHCARE EVENTS (`medicine_healthcare`)
  // ==========================================================================
  {
    id: 'wp_med_code_triage',
    title: 'Emergency Trauma Triage',
    icon: '🚨',
    minAge: 18,
    maxAge: 70,
    weight: 1.4,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'medicine_healthcare',
    description:
      'A multi-vehicle highway pileup floods the emergency department at {companyName} with critical patients during a nursing shift change.',
    choices: [
      {
        id: 'lead_triage_protocol',
        label: 'Take charge of the triage bay, prioritize airway stabilization, and coordinate the surgical teams',
        icon: '🩺',
        outcomes: [
          {
            message:
              'Your rapid, decisive leadership saved multiple lives tonight! The Chief of Medicine commended your exceptional clinical composure.',
            effects: { jobPerformance: 20, karma: 12, smarts: 4, happiness: 8, health: -4 },
          },
          {
            message:
              'It was a harrowing 14-hour shift, but all critical patients were stabilized. You collapsed into bed exhausted but deeply proud.',
            effects: { jobPerformance: 12, karma: 8, happiness: 4, health: -6 },
          },
        ],
      },
      {
        id: 'focus_on_one_patient',
        label: 'Keep your focus entirely on your assigned bedside patient to ensure zero complications',
        icon: '💉',
        outcomes: [
          {
            message:
              'Your patient made a full recovery under your meticulous care and sent flowers to the hospital staff.',
            effects: { jobPerformance: 8, karma: 5, happiness: 5 },
          },
        ],
      },
      {
        id: 'panic_under_pressure',
        label: 'Freeze in the hallway overwhelmed by the noise, beeping alarms, and chaos',
        icon: '😨',
        outcomes: [
          {
            message:
              'A senior charge nurse stepped in to steady you. You finished the shift, but were placed on mandatory clinical supervision.',
            effects: { jobPerformance: -16, happiness: -10 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_med_rare_diagnosis',
    title: 'The Perplexing Symptom Cluster',
    icon: '🔬',
    minAge: 18,
    maxAge: 70,
    weight: 1.1,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'medicine_healthcare',
    description:
      'A patient admitted to {companyName} presents with mysterious neurological tingling and elevated liver enzymes that defy standard lab panels.',
    choices: [
      {
        id: 'research_medical_journals',
        label: 'Dig into rare specialty case studies and order a targeted autoimmune antibody panel',
        icon: '📚',
        outcomes: [
          {
            message:
              'Bulls-eye! You diagnosed a rare metabolic disorder within 24 hours, initiating the exact targeted enzyme therapy needed for a full cure!',
            effects: { jobPerformance: 18, smarts: 4, karma: 10, happiness: 9 },
          },
        ],
      },
      {
        id: 'consult_colleagues',
        label: 'Call an interdisciplinary case conference with neurology and toxicology specialists',
        icon: '👥',
        outcomes: [
          {
            message:
              'Collaborative medicine at its best! Together, the team isolated a rare medication interaction and adjusted the prescription safely.',
            effects: { jobPerformance: 12, smarts: 2, karma: 6, happiness: 5 },
          },
        ],
      },
      {
        id: 'discharge_with_aspirin',
        label: 'Assume it is just fatigue, prescribe basic painkillers, and write a discharge order',
        icon: '💊',
        outcomes: [
          {
            message:
              'The patient was readmitted two days later with worsened symptoms. The clinical director opened a formal quality-of-care inquiry.',
            effects: { jobPerformance: -18, karma: -8, happiness: -8 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 4. LAW & GOVERNMENT EVENTS (`law_government`)
  // ==========================================================================
  {
    id: 'wp_law_surprise_witness',
    title: 'The Courtroom Ambush',
    icon: '⚖️',
    minAge: 18,
    maxAge: 70,
    weight: 1.3,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'law_government',
    description:
      'During trial oral arguments, opposing counsel introduces a surprise expert witness to challenge your case evidence for {companyName}.',
    choices: [
      {
        id: 'cross_examine_with_precedent',
        label: 'Cross-examine vigorously using opposing counsel’s own past published articles against them',
        icon: '🎯',
        outcomes: [
          {
            message:
              'Masterclass litigation! You exposed a glaring methodological contradiction on the record. The presiding judge struck their testimony!',
            effects: { jobPerformance: 20, smarts: 4, happiness: 10, cash: 1500 },
          },
        ],
      },
      {
        id: 'request_immediate_recess',
        label: 'Request a 30-minute recess to examine the surprise testimony with your trial co-counsel',
        icon: '⏸️',
        outcomes: [
          {
            message:
              'The judge granted the recess. You drafted three solid objections and neutralized their impact effectively.',
            effects: { jobPerformance: 10, smarts: 2, happiness: 3 },
          },
        ],
      },
      {
        id: 'object_erratically',
        label: 'Jump to your feet, slam your binder, and yell "OBJECTION, YOUR HONOR!" without legal grounds',
        icon: '🤦',
        outcomes: [
          {
            message:
              'The judge gave you a stern warning for theatrics and threatened contempt of court. Senior partners were mortified.',
            effects: { jobPerformance: -16, happiness: -8 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 5. BUSINESS & FINANCE EVENTS (`business_finance`)
  // ==========================================================================
  {
    id: 'wp_finance_flash_crash',
    title: 'Market Volatility Flash Crash',
    icon: '📉',
    minAge: 18,
    maxAge: 70,
    weight: 1.3,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'business_finance',
    description:
      'Global macroeconomic headlines trigger a 4.5% morning sell-off across index futures. Anxious institutional clients are calling {companyName} nonstop.',
    choices: [
      {
        id: 'execute_hedging_strategy',
        label: 'Execute systematic portfolio hedges, rebalance into defensive assets, and publish a calm investor memo',
        icon: '🛡️',
        outcomes: [
          {
            message:
              'Your steady risk mitigation protected millions in client capital while the broader market bled! You received a discretionary quarterly bonus.',
            effects: { jobPerformance: 18, cash: 2000, smarts: 3, happiness: 8 },
          },
        ],
      },
      {
        id: 'advise_staying_course',
        label: 'Host individual client calls reminding them of long-term fundamentals and dollar-cost averaging',
        icon: '📞',
        outcomes: [
          {
            message:
              'Clients appreciated your reassuring, steady guidance. By market close, indices rebounded 2% off the lows.',
            effects: { jobPerformance: 10, happiness: 4 },
          },
        ],
      },
      {
        id: 'panic_sell_all_holdings',
        label: 'Panic, dump all equity positions at the morning market bottom, and move to cash',
        icon: '💸',
        outcomes: [
          {
            message:
              'You locked in massive losses right at the bottom before afternoon buyers drove prices back up. Portfolio partners were furious.',
            effects: { jobPerformance: -20, cash: -500, happiness: -10 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_business_big_client_intro',
    title: 'The Whimsical Billionaire Client',
    icon: '💼',
    minAge: 18,
    maxAge: 70,
    weight: 1.1,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'business_finance',
    description:
      'Arthur Pendelton, an eccentric multi-millionaire investor, visits {companyName} looking for a trusted manager to oversee his latest commercial venture.',
    choices: [
      {
        id: 'deliver_bespoke_pitch',
        label: 'Present a tailored financial model with conservative risk guardrails and clear upside',
        icon: '📑',
        outcomes: [
          {
            message:
              'Arthur leaned back and chuckled: "Splendid! Clear thinking without the nonsense." Arthur signed the account with you on the spot!',
            effects: { jobPerformance: 16, cash: 1800, happiness: 8 },
            personIntroduced: {
              firstName: 'Arthur',
              lastName: 'Pendelton',
              gender: 'male',
              role: 'VIP Client & Investor',
              relationshipType: 'mentor',
              relationship: 85,
              originStory: 'Impressed by your bespoke portfolio pitch at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '🎩',
            },
          },
        ],
      },
      {
        id: 'entertain_with_dinner',
        label: 'Take Arthur to an upscale steakhouse and focus on building personal rapport',
        icon: '🍷',
        outcomes: [
          {
            message:
              'Arthur enjoyed your company and signed a trial engagement. An exciting new high-net-worth connection!',
            effects: { jobPerformance: 8, cash: 500, happiness: 5 },
            personIntroduced: {
              firstName: 'Arthur',
              lastName: 'Pendelton',
              gender: 'male',
              role: 'VIP Client & Investor',
              relationshipType: 'friend',
              relationship: 75,
              originStory: 'Connected over dinner discussing commercial ventures at {companyName}',
              stageMet: 'adulthood',
              avatarEmoji: '🎩',
            },
          },
        ],
      },
      {
        id: 'promise_unrealistic_gains',
        label: 'Guarantee Arthur 40% annual returns with "zero risk"',
        icon: '🚀',
        outcomes: [
          {
            message:
              'Arthur scoffed: "I did not build my fortune listening to carnival barkers." He walked straight out of the conference room.',
            effects: { jobPerformance: -12, happiness: -6 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 6. HOSPITALITY & RETAIL EVENTS (`hospitality_retail`)
  // ==========================================================================
  {
    id: 'wp_retail_rush_chaos',
    title: 'The Saturday Rush Hour Crush',
    icon: '🍔',
    minAge: 16,
    maxAge: 65,
    weight: 1.4,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'hospitality_retail',
    description:
      'A bus tour unloads 50 hungry guests all at once at {companyName}! The kitchen ticket printer is spitting receipts non-stop and the line stretches out the door.',
    choices: [
      {
        id: 'orchestrate_kitchen_assembly',
        label: 'Organize an efficient assembly line, call orders clearly, and keep tickets moving in sync',
        icon: '⚡',
        outcomes: [
          {
            message:
              'You turned chaos into poetry! Every single order flew out fresh and hot in under 12 minutes. The team shared a massive tip pool!',
            effects: { jobPerformance: 16, cash: 180, happiness: 6 },
          },
          {
            message:
              'It was a breathless hour of non-stop hustle, but you powered through and kept customer wait times manageable.',
            effects: { jobPerformance: 10, cash: 90, happiness: 2 },
          },
        ],
      },
      {
        id: 'keep_calm_and_steady',
        label: 'Keep your head down and fulfill each ticket one by one with steady accuracy',
        icon: '👌',
        outcomes: [
          {
            message:
              'Zero mistakes were made on your station, though the wait times dragged a bit.',
            effects: { jobPerformance: 6, cash: 40 },
          },
        ],
      },
      {
        id: 'hide_in_walk_in',
        label: 'Pretend you are restocking mayonnaise in the walk-in freezer until the rush ends',
        icon: '🥶',
        outcomes: [
          {
            message:
              'Your teammates noticed your disappearance immediately. The shift manager wrote you up for deserting the line.',
            effects: { jobPerformance: -16, happiness: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 'wp_retail_generous_tipper',
    title: 'The Secret Hundred-Dollar Tip',
    icon: '💵',
    minAge: 16,
    maxAge: 65,
    weight: 1.0,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'hospitality_retail',
    description:
      'While cleaning off a table at {companyName}, you find a folded $100 bill tucked under a coffee cup with a note: "For the hardworking star on shift tonight!"',
    choices: [
      {
        id: 'pocket_grateful_tip',
        label: 'Smile warmly, tuck the well-earned $100 into your apron, and keep crushing your shift',
        icon: '😇',
        outcomes: [
          {
            message:
              'Hard work truly pays off! That unexpected $100 cash made your whole week brighter.',
            effects: { cash: 100, happiness: 10 },
          },
        ],
      },
      {
        id: 'split_with_team',
        label: 'Split the $100 tip evenly among the shift crew so everyone shares the good fortune',
        icon: '🍕',
        outcomes: [
          {
            message:
              'Your teammates cheered your generosity! Everyone bought pizza together after the shift and moral was at an all-time high.',
            effects: { cash: 25, happiness: 8, popularity: 6, karma: 6 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 7. TRADES & OPERATIONS EVENTS (`trades_services`)
  // ==========================================================================
  {
    id: 'wp_trades_safety_hazard',
    title: 'High-Voltage Breaker Spark',
    icon: '⚡',
    minAge: 18,
    maxAge: 65,
    weight: 1.3,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'trades_services',
    description:
      'While inspecting an industrial power cabinet at {companyName}, a buzzing arc flashes from a corroded busbar. The master switch is vibrating.',
    choices: [
      {
        id: 'isolate_upstream_breaker',
        label: 'Trip the main upstream feed breaker, tag the panel out, and test for zero voltage safely',
        icon: '🧯',
        outcomes: [
          {
            message:
              'Textbook safety procedure! You averted a dangerous electrical fire and rewired the busbar with pristine new copper lugs.',
            effects: { jobPerformance: 18, smarts: 3, karma: 8, happiness: 6 },
          },
        ],
      },
      {
        id: 'replace_with_pliers',
        label: 'Try to tighten the loose screw right away with standard rubber-grip pliers without disconnecting',
        icon: '🔧',
        outcomes: [
          {
            message:
              'A huge shower of sparks exploded! Your gloves saved your hands, but the main fuse blew and plunged the floor into darkness.',
            effects: { jobPerformance: -14, health: -8, happiness: -6 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 8. AVIATION & TRANSPORT EVENTS (`aviation_transport`)
  // ==========================================================================
  {
    id: 'wp_aviation_weather_diversion',
    title: 'Severe Thunderstorm on Approach',
    icon: '✈️',
    minAge: 18,
    maxAge: 65,
    weight: 1.3,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'aviation_transport',
    description:
      'En route into destination airspace on your shift with {companyName}, Doppler radar shows a sudden microburst storm cell directly over the runway threshold.',
    choices: [
      {
        id: 'divert_to_alternate',
        label: 'Execute a go-around immediately, coordinate with ATC, and divert to your planned alternate airport',
        icon: '🛬',
        outcomes: [
          {
            message:
              'Flawless airmanship! You landed smoothly in clear skies with ample fuel reserves. Passengers applauded the captain’s prudent safety call.',
            effects: { jobPerformance: 18, smarts: 3, karma: 8, happiness: 6 },
          },
        ],
      },
      {
        id: 'enter_holding_pattern',
        label: 'Request a 20-minute holding pattern at 10,000 feet to see if the storm cell clears quickly',
        icon: '🔄',
        outcomes: [
          {
            message:
              'The storm cell drifted east after 15 minutes, allowing for a safe, smooth landing on the primary runway without diversion.',
            effects: { jobPerformance: 12, smarts: 2, happiness: 4 },
          },
        ],
      },
      {
        id: 'attempt_blind_landing',
        label: 'Try to punch through the heavy rain and land anyway without full runway visual cues',
        icon: '⛈️',
        outcomes: [
          {
            message:
              'Severe wind shear triggered the ground proximity warning alarm! You pulled up at the last second. The flight safety board issued a formal review.',
            effects: { jobPerformance: -22, happiness: -10 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 9. ARTS, DESIGN & MEDIA EVENTS (`arts_media`)
  // ==========================================================================
  {
    id: 'wp_arts_crazy_revisions',
    title: 'The 11th-Hour Revision Demands',
    icon: '🎨',
    minAge: 18,
    maxAge: 65,
    weight: 1.3,
    category: 'career',
    requiresEmployed: true,
    requiredCareerField: 'arts_media',
    description:
      'Two hours before final print and media rollout for {companyName}, a major marketing client demands to swap the color palette and rework the primary typography.',
    choices: [
      {
        id: 'negotiate_smart_compromise',
        label: 'Present two high-impact visual tweaks that achieve their goal while preserving the print deadline',
        icon: '💡',
        outcomes: [
          {
            message:
              'The client loved your responsive, collaborative creativity! The campaign launched on time to rave reviews from executive leadership.',
            effects: { jobPerformance: 16, smarts: 3, happiness: 8, cash: 500 },
          },
        ],
      },
      {
        id: 'pull_emergency_sprint',
        label: 'Gulp a double espresso and sprint to implement all 14 revisions before the press rolls',
        icon: '☕',
        outcomes: [
          {
            message:
              'You pulled it off by the skin of your teeth! The client sent a glowing thank-you note, though your eyes were burning from screen fatigue.',
            effects: { jobPerformance: 12, health: -3, happiness: 3 },
          },
        ],
      },
      {
        id: 'refuse_rudely',
        label: 'Send back an all-caps email stating that true artists never alter their masterpiece',
        icon: '🤬',
        outcomes: [
          {
            message:
              'The client threatened to cancel their entire contract with {companyName}. The studio director had to step in and apologize personally.',
            effects: { jobPerformance: -18, happiness: -7 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 10. FREELANCE GIG WORK EVENTS (`freelance`)
  // ==========================================================================
  {
    id: 'wp_freelance_scope_creep',
    title: 'The Unpaid Scope Creep Trap',
    icon: '🌐',
    minAge: 18,
    maxAge: 70,
    weight: 1.4,
    category: 'career',
    requiresEmployed: true,
    requiredEmploymentType: 'freelance',
    description:
      'A freelance client for your independent business ({companyName}) asks for three extra features and an uncontracted mobile redesign without increasing your project fee.',
    choices: [
      {
        id: 'send_phase_two_quote',
        label: 'Send a polite, professional Phase 2 scope estimate pricing the new requests clearly',
        icon: '📑',
        outcomes: [
          {
            message:
              'The client respected your clear business boundaries and approved the Phase 2 contract with an extra $1,200 deposit!',
            effects: { jobPerformance: 14, cash: 1200, smarts: 2, happiness: 8 },
          },
        ],
      },
      {
        id: 'compromise_on_one',
        label: 'Offer one minor cosmetic revision as a goodwill bonus while keeping the core contract firm',
        icon: '🤝',
        outcomes: [
          {
            message:
              'The client was thrilled with the extra polish and left a glowing 5-star public testimonial on your portfolio!',
            effects: { jobPerformance: 10, happiness: 6 },
          },
        ],
      },
      {
        id: 'do_all_for_free',
        label: 'Work 30 unbilled hours for free out of fear the client might get upset',
        icon: '😩',
        outcomes: [
          {
            message:
              'You burned out working for free. The client continued making even more endless demands without paying an extra cent.',
            effects: { happiness: -8, health: -4 },
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // 11. PART-TIME TEEN GIG EVENTS (`part_time`)
  // ==========================================================================
  {
    id: 'wp_part_time_exam_conflict',
    title: 'Midterm Exam vs. Weekend Shift',
    icon: '📚',
    minAge: 16,
    maxAge: 18,
    weight: 1.4,
    category: 'career',
    requiresEmployed: true,
    requiredEmploymentType: 'part_time',
    description:
      'Your manager at {companyName} scheduled you for a late Friday evening shift, right before your high school chemistry midterm on Monday morning.',
    choices: [
      {
        id: 'swap_shifts_early',
        label: 'Find a responsible coworker to swap shifts with three days in advance',
        icon: '🔄',
        outcomes: [
          {
            message:
              'Shift successfully swapped! You spent Friday evening studying in peace and aced your chemistry exam with an A!',
            effects: { grades: 8, smarts: 2, happiness: 5 },
          },
        ],
      },
      {
        id: 'work_and_study_late',
        label: 'Work the full shift, then stay up late studying with energy drinks and flashcards',
        icon: '⚡',
        outcomes: [
          {
            message:
              'You earned your paycheck and passed your exam with a B+, but were completely exhausted all weekend.',
            effects: { cash: 90, jobPerformance: 6, health: -4, happiness: -2 },
          },
        ],
      },
      {
        id: 'call_in_fake_sick',
        label: 'Call in "sick" thirty minutes before your shift starts and stay home',
        icon: '🤒',
        outcomes: [
          {
            message:
              'A coworker saw you studying at the cafe right down the street. Your manager gave you a formal written warning for attendance.',
            effects: { jobPerformance: -14, karma: -4, happiness: -4 },
          },
        ],
      },
    ],
  },
];
