import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getExternalProgress } from "@/lib/domains/integrations/queries";
import type { ExternalPlatform } from "@/lib/domains/integrations/types";

/**
 * GET /api/integrations/progress
 *
 * Returns unified external progress data across all platforms.
 * Supports optional query params: platform, userId, limit, offset.
 * Admin only.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    const url = new URL(request.url);
    const platform = url.searchParams.get("platform") as ExternalPlatform | null;
    const userId = url.searchParams.get("userId");
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    // Validate platform if provided
    if (platform) {
      const platformCheck = z
        .enum(["coursera", "pluralsight", "udemy"])
        .safeParse(platform);
      if (!platformCheck.success) {
        return NextResponse.json(
          { error: "Invalid platform parameter" },
          { status: 400 }
        );
      }
    }

    const limit = limitParam ? Math.min(Number(limitParam), 200) : 50;
    const offset = offsetParam ? Number(offsetParam) : 0;

    const progress = await getExternalProgress(auth.organizationId, {
      platform: platform ?? undefined,
      userId: userId ?? undefined,
      limit,
      offset,
    });

    // Compute summary stats
    const totalCourses = progress.length;
    const completedCourses = progress.filter(
      (p) => p.status === "completed"
    ).length;
    const completionRate =
      totalCourses > 0
        ? Math.round((completedCourses / totalCourses) * 100)
        : 0;

    // Platform breakdown
    const platformCounts: Record<string, number> = {};
    for (const p of progress) {
      platformCounts[p.platform] = (platformCounts[p.platform] ?? 0) + 1;
    }

    const mostActivePlatform =
      Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      null;

    return NextResponse.json({
      data: {
        progress,
        summary: {
          totalCourses,
          completedCourses,
          completionRate,
          platformCounts,
          mostActivePlatform,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/integrations/progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
