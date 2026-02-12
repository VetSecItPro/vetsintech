// ============================================================================
// Gamification Domain Validation
// Zod schemas for badge creation and XP events
// ============================================================================

import { z } from "zod/v4";

// ---------- Enums ----------

export const badgeRaritySchema = z.enum([
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
]);

export const xpEventTypeSchema = z.enum([
  "lesson_complete",
  "course_complete",
  "quiz_pass",
  "quiz_perfect",
  "assignment_submit",
  "first_post",
  "helpful_reply",
  "streak_milestone",
  "badge_earned",
  "path_complete",
  "login_streak",
]);

// ---------- Badge Schemas ----------

export const badgeCriteriaSchema = z.object({
  type: z
    .string()
    .min(1, "Criteria type is required")
    .max(100, "Criteria type must be under 100 characters"),
  threshold: z
    .number()
    .int("Threshold must be a whole number")
    .positive("Threshold must be positive")
    .max(100000, "Threshold seems too high"),
});

export const badgeCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Badge name must be at least 2 characters")
    .max(100, "Badge name must be under 100 characters"),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(500, "Description must be under 500 characters"),
  icon: z
    .string()
    .min(1, "Icon is required")
    .max(50, "Icon must be under 50 characters"),
  rarity: badgeRaritySchema,
  xp_reward: z
    .number()
    .int("XP reward must be a whole number")
    .min(0, "XP reward must be at least 0")
    .max(10000, "XP reward seems too high"),
  criteria: badgeCriteriaSchema,
});

// ---------- XP Event Schemas ----------

export const awardXpSchema = z.object({
  user_id: z.uuid("Invalid user ID"),
  event_type: xpEventTypeSchema,
  xp_amount: z
    .number()
    .int("XP amount must be a whole number")
    .positive("XP amount must be positive")
    .max(10000, "XP amount seems too high"),
  source_id: z.uuid("Invalid source ID").optional(),
  source_type: z
    .string()
    .max(50, "Source type must be under 50 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional(),
});

// ---------- Inferred Types ----------

export type BadgeCreateFormData = z.infer<typeof badgeCreateSchema>;
export type AwardXpFormData = z.infer<typeof awardXpSchema>;
