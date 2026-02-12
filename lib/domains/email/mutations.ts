// ============================================================================
// Email Domain Mutations
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type { EmailPreference, UpdateEmailPreferencesInput } from "./types";

/**
 * Update an existing email preferences row (partial update).
 */
export async function updateEmailPreferences(
  userId: string,
  input: UpdateEmailPreferencesInput
): Promise<EmailPreference> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.announcement_emails !== undefined)
    payload.announcement_emails = input.announcement_emails;
  if (input.grade_emails !== undefined)
    payload.grade_emails = input.grade_emails;
  if (input.assignment_reminder_emails !== undefined)
    payload.assignment_reminder_emails = input.assignment_reminder_emails;
  if (input.enrollment_emails !== undefined)
    payload.enrollment_emails = input.enrollment_emails;
  if (input.discussion_reply_emails !== undefined)
    payload.discussion_reply_emails = input.discussion_reply_emails;
  if (input.weekly_digest !== undefined)
    payload.weekly_digest = input.weekly_digest;

  const { data, error } = await supabase
    .from("email_preferences")
    .update(payload)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create default email preferences for a user (called on first access).
 */
export async function createDefaultPreferences(
  userId: string,
  organizationId: string
): Promise<EmailPreference> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_preferences")
    .insert({
      user_id: userId,
      organization_id: organizationId,
      announcement_emails: true,
      grade_emails: true,
      assignment_reminder_emails: true,
      enrollment_emails: true,
      discussion_reply_emails: false,
      weekly_digest: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
