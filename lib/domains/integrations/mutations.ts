import { createClient } from "@/lib/supabase/server";
import type { ExternalPlatform } from "./types";

export async function upsertPlatformConfig(
  orgId: string,
  platform: ExternalPlatform,
  data: {
    credentials: Record<string, string>;
    sync_frequency_minutes?: number;
    is_enabled?: boolean;
  }
) {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("platform_configs")
    .upsert(
      {
        organization_id: orgId,
        platform,
        credentials: data.credentials,
        sync_frequency_minutes: data.sync_frequency_minutes ?? 60,
        is_enabled: data.is_enabled ?? true,
      },
      {
        onConflict: "organization_id,platform",
      }
    )
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateSyncStatus(
  configId: string,
  status: string,
  error?: string
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    sync_status: status,
    sync_error: error ?? null,
  };

  if (status === "idle") {
    updateData.last_synced_at = new Date().toISOString();
  }

  const { data: result, error: dbError } = await supabase
    .from("platform_configs")
    .update(updateData)
    .eq("id", configId)
    .select()
    .single();

  if (dbError) throw dbError;
  return result;
}

export async function upsertExternalEnrollment(data: {
  organization_id: string;
  user_id: string;
  platform: ExternalPlatform;
  external_course_id: string;
  external_course_title: string;
  enrolled_at: string | null;
}) {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("external_enrollments")
    .upsert(data, {
      onConflict: "organization_id,user_id,platform,external_course_id",
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function upsertExternalProgress(data: {
  external_enrollment_id: string;
  progress_percentage: number;
  status: string;
  completed_at: string | null;
  time_spent_minutes: number | null;
  last_activity_at: string | null;
  synced_at: string;
}) {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("external_progress")
    .upsert(data, {
      onConflict: "external_enrollment_id",
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}
