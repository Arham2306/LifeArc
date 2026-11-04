import type { RomanticStage } from '../../types/game';

export interface DatingCandidate {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary';
  looks: number;
  smarts: number;
  craziness: number;
  generosity: number;
  fertility: number;
  occupation: string;
  annualIncome: number;
  bio: string;
  avatarEmoji: string;
}

export interface FlirtOption {
  id: string;
  label: string;
  style: 'playful' | 'cheesy' | 'subtle' | 'bold';
  dialogue: string;
  minRomance: number; // minimum romance to feel natural
  difficulty: number; // 0 - 100 check vs looks/smarts
  successMessage: string;
  awkwardMessage: string;
  rejectionMessage: string;
}

export interface DateVenue {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  cost: number;
  vibe: string;
  description: string;
  emoji: string;
  minRomance: number;
  happinessBonus: number;
  relationshipBonus: number;
  romanceBonus: number;
}

export interface RomanticTalkOption {
  id: string;
  topic: string;
  dialogue: string;
  minRomance: number;
  traitRevealed?: 'craziness' | 'generosity' | 'fertility' | 'marriageReadiness' | 'smarts' | 'looks';
  reaction: string;
}

export interface RomanticGift {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  minRomance: number;
  prestige: number;
  relationshipDelta: number;
  romanceDelta: number;
  reaction: string;
}

export interface EngagementRing {
  id: string;
  name: string;
  cost: number;
  tierScore: number; // 0 - 100
  carat?: string;
  material: string;
  emoji: string;
  description: string;
}

export interface ProposalVenue {
  id: string;
  name: string;
  cost: number;
  atmosphereScore: number;
  emoji: string;
  description: string;
}

export interface WeddingVenue {
  id: string;
  name: string;
  cost: number;
  guestCapacity: string;
  emoji: string;
  prestigeScore: number;
  happinessDelta: number;
  description: string;
}

export interface RomanceActionResult {
  success: boolean;
  message: string;
  relationshipDelta: number;
  romanceDelta: number;
  happinessDelta?: number;
  cashDelta?: number;
  newRomanticStage?: RomanticStage;
  conceptionOccurred?: boolean;
  unlockedRomance?: boolean;
}

export interface DivorceSettlement {
  partnerShareCash: number;
  playerRetainedCash: number;
  childSupportAnnual: number;
  custodyHolder: 'player' | 'partner' | 'shared';
  alimonyPaid: number;
  summaryMessage: string;
}
