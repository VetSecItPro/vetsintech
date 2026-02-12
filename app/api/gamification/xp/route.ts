import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getUserXpTotal, getRecentXpEvents } from "@/lib/domains/gamification/queries";
import {
  calculateLevel,
  getLevelTitle,
  getXpProgressInLevel,
} from "@/lib/domains/gamification/utils";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const [totalXp, recentEvents] = await Promise.all([
      getUserXpTotal(auth.user.id, auth.organizationId),
      getRecentXpEvents(auth.user.id, auth.organizationId, 20),
    ]);

    const level = calculateLevel(totalXp);
    const progress = getXpProgressInLevel(totalXp);

    return NextResponse.json(
      {
        data: {
          total_xp: totalXp,
          level,
          level_title: getLevelTitle(level),
          xp_progress: progress,
          recent_events: recentEvents,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/gamification/xp error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
