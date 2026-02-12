// ============================================================================
// Gamification Domain Types
// Maps to: badges, user_badges, xp_events, streaks tables
// Related: profiles, organizations
// ============================================================================

// ---------- Enums ----------

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type XpEventType =
  | "lesson_complete"
  | "course_complete"
  | "quiz_pass"
  | "quiz_perfect"
  | "assignment_submit"
  | "first_post"
  | "helpful_reply"
  | "streak_milestone"
  | "badge_earned"
  | "path_complete"
  | "login_streak";

// ---------- Core Entities ----------

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  xp_reward: number;
  criteria: BadgeCriteria;
  organization_id: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface XpEvent {
  id: string;
  user_id: string;
  event_type: XpEventType;
  xp_amount: number;
  source_id: string | null;
  source_type: string | null;
  description: string | null;
  organization_id: string;
  created_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  organization_id: string;
  updated_at: string;
}

// ---------- Badge Criteria ----------

export interface BadgeCriteria {
  type: string;
  threshold: number;
}

// ---------- Joined / Extended Types ----------

/** Badge with whether the current user has earned it */
export interface BadgeCatalogItem extends Badge {
  earned: boolean;
  earned_at: string | null;
}

/** Leaderboard entry for a single user */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  level_title: string;
  badge_count: number;
  current_streak: number;
}

/** Complete gamification profile for a user */
export interface UserGamificationProfile {
  user_id: string;
  total_xp: number;
  level: number;
  level_title: string;
  xp_for_current_level: number;
  xp_for_next_level: number;
  xp_progress_in_level: number;
  badges: UserBadgeWithDetails[];
  current_streak: number;
  longest_streak: number;
  recent_xp_events: XpEvent[];
}

/** User badge joined with badge details */
export interface UserBadgeWithDetails {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

// ---------- Input Types ----------

export interface AwardXpInput {
  user_id: string;
  event_type: XpEventType;
  xp_amount: number;
  source_id?: string;
  source_type?: string;
  description?: string;
  organization_id: string;
}

export interface AwardBadgeInput {
  user_id: string;
  badge_id: string;
}

export interface BadgeCreateInput {
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  xp_reward: number;
  criteria: BadgeCriteria;
  organization_id: string;
}
