import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getLeaderboard } from "@/lib/domains/gamification/queries";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") === "this_month" ? "this_month" : "all_time";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

    const entries = await getLeaderboard(auth.organizationId, { limit, period });

    // Find current user's rank
    const userRank = entries.find((e) => e.user_id === auth.user.id);

    return NextResponse.json(
      {
        data: {
          entries,
          user_rank: userRank ?? null,
          period,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/gamification/leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
