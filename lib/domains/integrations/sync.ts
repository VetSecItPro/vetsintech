import { createClient } from "@/lib/supabase/server";
import { getAdapter } from "./adapter";
import {
  upsertExternalEnrollment,
  upsertExternalProgress,
  updateSyncStatus,
} from "./mutations";
import { getPlatformConfigs, getPlatformConfig } from "./queries";
import type { ExternalPlatform, PlatformConfig } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncResult {
  platform: ExternalPlatform;
  enrollmentsSynced: number;
  progressSynced: number;
  errors: string[];
  durationMs: number;
}

export interface SyncStatusInfo {
  platform: ExternalPlatform;
  lastSyncedAt: string | null;
  syncStatus: string;
  syncError: string | null;
  isEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Core sync
// ---------------------------------------------------------------------------

/**
 * Sync enrollments and progress from an external platform for an organization.
 *
 * 1. Gets all user emails in the org (from profiles + user_roles)
 * 2. Calls adapter.fetchEnrollments() and adapter.fetchProgress()
 * 3. Upserts into external_enrollments and external_progress tables
 * 4. Logs per-item errors without failing the entire sync
 * 5. Returns sync counts and any errors
 */
export async function syncPlatformData(
  platformId: string,
  orgId: string
): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];

  // Fetch the platform config
  const supabase = await createClient();
  const { data: configRow, error: configError } = await supabase
    .from("platform_configs")
    .select("*")
    .eq("id", platformId)
    .eq("organization_id", orgId)
    .single();

  if (configError || !configRow) {
    return {
      platform: "coursera", // placeholder — won't be used if error
      enrollmentsSynced: 0,
      progressSynced: 0,
      errors: [configError?.message ?? "Platform config not found"],
      durationMs: Date.now() - start,
    };
  }

  const config = configRow as PlatformConfig;
  const platform = config.platform;
  const adapter = getAdapter(platform);

  // Mark as syncing
  await updateSyncStatus(config.id, "syncing");

  try {
    // 1. Get all user emails in the org
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("organization_id", orgId);

    if (profilesError) throw profilesError;

    const emailToUserId: Record<string, string> = {};
    const emails: string[] = [];
    for (const profile of profiles ?? []) {
      if (profile.email) {
        emailToUserId[profile.email.toLowerCase()] = profile.id;
        emails.push(profile.email);
      }
    }

    if (emails.length === 0) {
      await updateSyncStatus(config.id, "idle");
      return {
        platform,
        enrollmentsSynced: 0,
        progressSynced: 0,
        errors: [],
        durationMs: Date.now() - start,
      };
    }

    // 2. Fetch enrollments from external platform
    const enrollments = await adapter.fetchEnrollments(
      config.credentials,
      emails
    );

    // 3. Upsert into external_enrollments (per-item error handling)
    let enrollmentsSynced = 0;
    const enrollmentMap: Record<string, string> = {};

    for (const enrollment of enrollments) {
      const email = enrollment.userEmail.toLowerCase();
      const userId = emailToUserId[email];
      if (!userId) continue;

      try {
        const result = await upsertExternalEnrollment({
          organization_id: orgId,
          user_id: userId,
          platform,
          external_course_id: enrollment.courseId,
          external_course_title: enrollment.courseTitle,
          enrolled_at: enrollment.enrolledAt,
        });

        enrollmentMap[`${email}:${enrollment.courseId}`] = result.id;
        enrollmentsSynced++;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown enrollment upsert error";
        errors.push(
          `Enrollment upsert failed for ${email}/${enrollment.courseId}: ${msg}`
        );
      }
    }

    // 4. Fetch progress for all enrollments
    const progressItems = await adapter.fetchProgress(
      config.credentials,
      enrollments.map((e) => ({
        courseId: e.courseId,
        userEmail: e.userEmail,
      }))
    );

    // 5. Upsert into external_progress (per-item error handling)
    let progressSynced = 0;

    for (const item of progressItems) {
      const email = item.userEmail.toLowerCase();
      const enrollmentId = enrollmentMap[`${email}:${item.courseId}`];
      if (!enrollmentId) continue;

      try {
        await upsertExternalProgress({
          external_enrollment_id: enrollmentId,
          progress_percentage: item.progressPercentage,
          status: item.status,
          completed_at: item.completedAt,
          time_spent_minutes: item.timeSpentMinutes,
          last_activity_at: item.lastActivityAt,
          synced_at: new Date().toISOString(),
        });

        progressSynced++;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown progress upsert error";
        errors.push(
          `Progress upsert failed for ${email}/${item.courseId}: ${msg}`
        );
      }
    }

    // Mark as idle (success)
    const syncErr =
      errors.length > 0
        ? `Completed with ${errors.length} error(s): ${errors[0]}`
        : undefined;
    await updateSyncStatus(config.id, "idle", syncErr);

    return {
      platform,
      enrollmentsSynced,
      progressSynced,
      errors,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown sync error";
    await updateSyncStatus(config.id, "error", errorMessage);

    return {
      platform,
      enrollmentsSynced: 0,
      progressSynced: 0,
      errors: [errorMessage],
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Convenience overload: sync by platform name instead of config ID.
 */
export async function syncPlatform(
  orgId: string,
  platform: ExternalPlatform,
  credentials: Record<string, string>
): Promise<SyncResult> {
  const config = await getPlatformConfig(orgId, platform);
  if (!config) {
    return {
      platform,
      enrollmentsSynced: 0,
      progressSynced: 0,
      errors: [`No config found for platform: ${platform}`],
      durationMs: 0,
    };
  }

  // Use credentials from config rather than the passed-in ones for consistency
  void credentials;
  return syncPlatformData(config.id, orgId);
}

// ---------------------------------------------------------------------------
// Sync all platforms
// ---------------------------------------------------------------------------

/**
 * Sync all configured and enabled platforms for an organization.
 * Runs each platform sync sequentially to avoid rate-limit issues.
 */
export async function syncAllPlatforms(
  orgId: string
): Promise<SyncResult[]> {
  const configs = await getPlatformConfigs(orgId);

  const results: SyncResult[] = [];

  for (const config of configs) {
    if (!config.is_enabled) {
      results.push({
        platform: config.platform,
        enrollmentsSynced: 0,
        progressSynced: 0,
        errors: ["Platform is disabled — skipped"],
        durationMs: 0,
      });
      continue;
    }

    const result = await syncPlatformData(config.id, orgId);
    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Sync status
// ---------------------------------------------------------------------------

/**
 * Get the last sync status for all configured platforms in an organization.
 */
export async function getAllSyncStatuses(
  orgId: string
): Promise<SyncStatusInfo[]> {
  const configs = await getPlatformConfigs(orgId);

  return configs.map((config) => ({
    platform: config.platform,
    lastSyncedAt: config.last_synced_at,
    syncStatus: config.sync_status,
    syncError: config.sync_error,
    isEnabled: config.is_enabled,
  }));
}

/**
 * Get the last sync status for a single platform.
 */
export async function getLastSyncStatus(
  orgId: string,
  platform: ExternalPlatform
): Promise<SyncStatusInfo | null> {
  const config = await getPlatformConfig(orgId, platform);
  if (!config) return null;

  return {
    platform: config.platform,
    lastSyncedAt: config.last_synced_at,
    syncStatus: config.sync_status,
    syncError: config.sync_error,
    isEnabled: config.is_enabled,
  };
}
