// ============================================================================
// Notification & Announcement Domain Mutations
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  Announcement,
  Notification,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  CreateNotificationInput,
} from "./types";

// ============================================================================
// Announcement Mutations
// ============================================================================

/**
 * Create a new announcement (starts unpublished).
 */
export async function createAnnouncement(
  organizationId: string,
  authorId: string,
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      organization_id: organizationId,
      author_id: authorId,
      title: input.title,
      body: input.body,
      cohort_id: input.cohort_id || null,
      is_published: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing announcement.
 */
export async function updateAnnouncement(
  announcementId: string,
  input: UpdateAnnouncementInput
): Promise<Announcement> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.body !== undefined) payload.body = input.body;
  if (input.cohort_id !== undefined)
    payload.cohort_id = input.cohort_id || null;

  const { data, error } = await supabase
    .from("announcements")
    .update(payload)
    .eq("id", announcementId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an announcement.
 */
export async function deleteAnnouncement(
  announcementId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId);

  if (error) throw error;
}

/**
 * Publish an announcement. Sets is_published=true and published_at=now().
 */
export async function publishAnnouncement(
  announcementId: string
): Promise<Announcement> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", announcementId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Unpublish an announcement. Sets is_published=false and clears published_at.
 */
export async function unpublishAnnouncement(
  announcementId: string
): Promise<Announcement> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .update({
      is_published: false,
      published_at: null,
    })
    .eq("id", announcementId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Notification Mutations
// ============================================================================

/**
 * Create a single notification.
 */
export async function createNotification(
  organizationId: string,
  input: CreateNotificationInput
): Promise<Notification> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      organization_id: organizationId,
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      body: input.body || null,
      link: input.link || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create multiple notifications at once (e.g., notify all users in a cohort
 * about a new announcement).
 */
export async function createBulkNotifications(
  organizationId: string,
  inputs: CreateNotificationInput[]
): Promise<Notification[]> {
  const supabase = await createClient();

  const rows = inputs.map((input) => ({
    organization_id: organizationId,
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body || null,
    link: input.link || null,
    metadata: input.metadata || {},
  }));

  const { data, error } = await supabase
    .from("notifications")
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(
  notificationId: string
): Promise<Notification> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark all unread notifications as read for a user in an organization.
 */
export async function markAllAsRead(
  userId: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("is_read", false);

  if (error) throw error;
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(
  notificationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
}

// ============================================================================
// Notification Triggers
// ============================================================================

/**
 * Notify all students in an organization when an announcement is published.
 * Queries the announcement by ID, then gets all student user_ids in the org
 * from user_roles, and creates bulk notifications.
 */
export async function notifyOnAnnouncementPublish(
  announcementId: string,
  organizationId: string
): Promise<Notification[]> {
  const supabase = await createClient();

  // Fetch the announcement to get its title
  const { data: announcement, error: announcementError } = await supabase
    .from("announcements")
    .select("title")
    .eq("id", announcementId)
    .single();

  if (announcementError) throw announcementError;

  // Get all student user_ids in the organization
  const { data: studentRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "student");

  if (rolesError) throw rolesError;

  const studentIds = (studentRoles || []).map((r) => r.user_id);

  if (studentIds.length === 0) return [];

  // Build notification inputs for each student
  const inputs: CreateNotificationInput[] = studentIds.map((userId) => ({
    user_id: userId,
    type: "announcement" as const,
    title: announcement.title,
    link: "/announcements",
  }));

  // Create bulk notifications
  return createBulkNotifications(organizationId, inputs);
}
