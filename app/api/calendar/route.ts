import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCalendarItems } from "@/lib/domains/calendar/queries";

/**
 * GET /api/calendar?start=<ISO>&end=<ISO>
 * Get all calendar items (assignments, quizzes, events) for a date range.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end query parameters are required (ISO datetime)" },
        { status: 400 }
      );
    }

    // Validate ISO dates
    if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
      return NextResponse.json(
        { error: "start and end must be valid ISO datetime strings" },
        { status: 400 }
      );
    }

    const items = await getCalendarItems(auth.organizationId, start, end);
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
