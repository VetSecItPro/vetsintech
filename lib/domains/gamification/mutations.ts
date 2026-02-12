// ============================================================================
// Gamification Domain Mutations
// Write operations for XP, badges, and streaks
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  XpEvent,
  UserBadge,
  Streak,
  AwardXpInput,
  AwardBadgeInput,
} from "./types";
import { getUserXpTotal, getUserBadges } from "./queries";

// ============================================================================
// XP
// ============================================================================

/**
 * Award XP to a user for an action.
 * Inserts a new xp_events row. Does NOT check for duplicates — callers
 * should ensure idempotency at the application layer if needed.
 */
export async function awardXp(input: AwardXpInput): Promise<XpEvent> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("xp_events")
    .insert({
      user_id: input.user_id,
      event_type: input.event_type,
      xp_amount: input.xp_amount,
      source_id: input.source_id ?? null,
      source_type: input.source_type ?? null,
      description: input.description ?? null,
      organization_id: input.organization_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Badges
// ============================================================================

/**
 * Award a badge to a user. Idempotent — if the badge is already earned,
 * returns the existing record.
 */
export async function awardBadge(input: AwardBadgeInput): Promise<UserBadge> {
  const supabase = await createClient();

  // Check if already earned
  const { data: existing, error: checkError } = await supabase
    .from("user_badges")
    .select("*")
    .eq("user_id", input.user_id)
    .eq("badge_id", input.badge_id)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existing) return existing;

  // Award the badge
  const { data, error } = await supabase
    .from("user_badges")
    .insert({
      user_id: input.user_id,
      badge_id: input.badge_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check all badge criteria for a user and award any they've newly qualified for.
 * Returns an array of newly awarded badges (empty if none).
 *
 * This function fetches:
 *   - All badges for the org
 *   - The user's already-earned badges
 *   - The user's total XP, lesson completions count, streak, etc.
 * Then checks each unearned badge's criteria.
 */
export async function checkAndAwardBadges(
  userId: string,
  organizationId: string
): Promise<UserBadge[]> {
  const supabase = await createClient();

  // Fetch all badges for the org
  const { data: allBadges, error: badgesError } = await supabase
    .from("badges")
    .select("*")
    .eq("organization_id", organizationId);

  if (badgesError) throw badgesError;
  if (!allBadges || allBadges.length === 0) return [];

  // Fetch already earned badges
  const earnedBadges = await getUserBadges(userId, organizationId);
  const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badge_id));

  // Uneearned badges
  const unearnedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id));
  if (unearnedBadges.length === 0) return [];

  // Gather user stats for criteria checking
  const [totalXp, lessonCount, courseCount, streakData, quizPerfectCount, discussionPostCount] =
    await Promise.all([
      getUserXpTotal(userId, organizationId),
      getLessonCompletionCount(userId),
      getCourseCompletionCount(userId),
      getStreakData(userId, organizationId),
      getQuizPerfectCount(userId),
      getDiscussionPostCount(userId),
    ]);

  const stats: Record<string, number> = {
    lessons_completed: lessonCount,
    courses_completed: courseCount,
    total_xp: totalXp,
    current_streak: streakData?.current_streak ?? 0,
    quiz_perfect: quizPerfectCount,
    discussion_posts: discussionPostCount,
  };

  // Check each unearned badge
  const newlyAwarded: UserBadge[] = [];

  for (const badge of unearnedBadges) {
    const criteria = badge.criteria as { type: string; threshold: number };
    const userValue = stats[criteria.type] ?? 0;

    if (userValue >= criteria.threshold) {
      const awarded = await awardBadge({
        user_id: userId,
        badge_id: badge.id,
      });
      newlyAwarded.push(awarded);

      // Award bonus XP for earning the badge
      if (badge.xp_reward > 0) {
        await awardXp({
          user_id: userId,
          event_type: "badge_earned",
          xp_amount: badge.xp_reward,
          source_id: badge.id,
          source_type: "badge",
          description: `Earned badge: ${badge.name}`,
          organization_id: organizationId,
        });
      }
    }
  }

  return newlyAwarded;
}

// ============================================================================
// Streaks
// ============================================================================

/**
 * Update the user's streak. Called when the user performs any qualifying activity.
 *
 * Logic:
 *   - If last_activity_date is today → no change
 *   - If last_activity_date is yesterday → increment streak
 *   - If last_activity_date is older → reset streak to 1
 *   - Update longest_streak if current exceeds it
 */
export async function updateStreak(
  userId: string,
  organizationId: string
): Promise<Streak> {
  const supabase = await createClient();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

  // Get existing streak
  const { data: existing, error: fetchError } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!existing) {
    // First ever activity — create streak record
    const { data, error } = await supabase
      .from("streaks")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: todayStr,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Already active today
  if (existing.last_activity_date === todayStr) {
    return existing;
  }

  // Check if yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak: number;
  if (existing.last_activity_date === yesterdayStr) {
    // Consecutive day
    newStreak = existing.current_streak + 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, existing.longest_streak);

  const { data, error } = await supabase
    .from("streaks")
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: todayStr,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Private Helpers — stats lookups for badge criteria checking
// ============================================================================

async function getLessonCompletionCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("lesson_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

async function getCourseCompletionCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("course_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  if (error) throw error;
  return count ?? 0;
}

async function getStreakData(
  userId: string,
  organizationId: string
): Promise<{ current_streak: number } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getQuizPerfectCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("quiz_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("score", 100);

  if (error) throw error;
  return count ?? 0;
}

async function getDiscussionPostCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("discussion_posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", userId);

  if (error) throw error;
  return count ?? 0;
}
