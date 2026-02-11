import { createClient } from "@/lib/supabase/server";
import { getAdapter } from "./adapter";
import {
  upsertExternalEnrollment,
  upsertExternalProgress,
} from "./mutations";
import type { ExternalPlatform } from "./types";

interface SyncResult {
  enrollmentsSynced: number;
  progressSynced: number;
}

/**
 * Sync enrollments and progress from an external platform for an organization.
 *
 * 1. Gets all student emails in the org (from profiles + user_roles)
 * 2. Calls adapter.fetchEnrollments() and adapter.fetchProgress()
 * 3. Upserts into external_enrollments and external_progress tables
 * 4. Returns sync counts
 */
export async function syncPlatform(
  orgId: string,
  platform: ExternalPlatform,
  credentials: Record<string, string>
): Promise<SyncResult> {
  const supabase = await createClient();
  const adapter = getAdapter(platform);

  // 1. Get all student emails in the org via profiles + user_roles
  const { data: studentRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "student");

  if (rolesError) throw rolesError;

  const studentIds = (studentRoles ?? []).map((r) => r.user_id);

  if (studentIds.length === 0) {
    return { enrollmentsSynced: 0, progressSynced: 0 };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", studentIds)
    .eq("organization_id", orgId);

  if (profilesError) throw profilesError;

  const emailToUserId: Record<string, string> = {};
  const emails: string[] = [];
  for (const profile of profiles ?? []) {
    if (profile.email) {
      emailToUserId[profile.email] = profile.id;
      emails.push(profile.email);
    }
  }

  if (emails.length === 0) {
    return { enrollmentsSynced: 0, progressSynced: 0 };
  }

  // 2. Fetch enrollments from external platform
  const enrollments = await adapter.fetchEnrollments(credentials, emails);

  // 3. Upsert into external_enrollments
  let enrollmentsSynced = 0;
  const enrollmentMap: Record<string, string> = {};

  for (const enrollment of enrollments) {
    const userId = emailToUserId[enrollment.userEmail];
    if (!userId) continue;

    const result = await upsertExternalEnrollment({
      organization_id: orgId,
      user_id: userId,
      platform,
      external_course_id: enrollment.courseId,
      external_course_title: enrollment.courseTitle,
      enrolled_at: enrollment.enrolledAt,
    });

    enrollmentMap[`${enrollment.userEmail}:${enrollment.courseId}`] = result.id;
    enrollmentsSynced++;
  }

  // Fetch progress for all enrollments
  const progressItems = await adapter.fetchProgress(
    credentials,
    enrollments.map((e) => ({
      courseId: e.courseId,
      userEmail: e.userEmail,
    }))
  );

  // Upsert into external_progress
  let progressSynced = 0;

  for (const item of progressItems) {
    const enrollmentId =
      enrollmentMap[`${item.userEmail}:${item.courseId}`];
    if (!enrollmentId) continue;

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
  }

  // 4. Return sync counts
  return { enrollmentsSynced, progressSynced };
}
