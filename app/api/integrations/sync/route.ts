import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getPlatformConfig } from "@/lib/domains/integrations/queries";
import {
  updateSyncStatus,
  upsertExternalEnrollment,
  upsertExternalProgress,
} from "@/lib/domains/integrations/mutations";
import { getAdapter } from "@/lib/domains/integrations/adapter";
import { createClient } from "@/lib/supabase/server";

const syncSchema = z.object({
  platform: z.enum(["coursera", "pluralsight", "udemy"]),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const result = syncSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: z.prettifyError(result.error) },
        { status: 400 }
      );
    }

    const { platform } = result.data;

    const config = await getPlatformConfig(
      auth.organizationId,
      platform
    );

    if (!config) {
      return NextResponse.json(
        { error: "Platform not configured" },
        { status: 404 }
      );
    }

    if (!config.is_enabled) {
      return NextResponse.json(
        { error: "Platform integration is disabled" },
        { status: 400 }
      );
    }

    const adapter = getAdapter(platform);

    // Validate credentials before syncing
    const credentialsValid = await adapter.validateCredentials(
      config.credentials
    );
    if (!credentialsValid) {
      await updateSyncStatus(config.id, "error", "Invalid credentials");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    // Update sync status to syncing
    await updateSyncStatus(config.id, "syncing");

    try {
      // Fetch org user emails for matching
      const supabase = await createClient();
      const { data: orgUsers } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("organization_id", auth.organizationId);

      const emailToUserId: Record<string, string> = {};
      const emails: string[] = [];
      for (const user of orgUsers ?? []) {
        if (user.email) {
          emailToUserId[user.email] = user.id;
          emails.push(user.email);
        }
      }

      // Fetch enrollments from external platform
      const enrollments = await adapter.fetchEnrollments(
        config.credentials,
        emails
      );

      let enrollmentCount = 0;
      const enrollmentMap: Record<string, string> = {};

      for (const enrollment of enrollments) {
        const userId = emailToUserId[enrollment.userEmail];
        if (!userId) continue;

        const upsertResult = await upsertExternalEnrollment({
          organization_id: auth.organizationId,
          user_id: userId,
          platform,
          external_course_id: enrollment.courseId,
          external_course_title: enrollment.courseTitle,
          enrolled_at: enrollment.enrolledAt,
        });

        enrollmentMap[`${enrollment.userEmail}:${enrollment.courseId}`] =
          upsertResult.id;
        enrollmentCount++;
      }

      // Fetch progress for all enrollments
      const progressItems = await adapter.fetchProgress(
        config.credentials,
        enrollments.map((e) => ({
          courseId: e.courseId,
          userEmail: e.userEmail,
        }))
      );

      let progressCount = 0;

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

        progressCount++;
      }

      // Update sync status to idle (success)
      await updateSyncStatus(config.id, "idle");

      return NextResponse.json({
        data: {
          enrollments: enrollmentCount,
          progress: progressCount,
        },
      });
    } catch (syncError) {
      const errorMessage =
        syncError instanceof Error ? syncError.message : "Unknown sync error";
      await updateSyncStatus(config.id, "error", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error("POST /api/integrations/sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
