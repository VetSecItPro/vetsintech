// ============================================================================
// Email Domain Queries
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type { EmailPreference, EmailLog } from "./types";

/**
 * Get a user's email preferences. Returns null if no preferences row exists.
 */
export async function getUserEmailPreferences(
  userId: string
): Promise<EmailPreference | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }

  return data;
}

/**
 * Get email logs for an organization (admin view).
 */
export async function getEmailLog(
  organizationId: string,
  options?: { limit?: number; offset?: number }
): Promise<EmailLog[]> {
  const supabase = await createClient();

  let query = supabase
    .from("email_log")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}
