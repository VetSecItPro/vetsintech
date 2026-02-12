import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getAllSyncStatuses } from "@/lib/domains/integrations/sync";

/**
 * GET /api/integrations/sync/status
 *
 * Returns sync status for all configured platforms.
 * Admin only.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    const statuses = await getAllSyncStatuses(auth.organizationId);

    return NextResponse.json({ data: statuses });
  } catch (error) {
    console.error("GET /api/integrations/sync/status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
