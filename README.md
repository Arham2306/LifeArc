# LifeArc 🎮

[![React](https://img.shields.io/badge/React-19.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-6%2F6%20Passed-10b981)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**LifeArc** is an interactive, mobile-first life simulation web game inspired by text-driven simulation titles like *BitLife*. Guide your character year-by-year from birth through childhood, academics, career milestones, entrepreneurial ventures, and eventual retirement or mortality.

Designed with a playful **neo-brutalist "cartoon" aesthetic** featuring bold ink borders, dynamic stat meters, tactile drop-shadows, and rich narrative choice events.

---

## ✨ Features

- 👶 **Character Generation & Lineage**: Choose or randomize name, gender, nationality across 250+ countries, starting city, parents with socioeconomic background, and baseline vitality genetics.
- ⏳ **Lifespan & Aging Engine**: Progress year-by-year with natural age-dependent health curves, developmental milestones, parental aging/mortality (75+), grief mechanics, and obituary summaries.
- 🎓 **Education System**:
  - Elementary, Middle School, and High School with GPA grades, studying harder, skipping class, dropping out, or participating in athletics, arts, and academic clubs.
  - University with 12 majors and multiple tuition funding models (merit scholarships, athletic grants, parental funding, student debt, or self-paid).
  - Graduate & Professional Schools: Medical School (M.D.), Law School (J.D.), Business School (M.B.A.), and Graduate STEM (Ph.D.).
- 💼 **Career & Workplace System**:
  - 40+ positions spanning 9 industries (Technology, Medicine, Business/Finance, Law/Government, Arts/Media, Trades, Hospitality, Aviation, Science).
  - Job interviews with scenario questions and pass/fail criteria.
  - Workplace actions: Work Harder, Slack Off, Ask for Raise, Ask for Promotion, Socialize with Coworkers.
  - Real-world paycheck math: automated tax withholding, direct student loan paycheck deductions, and retirement pensions.
- 🏢 **Business & Entrepreneurship**:
  - Found businesses across 7 sectors with 12 business archetypes.
  - Multiple capital tiers and funding methods (Bootstrapping, Commercial Bank Loans, Angel Equity).
  - Corporate levers: Pricing, Marketing, Payroll competitiveness, R&D budgets, CEO salary, and dividend distributions.
  - Executive actions: Workforce scaling, retreats, bonuses, equipment upgrades, operations audits, branch expansions, and corporate rebranding.
  - Annual P&L financial reports, company valuation, private acquisitions, and Initial Public Offerings (IPO).
- 🎲 **Branching Narrative Events**: Hundreds of interactive dilemmas across infancy, school years, dorm life, workplace crises, corporate decisions, and family situations with multi-attribute consequences and NPC relationship introductions.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/) with `@tailwindcss/vite`
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Linter**: [Oxlint](https://oxc.rs/)
- **Testing**: [Node Test Runner](https://nodejs.org/api/test.html) via [tsx](https://github.com/privatenumber/tsx)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or newer recommended)
- `npm` (v10 or newer)

### Installation

```bash
# Clone repository
git clone https://github.com/<your-username>/lifearc.git
cd lifearc

# Install dependencies
npm install
```

### Running Locally

```bash
# Start development server with Hot Module Replacement (HMR)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Verification

Run the full simulation test suite covering aging mechanics, career ladders, workplace actions, entrepreneurship financials, and event branches:

```bash
# Run all simulation tests
npm test

# Run code linter
npm run lint

# Production build & type check
npm run build
```

---

## 📂 Project Architecture

```
lifearc/
├── public/                 # Static assets and favicon
├── src/
│   ├── assets/             # Images and graphic assets
│   ├── components/
│   │   ├── game/           # In-game widgets (LifeTimeline, VitalityCard, DeathModal)
│   │   ├── layout/         # Shell components (ProfileDashboard, BottomNav)
│   │   └── ui/             # Reusable cartoon UI design system (Buttons, Cards, Inputs, Modals)
│   ├── constants/          # Vitality stats metadata
│   ├── modules/
│   │   ├── aging/          # Milestone schedules, aging engine, mortality curves
│   │   ├── business/       # Entrepreneurship models, levers, P&L simulation, executive actions
│   │   ├── career/         # Job catalog, interview mini-games, promotions, payroll
│   │   ├── character/      # Lineage, names, geolocation APIs, stat clamping
│   │   ├── education/      # K-12, university majors, tuition loans, professional schools
│   │   └── events/         # Narrative event pools (Toddler, Child, Teen, Workplace, Business)
│   ├── types/              # Domain TypeScript interfaces (CharacterProfile, StatEffects, etc.)
│   ├── utils/              # ID generation and random utility helpers
│   ├── App.tsx             # Root application orchestrator
│   └── main.tsx            # React application entrypoint
├── index.html              # HTML entrypoint
├── package.json
└── vite.config.ts
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
