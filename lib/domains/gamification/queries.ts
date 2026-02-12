// ============================================================================
// Gamification Domain Queries
// Read-only Supabase queries for badges, XP, streaks, and leaderboards
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  Badge,
  XpEvent,
  Streak,
  LeaderboardEntry,
  BadgeCatalogItem,
  UserBadgeWithDetails,
} from "./types";
import { calculateLevel, getLevelTitle } from "./utils";

// ============================================================================
// XP
// ============================================================================

/**
 * Get the total XP for a user across all events in an organization.
 */
export async function getUserXpTotal(
  userId: string,
  organizationId: string
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("xp_events")
    .select("xp_amount")
    .eq("user_id", userId)
    .eq("organization_id", organizationId);

  if (error) throw error;

  return (data || []).reduce((sum, row) => sum + row.xp_amount, 0);
}

/**
 * Get recent XP events for a user, ordered by most recent first.
 */
export async function getRecentXpEvents(
  userId: string,
  organizationId: string,
  limit: number = 10
): Promise<XpEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("xp_events")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Badges
// ============================================================================

/**
 * Get all badges a user has earned, joined with badge details.
 */
export async function getUserBadges(
  userId: string,
  organizationId: string
): Promise<UserBadgeWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_badges")
    .select(
      `
      id,
      badge_id,
      earned_at,
      badge:badges!inner(
        id,
        name,
        description,
        icon,
        rarity,
        xp_reward,
        criteria,
        organization_id,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .eq("badge.organization_id", organizationId)
    .order("earned_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    badge_id: row.badge_id,
    earned_at: row.earned_at,
    badge: row.badge as unknown as Badge,
  }));
}

/**
 * Get the badge catalog for an organization, with earned status per user.
 */
export async function getBadgeCatalog(
  userId: string,
  organizationId: string
): Promise<BadgeCatalogItem[]> {
  const supabase = await createClient();

  // Get all badges for the org
  const { data: badges, error: badgesError } = await supabase
    .from("badges")
    .select("*")
    .eq("organization_id", organizationId)
    .order("rarity", { ascending: true });

  if (badgesError) throw badgesError;

  // Get all earned badges for this user
  const { data: earned, error: earnedError } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", userId);

  if (earnedError) throw earnedError;

  const earnedMap = new Map(
    (earned || []).map((e) => [e.badge_id, e.earned_at])
  );

  return (badges || []).map((badge) => ({
    ...badge,
    earned: earnedMap.has(badge.id),
    earned_at: earnedMap.get(badge.id) ?? null,
  }));
}

// ============================================================================
// Streaks
// ============================================================================

/**
 * Get the streak record for a user in an organization.
 * Returns null if no streak record exists.
 */
export async function getUserStreak(
  userId: string,
  organizationId: string
): Promise<Streak | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

// ============================================================================
// Leaderboard
// ============================================================================

/**
 * Get the top N users by XP in an organization.
 * Supports "all_time" and "this_month" periods.
 */
export async function getLeaderboard(
  organizationId: string,
  options?: { limit?: number; period?: "all_time" | "this_month" }
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const limit = options?.limit ?? 50;
  const period = options?.period ?? "all_time";

  // Build XP query based on period
  let xpQuery = supabase
    .from("xp_events")
    .select("user_id, xp_amount")
    .eq("organization_id", organizationId);

  if (period === "this_month") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    xpQuery = xpQuery.gte("created_at", startOfMonth.toISOString());
  }

  const { data: xpRows, error: xpError } = await xpQuery.limit(10000);
  if (xpError) throw xpError;

  // Aggregate XP per user
  const xpByUser = new Map<string, number>();
  for (const row of xpRows || []) {
    xpByUser.set(row.user_id, (xpByUser.get(row.user_id) ?? 0) + row.xp_amount);
  }

  // Sort by XP descending and take top N
  const sortedUsers = Array.from(xpByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (sortedUsers.length === 0) return [];

  const userIds = sortedUsers.map(([uid]) => uid);

  // Fetch profiles for these users
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  if (profileError) throw profileError;

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  // Fetch badge counts
  const { data: badgeRows, error: badgeError } = await supabase
    .from("user_badges")
    .select("user_id, badge:badges!inner(organization_id)")
    .eq("badge.organization_id", organizationId)
    .in("user_id", userIds);

  if (badgeError) throw badgeError;

  const badgeCountByUser = new Map<string, number>();
  for (const row of badgeRows || []) {
    badgeCountByUser.set(
      row.user_id,
      (badgeCountByUser.get(row.user_id) ?? 0) + 1
    );
  }

  // Fetch streaks
  const { data: streakRows, error: streakError } = await supabase
    .from("streaks")
    .select("user_id, current_streak")
    .eq("organization_id", organizationId)
    .in("user_id", userIds);

  if (streakError) throw streakError;

  const streakByUser = new Map(
    (streakRows || []).map((s) => [s.user_id, s.current_streak])
  );

  // Build leaderboard entries
  return sortedUsers.map(([userId, totalXp], index) => {
    const profile = profileMap.get(userId);
    const level = calculateLevel(totalXp);

    return {
      rank: index + 1,
      user_id: userId,
      full_name: profile?.full_name ?? "Unknown",
      avatar_url: profile?.avatar_url ?? null,
      total_xp: totalXp,
      level,
      level_title: getLevelTitle(level),
      badge_count: badgeCountByUser.get(userId) ?? 0,
      current_streak: streakByUser.get(userId) ?? 0,
    };
  });
}
