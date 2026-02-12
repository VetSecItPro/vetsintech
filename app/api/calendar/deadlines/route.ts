import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getUpcomingDeadlines } from "@/lib/domains/calendar/queries";

/**
 * GET /api/calendar/deadlines?days_ahead=7
 * Get upcoming deadlines for the current user.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const daysAheadParam = searchParams.get("days_ahead");
    const daysAhead = daysAheadParam ? parseInt(daysAheadParam, 10) : 7;

    if (isNaN(daysAhead) || daysAhead < 1 || daysAhead > 365) {
      return NextResponse.json(
        { error: "days_ahead must be between 1 and 365" },
        { status: 400 }
      );
    }

    const deadlines = await getUpcomingDeadlines(auth.user.id, daysAhead);
    return NextResponse.json({ data: deadlines }, { status: 200 });
  } catch (error) {
    console.error("GET /api/calendar/deadlines error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
