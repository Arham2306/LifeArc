import type { StatEffects } from '../../types/game';

export type SocialActionType =
  | 'spend_time'
  | 'conversation'
  | 'compliment'
  | 'insult'
  | 'give_gift'
  | 'ask_money';

export type GiftTier = 'handmade' | 'thoughtful' | 'luxury' | 'lavish';

export interface InteractiveOption {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export interface GiftOption {
  id: string;
  name: string;
  cost: number;
  icon: string;
  tier: GiftTier;
  description: string;
}

export interface SocialActionOutcome {
  actionType: SocialActionType;
  success: boolean;
  headline: string;
  narrative: string;
  relationshipDelta: number;
  statEffects: StatEffects;
  targetName: string;
  cashDelta?: number;
}

export type FriendOrigin = 'childhood_school' | 'university' | 'workplace' | 'community';

export interface ProspectiveFriend {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'non-binary';
  age: number;
  role: string;
  originStory: string;
  stageMet: 'childhood' | 'middle_school' | 'high_school' | 'university' | 'adulthood';
  avatarEmoji?: string;
  initialRelationship: number;
}

