// ============================================================================
// Notification & Announcement Domain Queries
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type { AnnouncementWithAuthor, Notification } from "./types";

// ============================================================================
// Announcement Queries
// ============================================================================

/**
 * Get published announcements for an organization.
 * Optionally filter by cohort_id. Includes author profile.
 */
export async function getAnnouncements(
  organizationId: string,
  options?: { cohort_id?: string; limit?: number; offset?: number }
): Promise<AnnouncementWithAuthor[]> {
  const supabase = await createClient();

  let query = supabase
    .from("announcements")
    .select(
      `
      *,
      author:profiles!inner(full_name)
    `
    )
    .eq("organization_id", organizationId)
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (options?.cohort_id) {
    query = query.eq("cohort_id", options.cohort_id);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 20) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    author: row.author as unknown as { full_name: string },
  }));
}

/**
 * Get a single announcement by ID with author profile.
 */
export async function getAnnouncementById(
  announcementId: string
): Promise<AnnouncementWithAuthor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      *,
      author:profiles!inner(full_name)
    `
    )
    .eq("id", announcementId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    author: data.author as unknown as { full_name: string },
  };
}

/**
 * Get all announcements (including unpublished) for admin view.
 */
export async function getAdminAnnouncements(
  organizationId: string
): Promise<AnnouncementWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      *,
      author:profiles!inner(full_name)
    `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    author: row.author as unknown as { full_name: string },
  }));
}

// ============================================================================
// Notification Queries
// ============================================================================

/**
 * Get notifications for a user in an organization.
 * Optionally filter by read status.
 */
export async function getNotifications(
  userId: string,
  organizationId: string,
  options?: { is_read?: boolean; limit?: number; offset?: number }
): Promise<Notification[]> {
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (options?.is_read !== undefined) {
    query = query.eq("is_read", options.is_read);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 20) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

/**
 * Get the count of unread notifications for a user in an organization.
 */
export async function getUnreadCount(
  userId: string,
  organizationId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Get a single notification by ID.
 */
export async function getNotificationById(
  notificationId: string
): Promise<Notification | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}
