import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getBadgeCatalog, getUserBadges } from "@/lib/domains/gamification/queries";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view"); // "catalog" or "earned"

    if (view === "catalog") {
      const catalog = await getBadgeCatalog(auth.user.id, auth.organizationId);
      return NextResponse.json({ data: catalog }, {
        status: 200,
        headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=300" },
      });
    }

    // Default: return earned badges
    const earned = await getUserBadges(auth.user.id, auth.organizationId);
    return NextResponse.json({ data: earned }, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("GET /api/gamification/badges error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
