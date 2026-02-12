import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getPlatformConfig } from "@/lib/domains/integrations/queries";
import { syncPlatformData, syncAllPlatforms } from "@/lib/domains/integrations/sync";
import { getAdapter } from "@/lib/domains/integrations/adapter";
import { updateSyncStatus } from "@/lib/domains/integrations/mutations";

const syncSchema = z.object({
  platform: z.enum(["coursera", "pluralsight", "udemy"]).optional(),
  syncAll: z.boolean().optional(),
});

/**
 * POST /api/integrations/sync
 *
 * Triggers a sync for a specific platform or all platforms.
 * Admin only.
 *
 * Body: { platform?: string, syncAll?: boolean }
 */
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

    const { platform, syncAll } = result.data;

    // Sync all platforms if requested
    if (syncAll) {
      const results = await syncAllPlatforms(auth.organizationId);

      const totalEnrollments = results.reduce(
        (sum, r) => sum + r.enrollmentsSynced,
        0
      );
      const totalProgress = results.reduce(
        (sum, r) => sum + r.progressSynced,
        0
      );
      const totalErrors = results.reduce(
        (sum, r) => sum + r.errors.length,
        0
      );

      return NextResponse.json({
        data: {
          enrollments: totalEnrollments,
          progress: totalProgress,
          errors: totalErrors,
          results,
        },
      });
    }

    // Sync a single platform
    if (!platform) {
      return NextResponse.json(
        { error: "Either 'platform' or 'syncAll: true' is required" },
        { status: 400 }
      );
    }

    const config = await getPlatformConfig(auth.organizationId, platform);

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

    // Validate credentials before syncing
    const adapter = getAdapter(platform);
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

    const syncResult = await syncPlatformData(config.id, auth.organizationId);

    return NextResponse.json({
      data: {
        enrollments: syncResult.enrollmentsSynced,
        progress: syncResult.progressSynced,
        errors: syncResult.errors.length,
        durationMs: syncResult.durationMs,
        errorDetails: syncResult.errors.length > 0 ? syncResult.errors.slice(0, 5) : undefined,
      },
    });
  } catch (error) {
    console.error("POST /api/integrations/sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
