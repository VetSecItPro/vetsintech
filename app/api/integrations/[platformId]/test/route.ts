import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getPlatformConfig } from "@/lib/domains/integrations/queries";
import { testConnection } from "@/lib/domains/integrations/connection-test";
import type { ExternalPlatform } from "@/lib/domains/integrations/types";

/**
 * POST /api/integrations/[platformId]/test
 *
 * Tests the API connection for a specific platform.
 * The platformId here is the platform name (coursera, pluralsight, udemy).
 * Admin only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ platformId: string }> }
) {
  const auth = await requireAuth(request, ["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    const { platformId } = await params;

    // Validate platform name
    const validPlatforms: ExternalPlatform[] = [
      "coursera",
      "pluralsight",
      "udemy",
    ];
    if (!validPlatforms.includes(platformId as ExternalPlatform)) {
      return NextResponse.json(
        { error: `Invalid platform: ${platformId}` },
        { status: 400 }
      );
    }

    const platform = platformId as ExternalPlatform;

    // Get the stored config for this platform
    const config = await getPlatformConfig(auth.organizationId, platform);

    if (!config) {
      return NextResponse.json(
        { error: "Platform not configured. Save credentials first." },
        { status: 404 }
      );
    }

    // Test the connection
    const result = await testConnection(platform, config.credentials);

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    console.error("POST /api/integrations/[platformId]/test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
